import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { isPasswordStrongEnough } from '@/lib/password';
import { resetEmployeePassword } from '@/lib/erp/employees';

// Reset-only — there is deliberately no "view current password" capability
// anywhere in this system. The hash is never selected by any route.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const { newPassword } = await request.json();
    if (!isPasswordStrongEnough(newPassword)) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    const ok = await resetEmployeePassword(auth.email, id, newPassword, auth.employeeId || auth.email);
    if (!ok) return NextResponse.json({ success: false, error: 'This employee has no login access set up yet.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
