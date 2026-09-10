import { NextResponse } from 'next/server';
import { buildAuthenticationOptions } from '@/lib/webauthn';

// Public — there's no identity to authenticate yet at this point. Returns a
// usernameless ("discoverable credential") challenge: the browser's own
// passkey/biometric prompt shows every passkey registered for this site,
// with no email typed first, matching the one-tap login button in the UI.
export async function POST(request: Request) {
  try {
    const { options, challengeId } = await buildAuthenticationOptions(request);
    return NextResponse.json({ success: true, options, challengeId });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
