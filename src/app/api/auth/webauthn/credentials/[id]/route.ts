import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { removeCredential } from '@/lib/webauthn';
import { verifyCurrentPassword } from '@/lib/self-account';

// Removing a passkey is destructive (you could lock yourself out of
// biometric login), so it re-requires the current password — the same
// "prove it's really you" bar as changing the password itself.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  try {
    const { currentPassword } = await request.json().catch(() => ({}));
    const identity = { userEmail: auth.email, employeeId: auth.employeeId };
    const ok = await verifyCurrentPassword(identity, currentPassword);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const removed = await removeCredential(auth.email, auth.employeeId, decodeURIComponent(id));
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Passkey not found.' }, { status: 404 });
    }

    if (auth.employeeId) {
      const { logSelfServiceAudit } = await import('@/lib/erp/employees');
      await logSelfServiceAudit(auth.email, auth.employeeId, 'passkey_removed', 'Removed a registered passkey').catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
