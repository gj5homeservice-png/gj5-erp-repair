import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';

const DEFAULT_STARTING_BALANCE = 50000;

// Accepts either a Pool or a PoolConnection — both expose the same
// .execute(sql, params) signature in mysql2/promise.
type Executor = { execute: (sql: string, params?: any[]) => Promise<any> };

// Seeds the tenant's wallet at the app's default starting balance the first
// time it's touched (INSERT IGNORE is a no-op if the row already exists), so
// a brand-new tenant's first transaction doesn't clobber that default.
export async function ensureWalletSeeded(executor: Executor, email: string) {
  await executor.execute('INSERT IGNORE INTO wallet_balance (user_email, balance) VALUES (?, ?)', [email, DEFAULT_STARTING_BALANCE]);
}

export async function applyWalletDelta(conn: PoolConnection, email: string, delta: number) {
  await ensureWalletSeeded(conn, email);
  await conn.execute('UPDATE wallet_balance SET balance = balance + ? WHERE user_email = ?', [delta, email]);
}

export async function getWalletBalance(email: string): Promise<number> {
  const pool = getPool();
  await ensureWalletSeeded(pool, email);
  const [rows] = await pool.execute<any[]>('SELECT balance FROM wallet_balance WHERE user_email = ?', [email]);
  return (rows as any[])[0]?.balance ?? DEFAULT_STARTING_BALANCE;
}

function txRowToObject(row: any) {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    time: row.time,
    type: row.type,
    description: row.description,
    metadata: row.metadata,
  };
}

export async function listWalletTransactions(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM wallet_transactions WHERE user_email = ? ORDER BY id DESC', [email]);
  return (rows as any[]).map(txRowToObject);
}

export async function addWalletTransaction(email: string, type: string, amount: number, description: string, metadata?: any) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = `TX-${type === 'TOPUP' ? 'TOP-' : type === 'MANUAL_CREDIT' || type === 'MANUAL_DEBIT' ? 'ADJ-' : ''}${Date.now()}`;
    const now = new Date();
    await conn.execute(
      `INSERT INTO wallet_transactions (id, user_email, amount, date, time, type, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, amount, now.toISOString().split('T')[0], now.toLocaleTimeString(), type, description, metadata ? JSON.stringify(metadata) : null]
    );
    const delta = (type === 'TOPUP' || type === 'MANUAL_CREDIT') ? amount : -Math.abs(amount);
    await applyWalletDelta(conn, email, delta);
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Matches use-erp-store.ts's deleteTransaction: reverses the balance effect
// for credit-type transactions (TOPUP, MANUAL_CREDIT, INVOICE_SALE) before
// removing the row.
const CREDIT_TYPES = new Set(['TOPUP', 'MANUAL_CREDIT', 'INVOICE_SALE']);

export async function deleteWalletTransaction(email: string, id: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<any[]>('SELECT * FROM wallet_transactions WHERE id = ? AND user_email = ?', [id, email]);
    const tx = (rows as any[])[0];
    if (!tx) {
      await conn.rollback();
      return false;
    }
    const reversalDelta = CREDIT_TYPES.has(tx.type) ? -tx.amount : tx.amount;
    await applyWalletDelta(conn, email, reversalDelta);
    await conn.execute('DELETE FROM wallet_transactions WHERE id = ? AND user_email = ?', [id, email]);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
