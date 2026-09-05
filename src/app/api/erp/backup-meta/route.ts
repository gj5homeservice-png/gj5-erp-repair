import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getSingleRow, upsertSingleRow } from '@/lib/erp/singleRow';

const COLUMNS = { lastBackupAt: 'last_backup_at', status: 'status', recordCounts: 'record_counts' };

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const row = await getSingleRow('backup_meta', auth.email);
    if (!row) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: { lastBackupAt: row.last_backup_at, status: row.status, recordCounts: row.record_counts } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const patch = await request.json();
    await upsertSingleRow('backup_meta', auth.email, COLUMNS, ['recordCounts'], patch);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
