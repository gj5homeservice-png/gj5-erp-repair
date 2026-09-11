import crypto from 'crypto';
import { getPool } from './db';

// Mirrors src/lib/session.ts's shape and reasoning exactly, but against the
// separate `customer_sessions` table — see sql/migrations/008_customer_accounts.sql
// for why a customer identity is never allowed to live in the same table as
// an owner/employee one.

const TTL_DAYS = process.env.SESSION_TOKEN_TTL_DAYS ? parseInt(process.env.SESSION_TOKEN_TTL_DAYS, 10) : 30;

export interface CustomerSessionIdentity {
  customerId: string;
  userEmail: string;
}

export async function createCustomerSession(customerId: string, userEmail: string, deviceInfo?: string): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const pool = getPool();
  await pool.execute(
    'INSERT INTO customer_sessions (token, customer_id, user_email, created_at, expires_at, device_info) VALUES (?, ?, ?, ?, ?, ?)',
    [token, customerId, userEmail, now.toISOString(), expiresAt.toISOString(), deviceInfo ?? null]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function validateCustomerSession(token: string): Promise<CustomerSessionIdentity | null> {
  if (!token) return null;
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT customer_id, user_email, expires_at FROM customer_sessions WHERE token = ? LIMIT 1',
    [token]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.execute('DELETE FROM customer_sessions WHERE token = ?', [token]);
    return null;
  }
  return { customerId: row.customer_id, userEmail: row.user_email };
}

export async function deleteCustomerSession(token: string): Promise<void> {
  if (!token) return;
  const pool = getPool();
  await pool.execute('DELETE FROM customer_sessions WHERE token = ?', [token]);
}
