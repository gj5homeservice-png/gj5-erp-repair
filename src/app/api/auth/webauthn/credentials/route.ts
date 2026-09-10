import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { listCredentials } from '@/lib/webauthn';

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const credentials = await listCredentials(auth.email, auth.employeeId);
    return NextResponse.json({ success: true, credentials });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
