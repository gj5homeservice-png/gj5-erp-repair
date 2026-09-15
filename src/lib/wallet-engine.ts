// GJ5 E-Wallet financial engine.
//
// This is the single place that decides what counts as real income/expense
// and computes every number the E-Wallet screen shows. It is intentionally
// a pure, framework-free module (no fetch, no React) so the same math can be
// unit-reasoned-about and reused anywhere.
//
// ANTI-DUPLICATION DESIGN (see also the module's own comments below):
// Every financial event has exactly ONE authoritative source table, and this
// engine reads each event from that table ONLY — never from a second place
// that might also mention it:
//   - Repair income        -> RepairJob.payments[]            (never wallet_transactions)
//   - Invoice/sale income  -> Invoice (paymentStatus-gated)    (never wallet_transactions)
//   - Manual/topup income  -> wallet transactions of type TOPUP or MANUAL_CREDIT
//   - Business expenses    -> Expense[]                        (never wallet_transactions)
//   - Stock purchases      -> StockItem.history[] (PURCHASE/INWARD only)
//   - Salaries             -> SalaryRecord[] (paymentStatus === 'Paid' only)
//   - Manual debits        -> wallet transactions of type MANUAL_DEBIT
//
// wallet_transactions rows of type INVOICE_SALE and REPAIR_JOB_PAYMENT DO
// exist in the database (written by the older invoice/repair-payment code
// paths for a legacy running-balance counter) but are deliberately EXCLUDED
// here, because their underlying event is already being read from its real
// source (Invoice / RepairJob) above. Including both would double-count the
// exact same rupee. See WALLET_NATIVE_TYPES below.

import { parseISO, isToday, isSameMonth, isSameWeek, isValid } from 'date-fns';
import { grandTotal as repairGrandTotal, totalPaid as repairTotalPaid, balanceDue as repairBalanceDue } from './repair-utils';
import type { RepairJob, Invoice, Expense, StockItem, SalaryRecord, WalletTransaction, SalesOrder, Account } from './types';

// ---- Master Money Control additions ----
//
// "Runner collected a customer payment" / "an employee paid an expense out
// of custody cash" are NOT new ledger-insert event types — they are
// account_id attribution on the SAME repair_job_payments/expenses rows
// buildLedger already reads above as income/expense. Inventing a second
// insert type for "the runner collected it" while ALSO reading the
// underlying payment would double-count that rupee. Instead, the Master
// Ledger's display Type label is derived here (see typeLabelForAccount)
// by checking which kind of account the row's accountId points at — pure
// display, never changes amount/direction/category, so the anti-dup
// guarantees above are completely untouched.
//
// Genuinely new event kinds that have no other source table DO get real
// wallet_transactions rows: ACCOUNT_TRANSFER, EMPLOYEE_ADVANCE,
// RUNNER_ADVANCE, RUNNER_SETTLEMENT, REFUND — see src/lib/erp/accounts.ts.
// The first four move money between the company's own accounts and are
// excluded from Income/Expense (exactly like a plain TOPUP already is);
// REFUND is a real expense (money actually leaving the business).
const TRANSFER_LIKE_TYPES = new Set(['ACCOUNT_TRANSFER', 'EMPLOYEE_ADVANCE', 'RUNNER_ADVANCE', 'RUNNER_SETTLEMENT']);
const TRANSFER_LIKE_CATEGORIES = new Set(['Account Transfer', 'Employee Advance', 'Runner Advance', 'Runner Settlement']);

function accountName(accounts: Account[], id: string | null | undefined): string | null {
  if (!id) return null;
  return accounts.find(a => a.id === id)?.name || null;
}

function accountType(accounts: Account[], id: string | null | undefined): Account['type'] | null {
  if (!id) return null;
  return accounts.find(a => a.id === id)?.type || null;
}

