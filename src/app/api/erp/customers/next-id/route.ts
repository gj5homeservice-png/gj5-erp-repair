import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getNextCustomerId } from '@/lib/erp/customers';

// Read-only preview of the Customer ID an Add Customer save would get right
// now — shown in the modal before saving. The authoritative id is always
// recomputed (and race-safe) inside createCustomer() itself; this route
// never writes anything and never reserves an id.
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const nextId = await getNextCustomerId(auth.email);
    return NextResponse.json({ success: true, data: { nextId } });
  } catch (error: any) {
    console.error('[erp/customers/next-id] failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to compute next customer id.' }, { status: 500 });
  }
}
