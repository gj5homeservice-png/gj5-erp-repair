import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { updateSalesDeliveryStatus } from '@/lib/erp/sales';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { status } = await request.json();
    if (!status) return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 });
    const ok = await updateSalesDeliveryStatus(auth.email, id, status);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