// Display-only label for the Master Ledger's "Type" column — a repair
// payment collected into a RUNNER-type account reads as "RUNNER
// COLLECTION" even though, underneath, it's the exact same
// RepairJobPayment counted once as income above.
function typeLabelForPayment(accounts: Account[], accountId: string | null | undefined): string {
  const t = accountType(accounts, accountId);
  if (t === 'RUNNER') return 'RUNNER COLLECTION';
  return 'CUSTOMER PAYMENT';
}

// The app's documented starting balance for a brand-new tenant (see
// src/lib/erp/wallet.ts's DEFAULT_STARTING_BALANCE) — preserved here as the
// literal opening balance for the fresh calculation this engine performs,
// exactly matching "if the existing system already has an opening balance,
// preserve it."
export const OPENING_BALANCE = 50000;

// Only these two wallet_transactions types are read by this engine — every
// other type (INVOICE_SALE, REPAIR_JOB_PAYMENT, EXPENSE) has its own real
// source table read directly instead, so those rows are never touched here.
const WALLET_NATIVE_INCOME_TYPES = new Set(['TOPUP', 'MANUAL_CREDIT']);
const WALLET_NATIVE_EXPENSE_TYPES = new Set(['MANUAL_DEBIT']);

export type LedgerDirection = 'INCOME' | 'EXPENSE';
export type LedgerStatus = 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED';

export interface LedgerEntry {
  id: string;               // stable, unique across the whole ledger
  date: string;              // ISO date used for all grouping/filtering
  direction: LedgerDirection;
  amount: number;            // always positive; direction carries the sign
  category: string;          // e.g. 'Repair Payments', 'TV/Product Sales', 'Salaries'
  sourceModule: 'Repair' | 'Sales' | 'Wallet' | 'Expense' | 'Stock' | 'Salary';
  sourceRecordId: string;    // the id of the record in its own module (RJ1004, INV-..., etc.)
  description: string;
  customerOrVendor: string | null;
  reference: string | null;  // invoice number / PO-style reference where one exists
  paymentMethod: string | null;
  status: LedgerStatus;
  technician?: string | null;
  createdBy?: string | null;
  // Master Money Control — the Master Ledger's Type/Account/Destination
  // columns. accountId is the single account a repair-payment/expense row
  // touched; for a wallet-native transfer/advance/settlement, accountId is
  // the "from" side and counterAccountId is the "to" side (display only —
  // see the module header comment for why this never double-counts).
  txType?: string;
  accountId?: string | null;
  accountName?: string | null;
  counterAccountId?: string | null;
  counterAccountName?: string | null;
}

function safeParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

function normalizePaymentMethod(raw: string | null | undefined): string {
  if (!raw) return 'Other';
  const v = raw.toLowerCase();
  if (v.includes('cash')) return 'Cash';
  if (v.includes('upi')) return 'UPI';
  if (v.includes('bank')) return 'Bank Transfer';
  if (v.includes('card')) return 'Card';
  return 'Other';
}

// ---- Building the unified ledger (section 8 / 15) ----

