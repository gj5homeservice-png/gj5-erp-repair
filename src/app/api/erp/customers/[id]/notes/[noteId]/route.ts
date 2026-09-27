import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/api-auth';
import { editCustomerNote, deleteCustomerNote } from '@/lib/erp/customers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const auth = await requirePermission(request, 'Customer Department', 'edit');
  if (isAuthError(auth)) return auth;

  try {
    const { noteId } = await params;
    const body = await request.json();
    const ok = await editCustomerNote(auth.email, noteId, body?.note);
    if (!ok) return NextResponse.json({ success: false, error: 'Note not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isValidation = error?.message?.includes('required');
    if (!isValidation) console.error('[erp/customers/:id/notes/:noteId] update failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to update this note. Please try again.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const auth = await requirePermission(request, 'Customer Department', 'delete');
  if (isAuthError(auth)) return auth;

  try {
    const { noteId } = await params;
    const ok = await deleteCustomerNote(auth.email, noteId);
    if (!ok) return NextResponse.json({ success: false, error: 'Note not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[erp/customers/:id/notes/:noteId] delete failed:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to delete this note. Please try again.' }, { status: 500 });
  }
}
