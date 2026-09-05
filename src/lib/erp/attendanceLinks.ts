import crypto from 'crypto';
import { getPool } from '../db';

function linkRowToObject(row: any) {
  return {
    id: row.id,
    token: row.token,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    mobile: row.mobile,
    expiresAt: row.expires_at,
    used: !!row.used,
    createdAt: row.created_at,
  };
}

export async function generateAttendanceLink(email: string, employee: { employeeId: string; name: string; mobile: string }) {
  const pool = getPool();
  const id = `LINK-${Date.now()}`;
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 120000).toISOString();
  const createdAt = new Date().toISOString();
  await pool.execute(
    `INSERT INTO attendance_links (id, user_email, token, employee_id, employee_name, mobile, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
    [id, email, token, employee.employeeId, employee.name, employee.mobile, expiresAt, createdAt]
  );
  return { id, token, expiresAt };
}

// Public lookup — no session required. Callers authorize by possessing the
// token itself (unguessable random hex, 2-minute expiry), exactly like the
// original localStorage-based design intended, but now resolvable from any
// device since it's a real server-side lookup instead of the admin's own
// browser storage.
export async function findAttendanceLinkByToken(token: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM attendance_links WHERE token = ? LIMIT 1', [token]);
  const row = (rows as any[])[0];
  if (!row) return null;
  return { link: linkRowToObject(row), userEmail: row.user_email as string };
}

export async function markAttendanceLinkUsed(token: string) {
  const pool = getPool();
  await pool.execute('UPDATE attendance_links SET used = TRUE WHERE token = ?', [token]);
}

export async function listAttendanceLinks(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM attendance_links WHERE user_email = ?', [email]);
  return (rows as any[]).map(linkRowToObject);
}
