import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { verifyCurrentPassword, isLoginEmailAvailable, createEmailChangeRequest, getCurrentLoginEmail } from '@/lib/self-account';
import { isEmailSendingConfigured } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Re-authentication (current password) is required to even request a
// change, on top of the new address itself needing to be verified before
// it's applied — two independent checks for one sensitive action.
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;

  try {
    const { newEmail, currentPassword } = await request.json();
    if (!newEmail || typeof newEmail !== 'string' || !EMAIL_RE.test(newEmail)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    const identity = { userEmail: auth.email, employeeId: auth.employeeId };
    const ok = await verifyCurrentPassword(identity, currentPassword);
    if (!ok) return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });

    const current = await getCurrentLoginEmail(identity);
    if (newEmail.toLowerCase() === current.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'That is already your current email.' }, { status: 400 });
    }

    const available = await isLoginEmailAvailable(newEmail, identity);
    if (!available) {
      return NextResponse.json({ success: false, error: 'That email address is already in use.' }, { status: 409 });
    }

    const { token, expiresAt } = await createEmailChangeRequest(identity, newEmail);
    const configured = isEmailSendingConfigured();

    // No email provider is configured yet — rather than pretend to send
    // anything, the verification link itself is returned so the already-
    // authenticated account holder can complete the flow manually. Once
    // SMTP/an email API is connected, this same token continues to work —
    // only the delivery mechanism changes.
    const verificationPath = `/api/auth/change-email/confirm?token=${token}`;
    return NextResponse.json({
      success: true,
      emailSendingConfigured: configured,
      expiresAt,
      ...(configured ? {} : { verificationPath }),
    });
  } catch (error: any) {
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: detail }, { status: error?.code ? 503 : 500 });
  }
}
