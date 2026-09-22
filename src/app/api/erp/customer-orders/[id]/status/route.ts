import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { setOrderStatus } from '@/lib/erp/customerOrders';
import { actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

// Moving an order to DELIVERED also creates its Sale (stock is taken out at
// that moment) — the response carries the new sale's id.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const { status } = await request.json();
    const data = await setOrderStatus(auth.email, id, status, actorFrom(auth));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
