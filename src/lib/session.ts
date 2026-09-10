import crypto from 'crypto';
import { getPool } from './db';

const TTL_DAYS = process.env.SESSION_TOKEN_TTL_DAYS ? parseInt(process.env.SESSION_TOKEN_TTL_DAYS, 10) : 30;

export interface SessionIdentity {
  email: string;      // tenant scope (the employer account) — same value used
                       // to scope every row in every ERP table, whether the
                       // owner or one of their employees is logged in.
  employeeId: string | null; // null = owner/admin session (unchanged, always
                              // full access). Set = an employee session.
}

// `employeeId` is optional and only set for an employee self-login (see
// src/app/api/auth/employee-login/route.ts) — the existing owner login path
// (src/app/api/auth/session/route.ts) never passes it, so that flow is
// completely unchanged.
export async function createSession(userEmail: string, deviceInfo?: string, employeeId?: string | null): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const pool = getPool();
  // Store explicit UTC ISO strings, not raw Date objects. A bound Date object
  // gets serialized to a MySQL DATETIME literal using the driver's "local"
  // timezone by default (no `timezone` option is set on the pool), then read
  // back later as a bare, timezone-less string (dateStrings: true) and
  // re-parsed with `new Date()` — which only round-trips correctly if the
  // write and read both happen under the same assumed local timezone. On
  // shared hosting that's an unverifiable assumption, not a guarantee, and a
  // mismatch here makes sessions look expired/invalid unpredictably. An ISO
  // string with a trailing "Z" removes the ambiguity entirely in both
  // directions — this is the same reasoning already applied to every other
  // date/time column in this schema (see sql/schema.sql's comments), just
  // missed for this table originally.
  await pool.execute(
    'INSERT INTO sessions (token, user_email, employee_id, created_at, expires_at, device_info) VALUES (?, ?, ?, ?, ?, ?)',
    [token, userEmail, employeeId ?? null, now.toISOString(), expiresAt.toISOString(), deviceInfo ?? null]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function validateSession(token: string): Promise<SessionIdentity | null> {
  if (!token) return null;
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT user_email, employee_id, expires_at FROM sessions WHERE token = ? LIMIT 1',
    [token]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }
  return { email: row.user_email as string, employeeId: (row.employee_id as string) || null };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const pool = getPool();
  await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
}

// Used by "Revoke All Sessions" (Login & Security controls) — signs an
// employee out of every device at once.
export async function deleteAllSessionsForEmployee(employeeId: string): Promise<void> {
  if (!employeeId) return;
  const pool = getPool();
  await pool.execute('DELETE FROM sessions WHERE employee_id = ?', [employeeId]);
}

export interface SessionSummary {
  token: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
}

// The three self-service "Devices & Sessions" operations in Login &
// Security — all scoped to exactly one identity (owner: employeeId IS NULL;
// an employee: their own employeeId), never able to touch another
// identity's sessions.
export async function listSessionsForIdentity(userEmail: string, employeeId: string | null): Promise<SessionSummary[]> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT token, device_info, created_at, expires_at FROM sessions WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL)) ORDER BY created_at DESC',
    [userEmail, employeeId, employeeId]
  );
  return (rows as any[]).map((r) => ({ token: r.token, deviceInfo: r.device_info, createdAt: r.created_at, expiresAt: r.expires_at }));
}

export async function deleteOtherSessionsForIdentity(userEmail: string, employeeId: string | null, keepToken: string): Promise<number> {
  const pool = getPool();
  const [result]: any = await pool.execute(
    'DELETE FROM sessions WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL)) AND token != ?',
    [userEmail, employeeId, employeeId, keepToken]
  );
  return result.affectedRows || 0;
}

export async function deleteAllSessionsForIdentity(userEmail: string, employeeId: string | null): Promise<number> {
  const pool = getPool();
  const [result]: any = await pool.execute(
    'DELETE FROM sessions WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL))',
    [userEmail, employeeId, employeeId]
  );
  return result.affectedRows || 0;
}

export async function deleteOneSessionForIdentity(userEmail: string, employeeId: string | null, token: string): Promise<boolean> {
  const pool = getPool();
  const [result]: any = await pool.execute(
    'DELETE FROM sessions WHERE token = ? AND user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL))',
    [token, userEmail, employeeId, employeeId]
  );
  return (result.affectedRows || 0) > 0;
}
