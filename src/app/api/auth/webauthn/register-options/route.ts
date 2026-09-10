import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { buildRegistrationOptions } from '@/lib/webauthn';
import { getCurrentLoginEmail } from '@/lib/self-account';

// Authenticated — registering a new passkey always happens from within an
// already-established session (Settings > Login & Security), never as a
// standalone "prove who you are" step of its own.
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const identity = { userEmail: auth.email, employeeId: auth.employeeId };
    const displayName = await getCurrentLoginEmail(identity);
    const { options, challengeId } = await buildRegistrationOptions(request, identity, displayName);
    return NextResponse.json({ success: true, options, challengeId });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
