import { NextResponse } from 'next/server';
import { requireCustomer, isCustomerAuthError } from '@/lib/customer-auth';
import { getCustomerById } from '@/lib/customer-credentials';

export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (isCustomerAuthError(auth)) return auth;

  try {
    const account = await getCustomerById(auth.userEmail, auth.customerId);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
