import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { searchCustomers } from '@/lib/erp/customers';

// The ONE fast, indexed lookup every customer picker/quick-lookup/Ctrl+K
// search in the app calls — never the full customer list. See
// searchCustomers()'s own comment for the query shape.
export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'view');
  if (isAuthError(auth)) return auth;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const limit = Number(url.searchParams.get('limit')) || 10;
    if (!q.trim()) return NextResponse.json({ success: true, data: [] });
    const data = await searchCustomers(auth.email, q, limit);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[erp/customers/search] failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
