import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { findAttendanceLinkByToken } from '@/lib/erp/attendanceLinks';

// Public — same token used for check-in identifies the employee/tenant for
// check-out too (the link's one-time "used" flag was already consumed at
// check-in; here the token is only being used as an identity key, not
// re-validated as a still-usable invite, since the same page session covers
// both actions). Computes workHours/overtime here from the found record's
// own check-in time, since the client-side page never has that record loaded
// (it's a fresh, unauthenticated device with no bootstrap data).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const result = await findAttendanceLinkByToken(token);
    if (!result) return NextResponse.json({ success: false, error: 'Invalid link' }, { status: 404 });
    const { link, userEmail } = result;

    const patch = await request.json();
    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      `SELECT id, check_in FROM attendance_records WHERE user_email = ? AND employee_id = ? AND date = ? AND check_out IS NULL ORDER BY id DESC LIMIT 1`,
      [userEmail, link.employeeId, patch.date]
    );
    const openRecord = (rows as any[])[0];
    if (!openRecord) return NextResponse.json({ success: false, error: 'No open shift found for today' }, { status: 404 });

    const now = new Date();
    const inTime = new Date(openRecord.check_in);
    const diffMinutes = Math.max(0, Math.floor((now.getTime() - inTime.getTime()) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const workHours = `${hours}h ${mins}m`;
    const overtime = hours > 9 ? `${hours - 9}h` : '0h';

    await pool.execute(
      `UPDATE attendance_records SET check_out = ?, work_hours = ?, overtime = ?, selfie_check_out = ?, status = 'Checked Out' WHERE id = ?`,
      [now.toISOString(), workHours, overtime, patch.selfieCheckOut ?? null, openRecord.id]
    );
    return NextResponse.json({ success: true, workHours, overtime });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
