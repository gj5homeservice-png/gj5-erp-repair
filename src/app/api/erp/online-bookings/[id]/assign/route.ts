import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { assignTechnician } from '@/lib/erp/onlineBookings';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const { id } = await params;
    const { technicianId, technicianName, note } = await request.json();
    if (!technicianId || !technicianName) {
      return NextResponse.json({ success: false, error: 'Technician is required.' }, { status: 400 });
    }
    const ok = await assignTechnician(auth.email, id, technicianId, technicianName, note);
    if (!ok) return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
