import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { reverseLedgerEntry } from '@/lib/erp/accounts';

// Never silently deletes a financial transaction — inserts an
// equal-and-opposite reversal entry instead (see accounts.ts's
// reverseLedgerEntry). Same URL/verb as before so the existing Ledger tab
// delete button needs no rewiring.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    await reverseLedgerEntry(auth.email, id, auth.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
