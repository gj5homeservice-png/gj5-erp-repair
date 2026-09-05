import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { addRepairJobPayment } from '@/lib/erp/repairJobs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const payment = await request.json();
    const ok = await addRepairJobPayment(auth.email, id, payment);
    if (!ok) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
