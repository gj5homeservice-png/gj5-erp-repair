import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { listInvoices, createInvoiceWithSideEffects } from '@/lib/erp/invoices';

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const data = await listInvoices(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    await createInvoiceWithSideEffects(auth.email, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
