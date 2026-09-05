import { NextResponse } from 'next/server';
import { createSession, deleteSession } from '@/lib/session';

// Called by login/page.tsx immediately AFTER its existing demo-credential
// check (email/password or mobile/OTP) already passed. This route does not
// re-check credentials — it only mints a server-verified session token for
// the identity the client has already established, so every subsequent
// /api/erp/* call can resolve "who is this" without trusting a client-sent
// email.
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'email is required' }, { status: 400 });
    }
    const deviceInfo = request.headers.get('user-agent') || undefined;
    const { token, expiresAt } = await createSession(email, deviceInfo);
    return NextResponse.json({ success: true, token, expiresAt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token) await deleteSession(token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
