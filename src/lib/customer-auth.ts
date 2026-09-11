import { NextResponse } from 'next/server';
import { validateCustomerSession, CustomerSessionIdentity } from './customer-session';

// The customer-portal mirror of src/lib/api-auth.ts's requireUser(). Every
// /api/customer/repairs* route calls this — it resolves identity only from
// a server-verified customer_sessions token, exactly like requireUser()
// does against `sessions`, and the two are structurally incapable of
// accepting each other's tokens since they're different tables entirely. A
// customer token handed to an ERP route fails there the same way any junk
// string would (no matching row in `sessions`); an ERP staff token handed
// here fails the same way (no matching row in `customer_sessions`).
export async function requireCustomer(request: Request): Promise<CustomerSessionIdentity | NextResponse> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return NextResponse.json({ success: false, error: 'Please log in to continue.' }, { status: 401 });
  }

  let identity: CustomerSessionIdentity | null;
  try {
    identity = await validateCustomerSession(token);
  } catch (err: any) {
    const detail = err?.code ? `${err.code}: ${err?.message || ''}`.trim() : (err?.message || 'database error');
    return NextResponse.json({ success: false, error: `Session check failed: ${detail}` }, { status: 503 });
  }

  if (!identity) {
    return NextResponse.json({ success: false, error: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  return identity;
}

export function isCustomerAuthError(result: CustomerSessionIdentity | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
