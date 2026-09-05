import { NextResponse } from 'next/server';
import { findAttendanceLinkByToken } from '@/lib/erp/attendanceLinks';

// Public — no session. This is the fix for the pre-existing cross-device bug:
// today's localStorage-based lookup only works in the admin's own browser;
// this is a real server-side lookup reachable from any employee's phone.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const result = await findAttendanceLinkByToken(token);
    if (!result) return NextResponse.json({ success: false, error: 'Invalid link' }, { status: 404 });
    const { link } = result;
    if (link.used) return NextResponse.json({ success: false, error: 'This link has already been used' }, { status: 410 });
    if (new Date(link.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'This link has expired' }, { status: 410 });
    }
    return NextResponse.json({ success: true, data: link });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
