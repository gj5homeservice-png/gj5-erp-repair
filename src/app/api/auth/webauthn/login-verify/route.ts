import { NextResponse } from 'next/server';
import { finishAuthentication } from '@/lib/webauthn';
import { createSession } from '@/lib/session';
import { getPool } from '@/lib/db';

// Public — completes the usernameless passkey login. Identity is resolved
// entirely server-side from which credential the browser used; nothing
// about "who this is" is ever trusted from the client.
export async function POST(request: Request) {
  try {
    const { challengeId, response } = await request.json();
    if (!challengeId || !response) {
      return NextResponse.json({ success: false, error: 'Missing challengeId or response.' }, { status: 400 });
    }

    const result = await finishAuthentication(request, challengeId, response);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    const { userEmail, employeeId } = result.identity;

    // Mirror the same activity/status safeguards the password login path
    // already enforces for employees.
    if (employeeId) {
      const pool = getPool();
      const [rows] = await pool.execute<any[]>('SELECT status FROM employees WHERE id = ? AND user_email = ?', [employeeId, userEmail]);
      const status = (rows as any[])[0]?.status;
      if (!status || status !== 'Active') {
        return NextResponse.json({ success: false, error: 'This account is not active. Contact your administrator.' }, { status: 403 });
      }
    }

    const deviceInfo = request.headers.get('user-agent') || undefined;
    const { token, expiresAt } = await createSession(userEmail, deviceInfo, employeeId);

    if (employeeId) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const { logLoginAudit } = await import('@/lib/erp/employees');
      await logLoginAudit(userEmail, employeeId, employeeId, 'login', ip, deviceInfo ?? null).catch(() => {});
    }

    return NextResponse.json({ success: true, token, expiresAt, email: userEmail, employeeId });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
