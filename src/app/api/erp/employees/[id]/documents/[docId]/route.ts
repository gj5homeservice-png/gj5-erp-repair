import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { setDocumentVerification, deleteEmployeeDocument } from '@/lib/erp/employees';

// Verify/Reject a document — requires 'edit' on the dedicated KYC Vault
// permission module, kept separate from the generic Employees grid.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const auth = await requirePermission(request, 'KYC Vault', 'edit');
  if (isAuthError(auth)) return auth;
  try {
    const { status, notes, reason } = await request.json();
    if (status !== 'Verified' && status !== 'Rejected') {
      return NextResponse.json({ success: false, error: 'status must be Verified or Rejected' }, { status: 400 });
    }
    if (status === 'Rejected' && !reason) {
      return NextResponse.json({ success: false, error: 'A rejection reason is required' }, { status: 400 });
    }
    const ok = await setDocumentVerification(auth.email, id, docId, status, auth.employeeId || auth.email, notes, reason);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const auth = await requirePermission(request, 'KYC Vault', 'delete');
  if (isAuthError(auth)) return auth;
  try {
    const ok = await deleteEmployeeDocument(auth.email, id, docId, auth.employeeId || auth.email);
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
