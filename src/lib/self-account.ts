import crypto from 'crypto';
import { getPool } from './db';
import { verifyPassword, hashPassword } from './password';
import {
  getOwnerCredential,
  verifyOwnerPassword,
  updateOwnerPassword,
  updateOwnerLoginEmail,
} from './owner-credentials';
import {
  getEmployeeCredentialHash,
  getEmployeeLoginEmail,
  selfChangeEmployeePassword,
  updateEmployeeLoginEmail,
} from './erp/employees';

// A single, identity-agnostic surface the new self-service API routes call
// against — every function takes the exact (userEmail, employeeId) pair
// resolved by requireUser() and internally routes to either the owner or
// the employee credential tables. Nothing here ever trusts a client-supplied
// identity.

export interface SelfIdentity {
  userEmail: string;
  employeeId: string | null;
}

export async function getCurrentLoginEmail({ userEmail, employeeId }: SelfIdentity): Promise<string> {
  if (!employeeId) {
    const cred = await getOwnerCredential(userEmail);
    return cred?.loginEmail || userEmail;
  }
  const email = await getEmployeeLoginEmail(userEmail, employeeId);
  return email || userEmail;
}

export async function verifyCurrentPassword({ userEmail, employeeId }: SelfIdentity, password: string): Promise<boolean> {
  if (!password) return false;
  if (!employeeId) return verifyOwnerPassword(userEmail, password);
  const hash = await getEmployeeCredentialHash(employeeId);
  if (!hash) return false;
  return verifyPassword(password, hash);
}

export async function changeOwnPassword(identity: SelfIdentity, newPassword: string): Promise<void> {
  if (!identity.employeeId) {
    await updateOwnerPassword(identity.userEmail, newPassword);
    return;
  }
  await selfChangeEmployeePassword(identity.userEmail, identity.employeeId, newPassword);
}

// Global uniqueness check — login lookups (both owner and employee) resolve
// by email/username across the whole database, not per-tenant, so a new
// email must not collide with any existing login identity anywhere.
export async function isLoginEmailAvailable(email: string, excludeSelf: SelfIdentity): Promise<boolean> {
  const pool = getPool();
  const [ownerRows] = await pool.execute<any[]>(
    'SELECT user_email FROM owner_credentials WHERE (user_email = ? OR login_email = ?) AND user_email != ?',
    [email, email, excludeSelf.employeeId ? '__none__' : excludeSelf.userEmail]
  );
  if ((ownerRows as any[]).length > 0) return false;

  const [empRows] = await pool.execute<any[]>(
    'SELECT employee_id FROM employee_credentials WHERE (login_email = ? OR username = ?) AND employee_id != ?',
    [email, email, excludeSelf.employeeId || '__none__']
  );
  if ((empRows as any[]).length > 0) return false;

  const [empProfileRows] = await pool.execute<any[]>('SELECT id FROM employees WHERE email = ? AND id != ?', [
    email,
    excludeSelf.employeeId || '__none__',
  ]);
  if ((empProfileRows as any[]).length > 0) return false;

  return true;
}

export async function applyNewLoginEmail(identity: SelfIdentity, newEmail: string): Promise<void> {
  if (!identity.employeeId) {
    await updateOwnerLoginEmail(identity.userEmail, newEmail);
    return;
  }
  await updateEmployeeLoginEmail(identity.userEmail, identity.employeeId, newEmail);
}

// ---- Email change verification tokens ----

const EMAIL_CHANGE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function createEmailChangeRequest(identity: SelfIdentity, newEmail: string): Promise<{ token: string; expiresAt: string }> {
  const pool = getPool();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_CHANGE_TTL_MS);
  // Invalidate any earlier pending request for this identity first — only
  // the most recent one should ever be usable.
  await pool.execute('DELETE FROM email_change_requests WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL)) AND used = FALSE', [
    identity.userEmail,
    identity.employeeId,
    identity.employeeId,
  ]);
  await pool.execute(
    'INSERT INTO email_change_requests (token, user_email, employee_id, new_email, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
    [token, identity.userEmail, identity.employeeId, newEmail, now.toISOString(), expiresAt.toISOString()]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function confirmEmailChangeRequest(token: string): Promise<{ success: true; newEmail: string } | { success: false; error: string }> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT user_email, employee_id, new_email, expires_at, used FROM email_change_requests WHERE token = ? LIMIT 1',
    [token]
  );
  const row = (rows as any[])[0];
  if (!row) return { success: false, error: 'This verification link is invalid.' };
  if (row.used) return { success: false, error: 'This verification link has already been used.' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { success: false, error: 'This verification link has expired. Please request the change again.' };

  const identity: SelfIdentity = { userEmail: row.user_email, employeeId: row.employee_id };
  const stillAvailable = await isLoginEmailAvailable(row.new_email, identity);
  if (!stillAvailable) return { success: false, error: 'That email address is no longer available.' };

  await applyNewLoginEmail(identity, row.new_email);
  await pool.execute('UPDATE email_change_requests SET used = TRUE WHERE token = ?', [token]);
  return { success: true, newEmail: row.new_email };
}
