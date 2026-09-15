import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { addWalletTransaction } from '@/lib/erp/wallet';

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { amount, type, description, metadata } = await request.json();
    if (!amount || isNaN(amount) || amount <= 0 || !['MANUAL_CREDIT', 'MANUAL_DEBIT'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid adjustment' }, { status: 400 });
    }
    // `metadata` is optional and only ever set by the E-Wallet's "Other
    // Business Income" form (category/paymentMethod/reference/notes) — see
    // src/lib/wallet-engine.ts, which treats a MANUAL_CREDIT carrying
    // metadata.category as real categorized income, and one without it as a
    // plain legacy balance adjustment (unchanged behavior for existing callers).
    const id = await addWalletTransaction(auth.email, type, amount, description || 'Manual adjustment', metadata);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
