import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { getEmployeeDetail, updateEmployee, deleteEmployee } from '@/lib/erp/employees';

// GET/PUT are gated by 'Employee Profile' — a distinct permission from the
// roster-level 'Employees' grid used by list/create/delete/status below, so
// an Admin can grant someone the ability to view/edit profile details
// without also handing out create/delete/status-change rights, or vice versa.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employee Profile', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const data = await getEmployeeDetail(auth.email, id);
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employee Profile', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    const ok = await updateEmployee(auth.email, id, body, auth.employeeId || auth.email);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'delete');
  if (isAuthError(auth)) return auth;
  try {
    const ok = await deleteEmployee(auth.email, id);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
