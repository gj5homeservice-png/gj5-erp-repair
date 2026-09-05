import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getWalletBalance, listWalletTransactions } from '@/lib/erp/wallet';

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const [balance, transactions] = await Promise.all([
      getWalletBalance(auth.email),
      listWalletTransactions(auth.email),
    ]);
    return NextResponse.json({ success: true, data: { balance, transactions } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
