import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { applyWalletDelta } from './wallet';

export type AccountType = 'CASH' | 'UPI' | 'BANK' | 'EMPLOYEE' | 'RUNNER';

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  linkedEmployeeId: string | null;
  openingBalance: number;
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  isActive: boolean;
  createdAt: string | null;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

// The single choke point every account balance change goes through —
// mirrors applyWalletDelta in wallet.ts exactly, so an account's
// current_balance is maintained the same proven way the app's original
// single wallet_balance always has been.
export async function applyAccountDelta(conn: PoolConnection, email: string, accountId: string, delta: number): Promise<void> {
  await conn.execute(
    'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_email = ?',
    [delta, accountId, email]
  );
}

function accountRowToObject(row: any, totalIn: number, totalOut: number): AccountWithBalance {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    linkedEmployeeId: row.linked_employee_id,
    openingBalance: Number(row.opening_balance) || 0,
    currentBalance: Number(row.current_balance) || 0,
    totalIn,
    totalOut,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
}

// total_in/total_out are display-only aggregates, computed live from the
// three tables that can move money into/out of an account — never stored,
// so they can never drift from the ledger they're summarizing. current_balance
// (the number every other calculation trusts) is read straight from the
// accounts row, maintained exclusively by applyAccountDelta above.
export async function listAccountsWithBalances(email: string): Promise<AccountWithBalance[]> {
  const pool = getPool();
  const [accountRows] = await pool.execute<any[]>(
    'SELECT * FROM accounts WHERE user_email = ? ORDER BY created_at ASC',
    [email]
  );
  const accounts = accountRows as any[];
  if (accounts.length === 0) return [];

  const [paymentIn] = await pool.execute<any[]>(
    `SELECT account_id, SUM(amount) AS total FROM repair_job_payments
     WHERE account_id IS NOT NULL AND repair_job_id IN (SELECT id FROM repair_jobs WHERE user_email = ?)
     GROUP BY account_id`,
    [email]
  );
  const [expenseOut] = await pool.execute<any[]>(
    'SELECT account_id, SUM(amount) AS total FROM expenses WHERE user_email = ? AND account_id IS NOT NULL GROUP BY account_id',
    [email]
  );
  const [txIn] = await pool.execute<any[]>(
    'SELECT to_account_id AS account_id, SUM(amount) AS total FROM wallet_transactions WHERE user_email = ? AND to_account_id IS NOT NULL GROUP BY to_account_id',
    [email]
  );
  const [txOut] = await pool.execute<any[]>(
    'SELECT from_account_id AS account_id, SUM(amount) AS total FROM wallet_transactions WHERE user_email = ? AND from_account_id IS NOT NULL GROUP BY from_account_id',
    [email]
  );

  const inMap = new Map<string, number>();
  const outMap = new Map<string, number>();
  const add = (map: Map<string, number>, rows: any[]) => {
    for (const r of rows) map.set(r.account_id, (map.get(r.account_id) || 0) + (Number(r.total) || 0));
  };
  add(inMap, paymentIn as any[]);
  add(inMap, txIn as any[]);
  add(outMap, expenseOut as any[]);
  add(outMap, txOut as any[]);

  return accounts.map(row => accountRowToObject(row, inMap.get(row.id) || 0, outMap.get(row.id) || 0));
}

export async function createAccount(
  email: string,
  data: { name: string; type: AccountType; linkedEmployeeId?: string; openingBalance?: number }
): Promise<AccountWithBalance> {
  if (!data?.name || !data.name.trim()) throw new Error('Account name is required.');
  const validTypes: AccountType[] = ['CASH', 'UPI', 'BANK', 'EMPLOYEE', 'RUNNER'];
  if (!validTypes.includes(data.type)) throw new Error('Invalid account type.');

  const pool = getPool();
  if (data.linkedEmployeeId) {
    const [rows] = await pool.execute<any[]>('SELECT id FROM employees WHERE id = ? AND user_email = ?', [data.linkedEmployeeId, email]);
    if (!(rows as any[])[0]) throw new Error('Linked employee not found.');
  }

  const id = `ACC-${Date.now()}-${randomSuffix()}`;
  const opening = Number(data.openingBalance) || 0;
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO accounts (id, user_email, name, type, linked_employee_id, opening_balance, current_balance, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
    [id, email, data.name.trim(), data.type, data.linkedEmployeeId || null, opening, opening, now]
  );
  return { id, name: data.name.trim(), type: data.type, linkedEmployeeId: data.linkedEmployeeId || null, openingBalance: opening, currentBalance: opening, totalIn: 0, totalOut: 0, isActive: true, createdAt: now };
}

