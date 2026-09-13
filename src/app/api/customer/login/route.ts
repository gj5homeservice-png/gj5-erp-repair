import { NextResponse } from 'next/server';
import { verifyCustomerPassword } from '@/lib/customer-credentials';
import { createCustomerSession } from '@/lib/customer-session';
import { getShopTenantEmail } from '@/lib/public-shop';

// Public. Mirrors /api/auth/session's own guarantee: a request with only an
// identifier and no password can never succeed — verifyCustomerPassword
// always requires (and bcrypt-checks) a real password server-side.
export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Mobile/email and password are required.' }, { status: 400 });
    }

    const shopEmail = getShopTenantEmail();
    const account = await verifyCustomerPassword(shopEmail, identifier.trim(), password);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Invalid mobile/email or password.' }, { status: 401 });
    }

    const deviceInfo = request.headers.get('user-agent') || undefined;
    const { token, expiresAt } = await createCustomerSession(account.id, shopEmail, deviceInfo);

    return NextResponse.json({ success: true, token, expiresAt, customer: account });
  } catch (error: any) {
    // Public, customer-facing endpoint — never echo raw driver/SQL detail.
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    console.error('[customer/login] request failed:', detail);
    return NextResponse.json({ success: false, error: 'We could not check your login right now. Please try again in a moment.' }, { status: error?.code ? 503 : 500 });
  }
}
