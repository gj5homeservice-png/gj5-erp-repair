import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { previewNextCustomerId } from '@/lib/erp/customers';

// Read-only preview of the Customer ID an Add Customer save would get right
// now — shown in the modal before saving. The authoritative id is always
// recomputed (and race-safe) inside createCustomer() itself; this route
// never writes anything and never reserves an id.
export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'create');
  if (isAuthError(auth)) return auth;

  try {
    const nextId = await previewNextCustomerId(auth.email);
    return NextResponse.json({ success: true, data: { nextId } });
  } catch (error: any) {
    console.error('[erp/customers/next-id] failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to compute next customer id.' }, { status: 500 });
  }
}
