import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getOnlineBooking, updateOnlineBooking, deleteOnlineBooking } from '@/lib/erp/onlineBookings';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const data = await getOnlineBooking(auth.email, id);
    if (!data) return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const ok = await updateOnlineBooking(auth.email, id, body);
    if (!ok) return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const ok = await deleteOnlineBooking(auth.email, id);
    if (!ok) return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
