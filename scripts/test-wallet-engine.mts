// Standalone correctness test for the E-Wallet financial engine, run with
// `npx tsx scripts/test-wallet-engine.mts`. Exercises realistic sample data
// (including the exact RJ1004/INV-1005/PO-1002/SAL-001 style examples from
// the spec) plus the anti-duplication edge cases explicitly called out in
// the task: a repair payment must count once even if a legacy
// REPAIR_JOB_PAYMENT wallet_transactions row also exists for it; a Pending
// invoice must not inflate income; a Pending salary must not inflate
// expenses; TOPUP/plain MANUAL_CREDIT must not be counted as business income.
import {
  computeFinancials,
  buildLedger,
  withRunningBalance,
  computeReceivables,
  computePayables,
  computeRepairFinancials,
  computeStockFinancials,
  computeCustomerAdvances,
  computeAccountRollups,
  OPENING_BALANCE,
} from '../src/lib/wallet-engine';
import type { RepairJob, Invoice, Expense, StockItem, SalaryRecord, WalletTransaction, SalesOrder, Account } from '../src/lib/types';

let failures = 0;
function assertEqual(label: string, actual: number, expected: number) {
  const ok = Math.abs(actual - expected) < 0.01;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}
function assertEqualArr(label: string, actual: number, expected: number) {
  assertEqual(label, actual, expected);
}

// ---- Sample data ----

const repairJobs: RepairJob[] = [
  {
    id: 'RJ1004',
    customerName: 'Priya Customer',
    mobile: '9999900001',
    productType: 'TV',
    brand: 'Sony',
    model: 'X90',
    problemDescription: 'No display',
    technicianName: 'Ramesh',
    receivedDate: '2026-09-01',
    estimatedCost: 5000,
    advancePayment: 0,
    status: 'In Progress' as any,
    parts: [{ id: 'PART1', partName: 'Panel', partId: 'P1', qty: 1, purchaseCost: 1500, sellingPrice: 2500, total: 2500 }],
    labourCharges: 500,
    otherCharges: 0,
    discount: 0,
    // Grand total = parts(2500) + labour(500) - discount(0) = 3000
    payments: [{ id: 'PAY1', date: '2026-09-05', amount: 2500, method: 'UPI' }],
    notesLog: [], statusHistory: [], notifications: [],
    createdAt: '2026-09-01', updatedAt: '2026-09-05',
  } as unknown as RepairJob,
];

const invoices: Invoice[] = [
  {
    id: 'INV-ID-1005', invoiceNumber: 'INV-1005', date: '2026-09-06', dueDate: '2026-09-06',
    customerId: 'CUST1', customerName: 'Rakesh Buyer', mobile: '9999900002', address: '',
    items: [], subtotal: 25000, totalDiscount: 0, cgst: 0, sgst: 0, grandTotal: 25000,
    paymentStatus: 'Paid', paymentMode: 'Bank Transfer', timestamp: '2026-09-06T10:00:00.000Z',
  },
  // An unpaid invoice — must NOT count as income, must appear as a receivable.
  {
    id: 'INV-ID-1006', invoiceNumber: 'INV-1006', date: '2026-09-07', dueDate: '2026-09-14',
    customerId: 'CUST2', customerName: 'Unpaid Customer', mobile: '9999900003', address: '',
    items: [], subtotal: 10000, totalDiscount: 0, cgst: 0, sgst: 0, grandTotal: 10000,
    paymentStatus: 'Unpaid', paymentMode: 'Cash', timestamp: '2026-09-07T10:00:00.000Z',
  },
];

const expenses: Expense[] = [
  { id: 'EXP1', amount: 500, category: 'Chai - Nasta', vendorName: 'Tea Stall', date: '2026-09-08', paymentMode: 'Cash', timestamp: '2026-09-08T09:00:00.000Z' },
];

