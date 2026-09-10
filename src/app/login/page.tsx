
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  Fingerprint,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { CompanyLogo } from '@/components/CompanyLogo';
import { getBrandLogoCache } from '@/lib/branding';
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // No session exists yet on this screen, so there's no companyProfile to
  // read the logo from — this mirrors the last logo saved from this device
  // (see setBrandLogoCache in useErpStore's updateCompanyProfile), falling
  // back to the generic mark below if this browser has never saved one.
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setBrandLogo(getBrandLogoCache());
    (async () => {
      if (!browserSupportsWebAuthn()) {
        setPasskeySupported(false);
        return;
      }
      const platformAvailable = await platformAuthenticatorIsAvailable().catch(() => false);
      setPasskeySupported(platformAvailable);
    })();
  }, []);

  const persistSessionAndEnter = (token: string, activeUser: string, welcomeMessage: string) => {
    localStorage.setItem('gj5_auth_token', token);
    localStorage.setItem('gj5_active_user', activeUser);
    toast({ title: "Identity Verified", description: welcomeMessage });
    router.push('/dashboard');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        persistSessionAndEnter(json.token, email, "Accessing GJ5 Home Service Console...");
        return;
      }

      // Not the owner account (or wrong owner password) — try it as an
      // employee login (their own username/password, set up by an Admin in
      // the Employees module). This never weakens the owner-login check
      // above; it's purely a second possibility tried after that one fails.
      const res2 = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const json2 = await res2.json();
      if (res2.ok && json2.success) {
        persistSessionAndEnter(
          json2.token,
          email,
          json2.forcePasswordChange ? "Please change your password after logging in." : "Accessing GJ5 Home Service Console..."
        );
        return;
      }

      toast({ variant: "destructive", title: "Auth Failed", description: json2.error || json.error || "Invalid email or password." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Server Unreachable", description: err?.message || "Could not connect to the ERP database." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (passkeySupported === false) {
      toast({ variant: "destructive", title: "Not Available", description: "Biometric / Passkey login is not available on this device/browser. Please use Email + Password." });
      return;
    }

    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/webauthn/login-options', { method: 'POST' });
      const optionsJson = await optionsRes.json();
      if (!optionsRes.ok || !optionsJson.success) {
        throw new Error(optionsJson.error || 'Could not start passkey sign-in.');
      }

      const assertion = await startAuthentication({ optionsJSON: optionsJson.options });

      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: optionsJson.challengeId, response: assertion }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.success) {
        throw new Error(verifyJson.error || 'Passkey sign-in failed.');
      }

      persistSessionAndEnter(verifyJson.token, verifyJson.email, "Signed in with your passkey.");
    } catch (err: any) {
      // A cancelled/dismissed OS prompt throws too — treat it as a quiet
      // no-op rather than an alarming error toast.
      if (err?.name === 'NotAllowedError') {
        setPasskeyLoading(false);
        return;
      }
      toast({ variant: "destructive", title: "Passkey Sign-In Failed", description: err?.message || "Please use Email + Password instead." });
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden font-body">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#123C8C]/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#E53935]/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-8 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
             <Link href="/" className="p-2 rounded-xl bg-slate-800/50 text-slate-500 hover:text-white transition-colors">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-[#123C8C] uppercase tracking-widest">ERP CONSOLE V4.0</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">Secure Gateway</span>
             </div>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <CompanyLogo src={brandLogo} className="w-full h-full" alt="Company Logo" />
          </div>

          <h1 className="text-2xl font-headline font-bold tracking-tight text-white mb-1 uppercase italic">GJ5 HOME SERVICE</h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black mb-8">GOOD JOB 5 ERP</p>

          <form onSubmit={handleEmailLogin} className="w-full space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Account Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-800 bg-white text-slate-900"
                  placeholder="admin@gj5.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Access Key</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-800 bg-white text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] rounded-xl font-bold uppercase text-xs mt-4 shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Dashboard"}
            </Button>
          </form>

          <div className="w-full flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">or</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handlePasskeyLogin}
            disabled={loading || passkeyLoading || passkeySupported === false}
            className="w-full h-12 rounded-xl font-bold uppercase text-xs border-slate-700 bg-slate-950/50 text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            {passkeyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" />
                Use Fingerprint / Face ID / Passkey
              </span>
            )}
          </Button>
          {passkeySupported === false && (
            <p className="mt-3 text-[9px] text-slate-600 text-center leading-relaxed">
              Biometric / Passkey login is not available on this device/browser. Please use Email + Password.
            </p>
          )}

          <p className="mt-10 text-[9px] text-slate-600 font-bold uppercase leading-relaxed text-center">
            Authorized Personnel Only.<br />Access logged via GJ5 Secure Protocol.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
