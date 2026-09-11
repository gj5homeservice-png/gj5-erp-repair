"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, User, Phone, Mail, Lock, MapPin } from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';
import { setCustomerSession } from '@/lib/customer-client';

export default function CustomerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', address: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create your account.');
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
            <h1 className="font-headline font-black text-2xl text-slate-900">Create Your Account</h1>
            <p className="text-slate-500 text-sm mt-1">Track your repairs and book faster next time.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <LabeledInput icon={User} label="Full Name" value={form.name} onChange={v => update('name', v)} placeholder="Your name" required />
            <LabeledInput icon={Phone} label="Mobile Number" value={form.mobile} onChange={v => update('mobile', v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" required inputMode="numeric" />
            <LabeledInput icon={Mail} label="Email (optional)" type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" />
            <LabeledInput icon={MapPin} label="Address (optional)" value={form.address} onChange={v => update('address', v)} placeholder="Your address" />
            <LabeledInput icon={Lock} label="Password" type="password" value={form.password} onChange={v => update('password', v)} placeholder="At least 8 characters, 1 letter, 1 number" required />

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account? <Link href="/customer/login" className="text-[#123C8C] font-bold">Log In</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function LabeledInput({ icon: Icon, label, value, onChange, ...props }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          {...props}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C]"
        />
      </div>
    </div>
  );
}