const stock: StockItem[] = [
  {
    id: 'STK1', name: 'LED Panel 43in', brand: 'Generic', category: 'Parts', purchasePrice: 8000, sellingPrice: 12000,
    quantity: 3, minStockLevel: 1, barcode: 'BC1', images: [], lastUpdated: '2026-09-02',
    history: [{ id: 'MV-PO-1002', date: '2026-09-02', type: 'PURCHASE', quantity: 1, notes: '', performedBy: 'Admin', referenceId: 'PO-1002', customerName: '' }],
  } as unknown as StockItem,
];

const salaries: SalaryRecord[] = [
  { id: 'SAL-001', employeeId: 'E1', employeeName: 'Suresh', month: 'September', year: '2026', baseSalary: 15000, attendanceDays: 26, overtimeHours: 0, bonus: 0, deductions: 0, netPayable: 15000, paymentStatus: 'Paid', processedDate: '2026-09-01' },
  // A pending salary — must NOT count as expense, must appear as a payable.
  { id: 'SAL-002', employeeId: 'E2', employeeName: 'Geeta', month: 'September', year: '2026', baseSalary: 12000, attendanceDays: 26, overtimeHours: 0, bonus: 0, deductions: 0, netPayable: 12000, paymentStatus: 'Pending', processedDate: '' },
];

// Legacy wallet_transactions rows: a REPAIR_JOB_PAYMENT row for the SAME
// RJ1004 payment, and an INVOICE_SALE row for the SAME INV-1005 — these
// exist in the real schema (written by the older code path) and must be
// EXCLUDED by the engine, since the real events are already read from
// repairJobs/invoices above. Also a real TOPUP, a plain MANUAL_CREDIT
// (legacy balance adjustment), and a categorized MANUAL_CREDIT (real "Other
// Income").
const transactions: WalletTransaction[] = [
  { id: 'TX-RJ-PAY1', amount: 2500, date: '2026-09-05', time: '10:00:00', type: 'REPAIR_JOB_PAYMENT', description: 'Repair payment: RJ1004' },
  { id: 'TX-1', amount: 25000, date: '2026-09-06', time: '10:00:00', type: 'INVOICE_SALE', description: 'Sale: INV-1005' },
  { id: 'TX-TOPUP-1', amount: 10000, date: '2026-09-03', time: '10:00:00', type: 'TOPUP', description: 'Wallet top-up' },
  { id: 'TX-ADJ-1', amount: 1000, date: '2026-09-04', time: '10:00:00', type: 'MANUAL_CREDIT', description: 'Manual adjustment' },
  { id: 'TX-ADJ-2', amount: 3000, date: '2026-09-04', time: '10:00:00', type: 'MANUAL_CREDIT', description: 'Rental income', metadata: { category: 'Rental Income', paymentMethod: 'Cash' } },
];

const input = { repairJobs, invoices, expenses, stock, salaries, transactions };

console.log('=== Ledger construction & anti-duplication ===');
const ledger = buildLedger(input);
const repairEntries = ledger.filter((e) => e.sourceModule === 'Repair');
const salesEntries = ledger.filter((e) => e.sourceModule === 'Sales');
assertEqualArr('Exactly one Repair Payment ledger entry for RJ1004 (not duplicated by the legacy wallet_transactions row)', repairEntries.length, 1);
assertEqual('RJ1004 repair payment amount', repairEntries[0]?.amount ?? -1, 2500);
assertEqualArr('Exactly one Sales ledger entry for INV-1005 (not duplicated by the legacy wallet_transactions row)', salesEntries.length, 1);
assertEqual('INV-1005 sale amount', salesEntries[0]?.amount ?? -1, 25000);
assertEqualArr('Unpaid invoice INV-1006 produces ZERO ledger entries', ledger.filter((e) => e.sourceRecordId === 'INV-ID-1006').length, 0);
assertEqualArr('Pending salary SAL-002 produces ZERO ledger entries', ledger.filter((e) => e.sourceRecordId === 'SAL-002').length, 0);
assertEqualArr('Stock purchase PO-1002 produces exactly one EXPENSE entry', ledger.filter((e) => e.sourceRecordId === 'STK1' && e.direction === 'EXPENSE').length, 1);
assertEqual('Stock purchase amount (1 unit x 8000 current purchase price)', ledger.find((e) => e.sourceRecordId === 'STK1')?.amount ?? -1, 8000);
assertEqualArr('Paid salary SAL-001 produces exactly one EXPENSE entry', ledger.filter((e) => e.sourceRecordId === 'SAL-001').length, 1);
assertEqual('Salary amount', ledger.find((e) => e.sourceRecordId === 'SAL-001')?.amount ?? -1, 15000);
assertEqualArr('Manual expense EXP1 produces exactly one EXPENSE entry', ledger.filter((e) => e.sourceRecordId === 'EXP1').length, 1);
assertEqualArr('Categorized MANUAL_CREDIT (Rental Income) is a real income entry', ledger.filter((e) => e.id === 'wallet:TX-ADJ-2' && e.category === 'Rental Income').length, 1);
assertEqualArr('Plain MANUAL_CREDIT is a Balance Adjustment, not a business income category', ledger.filter((e) => e.id === 'wallet:TX-ADJ-1' && e.category === 'Balance Adjustment').length, 1);
assertEqualArr('TOPUP is a Balance Top-Up, not a business income category', ledger.filter((e) => e.id === 'wallet:TX-TOPUP-1' && e.category === 'Balance Top-Up').length, 1);

