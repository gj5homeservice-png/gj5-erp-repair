"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Wrench, ChevronRight, PackageSearch } from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';
import { CustomerAuthGuard } from '@/components/customer/CustomerAuthGuard';
import { customerApiFetch } from '@/lib/customer-client';

const STATUS_COLORS: Record<string, string> = {
  Received: 'bg-blue-50 text-blue-700',
  Inspection: 'bg-cyan-50 text-cyan-700',
  'Estimate Sent': 'bg-amber-50 text-amber-700',
  Approved: 'bg-teal-50 text-teal-700',
  'In Progress': 'bg-purple-50 text-purple-700',
  'Waiting for Parts': 'bg-orange-50 text-orange-700',
  Ready: 'bg-lime-50 text-lime-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-rose-50 text-rose-700',
};

function MyRepairsContent() {
  const [repairs, setRepairs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerApiFetch('/api/customer/repairs')
      .then(json => setRepairs(json.data))
      .catch(err => setError(err?.message || 'Could not load your repairs.'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="mb-8">
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-slate-900">My Repairs</h1>
          <p className="text-slate-500 text-sm mt-1">Track the status of every repair you've booked with us.</p>
        </div>

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4">{error}</div>}

        {!repairs && !error && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#123C8C] animate-spin" />
          </div>
        )}

        {repairs && repairs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <PackageSearch className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm">You haven't booked any repairs yet.</p>
            <Link href="/book-repair" className="inline-block bg-[#123C8C] text-white font-bold text-sm px-6 py-2.5 rounded-xl mt-2">
              Book a Repair
            </Link>
          </div>
        )}

        {repairs && repairs.length > 0 && (
          <div className="space-y-3">
            {repairs.map(r => (
              <Link
                key={r.id}
                href={`/customer/repairs/${r.id}`}
                className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#123C8C]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#123C8C]/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-[#123C8C]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-code font-bold text-[#123C8C] text-sm">{r.id}</p>
                      <p className="font-bold text-slate-900 text-sm break-words">{r.productType} — {r.brand}{r.model ? ` ${r.model}` : ''}</p>
                      <p className="text-slate-500 text-xs mt-1 break-words">{r.problemDescription}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <span>Technician: <span className="font-semibold text-slate-700">{r.technicianName || 'Not yet assigned'}</span></span>
                  <span>Received: <span className="font-semibold text-slate-700">{r.receivedDate}</span></span>
                  {r.expectedDeliveryDate && <span>Expected: <span className="font-semibold text-slate-700">{r.expectedDeliveryDate}</span></span>}
                  <span>Paid: <span className="font-semibold text-slate-700">₹{r.totalPaid.toLocaleString()} / ₹{r.grandTotal.toLocaleString()}</span></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function MyRepairsPage() {
  return (
    <CustomerAuthGuard>
      <MyRepairsContent />
    </CustomerAuthGuard>
  );
}
