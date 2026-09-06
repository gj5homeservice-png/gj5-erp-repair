import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { changeEmployeeStatus } from '@/lib/erp/employees';

const VALID_STATUSES = ['Active', 'Inactive', 'Suspended', 'Resigned', 'Terminated'];

// Suspend / Activate / Terminate — kept on the 'Employees' module (roster
// administration), same as create/delete, distinct from 'Employee Profile'
// which gates editing the profile fields themselves.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    const ok = await changeEmployeeStatus(auth.email, id, status, auth.employeeId || auth.email);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
