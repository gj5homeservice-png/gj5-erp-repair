import { NextResponse } from 'next/server';
import { validateSession } from './session';

// Every /api/erp/* route (other than the public attendance-link endpoints,
// which are authorized by the link token itself instead) calls this first.
// Never trusts a client-supplied email — always resolves identity from a
// server-verified session token.
export async function requireUser(request: Request): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const email = await validateSession(token);
  if (!email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return { email };
}

export function isAuthError(result: { email: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
