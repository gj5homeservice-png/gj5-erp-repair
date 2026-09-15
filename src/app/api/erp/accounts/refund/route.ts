import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { recordRefund } from '@/lib/erp/accounts';

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { fromAccountId, amount, note, customerId, jobId } = await request.json();
    if (!fromAccountId) return NextResponse.json({ success: false, error: 'fromAccountId is required' }, { status: 400 });
    const id = await recordRefund(auth.email, { fromAccountId, amount: Number(amount), note: note || '', customerId, jobId, createdBy: auth.email });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