export function buildLedger(data: {
  repairJobs: RepairJob[];
  invoices: Invoice[];
  expenses: Expense[];
  stock: StockItem[];
  salaries: SalaryRecord[];
  transactions: WalletTransaction[];
  accounts?: Account[];
}): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const accounts = data.accounts || [];

  // 1. Repair payments — every payment a customer has actually made. A
  // payment record inherently represents received money, so it is always PAID.
  for (const job of data.repairJobs || []) {
    for (const payment of job.payments || []) {
      const accId = (payment as any).accountId || null;
      entries.push({
        id: `repair-payment:${payment.id}`,
        date: payment.date,
        direction: 'INCOME',
        amount: Number(payment.amount) || 0,
        category: 'Repair Payments',
        sourceModule: 'Repair',
        sourceRecordId: job.id,
        description: `Repair Payment — ${job.id} (${job.customerName})`,
        customerOrVendor: job.customerName || null,
        reference: job.id,
        paymentMethod: normalizePaymentMethod(payment.method),
        status: 'PAID',
        technician: job.technicianName || null,
        txType: typeLabelForPayment(accounts, accId),
        accountId: accId,
        accountName: accountName(accounts, accId),
      });
    }
  }

  // 2. Invoice sales — only money that has actually been received. An
  // 'Unpaid' invoice contributes ₹0 here (it still appears in Receivables);
  // a 'Partial' invoice also contributes ₹0 here because this schema has no
  // field recording exactly how much of it was paid — inventing a split
  // would violate "never invent missing values", so it is surfaced only as
  // a receivable, clearly flagged, until the app captures a real number.
  for (const inv of data.invoices || []) {
    if (inv.paymentStatus === 'Paid') {
      entries.push({
        id: `invoice:${inv.id}`,
        date: inv.date || inv.timestamp,
        direction: 'INCOME',
        amount: Number(inv.grandTotal) || 0,
        category: 'TV/Product Sales',
        sourceModule: 'Sales',
        sourceRecordId: inv.id,
        description: `Sale — ${inv.invoiceNumber || inv.id} (${inv.customerName})`,
        customerOrVendor: inv.customerName || null,
        reference: inv.invoiceNumber || inv.id,
        paymentMethod: normalizePaymentMethod(inv.paymentMode),
        status: 'PAID',
        txType: 'CUSTOMER PAYMENT',
      });
    }
  }

  // 3. Manual business expenses — every recorded expense is, by definition
  // in this schema, already-paid money (there is no "pending expense"
  // concept here), so always EXPENSE/PAID. An expense paid from an
  // EMPLOYEE-type account (staff paying it out of custody cash) still
  // counts once, exactly like any other expense — accountId just says
  // which pocket it came from.
  for (const exp of data.expenses || []) {
    const accId = exp.accountId || null;
    entries.push({
      id: `expense:${exp.id}`,
      date: exp.date || exp.timestamp,
      direction: 'EXPENSE',
      amount: Number(exp.amount) || 0,
      category: exp.category || 'Other Expenses',
      sourceModule: 'Expense',
      sourceRecordId: exp.id,
      description: (exp as any).description || `Expense — ${exp.category}${exp.vendorName ? ` (${exp.vendorName})` : ''}`,
      customerOrVendor: exp.vendorName || null,
      reference: (exp as any).reference || null,
      paymentMethod: normalizePaymentMethod(exp.paymentMode),
      status: 'PAID',
      txType: 'EXPENSE',
      accountId: accId,
      accountName: accountName(accounts, accId),
    });
  }

  // 4. Stock purchases — PURCHASE/INWARD movements only. The unit cost used
  // is the stock item's CURRENT purchasePrice, since individual movement
  // rows don't store their own historical unit cost — this is a real,
  // labelled approximation, not a fabricated figure (see report).
  // SALE/OUTWARD movements are deliberately NOT treated as income here,
  // since real sales income is already fully captured via Invoices above;
  // counting stock outflow as income too would double-count the same sale.
  for (const item of data.stock || []) {
    for (const mv of item.history || []) {
      if (mv.type === 'PURCHASE' || mv.type === 'INWARD') {
        const qty = Number(mv.quantity) || 0;
        const unitCost = Number(item.purchasePrice) || 0;
        entries.push({
          id: `stock-movement:${mv.id}`,
          date: mv.date,
          direction: 'EXPENSE',
          amount: qty * unitCost,
          category: 'Stock Purchases',
          sourceModule: 'Stock',
          sourceRecordId: item.id,
          description: `Stock Purchase — ${item.name} x${qty}`,
          customerOrVendor: item.supplierName || null,
          reference: mv.referenceId || null,
          paymentMethod: null,
          status: 'PAID',
          txType: 'PURCHASE',
        });
      }
    }
  }

  // 5. Salaries — only once actually marked Paid. Pending salaries are a
  // Payable, not a ledger expense (no money has moved yet).
  for (const sal of data.salaries || []) {
    if (sal.paymentStatus === 'Paid') {
      entries.push({
        id: `salary:${sal.id}`,
        date: sal.processedDate,
        direction: 'EXPENSE',
        amount: Number(sal.netPayable) || 0,
        category: 'Salaries',
        sourceModule: 'Salary',
        sourceRecordId: sal.id,
        description: `Salary — ${sal.employeeName} (${sal.month} ${sal.year})`,
        customerOrVendor: sal.employeeName || null,
        reference: sal.id,
        paymentMethod: null,
        status: 'PAID',
        txType: 'SALARY',
      });
    }
  }

  // 6. Wallet-native transactions — top-ups and manual adjustments only.
  // MANUAL_CREDIT rows carrying a `metadata.category` are real, categorized
  // "Other Business Income" entries (section 2C); MANUAL_CREDIT/DEBIT rows
  // with no such metadata are legacy plain balance adjustments and are
  // labelled as such rather than folded into a business income/expense
  // category that would misrepresent what they are.
  for (const tx of data.transactions || []) {
    if (WALLET_NATIVE_INCOME_TYPES.has(tx.type)) {
      const meta = tx.metadata || {};
      const isCategorizedIncome = tx.type === 'MANUAL_CREDIT' && !!meta.category;
      entries.push({
        id: `wallet:${tx.id}`,
        date: tx.date,
        direction: 'INCOME',
        amount: Number(tx.amount) || 0,
        category: isCategorizedIncome ? meta.category : (tx.type === 'TOPUP' ? 'Balance Top-Up' : 'Balance Adjustment'),
        sourceModule: 'Wallet',
        sourceRecordId: tx.id,
        description: meta.description || tx.description,
        customerOrVendor: null,
        reference: meta.reference || null,
        paymentMethod: normalizePaymentMethod(meta.paymentMethod),
        status: 'PAID',
        txType: isCategorizedIncome ? 'OTHER INCOME' : tx.type,
      });
    } else if (WALLET_NATIVE_EXPENSE_TYPES.has(tx.type)) {
      entries.push({
        id: `wallet:${tx.id}`,
        date: tx.date,
        direction: 'EXPENSE',
        amount: Number(tx.amount) || 0,
        category: 'Balance Adjustment',
        sourceModule: 'Wallet',
        sourceRecordId: tx.id,
        description: tx.description,
        customerOrVendor: null,
        reference: null,
        paymentMethod: null,
        status: 'PAID',
        txType: tx.type,
      });
    }
  }

  // 7. Account transfers / advances / settlements / refunds — genuinely new
  // event kinds with no other source table (see accounts.ts). Transfers,
  // advances and settlements move money between the company's own accounts
  // and are never Income/Expense (excluded below in computeFinancials,
  // exactly like a plain TOPUP already is); a REFUND is a real expense —
  // money actually leaving the business. sourceModule stays 'Wallet' so the
  // existing "only Wallet-sourced rows are reversible" UI gate picks these
  // up automatically, with no extra wiring.
  for (const tx of data.transactions || []) {
    if (tx.isReversal) {
      // A reversal must have the OPPOSITE P&L effect of whatever it
      // reverses, so the two net to exactly zero. Every wallet-native type
      // reachable via the UI's reverse button is either already excluded
      // from P&L (TOPUP/MANUAL_CREDIT/MANUAL_DEBIT/transfers/advances/
      // settlements — category 'Reversal' below is excluded the same way),
      // or REFUND, the one type that IS a real counted expense — its
      // reversal is counted as INCOME in the same 'Refunds' category so the
      // original expense and this entry cancel out exactly.
      const reversingRefund = tx.type === 'REVERSAL_REFUND';
      entries.push({
        id: `wallet:${tx.id}`,
        date: tx.date,
        direction: reversingRefund ? 'INCOME' : 'EXPENSE',
        amount: Number(tx.amount) || 0,
        category: reversingRefund ? 'Refunds' : 'Reversal',
        sourceModule: 'Wallet',
        sourceRecordId: tx.id,
        description: tx.description,
        customerOrVendor: null,
        reference: tx.reversedEntryId || null,
        paymentMethod: null,
        status: 'PAID',
        txType: 'REVERSAL',
        accountId: (tx as any).fromAccountId || null,
        accountName: accountName(accounts, (tx as any).fromAccountId),
        counterAccountId: (tx as any).toAccountId || null,
        counterAccountName: accountName(accounts, (tx as any).toAccountId),
      });
    } else if (TRANSFER_LIKE_TYPES.has(tx.type)) {
      const from = (tx as any).fromAccountId || null;
      const to = (tx as any).toAccountId || null;
      const fromName = accountName(accounts, from);
      const toName = accountName(accounts, to);
      const categoryByType: Record<string, string> = {
        ACCOUNT_TRANSFER: 'Account Transfer',
        EMPLOYEE_ADVANCE: 'Employee Advance',
        RUNNER_ADVANCE: 'Runner Advance',
        RUNNER_SETTLEMENT: 'Runner Settlement',
      };
      entries.push({
        id: `wallet:${tx.id}`,
        date: tx.date,
        direction: 'EXPENSE', // arbitrary — excluded from P&L via TRANSFER_LIKE_CATEGORIES
        amount: Number(tx.amount) || 0,
        category: categoryByType[tx.type] || tx.type,
        sourceModule: 'Wallet',
        sourceRecordId: tx.id,
        description: tx.description || `${fromName || from || '—'} → ${toName || to || '—'}`,
        customerOrVendor: null,
        reference: null,
        paymentMethod: null,
        status: 'PAID',
        txType: tx.type.replace(/_/g, ' '),
        accountId: from,
        accountName: fromName,
        counterAccountId: to,
        counterAccountName: toName,
      });
    } else if (tx.type === 'REFUND') {
      const from = (tx as any).fromAccountId || null;
      entries.push({
        id: `wallet:${tx.id}`,
        date: tx.date,
        direction: 'EXPENSE',
        amount: Number(tx.amount) || 0,
        category: 'Refunds',
        sourceModule: 'Wallet',
        sourceRecordId: tx.id,
        description: tx.description,
        customerOrVendor: null,
        reference: null,
        paymentMethod: null,
        status: 'PAID',
        txType: 'REFUND',
        accountId: from,
        accountName: accountName(accounts, from),
      });
    }
  }

  return entries.sort((a, b) => {
    const da = safeParseDate(a.date)?.getTime() ?? 0;
    const db = safeParseDate(b.date)?.getTime() ?? 0;
    return da - db; // oldest first, so a running balance can be accumulated in order
  });
}

