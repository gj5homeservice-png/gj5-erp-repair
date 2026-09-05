import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getFullSnapshotData } from '@/lib/erp/snapshot';

// One combined "load everything" response for the logged-in tenant, so the
// dashboard's initial load is a single round trip instead of ~20 waterfalled
// requests. Used to seed SWR's cache; every subsequent read/write still goes
// through the focused per-entity routes.
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const data = await getFullSnapshotData(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
