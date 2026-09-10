import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { finishRegistration } from '@/lib/webauthn';

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { challengeId, response, deviceName } = await request.json();
    if (!challengeId || !response) {
      return NextResponse.json({ success: false, error: 'Missing challengeId or response.' }, { status: 400 });
    }
    const trimmedName = typeof deviceName === 'string' ? deviceName.trim().slice(0, 100) : '';

    const result = await finishRegistration(
      request,
      challengeId,
      response,
      { userEmail: auth.email, employeeId: auth.employeeId },
      trimmedName || 'Unnamed device'
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    if (auth.employeeId) {
      const { logSelfServiceAudit } = await import('@/lib/erp/employees');
      await logSelfServiceAudit(auth.email, auth.employeeId, 'passkey_registered', `Registered passkey "${trimmedName || 'Unnamed device'}"`).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
