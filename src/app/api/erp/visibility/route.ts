import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getSingleRow, upsertSingleRow } from '@/lib/erp/singleRow';

const COLUMNS = { tabs: 'tabs', kpis: 'kpis' };

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const row = await getSingleRow('visibility_settings', auth.email);
    if (!row) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: { tabs: row.tabs, kpis: row.kpis } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const patch = await request.json();
    await upsertSingleRow('visibility_settings', auth.email, COLUMNS, ['tabs', 'kpis'], patch);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
