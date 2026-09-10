import { NextResponse } from 'next/server';
import { confirmEmailChangeRequest } from '@/lib/self-account';

// Deliberately public (no session required) — the token itself is the proof
// of ownership of the new address, exactly like every other "click the link
// in your email" verification flow. Supports GET so the link can be opened
// directly (e.g. pasted into a browser), and POST for programmatic use.
async function handle(token: string | null) {
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing verification token.' }, { status: 400 });
  }
  const result = await confirmEmailChangeRequest(token);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, newEmail: result.newEmail });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  return handle(token);
}

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({ token: null }));
  return handle(token);
}
