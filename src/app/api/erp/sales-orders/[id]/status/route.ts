import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { setSaleStatus, actorFrom, salesErrorResponse } from '@/lib/erp/saleRecords';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Sales', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const { status } = await request.json();
    const data = await setSaleStatus(auth.email, id, status, actorFrom(auth));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const r = salesErrorResponse(error);
    return NextResponse.json(r.body, { status: r.status });
  }
}