// Attaches a running balance to an already-date-sorted (ascending) ledger.
export function withRunningBalance(entries: LedgerEntry[]): (LedgerEntry & { balance: number })[] {
  let running = OPENING_BALANCE;
  return entries.map((e) => {
    running += e.direction === 'INCOME' ? e.amount : -e.amount;
    return { ...e, balance: running };
  });
}

// ---- Receivables & Payables (sections 6 / 7) ----

export interface ReceivableRow {
  customer: string;
  sourceModule: 'Repair' | 'Sales';
  referenceId: string;
  total: number;
  paid: number;
  pending: number;
  dueDate: string | null;
  status: string;
  note?: string;
}

// Fixed (Master Money Control validation pass): this used to omit
// salesOrders entirely, silently disagreeing with customers.ts's own
// listCustomersWithStats/getCustomerProfile, which already sum repair +
// sales_orders.balance_due + invoices for "Total Customer Pending." Adding
// salesOrders here is what makes "Total Customer Pending" on this dashboard
// agree with the Customer Department module's own number.
export function computeReceivables(data: { repairJobs: RepairJob[]; invoices: Invoice[]; salesOrders?: SalesOrder[] }): ReceivableRow[] {
  const rows: ReceivableRow[] = [];

  for (const job of data.repairJobs || []) {
    const total = repairGrandTotal(job);
    const paid = repairTotalPaid(job);
    const pending = repairBalanceDue(job);
    if (pending > 0.01) {
      rows.push({
        customer: job.customerName,
        sourceModule: 'Repair',
        referenceId: job.id,
        total,
        paid,
        pending,
        dueDate: job.expectedDeliveryDate || null,
        status: paid > 0 ? 'PARTIALLY PAID' : 'PENDING',
      });
    }
  }

  for (const order of data.salesOrders || []) {
    const pending = Number((order as any).balanceDue) || 0;
    if (pending > 0.01) {
      rows.push({
        customer: (order as any).customerName,
        sourceModule: 'Sales',
        referenceId: order.id,
        total: Number((order as any).grandTotal) || 0,
        paid: Number((order as any).amountPaid) || 0,
        pending,
        dueDate: null,
        status: (Number((order as any).amountPaid) || 0) > 0 ? 'PARTIALLY PAID' : 'PENDING',
      });
    }
  }

  for (const inv of data.invoices || []) {
    if (inv.paymentStatus === 'Unpaid') {
      rows.push({
        customer: inv.customerName,
        sourceModule: 'Sales',
        referenceId: inv.invoiceNumber || inv.id,
        total: inv.grandTotal,
        paid: 0,
        pending: inv.grandTotal,
        dueDate: inv.dueDate || null,
        status: 'PENDING',
      });
    } else if (inv.paymentStatus === 'Partial') {
      rows.push({
        customer: inv.customerName,
        sourceModule: 'Sales',
        referenceId: inv.invoiceNumber || inv.id,
        total: inv.grandTotal,
        paid: NaN, // genuinely unknown — this schema doesn't record it
        pending: inv.grandTotal,
        dueDate: inv.dueDate || null,
        status: 'PARTIALLY PAID',
        note: 'Amount actually received is not tracked for partial invoices yet — shown as fully pending until a paid-amount is recorded.',
      });
    }
  }

  return rows.sort((a, b) => b.pending - a.pending);
}

