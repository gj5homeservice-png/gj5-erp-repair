import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listCustomerOrders, createOrder } from '@/lib/erp/customerOrders';
import { actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Orders', 'view');
  if (isAuthError(auth)) return auth;
  try {
    return NextResponse.json({ success: true, data: await listCustomerOrders(auth.email) });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, 'Orders', 'create');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    const data = await createOrder(auth.email, body, actorFrom(auth));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