// type and openingBalance are deliberately NOT patchable here — changing
// either after any transaction exists would silently corrupt what
// current_balance means. Only the display name and active/inactive can change.
export async function updateAccount(email: string, id: string, data: { name?: string; isActive?: boolean }): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name.trim()); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(!!data.isActive); }
  if (fields.length === 0) return false;
  const pool = getPool();
  const [result]: any = await pool.execute(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ? AND user_email = ?`, [...values, id, email]);
  return result.affectedRows > 0;
}

async function getAccountForUpdate(conn: PoolConnection, email: string, id: string): Promise<any> {
  const [rows] = await conn.execute<any[]>('SELECT * FROM accounts WHERE id = ? AND user_email = ? FOR UPDATE', [id, email]);
  return (rows as any[])[0] || null;
}

export interface RecordLedgerEntryInput {
  type: string;
  amount: number;
  description: string;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  customerId?: string | null;
  employeeId?: string | null;
  jobId?: string | null;
  paymentMethod?: string | null;
  createdBy?: string | null;
  metadata?: any;
  isReversal?: boolean;
  reversedEntryId?: string | null;
}

// The one place that inserts a Master Ledger row and moves money between
// accounts. Does not itself decide "is this income/expense" — that
// classification lives entirely in wallet-engine.ts. Caller must already be
// inside a transaction (conn) so the insert and both balance updates commit
// or roll back together.
export async function recordLedgerEntry(conn: PoolConnection, email: string, input: RecordLedgerEntryInput): Promise<string> {
  const prefix = input.type.slice(0, 3).toUpperCase();
  const id = `TX-${prefix}-${Date.now()}-${randomSuffix()}`;
  const now = new Date();
  await conn.execute(
    `INSERT INTO wallet_transactions
       (id, user_email, amount, date, time, type, description, from_account_id, to_account_id, customer_id, employee_id, job_id, payment_method, created_by, is_reversal, reversed_entry_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, email, input.amount, now.toISOString().split('T')[0], now.toLocaleTimeString(), input.type, input.description,
      input.fromAccountId || null, input.toAccountId || null, input.customerId || null, input.employeeId || null, input.jobId || null,
      input.paymentMethod || null, input.createdBy || null, !!input.isReversal, input.reversedEntryId || null,
    ]
  );
  if (input.fromAccountId) await applyAccountDelta(conn, email, input.fromAccountId, -Math.abs(input.amount));
  if (input.toAccountId) await applyAccountDelta(conn, email, input.toAccountId, Math.abs(input.amount));
  return id;
}

async function validateActiveAccount(conn: PoolConnection, email: string, id: string, label: string) {
  const acc = await getAccountForUpdate(conn, email, id);
  if (!acc) throw new Error(`${label} account not found.`);
  if (!acc.is_active) throw new Error(`${label} account is inactive.`);
  return acc;
}

