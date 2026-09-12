"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, User, Lock, Fingerprint } from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';
import { setCustomerSession } from '@/lib/customer-client';
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication } from '@simplewebauthn/browser';

const GENERIC_ERROR = 'Invalid mobile/email or password.';

// The single login form for the entire site. It never asks "are you a
// customer or an admin" — it just tries each real credential store, in
// order, and only the one that actually matches decides where you land.
// A wrong identifier/password combination looks identical everywhere
// (same generic error, same 401), so nothing here reveals whether an
// email/mobile belongs to a customer, an owner, or an employee account.
export default function CustomerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!browserSupportsWebAuthn()) { setPasskeySupported(false); return; }
      const available = await platformAuthenticatorIsAvailable().catch(() => false);
      setPasskeySupported(available);
    })();
  }, []);

  const enterAsStaff = (token: string) => {
    localStorage.setItem('gj5_auth_token', token);
    localStorage.setItem('gj5_active_user', identifier);
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError(null);
    setLoading(true);
    try {
      // 1. Customer account — the common case for this public site.
      const customerRes = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const customerJson = await customerRes.json();
      if (customerRes.ok && customerJson.success) {
        setCustomerSession(customerJson.token, customerJson.customer.id, customerJson.customer.name);
        router.push('/customer/repairs');
        return;
      }

      // 2. Not a customer (or wrong password there) — try the owner/admin
      // account. This never weakens that check: it's the exact same
      // server-side bcrypt verification /api/auth/session has always done.
      const ownerRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });
      const ownerJson = await ownerRes.json();
      if (ownerRes.ok && ownerJson.success) {
        enterAsStaff(ownerJson.token);
        return;
      }

      // 3. Not the owner either — try it as an employee's own username/password.
      const employeeRes = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      });
      const employeeJson = await employeeRes.json();
      if (employeeRes.ok && employeeJson.success) {
        enterAsStaff(employeeJson.token);
        return;
      }

      // None of the three matched — one generic message regardless of which
      // account type (or none) the identifier belongs to.
      throw new Error(GENERIC_ERROR);
    } catch (err: any) {
      setError(err?.message || GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (passkeySupported === false) {
      setError('Biometric / Passkey login is not available on this device/browser. Please use your mobile/email and password.');
      return;
    }
    setError(null);
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/webauthn/login-options', { method: 'POST' });
      const optionsJson = await optionsRes.json();
      if (!optionsRes.ok || !optionsJson.success) throw new Error(optionsJson.error || 'Could not start passkey sign-in.');

      const assertion = await startAuthentication({ optionsJSON: optionsJson.options });

      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: optionsJson.challengeId, response: assertion }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.success) throw new Error(verifyJson.error || 'Passkey sign-in failed.');

      localStorage.setItem('gj5_auth_token', verifyJson.token);
      localStorage.setItem('gj5_active_user', verifyJson.email);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') { setPasskeyLoading(false); return; }
      setError(err?.message || 'Passkey sign-in failed. Please use mobile/email and password instead.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="font-headline font-black text-2xl text-slate-900">Track My Repair</h1>
            <p className="text-slate-500 text-sm mt-1">Log in to view your repair status.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Mobile Number or Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Mobile or email"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C]"
                />
              </div>
            </div>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3">{error}</div>}

            <button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In'}
            </button>
          </form>

          {passkeySupported !== false && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading || passkeyLoading}
                className="w-full h-12 rounded-xl font-bold text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Fingerprint className="w-4 h-4" /> Use Fingerprint / Face ID / Passkey</>)}
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            New here? <Link href="/customer/signup" className="text-[#123C8C] font-bold">Create an Account</Link>
          </p>
          <p className="text-center text-xs text-slate-400 mt-3">
            Just want to book a repair? <Link href="/book-repair" className="text-[#123C8C] font-semibold">Book without an account</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