export interface PayableRow {
  vendorOrEmployee: string;
  reference: string;
  total: number;
  pending: number;
  dueContext: string;
  status: string;
}

// The only genuine, non-fabricated payable this ERP can currently identify
// is a salary marked Pending — there is no accounts-payable concept for
// stock suppliers anywhere in the schema (a stock purchase doesn't record
// whether the supplier has actually been paid yet), so this list is
// deliberately limited rather than invented. See the report for detail.
export function computePayables(data: { salaries: SalaryRecord[] }): PayableRow[] {
  return (data.salaries || [])
    .filter((s) => s.paymentStatus === 'Pending')
    .map((s) => ({
      vendorOrEmployee: s.employeeName,
      reference: s.id,
      total: s.netPayable,
      pending: s.netPayable,
      dueContext: `${s.month} ${s.year}`,
      status: 'PENDING',
    }))
    .sort((a, b) => b.pending - a.pending);
}

// ---- Top-level dashboard summary (section 1 / 4 / 5 / 17) ----

export interface WalletFinancials {
  availableBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingReceivables: number;
  pendingPayables: number;
  todayIncome: number;
  todayExpense: number;
  weekIncome: number;
  weekExpense: number;
  monthIncome: number;
  monthExpense: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  paymentMethods: Record<string, { received: number; paid: number; net: number }>;
}

