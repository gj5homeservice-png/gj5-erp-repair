import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listCustomersWithStats, customersToCsv } from '@/lib/erp/customers';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Customer Department', 'export');
  if (isAuthError(auth)) return auth;

  try {
    const customers = await listCustomersWithStats(auth.email);
    const csv = customersToCsv(customers);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('[erp/customers/export] failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to export customers. Please try again.' }, { status: 500 });
  }
}
