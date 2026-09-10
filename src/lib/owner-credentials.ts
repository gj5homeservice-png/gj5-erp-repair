import { getPool } from './db';
import { verifyPassword, hashPassword } from './password';

// Mirrors employee_credentials' username/login_email split: `user_email` is
// the immutable tenant-scope value used everywhere else in the schema and
// never changes; `login_email` is the actual sign-in address, defaulting to
// the same value and only ever changed via the verified Settings > Login &
// Security > Change Email flow.

export interface OwnerCredentialRow {
  userEmail: string;
  loginEmail: string;
  passwordHash: string;
}

export async function findOwnerByLoginIdentifier(identifier: string): Promise<OwnerCredentialRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT user_email, login_email, password_hash FROM owner_credentials WHERE user_email = ? OR login_email = ? LIMIT 1',
    [identifier, identifier]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return { userEmail: row.user_email, loginEmail: row.login_email || row.user_email, passwordHash: row.password_hash };
}

export async function getOwnerCredential(userEmail: string): Promise<OwnerCredentialRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT user_email, login_email, password_hash FROM owner_credentials WHERE user_email = ? LIMIT 1',
    [userEmail]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return { userEmail: row.user_email, loginEmail: row.login_email || row.user_email, passwordHash: row.password_hash };
}

export async function verifyOwnerPassword(userEmail: string, plainText: string): Promise<boolean> {
  const cred = await getOwnerCredential(userEmail);
  if (!cred) return false;
  return verifyPassword(plainText, cred.passwordHash);
}

export async function updateOwnerPassword(userEmail: string, newPlainText: string): Promise<void> {
  const pool = getPool();
  const hash = await hashPassword(newPlainText);
  await pool.execute('UPDATE owner_credentials SET password_hash = ?, updated_at = ? WHERE user_email = ?', [
    hash,
    new Date().toISOString(),
    userEmail,
  ]);
}

export async function updateOwnerLoginEmail(userEmail: string, newLoginEmail: string): Promise<void> {
  const pool = getPool();
  await pool.execute('UPDATE owner_credentials SET login_email = ?, updated_at = ? WHERE user_email = ?', [
    newLoginEmail,
    new Date().toISOString(),
    userEmail,
  ]);
}
