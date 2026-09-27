import { NextResponse } from 'next/server';
import { requirePermission, actorFrom, isAuthError } from '@/lib/api-auth';
import { getCustomerProfile, updateCustomer, deactivateOrDeleteCustomer, CustomerError } from '@/lib/erp/customers';

function errorResponse(error: any, fallback: string) {
  const isValidation = error instanceof CustomerError && error.status < 500;
  if (!isValidation) console.error('[erp/customers/:id] failed:', error?.message || error);
  return NextResponse.json(
    {
      success: false,
      error: isValidation ? error.message : fallback,
      ...(error instanceof CustomerError && error.duplicates ? { duplicates: error.duplicates } : {}),
    },
    { status: error instanceof CustomerError ? error.status : 500 }
  );
}

// GET returns the FULL 360° profile (repair jobs, online bookings, sales,
// orders, invoices, notes, timeline, audit log, products purchased) —
// deliberately only ever called when a single customer's profile is
// actually opened, never as part of the list load.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'Customer Department', 'view');
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const data = await getCustomerProfile(auth.email, id);
    if (!data) return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return errorResponse(error, 'Unable to load this customer. Please try again.');
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'Customer Department', 'edit');
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateCustomer(auth.email, id, body, actorFrom(auth), { force: !!body?.force });
    if (!data) return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return errorResponse(error, 'Unable to save changes. Please try again.');
  }
}

// Never a blind DELETE FROM customers — deactivateOrDeleteCustomer() checks
// for real business history (repair jobs, online bookings, sales, orders,
// invoices, wallet transactions) first, and only removes the row when none
// exists. Any customer with history is deactivated, not destroyed.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'Customer Department', 'delete');
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const result = await deactivateOrDeleteCustomer(auth.email, id, actorFrom(auth));
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return errorResponse(error, 'Unable to remove this customer. Please try again.');
  }
}
