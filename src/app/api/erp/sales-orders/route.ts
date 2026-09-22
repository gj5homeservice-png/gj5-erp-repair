import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listSalesOrders } from '@/lib/erp/sales';
import { createSale, actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

// Sales module list + create. (The route path predates the Sales module — the
// underlying table is `sales_orders`, i.e. the sale records.)
export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Sales', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const data = await listSalesOrders(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, 'Sales', 'create');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    const result = await createSale(auth.email, body, actorFrom(auth), { generateInvoice: !!body?.generateInvoice });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
