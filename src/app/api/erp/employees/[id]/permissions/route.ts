import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { getEmployeeAccessContext, updateEmployeePermissions } from '@/lib/erp/employees';

// Managing another employee's permissions requires 'edit' on the Employees
// module itself — deliberately not a separate "manage permissions" action,
// to keep the permission model to the same 6 generic actions everywhere
// rather than a bespoke one-off flag for this single case.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const context = await getEmployeeAccessContext(auth.email, id);
    if (!context) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: context.permissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const permissions = await request.json();
    const ok = await updateEmployeePermissions(auth.email, id, permissions, auth.employeeId || auth.email);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