export async function transferBetweenAccounts(email: string, fromAccountId: string, toAccountId: string, amount: number, note: string, createdBy?: string): Promise<string> {
  if (fromAccountId === toAccountId) throw new Error('Cannot transfer an account to itself.');
  if (!(amount > 0)) throw new Error('Transfer amount must be greater than zero.');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const from = await validateActiveAccount(conn, email, fromAccountId, 'Source');
    const to = await validateActiveAccount(conn, email, toAccountId, 'Destination');
    const id = await recordLedgerEntry(conn, email, {
      type: 'ACCOUNT_TRANSFER', amount, fromAccountId, toAccountId, createdBy,
      description: note || `Transfer: ${from.name} -> ${to.name}`,
    });
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Money given to staff to hold (float/advance). Type is derived from the
// destination account's own type — an EMPLOYEE-type account gets
// EMPLOYEE_ADVANCE, a RUNNER-type account gets RUNNER_ADVANCE.
export async function giveAdvance(email: string, params: { fromAccountId: string; toAccountId: string; amount: number; note: string; employeeId?: string; createdBy?: string }): Promise<string> {
  if (!(params.amount > 0)) throw new Error('Advance amount must be greater than zero.');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const from = await validateActiveAccount(conn, email, params.fromAccountId, 'Source');
    const to = await validateActiveAccount(conn, email, params.toAccountId, 'Destination');
    if (to.type !== 'EMPLOYEE' && to.type !== 'RUNNER') throw new Error('Advances can only be given to an Employee or Runner account.');
    const type = to.type === 'RUNNER' ? 'RUNNER_ADVANCE' : 'EMPLOYEE_ADVANCE';
    const id = await recordLedgerEntry(conn, email, {
      type, amount: params.amount, fromAccountId: params.fromAccountId, toAccountId: params.toAccountId,
      employeeId: params.employeeId || to.linked_employee_id || null, createdBy: params.createdBy,
      description: params.note || `Advance: ${from.name} -> ${to.name}`,
    });
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Money an employee/runner returns to the company (e.g. after collecting a
// customer payment on delivery, or unspent float). Balance-neutral, never
// counted as income — the underlying revenue was already counted once, at
// the moment the customer paid.
export async function recordSettlement(email: string, params: { fromAccountId: string; toAccountId: string; amount: number; note: string; employeeId?: string; createdBy?: string }): Promise<string> {
  if (!(params.amount > 0)) throw new Error('Settlement amount must be greater than zero.');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const from = await validateActiveAccount(conn, email, params.fromAccountId, 'Source');
    if (from.type !== 'EMPLOYEE' && from.type !== 'RUNNER') throw new Error('Settlements can only be made from an Employee or Runner account.');
    const to = await validateActiveAccount(conn, email, params.toAccountId, 'Destination');
    const id = await recordLedgerEntry(conn, email, {
      type: 'RUNNER_SETTLEMENT', amount: params.amount, fromAccountId: params.fromAccountId, toAccountId: params.toAccountId,
      employeeId: params.employeeId || from.linked_employee_id || null, createdBy: params.createdBy,
      description: params.note || `Settlement: ${from.name} -> ${to.name}`,
    });
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// A refund paid back to a customer — a real business expense (reduces
// profit), unlike a transfer/advance/settlement.
export async function recordRefund(email: string, params: { fromAccountId: string; amount: number; customerId?: string; jobId?: string; note: string; createdBy?: string }): Promise<string> {
  if (!(params.amount > 0)) throw new Error('Refund amount must be greater than zero.');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const from = await validateActiveAccount(conn, email, params.fromAccountId, 'Source');
    const id = await recordLedgerEntry(conn, email, {
      type: 'REFUND', amount: params.amount, fromAccountId: params.fromAccountId,
      customerId: params.customerId || null, jobId: params.jobId || null, createdBy: params.createdBy,
      description: params.note || `Refund from ${from.name}`,
    });
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// The old wallet-balance-native types that DELETE /api/erp/wallet/transactions/[id]
// used to physically delete and reverse via applyWalletDelta — a reversal of
// one of these must also reverse that same legacy leg, since it's still
// live/read elsewhere. The newer account-only types below never touched
// wallet_balance, so reversing them must not touch it either.
const LEGACY_WALLET_BALANCE_TYPES = new Set(['TOPUP', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'INVOICE_SALE', 'REPAIR_JOB_PAYMENT', 'EXPENSE']);
const LEGACY_CREDIT_TYPES = new Set(['TOPUP', 'MANUAL_CREDIT', 'INVOICE_SALE']);

// Replaces physically deleting a wallet_transactions row. Inserts an
// equal-and-opposite entry (from/to swapped, tagged is_reversal +
// reversed_entry_id) and reverses whichever account balance(s) — and, for
// the older wallet-balance-native types, the legacy wallet_balance leg too
// — the original touched. The original row is never deleted, so the full
// history (including that it was reversed) stays visible forever.
export async function reverseLedgerEntry(email: string, entryId: string, createdBy?: string): Promise<string> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<any[]>('SELECT * FROM wallet_transactions WHERE id = ? AND user_email = ? FOR UPDATE', [entryId, email]);
    const tx = (rows as any[])[0];
    if (!tx) throw new Error('Transaction not found.');
    if (tx.is_reversal) throw new Error('This entry is itself a reversal and cannot be reversed again.');

    const reversalId = await recordLedgerEntry(conn, email, {
      type: `REVERSAL_${tx.type}`,
      amount: tx.amount,
      // Swapped: whatever the original credited, the reversal debits, and vice versa.
      fromAccountId: tx.to_account_id || null,
      toAccountId: tx.from_account_id || null,
      customerId: tx.customer_id, employeeId: tx.employee_id, jobId: tx.job_id,
      createdBy,
      isReversal: true,
      reversedEntryId: tx.id,
      description: `Reversal of ${tx.id}: ${tx.description || ''}`.trim(),
    });

    if (LEGACY_WALLET_BALANCE_TYPES.has(tx.type)) {
      const reversalDelta = LEGACY_CREDIT_TYPES.has(tx.type) ? -Number(tx.amount) : Number(tx.amount);
      await applyWalletDelta(conn, email, reversalDelta);
    }

    await conn.commit();
    return reversalId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