export function computeFinancials(data: {
  repairJobs: RepairJob[];
  invoices: Invoice[];
  expenses: Expense[];
  stock: StockItem[];
  salaries: SalaryRecord[];
  transactions: WalletTransaction[];
  salesOrders?: SalesOrder[];
  accounts?: Account[];
}): WalletFinancials {
  const ledger = buildLedger(data);
  const now = new Date();

  let totalIncome = 0, totalExpenses = 0;
  let todayIncome = 0, todayExpense = 0;
  let weekIncome = 0, weekExpense = 0;
  let monthIncome = 0, monthExpense = 0;
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const paymentMethods: Record<string, { received: number; paid: number; net: number }> = {};

  // Balance-adjustment-only categories are excluded from Income/Expense
  // totals (they're cash-position corrections, not business revenue/cost)
  // but ARE included in Available Balance below. Account transfers/
  // advances/settlements move money between the company's own pockets, and
  // a plain (non-refund) reversal has no P&L effect of its own — both are
  // excluded the same way. A REFUND (and the 'Refunds' category used to
  // cancel a reversed one) is deliberately NOT in this set — refunds are a
  // real expense.
  const BALANCE_ONLY = new Set(['Balance Top-Up', 'Balance Adjustment', 'Reversal', ...TRANSFER_LIKE_CATEGORIES]);

  for (const e of ledger) {
    const d = safeParseDate(e.date);
    const isBalanceOnly = BALANCE_ONLY.has(e.category);

    if (!isBalanceOnly) {
      if (e.direction === 'INCOME') {
        totalIncome += e.amount;
        incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
      } else {
        totalExpenses += e.amount;
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      }
      if (d && isToday(d)) {
        if (e.direction === 'INCOME') todayIncome += e.amount; else todayExpense += e.amount;
      }
      if (d && isSameWeek(d, now, { weekStartsOn: 1 })) {
        if (e.direction === 'INCOME') weekIncome += e.amount; else weekExpense += e.amount;
      }
      if (d && isSameMonth(d, now)) {
        if (e.direction === 'INCOME') monthIncome += e.amount; else monthExpense += e.amount;
      }
    }

    if (e.paymentMethod) {
      const bucket = paymentMethods[e.paymentMethod] || { received: 0, paid: 0, net: 0 };
      if (e.direction === 'INCOME') bucket.received += e.amount; else bucket.paid += e.amount;
      bucket.net = bucket.received - bucket.paid;
      paymentMethods[e.paymentMethod] = bucket;
    }
  }

  // Only the legacy top-up/manual-adjustment categories feed
  // availableBalance's OPENING_BALANCE-relative math — transfers/advances/
  // settlements move money between accounts.ts's own per-account balances
  // instead, a separate system (see computeAccountRollups below).
  const balanceEntries = ledger.filter((e) => e.category === 'Balance Top-Up' || e.category === 'Balance Adjustment');
  const balanceAdjustmentNet = balanceEntries.reduce((sum, e) => sum + (e.direction === 'INCOME' ? e.amount : -e.amount), 0);

  const availableBalance = OPENING_BALANCE + totalIncome - totalExpenses + balanceAdjustmentNet;
  const netProfit = totalIncome - totalExpenses;

  const receivables = computeReceivables(data);
  const payables = computePayables(data);
  const pendingReceivables = receivables.reduce((s, r) => s + (Number.isFinite(r.pending) ? r.pending : 0), 0);
  const pendingPayables = payables.reduce((s, p) => s + p.pending, 0);

  return {
    availableBalance,
    totalIncome,
    totalExpenses,
    netProfit,
    pendingReceivables,
    pendingPayables,
    todayIncome,
    todayExpense,
    weekIncome,
    weekExpense,
    monthIncome,
    monthExpense,
    incomeByCategory,
    expenseByCategory,
    paymentMethods,
  };
}

