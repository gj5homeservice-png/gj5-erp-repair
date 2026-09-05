import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getSingleRow, upsertSingleRow } from '@/lib/erp/singleRow';

const COLUMNS = { order: 'order_json' };

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const row = await getSingleRow('nav_order', auth.email);
    if (!row) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: row.order_json });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const order = await request.json();
    await upsertSingleRow('nav_order', auth.email, COLUMNS, ['order'], { order });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
