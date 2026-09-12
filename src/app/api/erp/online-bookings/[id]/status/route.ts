import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { changeBookingStatus } from '@/lib/erp/onlineBookings';

// Also used for Reject/Cancel — the client passes reason/reasonField for
// those specific status values; everything else omits them.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const { status, note, reasonField, reason } = await request.json();
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ success: false, error: 'Status is required.' }, { status: 400 });
    }
    const ok = await changeBookingStatus(auth.email, id, status, note, reasonField, reason);
    if (!ok) return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
