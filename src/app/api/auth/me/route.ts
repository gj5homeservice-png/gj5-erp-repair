import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { allFullAccess } from '@/lib/permissions';

// The client's own source of truth for "who is logged in and what can they
// access" — used to filter the sidebar and gate module rendering. Owner/
// admin sessions (employeeId === null) always get full access, matching the
// same guarantee enforced everywhere else. An employee session's permissions
// are read fresh from MySQL on every call — never cached client-side as the
// source of truth, so an Admin's permission change takes effect the moment
// the employee's browser next calls this (page load / tab focus / re-login).
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  if (!auth.employeeId) {
    return NextResponse.json({ success: true, data: { isEmployee: false, employeeId: null, role: 'Admin', permissions: allFullAccess() } });
  }

  try {
    const { getEmployeeAccessContext } = await import('@/lib/erp/employees');
    const context = await getEmployeeAccessContext(auth.email, auth.employeeId);
    if (!context || context.status !== 'Active') {
      return NextResponse.json({ success: false, error: 'Your account is not active. Contact your administrator.' }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      data: { isEmployee: true, employeeId: auth.employeeId, role: context.role, permissions: context.permissions },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
