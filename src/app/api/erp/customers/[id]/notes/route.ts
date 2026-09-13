import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { addCustomerNote } from '@/lib/erp/customers';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = await addCustomerNote(auth.email, id, body?.note, body?.createdBy);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const isValidation = error?.message?.includes('required');
    if (!isValidation) console.error('[erp/customers/:id/notes] add failed:', error?.message || error);
    return NextResponse.json(
      { success: false, error: isValidation ? error.message : 'Unable to save this note. Please try again.' },
      { status: isValidation ? 400 : 500 }
    );
  }
}