// ---- Master Money Control: customer advances & account rollups ----

// Informational only (see the module header note above and customers.ts's
// matching totalAdvance comment) — this system already treats an intake
// advance as a real payment the moment it's taken (it's already inside
// totalIncome via the repair-payment loop above), never a separate
// liability. This is a labeled breakdown of that same already-counted
// money for jobs still in progress, never added on top of income.
export function computeCustomerAdvances(repairJobs: RepairJob[]): number {
  return (repairJobs || [])
    .filter(j => j.status !== 'Delivered' && j.status !== 'Cancelled')
    .reduce((s, j) => s + (Number(j.advancePayment) || 0), 0);
}

export interface AccountRollups {
  totalCompanyBalance: number;
  totalCash: number;
  totalUpiBank: number;
  totalWithEmployees: number;
  totalEmployeeAdvances: number;
}

// Pure reduction over already-fetched accounts/ledger — kept here for
// consistency with this file's existing small-pure-aggregator style
// (computeReceivables/computePayables/computeRepairFinancials).
// totalEmployeeAdvances is a LIFETIME figure (every EMPLOYEE_ADVANCE/
// RUNNER_ADVANCE ever given, from the ledger) — deliberately different from
// totalWithEmployees (today's current custody balance), matching the
// user's own example: ₹5,000 given historically vs ₹3,500 held right now.
export function computeAccountRollups(accounts: Account[], transactions: WalletTransaction[]): AccountRollups {
  const active = (accounts || []).filter(a => a.isActive);
  const totalCash = active.filter(a => a.type === 'CASH').reduce((s, a) => s + a.currentBalance, 0);
  const totalUpiBank = active.filter(a => a.type === 'UPI' || a.type === 'BANK').reduce((s, a) => s + a.currentBalance, 0);
  const totalWithEmployees = active.filter(a => a.type === 'EMPLOYEE' || a.type === 'RUNNER').reduce((s, a) => s + a.currentBalance, 0);
  const totalEmployeeAdvances = (transactions || [])
    .filter(tx => !tx.isReversal && (tx.type === 'EMPLOYEE_ADVANCE' || tx.type === 'RUNNER_ADVANCE'))
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  return {
    // "How much money does the company have, total, right now" — includes
    // money currently with an employee/runner, since that's still company
    // property, just not sitting in a direct cash/UPI/bank account yet.
    totalCompanyBalance: totalCash + totalUpiBank + totalWithEmployees,
    totalCash,
    totalUpiBank,
    totalWithEmployees,
    totalEmployeeAdvances,
  };
}

