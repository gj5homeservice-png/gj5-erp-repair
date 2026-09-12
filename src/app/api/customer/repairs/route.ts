import { NextResponse } from 'next/server';
import { requireCustomer, isCustomerAuthError } from '@/lib/customer-auth';
import { getCustomerById } from '@/lib/customer-credentials';
import { listRepairJobsForCustomerMobile } from '@/lib/erp/repairJobs';
import { listOnlineBookingsForCustomerMobile } from '@/lib/erp/onlineBookings';

// Authenticated customer only. The mobile number used to scope both queries
// comes from the customer's own account row (resolved from their session),
// never from a query param or request body — a customer can never ask for
// another customer's records by supplying a different mobile number.
//
// Returns online bookings and repair jobs merged into one list. A booking
// that has already been Converted is left out here — its linked repair job
// (already in the repair_jobs results) is the one the customer should be
// tracking from that point on, so showing both would just be the same
// underlying job twice under two different ids.
export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (isCustomerAuthError(auth)) return auth;

  try {
    const account = await getCustomerById(auth.userEmail, auth.customerId);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    const [jobs, bookings] = await Promise.all([
      listRepairJobsForCustomerMobile(auth.userEmail, account.mobile),
      listOnlineBookingsForCustomerMobile(auth.userEmail, account.mobile),
    ]);

    // Never leak the technician's internal id or the shop's full cost
    // breakdown (purchase cost, labour/other charges) to the customer view —
    // only what a customer should see about their own job.
    const jobRecords = jobs.map((j: any) => ({
      type: 'repair_job' as const,
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
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      grandTotal: (j.parts || []).reduce((s: number, p: any) => s + (p.total || 0), 0) + (j.labourCharges || 0) + (j.otherCharges || 0) - (j.discount || 0),
      totalPaid: (j.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0),
    }));

    const bookingRecords = bookings
      .filter((b: any) => !b.repairJobId)
      .map((b: any) => ({
        type: 'online_booking' as const,
        id: b.id,
        productType: b.deviceType,
        brand: b.brand,
        model: b.model || null,
        problemDescription: b.problemDescription,
        technicianName: b.technicianName || null,
        receivedDate: b.preferredDate || b.createdAt.slice(0, 10),
        expectedDeliveryDate: null,
        status: b.status,
        warrantyDuration: null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        grandTotal: b.estimatedAmount || 0,
        totalPaid: 0,
      }));

    const merged = [...jobRecords, ...bookingRecords].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ success: true, data: merged });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
