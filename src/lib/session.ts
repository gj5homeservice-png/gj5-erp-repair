import crypto from 'crypto';
import { getPool } from './db';

const TTL_DAYS = process.env.SESSION_TOKEN_TTL_DAYS ? parseInt(process.env.SESSION_TOKEN_TTL_DAYS, 10) : 30;

export async function createSession(userEmail: string, deviceInfo?: string): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const pool = getPool();
  await pool.execute(
    'INSERT INTO sessions (token, user_email, created_at, expires_at, device_info) VALUES (?, ?, ?, ?, ?)',
    [token, userEmail, now, expiresAt, deviceInfo ?? null]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function validateSession(token: string): Promise<string | null> {
  if (!token) return null;
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT user_email, expires_at FROM sessions WHERE token = ? LIMIT 1',
    [token]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }
  return row.user_email as string;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const pool = getPool();
  await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
}
