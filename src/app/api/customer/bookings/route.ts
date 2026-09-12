import { NextResponse } from 'next/server';
import { createOnlineBooking } from '@/lib/erp/onlineBookings';
import { getShopTenantEmail } from '@/lib/public-shop';
import { validateCustomerSession } from '@/lib/customer-session';
import { getCustomerById } from '@/lib/customer-credentials';

// Public — anyone can submit a booking, logged in or not (guest booking is
// the common case for a repair shop's public site). Writes into
// online_bookings, NOT repair_jobs — an admin must explicitly review and
// "Convert to Repair Job" from the Online Bookings module before this
// becomes a real repair job. If the request carries a valid customer
// session token, the account's own stored details are used (never trusting
// whatever a logged-in customer's form fields happened to contain), linking
// customerId onto the booking so it appears correctly in their My Repairs.
const DEVICE_TYPES = ['TV', 'LED TV', 'LCD TV', 'Smart TV', 'Other Electronics'];
const MOBILE_RE = /^[0-9]{10}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName, mobile, email, address, pincode,
      deviceType, brand, model, problem,
      preferredDate, preferredTime, notes,
      idempotencyKey,
    } = body || {};

    // A logged-in customer's identity always comes from their verified
    // session, never from the form body.
    let customerId: string | undefined;
    let resolvedName = customerName;
    let resolvedMobile = mobile;
    let resolvedEmail = email;
    let resolvedAddress = address;
    let resolvedPincode = pincode;

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token) {
      const identity = await validateCustomerSession(token).catch(() => null);
      if (identity) {
        const account = await getCustomerById(identity.userEmail, identity.customerId).catch(() => null);
        if (account) {
          customerId = account.id;
          resolvedName = account.name;
          resolvedMobile = account.mobile;
          resolvedEmail = account.email || email;
          resolvedAddress = account.address || address;
          resolvedPincode = account.pincode || pincode;
        }
      }
    }

    if (!resolvedName || typeof resolvedName !== 'string' || !resolvedName.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your name.' }, { status: 400 });
    }
    if (!resolvedMobile || typeof resolvedMobile !== 'string' || !MOBILE_RE.test(resolvedMobile)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!resolvedAddress || typeof resolvedAddress !== 'string' || !resolvedAddress.trim()) {
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

    const shopEmail = getShopTenantEmail();
    const data = {
      customerId,
      customerName: resolvedName.trim(),
      customerMobile: resolvedMobile,
      customerEmail: typeof resolvedEmail === 'string' && resolvedEmail.trim() ? resolvedEmail.trim() : undefined,
      address: resolvedAddress.trim(),
      pincode: typeof resolvedPincode === 'string' && resolvedPincode.trim() ? resolvedPincode.trim() : undefined,
      deviceType,
      brand: brand.trim(),
      model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
      problemDescription: problem.trim(),
      preferredDate: typeof preferredDate === 'string' && preferredDate ? preferredDate : undefined,
      preferredTime: typeof preferredTime === 'string' && preferredTime ? preferredTime : undefined,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
      priority: 'Normal',
      paymentStatus: 'Pending',
      status: 'New',
      source: 'Website',
    };

    const result = await createOnlineBooking(shopEmail, data, typeof idempotencyKey === 'string' ? idempotencyKey : undefined);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        customerName: data.customerName,
        mobile: data.customerMobile,
        deviceType: data.deviceType,
        brand: data.brand,
        problemDescription: data.problemDescription,
        preferredDate: data.preferredDate || null,
        preferredTime: data.preferredTime || null,
        status: data.status,
      },
    });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: error?.code ? `Booking failed: ${detail}` : detail }, { status: error?.code ? 503 : 500 });
  }
}
