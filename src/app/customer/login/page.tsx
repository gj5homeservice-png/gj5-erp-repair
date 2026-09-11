"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, User, Lock } from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';
import { setCustomerSession } from '@/lib/customer-client';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Invalid mobile/email or password.');
      setCustomerSession(json.token, json.customer.id, json.customer.name);
      router.push('/customer/repairs');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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
              disabled={loading}
              className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In'}
            </button>
          </form>

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
