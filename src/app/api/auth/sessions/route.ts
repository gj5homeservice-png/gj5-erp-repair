import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import {
  listSessionsForIdentity,
  deleteOtherSessionsForIdentity,
  deleteAllSessionsForIdentity,
  deleteOneSessionForIdentity,
} from '@/lib/session';
import { verifyCurrentPassword } from '@/lib/self-account';

function currentTokenFrom(request: Request): string {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const currentToken = currentTokenFrom(request);
    const sessions = await listSessionsForIdentity(auth.email, auth.employeeId);
    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        // The token itself is never sent back in full — only enough to
        // identify the row for a targeted revoke, and a short suffix for
        // display purposes.
        id: s.token,
        deviceInfo: s.deviceInfo,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === currentToken,
      })),
    });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}

// DELETE body: { scope: 'one' | 'others' | 'all', sessionId?: string, currentPassword: string }
// 'others'/'all' require re-authentication (current password) since they can
// sign the user out of devices they aren't holding right now.
export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { scope, sessionId, currentPassword } = await request.json();
    const identity = { userEmail: auth.email, employeeId: auth.employeeId };
    const currentToken = currentTokenFrom(request);

    if (scope === 'one') {
      if (!sessionId) return NextResponse.json({ success: false, error: 'sessionId is required.' }, { status: 400 });
      // Logging out the current device from the list doesn't need
      // re-authentication — it's equivalent to the regular logout button.
      if (sessionId !== currentToken) {
        const ok = await verifyCurrentPassword(identity, currentPassword);
        if (!ok) return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
      }
      const removed = await deleteOneSessionForIdentity(auth.email, auth.employeeId, sessionId);
      return NextResponse.json({ success: removed });
    }

    if (scope === 'others') {
      const ok = await verifyCurrentPassword(identity, currentPassword);
      if (!ok) return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
      const count = await deleteOtherSessionsForIdentity(auth.email, auth.employeeId, currentToken);
      if (auth.employeeId) {
        const { logSelfServiceAudit } = await import('@/lib/erp/employees');
        await logSelfServiceAudit(auth.email, auth.employeeId, 'sessions_revoked', `Logged out ${count} other device(s)`).catch(() => {});
      }
      return NextResponse.json({ success: true, count });
    }

    if (scope === 'all') {
      const ok = await verifyCurrentPassword(identity, currentPassword);
      if (!ok) return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
      const count = await deleteAllSessionsForIdentity(auth.email, auth.employeeId);
      if (auth.employeeId) {
        const { logSelfServiceAudit } = await import('@/lib/erp/employees');
        await logSelfServiceAudit(auth.email, auth.employeeId, 'sessions_revoked', `Logged out all ${count} device(s), including this one`).catch(() => {});
      }
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ success: false, error: 'Invalid scope.' }, { status: 400 });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
