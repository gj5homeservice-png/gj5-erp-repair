import { NextResponse } from 'next/server';
import { validateSession } from './session';
import { ModuleActionPermissions } from './types';

export interface AuthedRequest {
  email: string;         // tenant scope — always present
  employeeId: string | null; // null = owner/admin session (always full access)
}

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
export async function requireUser(request: Request): Promise<AuthedRequest | NextResponse> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    console.warn('[api-auth] Rejected request: no Authorization header present.');
    return NextResponse.json({ success: false, error: 'No session token was sent with this request.' }, { status: 401 });
  }

  let identity: { email: string; employeeId: string | null } | null;
  try {
    identity = await validateSession(token);
  } catch (err: any) {
    // err.code (e.g. ECONNREFUSED, ENOTFOUND, ETIMEDOUT, ER_ACCESS_DENIED_ERROR,
    // ER_BAD_DB_ERROR) pinpoints exactly what's misconfigured — wrong host,
    // wrong port, wrong user/password, or wrong database name — without ever
    // touching the password itself. Safe to surface: mysql2's own access-denied
    // message only ever confirms whether a password was supplied, never its value.
    const detail = err?.code ? `${err.code}: ${err?.message || ''}`.trim() : (err?.message || 'database error');
    console.error('[api-auth] validateSession threw (likely a database connectivity/config issue):', detail);
    return NextResponse.json({ success: false, error: `Session check failed: ${detail}` }, { status: 503 });
  }

  if (!identity) {
    console.warn('[api-auth] Rejected token (not found in sessions table, or expired):', token.slice(0, 8) + '…');
    return NextResponse.json({ success: false, error: 'Your session is invalid or has expired. Please log in again.' }, { status: 401 });
  }

  return identity;
}

export function isAuthError(result: AuthedRequest | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// Second-layer, permission-aware check for routes that need it. An owner/
// admin session (employeeId === null) always passes — this is the one place
// that guarantee is enforced for API routes, mirroring the same rule already
// enforced in the UI/save-path (src/lib/permissions.ts's isSuperAccessRole).
// An employee session is checked against their own server-stored permissions
// and current employment status — never against anything the client sends.
export async function requirePermission(
  request: Request,
  module: string,
  action: keyof ModuleActionPermissions
): Promise<AuthedRequest | NextResponse> {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  if (!auth.employeeId) return auth; // owner/admin session

  // Lazy import to avoid a circular dependency (employees.ts imports db.ts,
  // not api-auth.ts) while keeping the actual query logic in one place.
  const { getEmployeeAccessContext } = await import('./erp/employees');
  let context;
  try {
    context = await getEmployeeAccessContext(auth.email, auth.employeeId);
  } catch (err: any) {
    console.error('[api-auth] requirePermission lookup failed:', err?.message || err);
    return NextResponse.json({ success: false, error: 'Could not verify permissions.' }, { status: 503 });
  }

  if (!context || context.status !== 'Active') {
    console.warn('[api-auth] Rejected employee session: account not active or not found.', auth.employeeId);
    return NextResponse.json({ success: false, error: 'Your account is not active. Contact your administrator.' }, { status: 403 });
  }

  const allowed = !!context.permissions?.[module]?.[action];
  if (!allowed) {
    return NextResponse.json({ success: false, error: `Access Denied: you do not have "${action}" permission for ${module}.` }, { status: 403 });
  }

  return auth;
}