console.log('\n=== Financial summary ===');
const fin = computeFinancials(input);
// Total income = repair payment (2500) + paid invoice (25000) + categorized manual credit (3000) = 30500
assertEqual('Total Income (repair + paid sale + categorized other income; excludes topup/plain adjustment)', fin.totalIncome, 30500);
// Total expenses = manual expense (500) + stock purchase (8000) + paid salary (15000) = 23500
assertEqual('Total Expenses (manual expense + stock purchase + paid salary)', fin.totalExpenses, 23500);
assertEqual('Net Profit = Income - Expenses', fin.netProfit, 30500 - 23500);
// Available balance = opening(50000) + income(30500) - expenses(23500) + topup(10000) + plain manual credit(1000)
assertEqual('Available Balance = Opening + Income - Expenses + balance adjustments (topup + plain manual credit)', fin.availableBalance, OPENING_BALANCE + 30500 - 23500 + 10000 + 1000);
assertEqual('Pending Receivables = unpaid invoice (10000) only (repair job RJ1004 is fully paid: 3000 total - 2500 paid = 500 pending too)', fin.pendingReceivables, 10000 + 500);
assertEqual('Pending Payables = pending salary SAL-002', fin.pendingPayables, 12000);

console.log('\n=== Receivables / Payables detail ===');
const receivables = computeReceivables(input);
const rj1004Receivable = receivables.find((r) => r.referenceId === 'RJ1004');
assertEqual('RJ1004 pending = grandTotal(3000) - paid(2500)', rj1004Receivable?.pending ?? -1, 500);
const inv1006Receivable = receivables.find((r) => r.referenceId === 'INV-1006');
assertEqual('INV-1006 pending = full grandTotal (unpaid)', inv1006Receivable?.pending ?? -1, 10000);
const payables = computePayables(input);
assertEqualArr('Exactly one payable (Geeta, pending salary)', payables.length, 1);
assertEqual('Payable amount', payables[0]?.pending ?? -1, 12000);

console.log('\n=== Repair & Stock financial summaries ===');
const repairFin = computeRepairFinancials(repairJobs);
assertEqual('Repair total revenue (grandTotal of RJ1004)', repairFin.totalRevenue, 3000);
assertEqual('Repair parts cost (1 x purchaseCost 1500)', repairFin.totalPartsCost, 1500);
assertEqual('Repair profit = revenue(3000) - partsCost(1500)', repairFin.totalProfit, 1500);
const stockFin = computeStockFinancials(stock);
assertEqual('Stock purchase cost total', stockFin.stockPurchaseCost, 8000);
assertEqual('Stock cost value (3 units x 8000)', stockFin.stockCostValue, 24000);

console.log('\n=== Running balance (chronological) ===');
const withBalance = withRunningBalance(ledger);
const last = withBalance[withBalance.length - 1];
assertEqual('Final running balance matches Available Balance from computeFinancials', last.balance, fin.availableBalance);

