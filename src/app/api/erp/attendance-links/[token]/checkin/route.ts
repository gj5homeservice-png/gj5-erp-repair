import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { findAttendanceLinkByToken, markAttendanceLinkUsed } from '@/lib/erp/attendanceLinks';

// Public — authorized by the (unguessable, 2-minute-lived) link token itself,
// not a login session, since the employee opening this page never logs in.
// The server resolves which tenant this belongs to from the link row, never
// from anything the client claims.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const result = await findAttendanceLinkByToken(token);
    if (!result) return NextResponse.json({ success: false, error: 'Invalid link' }, { status: 404 });
    const { link, userEmail } = result;
    if (link.used) return NextResponse.json({ success: false, error: 'This link has already been used' }, { status: 410 });
    if (new Date(link.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'This link has expired' }, { status: 410 });
    }

    const record = await request.json();
    const pool = getPool();
    await pool.execute(
      `INSERT INTO attendance_records
        (id, user_email, employee_id, employee_name, mobile, date, check_in, work_hours, overtime, latitude, longitude, address, selfie_check_in, status, created_at, device_info, browser_info, ip_address, attendance_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, userEmail, link.employeeId, link.employeeName, link.mobile, record.date,
        record.checkIn ?? null, record.workHours ?? '0', record.overtime ?? '0',
        record.latitude ?? null, record.longitude ?? null, record.address ?? null,
        record.selfieCheckIn ?? null, record.status ?? 'Checked In', record.createdAt ?? new Date().toISOString(),
        record.deviceInfo ?? null, record.browserInfo ?? null, record.ipAddress ?? null,
        record.attendanceType ?? 'WhatsAppLink',
      ]
    );
    await markAttendanceLinkUsed(token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
