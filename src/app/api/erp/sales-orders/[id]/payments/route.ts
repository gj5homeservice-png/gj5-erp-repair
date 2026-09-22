import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listPayments, recordSalePayment, actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Sales', 'view');
  if (isAuthError(auth)) return auth;
  try {
    return NextResponse.json({ success: true, data: await listPayments(auth.email, 'SALE', id) });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Sales', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    const data = await recordSalePayment(auth.email, id, body, actorFrom(auth));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
