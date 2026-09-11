import { NextResponse } from 'next/server';
import { requireCustomer, isCustomerAuthError } from '@/lib/customer-auth';
import { getCustomerById } from '@/lib/customer-credentials';
import { listRepairJobsForCustomerMobile } from '@/lib/erp/repairJobs';

// Authenticated customer only. The mobile number used to scope the query
// comes from the customer's own account row (resolved from their session),
// never from a query param or request body — a customer can never ask for
// another customer's repairs by supplying a different mobile number.
export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (isCustomerAuthError(auth)) return auth;

  try {
    const account = await getCustomerById(auth.userEmail, auth.customerId);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    const jobs = await listRepairJobsForCustomerMobile(auth.userEmail, account.mobile);
    // Sort newest first, and never leak the technician's internal id or the
    // shop's full cost breakdown (purchase cost, labour/other charges) to
    // the customer view — only what a customer should see about their own job.
    const sanitized = jobs
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((j: any) => ({
        id: j.id,
        productType: j.productType,
        brand: j.brand,
        model: j.model,
        problemDescription: j.problemDescription,
        technicianName: j.technicianName || null,
        receivedDate: j.receivedDate,
        expectedDeliveryDate: j.expectedDeliveryDate || null,
        status: j.status,
        warrantyDuration: j.warrantyDuration || null,
        updatedAt: j.updatedAt,
        grandTotal: (j.parts || []).reduce((s: number, p: any) => s + (p.total || 0), 0) + (j.labourCharges || 0) + (j.otherCharges || 0) - (j.discount || 0),
        totalPaid: (j.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0),
      }));
    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
