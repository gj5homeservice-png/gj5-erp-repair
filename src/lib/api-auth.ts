import { NextResponse } from 'next/server';
import { validateSession } from './session';

// Every /api/erp/* route (other than the public attendance-link endpoints,
// which are authorized by the link token itself instead) calls this first.
// Never trusts a client-supplied email — always resolves identity from a
// server-verified session token.
//
// Deliberately distinguishes three failure modes that used to look identical
// from the outside (all just "Unauthorized"): no token sent, a token that
// doesn't match any live session, and the database call itself failing. A
// thrown DB-layer error used to escape uncaught here (no try/catch existed),
// which is exactly the kind of failure that can surface as a generic/
// mismatched status code instead of a clear message — this closes that gap.
export async function requireUser(request: Request): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    console.warn('[api-auth] Rejected request: no Authorization header present.');
    return NextResponse.json({ success: false, error: 'No session token was sent with this request.' }, { status: 401 });
  }

  let email: string | null;
  try {
    email = await validateSession(token);
  } catch (err: any) {
    console.error('[api-auth] validateSession threw (likely a database connectivity/config issue):', err?.message || err);
    return NextResponse.json({ success: false, error: `Session check failed: ${err?.message || 'database error'}` }, { status: 503 });
  }

  if (!email) {
    console.warn('[api-auth] Rejected token (not found in sessions table, or expired):', token.slice(0, 8) + '…');
    return NextResponse.json({ success: false, error: 'Your session is invalid or has expired. Please log in again.' }, { status: 401 });
  }

  return { email };
}

export function isAuthError(result: { email: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
