import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getFullSnapshotData } from '@/lib/erp/snapshot';

// Backs the existing Settings "Download Backup" feature — same shape
// POST /api/erp/import accepts, so export -> import round-trips cleanly.
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const data = await getFullSnapshotData(auth.email);
    return NextResponse.json({
      success: true,
      data: { meta: { exportedAt: new Date().toISOString(), app: 'GJ5 PLUS ERP', version: 1 }, ...data },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
