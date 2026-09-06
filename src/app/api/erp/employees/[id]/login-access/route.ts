import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { isPasswordStrongEnough } from '@/lib/password';
import { setEmployeeLoginAccess } from '@/lib/erp/employees';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employee Login', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    if (body.password && !isPasswordStrongEnough(body.password)) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    await setEmployeeLoginAccess(auth.email, id, body, auth.employeeId || auth.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
