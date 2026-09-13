import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { listCustomersWithStats, createCustomer } from '@/lib/erp/customers';

// A literal route always wins over the dynamic [entity] catch-all for the
// same path, so this is what actually serves /api/erp/customers now instead
// of the generic single-table CRUD in genericCrud.ts — the same pattern
// already used to give 'employees' its own bespoke routes (see the comment
// in src/lib/erp/entities.ts, which no longer lists 'customers' either).
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const data = await listCustomersWithStats(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[erp/customers] list failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to load customer data. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const data = await createCustomer(auth.email, body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    // Validation/duplicate-mobile errors thrown by createCustomer() have
    // safe, specific messages meant to reach the admin as-is; anything else
    // (a real DB/driver failure) is logged server-side and generalized.
    const isValidation = error?.message?.includes('required') || error?.message?.includes('already exists');
    if (!isValidation) console.error('[erp/customers] create failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to save this customer. Please try again.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}
