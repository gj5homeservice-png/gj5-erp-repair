import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { convertBookingToRepairJob } from '@/lib/erp/onlineBookings';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const result = await convertBookingToRepairJob(auth.email, id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const status = error?.message === 'Booking not found.' ? 404 : 500;
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status });
  }
}
