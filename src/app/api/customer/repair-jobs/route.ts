import { NextResponse } from 'next/server';
import { createRepairJob } from '@/lib/erp/repairJobs';
import { getShopTenantEmail } from '@/lib/public-shop';
import { RepairJob } from '@/lib/types';

// Public — anyone can submit a repair request, logged in or not (guest
// booking, same as calling the shop). This writes into the exact same
// repair_jobs table and goes through the exact same createRepairJob() the
// admin ERP's own "New Repair" form uses (src/app/api/erp/repair-jobs/route.ts),
// so a booking placed here shows up in the admin's Repair Jobs module
// immediately, with a real server-generated Repair ID — nothing is
// duplicated or faked.
const DEVICE_TYPES = ['TV', 'LED TV', 'LCD TV', 'Smart TV', 'Other Electronics'];
const MOBILE_RE = /^[0-9]{10}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName, mobile, email, address, pincode,
      deviceType, brand, model, problem,
      preferredDate, preferredTime, notes,
    } = body || {};

    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your name.' }, { status: 400 });
    }
    if (!mobile || typeof mobile !== 'string' || !MOBILE_RE.test(mobile)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your address.' }, { status: 400 });
    }
    if (!deviceType || !DEVICE_TYPES.includes(deviceType)) {
      return NextResponse.json({ success: false, error: 'Please select a valid device type.' }, { status: 400 });
    }
    if (!brand || typeof brand !== 'string' || !brand.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter the brand.' }, { status: 400 });
    }
    if (!problem || typeof problem !== 'string' || !problem.trim()) {
      return NextResponse.json({ success: false, error: 'Please describe the problem.' }, { status: 400 });
    }

    // The booking form's "preferred date/time" and free-text notes have no
    // dedicated repair_jobs columns (the schema's dates are receivedDate /
    // expectedDeliveryDate, set by the shop once the job is actually
    // scheduled/actioned) — rather than adding new columns for a
    // not-yet-confirmed scheduling preference, they're folded into
    // customerNotes, which already exists for exactly this kind of
    // free-text context and is fully visible to the admin in the Repair
    // Jobs edit screen.
    const preferenceLines = [
      preferredDate ? `Preferred date: ${preferredDate}` : null,
      preferredTime ? `Preferred time: ${preferredTime}` : null,
      typeof notes === 'string' && notes.trim() ? `Customer notes: ${notes.trim()}` : null,
    ].filter(Boolean);

    const now = new Date().toISOString();
    const shopEmail = getShopTenantEmail();

    const job: Partial<RepairJob> = {
      customerName: customerName.trim(),
      mobile,
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
      address: address.trim(),
      pincode: typeof pincode === 'string' && pincode.trim() ? pincode.trim() : undefined,
      productType: deviceType,
      brand: brand.trim(),
      model: typeof model === 'string' && model.trim() ? model.trim() : '',
      problemDescription: problem.trim(),
      customerNotes: preferenceLines.length ? preferenceLines.join(' | ') : undefined,
      receivedDate: now.slice(0, 10),
      estimatedCost: 0,
      advancePayment: 0,
      status: 'Received',
      parts: [],
      labourCharges: 0,
      otherCharges: 0,
      discount: 0,
      payments: [],
      notesLog: [],
      statusHistory: [{ id: `SH-booking-${Date.now()}`, status: 'Received', changedAt: now, note: 'Booked by customer via public website' }],
      notifications: [{ id: `NT-booking-${Date.now()}`, trigger: 'Repair Received', message: `Repair request received from ${customerName.trim()}.`, sentAt: null }],
      createdAt: now,
      updatedAt: now,
    };

    const result = await createRepairJob(shopEmail, job);
    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        customerName: job.customerName,
        mobile: job.mobile,
        productType: job.productType,
        brand: job.brand,
        model: job.model,
        problemDescription: job.problemDescription,
        receivedDate: job.receivedDate,
        status: job.status,
      },
    });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: error?.code ? `Booking failed: ${detail}` : detail }, { status: error?.code ? 503 : 500 });
  }
}
