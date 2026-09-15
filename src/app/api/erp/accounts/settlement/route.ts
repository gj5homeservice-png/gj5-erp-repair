import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { recordSettlement } from '@/lib/erp/accounts';

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { fromAccountId, toAccountId, amount, note, employeeId } = await request.json();
    if (!fromAccountId || !toAccountId) return NextResponse.json({ success: false, error: 'fromAccountId and toAccountId are required' }, { status: 400 });
    const id = await recordSettlement(auth.email, { fromAccountId, toAccountId, amount: Number(amount), note: note || '', employeeId, createdBy: auth.email });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
