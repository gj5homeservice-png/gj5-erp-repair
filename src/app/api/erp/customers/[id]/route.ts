import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getCustomerProfile, updateCustomer, deactivateOrDeleteCustomer } from '@/lib/erp/customers';

// GET returns the FULL profile (repair jobs, online bookings, sales,
// invoices, notes, timeline) — deliberately only ever called when a single
// customer's profile is actually opened, never as part of the list load.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const data = await getCustomerProfile(auth.email, id);
    if (!data) return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[erp/customers/:id] profile load failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to load this customer. Please try again.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateCustomer(auth.email, id, body);
    if (!data) return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const isValidation = error?.message?.includes('required') || error?.message?.includes('already exists') || error?.message?.includes('valid category');
    if (!isValidation) console.error('[erp/customers/:id] update failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to save changes. Please try again.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}

// Never a blind DELETE FROM customers — deactivateOrDeleteCustomer() checks
// for real business history (repair jobs, online bookings, sales, invoices)
// under this customer's mobile number first, and only removes the row when
// none exists. Any customer with history is deactivated, not destroyed.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const result = await deactivateOrDeleteCustomer(auth.email, id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const isValidation = error?.message === 'Customer not found.';
    if (!isValidation) console.error('[erp/customers/:id] delete failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to remove this customer. Please try again.' },
      { status: isValidation ? 404 : 500 }
    );
  }
}
