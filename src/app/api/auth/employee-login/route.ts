import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';

// Called by login/page.tsx as a fallback AFTER the existing owner-login check
// (hardcoded demo admin / gj5_demo_users) fails — so this never changes or
// weakens that existing path, it only adds a second possibility. Looks up
// credentials by username OR login_email (an employee may not remember which
// one they were given), verifies the bcrypt hash server-side, and mints a
// session carrying both the resolved tenant scope (the employer's
// user_email — never trusted from the client) and the employee's own id.
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required.' }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      `SELECT c.employee_id, c.user_email, c.password_hash, c.login_enabled, c.force_password_change, e.status
       FROM employee_credentials c
       INNER JOIN employees e ON c.employee_id = e.id
       WHERE c.username = ? OR c.login_email = ? LIMIT 1`,
      [username, username]
    );
    const row = (rows as any[])[0];

    // Same generic failure message whether the username doesn't exist or the
    // password is wrong — never reveal which one was incorrect.
    const invalid = () => NextResponse.json({ success: false, error: 'Invalid username or password.' }, { status: 401 });

    if (!row) return invalid();
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return invalid();

    if (!row.login_enabled) {
      return NextResponse.json({ success: false, error: 'Login access has been disabled for this account. Contact your administrator.' }, { status: 403 });
    }
    if (row.status !== 'Active') {
      return NextResponse.json({ success: false, error: `This account is ${String(row.status).toLowerCase()}. Contact your administrator.` }, { status: 403 });
    }

    const deviceInfo = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const { token, expiresAt } = await createSession(row.user_email, deviceInfo, row.employee_id);

    await pool.execute(
      'UPDATE employee_credentials SET last_login_at = ?, last_login_device = ?, last_login_ip = ? WHERE employee_id = ?',
      [new Date().toISOString(), deviceInfo ?? null, ip, row.employee_id]
    );
    const { logLoginAudit } = await import('@/lib/erp/employees');
    await logLoginAudit(row.user_email, row.employee_id, row.employee_id, 'login', ip, deviceInfo ?? null);

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      employeeId: row.employee_id,
      forcePasswordChange: !!row.force_password_change,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
