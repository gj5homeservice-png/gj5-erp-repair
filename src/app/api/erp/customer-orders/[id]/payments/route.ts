import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { recordOrderPayment } from '@/lib/erp/customerOrders';
import { listPayments, actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'view');
  if (isAuthError(auth)) return auth;
  try {
    return NextResponse.json({ success: true, data: await listPayments(auth.email, 'ORDER', id) });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Orders', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await recordOrderPayment(auth.email, id, body, actorFrom(auth)) });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
