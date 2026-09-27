import { NextResponse } from 'next/server';
import { requirePermission, actorFrom, isAuthError } from '@/lib/api-auth';
import { listCustomersWithStats, listCustomersPaged, createCustomer, CustomerError } from '@/lib/erp/customers';

// A literal route always wins over the dynamic [entity] catch-all for the
// same path, so this is what actually serves /api/erp/customers now instead
// of the generic single-table CRUD in genericCrud.ts — the same pattern
// already used to give 'employees' its own bespoke routes (see the comment
// in src/lib/erp/entities.ts, which no longer lists 'customers' either).
//
// Without any query params this returns the FULL list (unpaginated) exactly
// as before, for existing callers (CustomerFormModal's duplicate-mobile
// check, Sales/Orders' legacy full fetch, CSV export). Passing `page` (or
// `search`/`status`/`category`/...) switches to the paginated, server-
// filtered path the Customer Department list UI now uses — see
// listCustomersPaged's own comment for why this matters at 10,000+ rows.
export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'view');
  if (isAuthError(auth)) return auth;

  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    if (!params.has('page') && !params.has('search') && !params.has('status') && !params.has('category') && !params.has('has')) {
      const data = await listCustomersWithStats(auth.email);
      return NextResponse.json({ success: true, data });
    }
    const result = await listCustomersPaged(auth.email, {
      search: params.get('search') || undefined,
      status: (params.get('status') as any) || undefined,
      category: params.get('category') || undefined,
      city: params.get('city') || undefined,
      createdFrom: params.get('createdFrom') || undefined,
      createdTo: params.get('createdTo') || undefined,
      has: (params.get('has') as any) || undefined,
      sortBy: (params.get('sortBy') as any) || undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
      pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    });
    return NextResponse.json({ success: true, data: result.customers, pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  } catch (error: any) {
    console.error('[erp/customers] list failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to load customer data. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'create');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const data = await createCustomer(auth.email, body, actorFrom(auth), { force: !!body?.force });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const isValidation = error instanceof CustomerError && error.status < 500;
    if (!isValidation) console.error('[erp/customers] create failed:', error?.code || error?.message || error, error?.sqlMessage || '');
    return NextResponse.json(
      {
        success: false,
        error: isValidation ? error.message : 'Unable to save this customer. Please try again.',
        // "Possible existing customer found" carries every match — the modal
        // offers Open Existing / Continue Creating New (force: true) / Cancel.
        ...(error instanceof CustomerError && error.duplicates ? { duplicates: error.duplicates } : {}),
        // Raw driver detail for a real (non-validation) failure — this is an
        // authenticated admin-only endpoint, and the alternative (a bare
        // "please try again" with the real cause only reachable via a
        // server log this app's admins can't get to) is what made the last
        // production failure here impossible to diagnose from the browser.
        ...(!isValidation ? { detail: error?.sqlMessage || error?.code || error?.message || undefined } : {}),
      },
      { status: isValidation ? (error instanceof CustomerError ? error.status : 400) : 500 }
    );
  }
}
