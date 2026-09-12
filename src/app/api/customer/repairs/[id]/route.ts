import { NextResponse } from 'next/server';
import { requireCustomer, isCustomerAuthError } from '@/lib/customer-auth';
import { getCustomerById } from '@/lib/customer-credentials';
import { getRepairJobForCustomerMobile } from '@/lib/erp/repairJobs';
import { getOnlineBookingForCustomerMobile } from '@/lib/erp/onlineBookings';

// Authenticated customer only. Both lookups filter by the customer's OWN
// mobile number (never trusts the :id alone), returning null — which
// becomes a plain 404, not a 403 — for a record that exists but belongs to
// someone else, so a customer can't distinguish "not yours" from "doesn't
// exist" by probing ids. The id's own prefix ("OB-" vs anything else) says
// which table to look in — the two id schemes never collide.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if (isCustomerAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const account = await getCustomerById(auth.userEmail, auth.customerId);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }

    if (id.startsWith('OB-')) {
      const booking: any = await getOnlineBookingForCustomerMobile(auth.userEmail, id, account.mobile);
      if (!booking) {
        return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          type: 'online_booking',
          id: booking.id,
          customerName: booking.customerName,
          mobile: booking.customerMobile,
          productType: booking.deviceType,
          brand: booking.brand,
          model: booking.model || null,
          problemDescription: booking.problemDescription,
          customerNotes: booking.notes || null,
          technicianName: booking.technicianName || null,
          receivedDate: booking.preferredDate || booking.createdAt.slice(0, 10),
          expectedDeliveryDate: null,
          status: booking.status,
          warrantyDuration: null,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          grandTotal: booking.estimatedAmount || 0,
          totalPaid: 0,
          balanceDue: booking.estimatedAmount || 0,
          payments: [],
          statusHistory: (booking.statusHistory || [])
            .slice()
            .sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
            .map((s: any) => ({ status: s.status, changedAt: s.changedAt, note: s.note || null })),
        },
      });
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
        type: 'repair_job',
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
