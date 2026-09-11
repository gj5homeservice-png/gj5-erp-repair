import { NextResponse, type NextRequest } from 'next/server';

// Secret-URL access gate for GJ5 HOME SERVICE.
//
// The ERP (and the public sign-up/super-admin surfaces) must not be
// directly reachable — only https://<domain>/x7k9p2 grants entry. Visiting
// that path sets an HttpOnly cookie and forwards the visitor into the app;
// every other protected request (page OR API) requires that cookie, and a
// missing cookie always results in a plain 404 — never a redirect back to
// the secret path, since redirecting would hand the "password" to anyone
// who simply tries a blocked URL, defeating the whole point.
//
// Employee attendance check-in links (/attendance, /attendance/[token], and
// their backing /api/erp/attendance-links/* routes) are sent to employees
// via SMS/WhatsApp and must keep working without anyone ever visiting the
// secret URL, so they're excluded from the gate entirely.
//
// The public customer repair-booking website (homepage, booking form,
// customer signup/login/my-repairs, and their backing /api/customer/*
// routes) is likewise excluded — real customers must be able to reach it
// without knowing the secret URL. This is a deliberate, narrow addition,
// not a weakening of the gate: everything else (every /dashboard route,
// every /api/erp/* route, /settings, /super-admin) stays exactly as gated
// as before, and customer identity lives in a completely separate
// customer_sessions table (see src/lib/customer-auth.ts) that the ERP's own
// requireUser() has no knowledge of, so a customer session can never pass
// as an owner/employee session even if a customer somehow obtained the
// gate cookie.

const SECRET_PATH = '/x7k9p2';
const GATE_COOKIE = 'gj5_erp_gate';
const GATE_VALUE = 'granted-7f3a1c';
const ROBOTS_HEADER = { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' } as const;
const ONE_YEAR = 60 * 60 * 24 * 365;

function isAlwaysPublic(pathname: string): boolean {
  if (pathname === '/attendance' || pathname === '/attendance/') return true;
  if (pathname.startsWith('/attendance/')) return true; // /attendance/[token]
  if (pathname.startsWith('/api/erp/attendance-links/')) return true;
  if (pathname === '/robots.txt' || pathname === '/favicon.ico') return true;

  // Public customer website — see the comment block above.
  if (pathname === '/' || pathname === '/book-repair' || pathname === '/book-repair/') return true;
  if (pathname.startsWith('/customer/')) return true;
  if (pathname.startsWith('/api/customer/')) return true;

  return false;
}

function withRobotsHeader(res: NextResponse): NextResponse {
  res.headers.set(ROBOTS_HEADER.key, ROBOTS_HEADER.value);
  return res;
}

function setGateCookie(res: NextResponse): void {
  res.cookies.set(GATE_COOKIE, GATE_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

function notFound(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return withRobotsHeader(NextResponse.json({ error: 'Not Found' }, { status: 404 }));
  }
  const url = request.nextUrl.clone();
  url.pathname = '/__gj5_gate_not_found__';
  return withRobotsHeader(NextResponse.rewrite(url, { status: 404 }));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAlwaysPublic(pathname)) {
    return NextResponse.next();
  }

  const hasGate = request.cookies.get(GATE_COOKIE)?.value === GATE_VALUE;

  // The secret entry point itself: grant the gate cookie and enter the app.
  if (pathname === SECRET_PATH || pathname === `${SECRET_PATH}/`) {
    const res = NextResponse.redirect(new URL('/dashboard', request.url));
    setGateCookie(res);
    return withRobotsHeader(res);
  }

  // Any other path under the secret prefix (e.g. /x7k9p2/login) — grant the
  // cookie and transparently serve the real, un-prefixed route so a direct
  // bookmark to a specific page under the secret path also works.
  if (pathname.startsWith(`${SECRET_PATH}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(SECRET_PATH.length) || '/dashboard';
    const res = NextResponse.rewrite(url);
    setGateCookie(res);
    return withRobotsHeader(res);
  }

  if (hasGate) {
    return NextResponse.next();
  }

  return notFound(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
