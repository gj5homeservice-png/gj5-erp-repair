"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, Tv } from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';
import { getCustomerToken, customerApiFetch } from '@/lib/customer-client';

const DEVICE_TYPES = ['TV', 'LED TV', 'LCD TV', 'Smart TV', 'Other Electronics'];

const EMPTY_FORM = {
  customerName: '', mobile: '', email: '', address: '', pincode: '',
  deviceType: '', brand: '', model: '', problem: '',
  preferredDate: '', preferredTime: '', notes: '',
};

export default function BookRepairPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  // One key per form-load, sent with the submission and reused on any retry
  // of THIS same attempt (e.g. a network error triggering a re-click) — the
  // server treats a repeat of the same key as the same booking rather than
  // creating a second one. A page refresh generates a fresh key, which is
  // correct: that's a deliberate new submission, not a retry.
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));

  // Prefill from the logged-in customer's own profile, if any — booking
  // itself never requires being logged in (guest booking is fine).
  useEffect(() => {
    const token = getCustomerToken();
    if (!token) return;
    customerApiFetch('/api/customer/me')
      .then(json => {
        const c = json.data;
        setForm(f => ({ ...f, customerName: c.name || '', mobile: c.mobile || '', email: c.email || '', address: c.address || '', pincode: c.pincode || '' }));
      })
      .catch(() => {});
  }, []);

  const update = (field: keyof typeof EMPTY_FORM, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // already-in-flight guard, on top of the server-side idempotency key
    setError(null);
    setLoading(true);
    try {
      const token = getCustomerToken();
      const res = await fetch('/api/customer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not submit your repair booking.');
      }
      setResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <PublicHeader />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full">
          <div className="text-center space-y-4 mb-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h1 className="font-headline font-black text-2xl sm:text-3xl text-slate-900">Your repair booking has been received.</h1>
            <p className="text-slate-500 text-sm">Our team will review it and contact you shortly to confirm your appointment.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
            <Row label="Booking ID" value={result.id} highlight />
            <Row label="Customer Name" value={result.customerName} />
            <Row label="Mobile" value={result.mobile} />
            <Row label="Service" value={`${result.deviceType}${result.brand ? ` — ${result.brand}` : ''}`} />
            <Row label="Problem" value={result.problemDescription} />
            {(result.preferredDate || result.preferredTime) && (
              <Row label="Preferred Date/Time" value={[result.preferredDate, result.preferredTime].filter(Boolean).join(' at ')} />
            )}
            <Row label="Status" value={result.status} badge />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link href="/customer/login" className="bg-[#123C8C] text-white font-bold text-sm px-6 py-3 rounded-xl text-center hover:bg-[#0D2E63] transition-colors">
              Sign Up / Login to Track This Repair
            </Link>
            <Link href="/" className="bg-slate-100 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl text-center hover:bg-slate-200 transition-colors">
              Back to Home
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full">
        <div className="text-center mb-8 space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#123C8C]/10 flex items-center justify-center">
            <Tv className="w-6 h-6 text-[#123C8C]" />
          </div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-slate-900">Book a Repair</h1>
          <p className="text-slate-500 text-sm">Tell us about your device — we'll take it from there.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-5">
          <Section title="Your Details">
            <Grid>
              <Field label="Customer Name *">
                <Input value={form.customerName} onChange={v => update('customerName', v)} placeholder="Full name" required />
              </Field>
              <Field label="Mobile Number *">
                <Input value={form.mobile} onChange={v => update('mobile', v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" required inputMode="numeric" />
              </Field>
              <Field label="Email (optional)">
                <Input type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" />
              </Field>
              <Field label="Pincode">
                <Input value={form.pincode} onChange={v => update('pincode', v.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" inputMode="numeric" />
              </Field>
            </Grid>
            <Field label="Address *">
              <Textarea value={form.address} onChange={v => update('address', v)} placeholder="House no, street, area, city" required />
            </Field>
          </Section>

          <Section title="Device Details">
            <Grid>
              <Field label="Device Type *">
                <Select value={form.deviceType} onChange={v => update('deviceType', v)} required>
                  <option value="">Select device type</option>
                  {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Brand *">
                <Input value={form.brand} onChange={v => update('brand', v)} placeholder="e.g. Samsung, LG, Sony" required />
              </Field>
              <Field label="Model Number (optional)">
                <Input value={form.model} onChange={v => update('model', v)} placeholder="Model number, if known" />
              </Field>
            </Grid>
            <Field label="Problem / Complaint *">
              <Textarea value={form.problem} onChange={v => update('problem', v)} placeholder="Describe the issue you're facing" required />
            </Field>
          </Section>

          <Section title="Preferred Schedule (optional)">
            <Grid>
              <Field label="Preferred Date">
                <Input type="date" value={form.preferredDate} onChange={v => update('preferredDate', v)} />
              </Field>
              <Field label="Preferred Time">
                <Input type="time" value={form.preferredTime} onChange={v => update('preferredTime', v)} />
              </Field>
            </Grid>
            <Field label="Additional Notes">
              <Textarea value={form.notes} onChange={v => update('notes', v)} placeholder="Anything else we should know?" />
            </Field>
          </Section>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#123C8C] hover:bg-[#0D2E63] text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-blue-900/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Repair Request'}
          </button>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pb-5 border-b border-slate-200 last:border-0 last:pb-0">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      {...props}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C]"
    />
  );
}

function Textarea({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return (
    <textarea
      {...props}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C] resize-none"
    />
  );
}

function Select({ value, onChange, children, ...props }: { value: string; onChange: (v: string) => void; children: React.ReactNode } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  return (
    <select
      {...props}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123C8C]/30 focus:border-[#123C8C]"
    >
      {children}
    </select>
  );
}

function Row({ label, value, highlight, badge }: { label: string; value: string; highlight?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500 font-semibold">{label}</span>
      {badge ? (
        <span className="bg-blue-50 text-[#123C8C] text-xs font-bold uppercase px-3 py-1 rounded-full">{value}</span>
      ) : (
        <span className={highlight ? 'font-code font-black text-[#123C8C] text-base' : 'font-semibold text-slate-800 text-right'}>{value}</span>
      )}
    </div>
  );
}