// ---- Repair & Stock financial summaries (sections 11 / 12) ----

export interface RepairFinancialRow {
  jobId: string;
  customer: string;
  revenue: number;
  partsCost: number;
  paid: number;
  pending: number;
  profit: number;
}

export function computeRepairFinancials(repairJobs: RepairJob[]) {
  const rows: RepairFinancialRow[] = (repairJobs || []).map((job) => {
    const revenue = repairGrandTotal(job);
    const partsCost = (job.parts || []).reduce((s, p) => s + (Number(p.purchaseCost) || 0) * (Number(p.qty) || 0), 0);
    const paid = repairTotalPaid(job);
    const pending = repairBalanceDue(job);
    return {
      jobId: job.id,
      customer: job.customerName,
      revenue,
      partsCost,
      paid,
      pending,
      profit: revenue - partsCost,
    };
  });

  return {
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalReceived: rows.reduce((s, r) => s + r.paid, 0),
    totalPending: rows.reduce((s, r) => s + Math.max(0, r.pending), 0),
    totalPartsCost: rows.reduce((s, r) => s + r.partsCost, 0),
    totalProfit: rows.reduce((s, r) => s + r.profit, 0),
    rows: rows.sort((a, b) => b.revenue - a.revenue),
  };
}

export function computeStockFinancials(stock: StockItem[]) {
  let purchaseCostTotal = 0;
  let stockCostValue = 0;

  for (const item of stock || []) {
    const unitCost = Number(item.purchasePrice) || 0;
    stockCostValue += unitCost * (Number(item.quantity) || 0);
    for (const mv of item.history || []) {
      if (mv.type === 'PURCHASE' || mv.type === 'INWARD') {
        purchaseCostTotal += unitCost * (Number(mv.quantity) || 0);
      }
    }
  }

  return {
    stockPurchaseCost: purchaseCostTotal,
    stockCostValue,
  };
}
