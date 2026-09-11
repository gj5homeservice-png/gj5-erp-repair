import { NextResponse } from 'next/server';
import { createSession, deleteSession, validateSession } from '@/lib/session';
import { findOwnerByLoginIdentifier, verifyOwnerPassword } from '@/lib/owner-credentials';

// Owner/admin login. Previously this route trusted a bare `{ email }` from
// the client with no password check of its own — the real check only ever
// happened in browser JavaScript in login/page.tsx, which meant anyone who
// could reach this endpoint directly could mint a valid owner session for
// any email with no password at all. It now verifies a real bcrypt hash
// server-side against `owner_credentials`, the same way employee logins
// already worked via /api/auth/employee-login. The session is always minted
// against the account's immutable tenant-scope email, never whatever alias
// (login_email) was typed in, so every existing `WHERE user_email = ?` query
// across the ERP keeps working unchanged.
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const invalid = () => NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });

    // The client response is deliberately the same generic message either
    // way (never reveal whether an email exists), but that also means an
    // admin who's genuinely typing their real password has no way to know
    // WHICH check failed. These two lines never log the password or its
    // hash — only which of the two independent checks rejected the
    // attempt — so a real failure is diagnosable from the server/Hostinger
    // logs instead of being a total black box.
    const owner = await findOwnerByLoginIdentifier(email);
    if (!owner) {
      console.warn(`[auth/session] No owner_credentials row matched identifier "${email}" (checked against both user_email and login_email).`);
      return invalid();
    }
    const ok = await verifyOwnerPassword(owner.userEmail, password);
    if (!ok) {
      console.warn(`[auth/session] Password did not match the stored hash for owner "${owner.userEmail}" (matched via identifier "${email}").`);
      return invalid();
    }

    const deviceInfo = request.headers.get('user-agent') || undefined;
    const { token, expiresAt } = await createSession(owner.userEmail, deviceInfo);
    return NextResponse.json({ success: true, token, expiresAt });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    const status = error?.code ? 503 : 500;
    return NextResponse.json({ success: false, error: status === 503 ? `Login check failed: ${detail}` : detail }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token) {
      // Only employee sessions get a logout audit entry — an owner/admin
      // session (employeeId === null) has no employee row to attach it to.
      const identity = await validateSession(token);
      if (identity?.employeeId) {
        const { logLoginAudit } = await import('@/lib/erp/employees');
        await logLoginAudit(identity.email, identity.employeeId, identity.employeeId, 'logout').catch(() => {});
      }
      await deleteSession(token);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
