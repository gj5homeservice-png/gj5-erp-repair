import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listEmployees, createEmployee } from '@/lib/erp/employees';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'Employees', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const data = await listEmployees(auth.email);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, 'Employees', 'create');
  if (isAuthError(auth)) return auth;
  try {
    const body = await request.json();
    await createEmployee(auth.email, body, auth.employeeId || auth.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