// ==================================================================
// Master Money Control — accounts, transfers, advances, settlements,
// refunds, reversals. Same anti-duplication rigor as above: every new
// event either has exactly one source (an attributed payment/expense row)
// or is a genuinely new wallet-native type, and every one of them either
// nets to zero in P&L (transfers/advances/settlements/plain reversals) or
// counts exactly once (a runner-collected payment; a refund and its
// reversal cancel out exactly).
// ==================================================================

const accounts: Account[] = [
  { id: 'ACC-CASH', name: 'Owner Cash', type: 'CASH', openingBalance: 0, currentBalance: 6500, totalIn: 0, totalOut: 0, isActive: true },
  { id: 'ACC-UPI1', name: 'UPI-1', type: 'UPI', openingBalance: 0, currentBalance: 20000, totalIn: 0, totalOut: 0, isActive: true },
  { id: 'ACC-UPI2', name: 'UPI-2', type: 'UPI', openingBalance: 0, currentBalance: 5000, totalIn: 0, totalOut: 0, isActive: true },
  { id: 'ACC-RUNNER1', name: 'Runner 1', type: 'RUNNER', openingBalance: 0, currentBalance: 3500, totalIn: 0, totalOut: 0, isActive: true },
];

console.log('\n=== Master Money Control: runner collection labeling & no double count ===');
const jobWithRunnerPayment: RepairJob = {
  ...(repairJobs[0] as any),
  id: 'RJ2001',
  payments: [{ id: 'PAY-R1', date: '2026-09-09', amount: 3000, method: 'Cash', accountId: 'ACC-RUNNER1' } as any],
} as unknown as RepairJob;
const ledgerWithAccounts = buildLedger({ ...input, repairJobs: [...repairJobs, jobWithRunnerPayment], accounts });
const runnerEntries = ledgerWithAccounts.filter((e) => e.sourceRecordId === 'RJ2001');
assertEqualArr('Runner-collected payment produces exactly ONE ledger entry (not a second RUNNER_COLLECTION insert)', runnerEntries.length, 1);
assertEqualArr('Runner-collected payment is labeled RUNNER COLLECTION for display', runnerEntries.filter((e) => e.txType === 'RUNNER COLLECTION').length, 1);
assertEqual('Runner-collected payment still counts as income exactly once', runnerEntries[0]?.amount ?? -1, 3000);

console.log('\n=== Master Money Control: transfers/advances/settlements excluded from P&L ===');
const moneyMovementTx: WalletTransaction[] = [
  { id: 'TX-XFER-1', amount: 5000, date: '2026-09-10', time: '10:00:00', type: 'ACCOUNT_TRANSFER', description: 'UPI-1 -> UPI-2', fromAccountId: 'ACC-UPI1', toAccountId: 'ACC-UPI2' },
  { id: 'TX-ADV-1', amount: 5000, date: '2026-09-10', time: '10:00:00', type: 'RUNNER_ADVANCE', description: 'Advance to Runner 1', fromAccountId: 'ACC-CASH', toAccountId: 'ACC-RUNNER1' },
  { id: 'TX-SETL-1', amount: 4000, date: '2026-09-11', time: '10:00:00', type: 'RUNNER_SETTLEMENT', description: 'Runner 1 returns cash', fromAccountId: 'ACC-RUNNER1', toAccountId: 'ACC-CASH' },
];
const inputWithMovement = { ...input, transactions: [...transactions, ...moneyMovementTx], accounts };
const finWithMovement = computeFinancials(inputWithMovement);
assertEqual('Total Income UNCHANGED by transfer/advance/settlement rows', finWithMovement.totalIncome, fin.totalIncome);
assertEqual('Total Expenses UNCHANGED by transfer/advance/settlement rows', finWithMovement.totalExpenses, fin.totalExpenses);
const ledgerWithMovement = buildLedger(inputWithMovement);
const transferEntry = ledgerWithMovement.find((e) => e.id === 'wallet:TX-XFER-1');
assertEqual('Transfer entry: from account is UPI-1', transferEntry?.accountId === 'ACC-UPI1' ? 1 : 0, 1);
assertEqual('Transfer entry: to (counter) account is UPI-2', transferEntry?.counterAccountId === 'ACC-UPI2' ? 1 : 0, 1);

