"use client"

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

function RepairDetailContent({ id }: { id: string }) {
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerApiFetch(`/api/customer/repairs/${id}`)
      .then(json => setJob(json.data))
      .catch(err => setError(err?.message || 'Could not load this repair.'));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <Link href="/customer/repairs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#123C8C] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to My Repairs
        </Link>

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4">{error}</div>}
        {!job && !error && (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#123C8C] animate-spin" /></div>
        )}

        {job && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <p className="font-code font-black text-[#123C8C] text-lg">{job.id}</p>
                  <h1 className="font-headline font-bold text-xl text-slate-900 break-words">{job.productType} — {job.brand}{job.model ? ` ${job.model}` : ''}</h1>
                </div>
                <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full shrink-0 ${STATUS_COLORS[job.status] || 'bg-slate-100 text-slate-600'}`}>{job.status}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <DetailRow label="Problem" value={job.problemDescription} />
                <DetailRow label="Technician" value={job.technicianName || 'Not yet assigned'} />
                <DetailRow label="Received Date" value={job.receivedDate} />
                <DetailRow label="Expected Date" value={job.expectedDeliveryDate || 'Not yet set'} />
                <DetailRow label="Warranty" value={job.warrantyDuration || 'Not applicable'} />
                <DetailRow label="Last Update" value={new Date(job.updatedAt).toLocaleString()} />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
                  <p className="font-code font-black text-slate-900">₹{job.grandTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Paid</p>
                  <p className="font-code font-black text-emerald-600">₹{job.totalPaid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Balance Due</p>
                  <p className="font-code font-black text-rose-600">₹{job.balanceDue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <h2 className="font-bold text-slate-900 text-sm mb-5">Status History</h2>
              <div className="space-y-4">
                {job.statusHistory.map((s: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-[#123C8C]/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#123C8C]" />
                      </div>
                      {i < job.statusHistory.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-bold text-slate-800 text-sm">{s.status}</p>
                      <p className="text-xs text-slate-400">{new Date(s.changedAt).toLocaleString()}</p>
                      {s.note && <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {job.payments.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
                <h2 className="font-bold text-slate-900 text-sm mb-4">Payment History</h2>
                <div className="space-y-2.5">
                  {job.payments.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-2.5 last:pb-0">
                      <span className="text-slate-500">{p.date} <span className="text-slate-300">·</span> {p.method}</span>
                      <span className="font-code font-bold text-slate-800">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
      <p className="text-slate-800 font-semibold break-words">{value}</p>
    </div>
  );
}

export default function RepairDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return (
    <CustomerAuthGuard>
      <RepairDetailContent id={id} />
    </CustomerAuthGuard>
  );
}
