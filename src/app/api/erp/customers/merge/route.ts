import { NextResponse } from 'next/server';
import { requirePermission, actorFrom, isAuthError } from '@/lib/api-auth';
import { mergeCustomers, CustomerError } from '@/lib/erp/customers';

// Gated behind the same 'delete' action that already governs permanently
// removing a customer — merge is at least as consequential (it reassigns
// history across Sales/Orders/Repair Jobs/Invoices/Wallet), and this app's
// permission model has no finer-grained "administrators only" concept to
// reuse instead of inventing a new one.
export async function POST(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'delete');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const data = await mergeCustomers(auth.email, body?.primaryId, body?.duplicateId, actorFrom(auth));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const isValidation = error instanceof CustomerError && error.status < 500;
    if (!isValidation) console.error('[erp/customers/merge] failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to merge these customers. Please try again.' },
      { status: error instanceof CustomerError ? error.status : 500 }
    );
  }
}
