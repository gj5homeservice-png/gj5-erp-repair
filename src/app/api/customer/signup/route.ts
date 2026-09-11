import { NextResponse } from 'next/server';
import { createCustomerAccount } from '@/lib/customer-credentials';
import { createCustomerSession } from '@/lib/customer-session';
import { getPasswordStrengthError } from '@/lib/password';
import { getShopTenantEmail } from '@/lib/public-shop';

const MOBILE_RE = /^[0-9]{10}$/;

// Public — anyone can create a customer account. Never touches
// owner_credentials/employee_credentials/sessions in any way.
export async function POST(request: Request) {
  try {
    const { name, mobile, email, password, address, pincode } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your name.' }, { status: 400 });
    }
    if (!mobile || typeof mobile !== 'string' || !MOBILE_RE.test(mobile)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Please enter a password.' }, { status: 400 });
    }
    const strengthError = getPasswordStrengthError(password);
    if (strengthError) {
      return NextResponse.json({ success: false, error: strengthError }, { status: 400 });
    }

    const shopEmail = getShopTenantEmail();
    const account = await createCustomerAccount(shopEmail, {
      name: name.trim(),
      mobile,
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
      password,
      address: typeof address === 'string' && address.trim() ? address.trim() : null,
      pincode: typeof pincode === 'string' && pincode.trim() ? pincode.trim() : null,
    });

    const deviceInfo = request.headers.get('user-agent') || undefined;
    const { token, expiresAt } = await createCustomerSession(account.id, shopEmail, deviceInfo);

    return NextResponse.json({ success: true, token, expiresAt, customer: account });
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const detail = error?.code ? `${error.code}: ${error?.message || ''}`.trim() : (error?.message || 'Internal Server Error');
    return NextResponse.json({ success: false, error: error?.code ? `Signup failed: ${detail}` : detail }, { status: error?.code ? 503 : 500 });
  }
}
