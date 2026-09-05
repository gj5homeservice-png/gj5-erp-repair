import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { ENTITIES } from '@/lib/erp/entities';
import { updateEntity, deleteEntity } from '@/lib/erp/genericCrud';

export async function PUT(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ success: false, error: 'Unknown entity' }, { status: 404 });

  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const ok = await updateEntity(config, auth.email, id, body);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ success: false, error: 'Unknown entity' }, { status: 404 });

  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const ok = await deleteEntity(config, auth.email, id);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
