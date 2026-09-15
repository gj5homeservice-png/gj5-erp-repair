import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { updateAccount } from '@/lib/erp/accounts';

// No DELETE — accounts are deactivated, never removed (a deleted account
// would orphan every historical repair_job_payments/expenses/wallet_transactions
// row that references it). Matches customers.ts's deactivate-not-delete pattern.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    const ok = await updateAccount(auth.email, id, body);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