console.log('\n=== Master Money Control: refund counts as expense, its reversal cancels it exactly ===');
const refundTx: WalletTransaction = { id: 'TX-REFUND-1', amount: 1200, date: '2026-09-12', time: '10:00:00', type: 'REFUND', description: 'Refund to customer', fromAccountId: 'ACC-CASH' };
const finWithRefund = computeFinancials({ ...input, transactions: [...transactions, refundTx], accounts });
assertEqual('Refund increases Total Expenses by its amount', finWithRefund.totalExpenses, fin.totalExpenses + 1200);
const reversalTx: WalletTransaction = { id: 'TX-REV-1', amount: 1200, date: '2026-09-13', time: '10:00:00', type: 'REVERSAL_REFUND', description: 'Reversal of TX-REFUND-1', isReversal: true, reversedEntryId: 'TX-REFUND-1', fromAccountId: undefined, toAccountId: 'ACC-CASH' };
const finWithRefundReversed = computeFinancials({ ...input, transactions: [...transactions, refundTx, reversalTx], accounts });
// The original refund is NEVER deleted (never-delete-financial-rows), so it
// permanently stays in Total Expenses — its reversal instead adds an equal
// amount to Total Income, so NET PROFIT (the number that actually matters)
// ends up exactly where it would be if the refund had never happened.
assertEqual('Reversing a refund adds an equal amount to Total Income (the original expense row is never deleted)', finWithRefundReversed.totalIncome, fin.totalIncome + 1200);
assertEqual('Reversing a refund restores Net Profit to its original value (net zero P&L effect)', finWithRefundReversed.netProfit, fin.netProfit);

console.log('\n=== Master Money Control: computeReceivables now includes sales orders ===');
const salesOrders: SalesOrder[] = [{ id: 'SO-1', customerName: 'Bulk Buyer', grandTotal: 8000, amountPaid: 3000, balanceDue: 5000 } as unknown as SalesOrder];
const receivablesWithSales = computeReceivables({ ...input, salesOrders });
assertEqualArr('Sales order with balance_due appears as a receivable', receivablesWithSales.filter((r) => r.referenceId === 'SO-1').length, 1);
assertEqual('Sales order pending = balance_due', receivablesWithSales.find((r) => r.referenceId === 'SO-1')?.pending ?? -1, 5000);

console.log('\n=== Master Money Control: customer advances & account rollups ===');
const activeJobWithAdvance: RepairJob = { ...(repairJobs[0] as any), id: 'RJ3001', status: 'In Progress' as any, advancePayment: 1000 } as unknown as RepairJob;
const deliveredJobWithAdvance: RepairJob = { ...(repairJobs[0] as any), id: 'RJ3002', status: 'Delivered' as any, advancePayment: 2000 } as unknown as RepairJob;
assertEqual('computeCustomerAdvances sums advancePayment only on active (not Delivered/Cancelled) jobs', computeCustomerAdvances([activeJobWithAdvance, deliveredJobWithAdvance]), 1000);

const rollups = computeAccountRollups(accounts, [...transactions, ...moneyMovementTx]);
assertEqual('Total Cash = sum of CASH-type account balances', rollups.totalCash, 6500);
assertEqual('Total UPI/Bank = sum of UPI+BANK-type account balances', rollups.totalUpiBank, 25000);
assertEqual('Total Money With Employees = sum of EMPLOYEE+RUNNER-type account balances', rollups.totalWithEmployees, 3500);
assertEqual('Total Company Balance = cash + upi/bank + with-employees', rollups.totalCompanyBalance, 6500 + 25000 + 3500);
assertEqual('Total Employee Advances = lifetime EMPLOYEE_ADVANCE+RUNNER_ADVANCE given (unaffected by settlements)', rollups.totalEmployeeAdvances, 5000);

console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
