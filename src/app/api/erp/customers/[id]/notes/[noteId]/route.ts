import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { deleteCustomerNote } from '@/lib/erp/customers';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const auth = await requireUser(request);
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
