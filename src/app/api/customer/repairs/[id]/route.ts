import { NextResponse } from 'next/server';
import { requireCustomer, isCustomerAuthError } from '@/lib/customer-auth';
import { getCustomerById } from '@/lib/customer-credentials';
import { getRepairJobForCustomerMobile } from '@/lib/erp/repairJobs';

// Authenticated customer only. getRepairJobForCustomerMobile() filters by
// the customer's OWN mobile number (never trusts the :id alone), returning
// null — which becomes a plain 404, not a 403 — for a job that exists but
// belongs to someone else, so a customer can't distinguish "not yours" from
// "doesn't exist" by probing ids.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if (isCustomerAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const account = await getCustomerById(auth.userEmail, auth.customerId);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    const job: any = await getRepairJobForCustomerMobile(auth.userEmail, id, account.mobile);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Repair request not found.' }, { status: 404 });
    }

    const grandTotal = (job.parts || []).reduce((s: number, p: any) => s + (p.total || 0), 0) + (job.labourCharges || 0) + (job.otherCharges || 0) - (job.discount || 0);
    const totalPaid = (job.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        customerName: job.customerName,
        mobile: job.mobile,
        productType: job.productType,
        brand: job.brand,
        model: job.model,
        problemDescription: job.problemDescription,
        customerNotes: job.customerNotes || null,
        technicianName: job.technicianName || null,
        receivedDate: job.receivedDate,
        expectedDeliveryDate: job.expectedDeliveryDate || null,
        status: job.status,
        warrantyDuration: job.warrantyDuration || null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        grandTotal,
        totalPaid,
        balanceDue: Math.max(0, grandTotal - totalPaid),
        payments: (job.payments || []).map((p: any) => ({ date: p.date, amount: p.amount, method: p.method })),
        statusHistory: (job.statusHistory || [])
          .slice()
          .sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
          .map((s: any) => ({ status: s.status, changedAt: s.changedAt, note: s.note || null })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
