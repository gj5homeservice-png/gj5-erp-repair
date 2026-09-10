import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getPasswordStrengthError } from '@/lib/password';
import { verifyCurrentPassword, changeOwnPassword } from '@/lib/self-account';
import { deleteOtherSessionsForIdentity } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current password and new password are required.' }, { status: 400 });
    }

    const identity = { userEmail: auth.email, employeeId: auth.employeeId };
    const ok = await verifyCurrentPassword(identity, currentPassword);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const strengthError = getPasswordStrengthError(newPassword);
    if (strengthError) {
      return NextResponse.json({ success: false, error: strengthError }, { status: 400 });
    }

    await changeOwnPassword(identity, newPassword);

    // Changing your password is a security-sensitive event — sign out every
    // other device/browser so a stolen or shared session can't linger. The
    // request making this change keeps working (its own token is untouched).
    const authHeader = request.headers.get('authorization') || '';
    const currentToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    await deleteOtherSessionsForIdentity(auth.email, auth.employeeId, currentToken);

    if (auth.employeeId) {
      const { logSelfServiceAudit } = await import('@/lib/erp/employees');
      await logSelfServiceAudit(auth.email, auth.employeeId, 'password_changed', 'Password changed by user — other sessions signed out').catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
