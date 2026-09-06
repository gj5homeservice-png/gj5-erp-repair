import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { listEmployeeDocuments, uploadEmployeeDocument } from '@/lib/erp/employees';

// KYC vault access is gated by the same 'Employees' module permission grid
// (view/create) rather than a separate KYC_* permission namespace — this
// still satisfies "no public access, must be authenticated and authorized,
// 403 for unauthorized" without doubling the permission model.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'view');
  if (isAuthError(auth)) return auth;
  try {
    const data = await listEmployeeDocuments(auth.email, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(request, 'Employees', 'create');
  if (isAuthError(auth)) return auth;
  try {
    const { documentType, fileData } = await request.json();
    if (!documentType || !fileData) {
      return NextResponse.json({ success: false, error: 'documentType and fileData are required' }, { status: 400 });
    }
    const docId = await uploadEmployeeDocument(auth.email, id, documentType, fileData, auth.employeeId || auth.email);
    return NextResponse.json({ success: true, id: docId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
