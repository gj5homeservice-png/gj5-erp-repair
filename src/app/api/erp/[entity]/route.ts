import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { ENTITIES } from '@/lib/erp/entities';
import { listEntity, createEntity } from '@/lib/erp/genericCrud';

// Generic list/create for simple, single-table entities (customers, employees,
// attendance, salaries, leaves, inquiries, transportation-logs). Entities with
// nested children or side effects (invoices, stock-items, repair-calls,
// repair-jobs, sales-orders, expenses, wallet) have their own bespoke route
// files under src/app/api/erp/*, which Next.js matches ahead of this dynamic
// [entity] segment since a literal path always wins over a dynamic one.

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ success: false, error: 'Unknown entity' }, { status: 404 });

  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const data = await listEntity(config, auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ success: false, error: 'Unknown entity' }, { status: 404 });

  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const data = await createEntity(config, auth.email, body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
