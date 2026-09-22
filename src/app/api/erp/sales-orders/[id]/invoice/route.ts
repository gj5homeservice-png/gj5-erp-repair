import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { generateInvoiceForSale, salesErrorResponse } from '@/lib/erp/saleRecords';

// Creates (or returns the existing) invoice for a sale in the MAIN Billing
// invoice engine, so it appears in Invoice History like any other invoice.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Sales', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const data = await generateInvoiceForSale(auth.email, id);
    return NextResponse.json({ success: true, data, invoiceId: data.invoiceId });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
