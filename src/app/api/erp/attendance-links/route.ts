import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { generateAttendanceLink, listAttendanceLinks } from '@/lib/erp/attendanceLinks';

// Admin-only: generating a link requires a valid session, same as every other
// write in the dashboard. The resulting token is what authorizes the public
// checkin/checkout routes below — not a session.
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const data = await listAttendanceLinks(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const employee = await request.json();
    const result = await generateAttendanceLink(auth.email, employee);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
