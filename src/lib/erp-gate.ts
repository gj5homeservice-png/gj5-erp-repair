import { NextResponse } from 'next/server';

// Shared with middleware.ts — the same secret-URL gate cookie, so it can
// also be granted from here: a successful owner/employee/passkey login is
// just as strong a proof of belonging as knowing the secret URL, so
// /api/auth/session, /api/auth/employee-login, and the WebAuthn login-verify
// route set this cookie on success. This is what makes the single public
// login page (src/app/customer/login/page.tsx) actually able to reach
// /dashboard afterwards — /dashboard and every /api/erp/* route still
// require this cookie exactly as before, nothing about that check changed;
// admins just now have a second, credential-proven way to obtain it instead
// of only ever getting it by visiting /x7k9p2 first.
export const GATE_COOKIE = 'gj5_erp_gate';
export const GATE_VALUE = 'granted-7f3a1c';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function grantErpGate(res: NextResponse): void {
  res.cookies.set(GATE_COOKIE, GATE_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}
