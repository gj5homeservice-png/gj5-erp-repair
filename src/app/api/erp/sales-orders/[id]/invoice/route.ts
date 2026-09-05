import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { generateSalesInvoiceForOrder } from '@/lib/erp/sales';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const invoiceId = await generateSalesInvoiceForOrder(auth.email, id);
    if (!invoiceId) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ success: true, invoiceId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
