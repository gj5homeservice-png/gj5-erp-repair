import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { getCustomerOrder, updateOrder, deleteOrder } from '@/lib/erp/customerOrders';
import { salesErrorResponse } from '@/lib/erp/saleRecords';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const order = await getCustomerOrder(auth.email, id);
    if (!order) return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await updateOrder(auth.email, id, body) });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'delete');
  if (isAuthError(auth)) return auth;
  try {
    await deleteOrder(auth.email, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
