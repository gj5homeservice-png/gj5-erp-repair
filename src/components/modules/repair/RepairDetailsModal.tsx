"use client"

import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RepairJob } from '@/lib/types';
import { partsTotal, grandTotal, totalPaid, balanceDue } from '@/lib/repair-utils';

interface RepairDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-800/50 text-xs">
    <span className="text-slate-500 uppercase font-bold">{label}</span>
    <span className="text-slate-200 font-bold text-right">{value ?? '—'}</span>
  </div>
);

export function RepairDetailsModal({ isOpen, onClose, job }: RepairDetailsModalProps) {
  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {job.id}
            <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[10px] uppercase">{job.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-slate-800/50 border border-slate-700 h-9 flex-wrap h-auto">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs">Parts &amp; Billing</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Status History</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto mt-3 pr-1">
            <TabsContent value="overview" className="space-y-1 mt-0">
              <Row label="Customer" value={job.customerName} />
              <Row label="Mobile" value={job.mobile} />
              <Row label="Email" value={job.email} />
              <Row label="Address" value={job.address} />
              <Row label="Product" value={`${job.productType} - ${job.brand} ${job.model}`} />
              <Row label="Serial Number" value={job.serialNumber} />
              <Row label="Product / TV Size" value={job.productSize} />
              <Row label="Problem / Complaint" value={job.problemDescription} />
              <Row label="Customer Notes" value={job.customerNotes} />
              <Row label="Technician" value={job.technicianName} />
              <Row label="Received Date" value={job.receivedDate} />
              <Row label="Expected Delivery" value={job.expectedDeliveryDate} />
            </TabsContent>

            <TabsContent value="billing" className="space-y-1 mt-0">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Parts Used</div>
              {job.parts.length === 0 && <p className="text-xs text-slate-600 italic mb-3">No parts added.</p>}
              {job.parts.map(p => (
                <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-300">{p.partName} ({p.partId}) x{p.qty}</span>
                  <span className="font-code text-slate-200">₹{p.total.toLocaleString()}</span>
                </div>
              ))}
              <Row label="Parts Total" value={`₹${partsTotal(job).toLocaleString()}`} />
              <Row label="Labour Charges" value={`₹${job.labourCharges.toLocaleString()}`} />
              <Row label="Other Charges" value={`₹${job.otherCharges.toLocaleString()}`} />
              <Row label="Discount" value={`-₹${job.discount.toLocaleString()}`} />
              <Row label="Grand Total" value={<span className="text-emerald-400">₹{grandTotal(job).toLocaleString()}</span>} />
              <Row label="Advance Paid" value={`₹${job.advancePayment.toLocaleString()}`} />
              <Row label="Total Paid" value={`₹${totalPaid(job).toLocaleString()}`} />
              <Row label="Balance Due" value={<span className="text-rose-400">₹{balanceDue(job).toLocaleString()}</span>} />
            </TabsContent>

            <TabsContent value="payments" className="space-y-1 mt-0">
              {job.payments.length === 0 && <p className="text-xs text-slate-600 italic">No payments recorded.</p>}
              {job.payments.map(p => (
                <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-300">{p.date} · {p.method}{p.notes ? ` · ${p.notes}` : ''}</span>
                  <span className="font-code font-bold text-emerald-400">₹{p.amount.toLocaleString()}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="notes" className="space-y-1 mt-0">
              {job.notesLog.length === 0 && <p className="text-xs text-slate-600 italic">No notes yet.</p>}
              {job.notesLog.map(n => (
                <div key={n.id} className="text-xs py-1.5 border-b border-slate-800/50">
                  <div className="text-slate-500 text-[10px] mb-0.5">{new Date(n.date).toLocaleString()}</div>
                  <div className="text-slate-300">{n.text}</div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-1 mt-0">
              {job.statusHistory.map(h => (
                <div key={h.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-300">{h.status}{h.note ? ` · ${h.note}` : ''}</span>
                  <span className="text-slate-500">{new Date(h.changedAt).toLocaleString()}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-1 mt-0">
              {job.notifications.length === 0 && <p className="text-xs text-slate-600 italic">No notifications logged.</p>}
              {job.notifications.map(n => (
                <div key={n.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-300">{n.trigger} — {n.message}</span>
                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px]">{n.sentAt ? 'Sent' : 'Pending'}</Badge>
                </div>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
