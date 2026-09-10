"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { User, Wrench, Wallet, X, ShieldCheck, PackagePlus, StickyNote, History, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RepairJob, RepairJobPayment, RepairJobPart, RepairJobStatus, RepairStatusHistoryEntry, RepairJobPaymentMethod } from '@/lib/types';
import { generateRepairJobId, grandTotal, totalPaid, balanceDue } from '@/lib/repair-utils';

const REPAIR_STATUSES: RepairJobStatus[] = [
  'Received', 'Inspection', 'Estimate Sent', 'Approved', 'In Progress',
  'Waiting for Parts', 'Ready', 'Delivered', 'Cancelled'
];

const WARRANTY_OPTIONS = ['No Warranty', 'Customer Warranty', '30 Days', '90 Days', '180 Days', '1 Year', 'Custom Warranty'];
const PAYMENT_METHODS: RepairJobPaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

interface RepairFormState {
  customerName: string; mobile: string; email: string; address: string;
  productType: string; brand: string; model: string; serialNumber: string; productSize: string;
  problemDescription: string; customerNotes: string;
  technicianId: string; technicianName: string;
  receivedDate: string; expectedDeliveryDate: string;
  estimatedCost: number; advancePayment: number;
  status: RepairJobStatus;
  warrantyDuration: string;
}

const EMPTY: RepairFormState = {
  customerName: '', mobile: '', email: '', address: '',
  productType: '', brand: '', model: '', serialNumber: '', productSize: '',
  problemDescription: '', customerNotes: '',
  technicianId: '', technicianName: '',
  receivedDate: format(new Date(), 'yyyy-MM-dd'), expectedDeliveryDate: '',
  estimatedCost: 0, advancePayment: 0,
  status: 'Received',
  warrantyDuration: 'No Warranty',
};

export function RepairFormModule({ store, editingJob, onDone }: { store: any; editingJob?: RepairJob | null; onDone?: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editingJob;
  const [form, setForm] = useState<RepairFormState>(editingJob ? { ...EMPTY, ...editingJob } : EMPTY);

  // Parts / Payments / Notes / Status History are the record's own child
  // lists — kept as local state seeded from the job being edited (empty for
  // a brand-new job) so they render immediately here instead of only being
  // reachable through the separate icon-triggered modals. Adding a payment
  // still goes through the exact same store.addRepairJobPayment() the
  // standalone Payment modal uses (so the wallet ledger is credited exactly
  // once, the same as before); adding a part or a note still goes through
  // the same store.updateRepairJob() the standalone Parts/Note modals use.
  // None of this changes what happens server-side — it only surfaces it in
  // one place instead of four separate popups.
  const [parts, setParts] = useState<RepairJobPart[]>(editingJob?.parts || []);
  const [payments, setPayments] = useState<RepairJobPayment[]>(editingJob?.payments || []);
  const [notesLog, setNotesLog] = useState(editingJob?.notesLog || []);
  const [statusHistory, setStatusHistory] = useState<RepairStatusHistoryEntry[]>(editingJob?.statusHistory || []);

  const [newPart, setNewPart] = useState({ partName: '', partId: '', qty: 1, purchaseCost: 0, sellingPrice: 0 });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash' as RepairJobPaymentMethod, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    setForm(editingJob ? { ...EMPTY, ...editingJob } : EMPTY);
    setParts(editingJob?.parts || []);
    setPayments(editingJob?.payments || []);
    setNotesLog(editingJob?.notesLog || []);
    setStatusHistory(editingJob?.statusHistory || []);
  }, [editingJob]);

  const jobId = useMemo(
    () => isEditing && editingJob ? editingJob.id : generateRepairJobId(store.repairJobs || []),
    [isEditing, editingJob, store.repairJobs]
  );

  const activeTechnicians = useMemo(
    () => (store.employees || []).filter((e: any) => e.status === 'Active'),
    [store.employees]
  );

  const remainingAmount = Math.max(0, (Number(form.estimatedCost) || 0) - (Number(form.advancePayment) || 0));

  // Once billing has actually started (parts/labour/other/discount/payments
  // exist), the real grand total / paid / balance — the exact same formulas
  // already used everywhere else (repair-utils.ts) — are more accurate than
  // the intake-time estimate above.
  const billingStarted = parts.length > 0 || (editingJob?.labourCharges || 0) > 0 || (editingJob?.otherCharges || 0) > 0 || payments.length > 0;
  const realTotal = editingJob ? grandTotal({ ...editingJob, parts }) : 0;
  const realPaid = editingJob ? totalPaid({ ...editingJob, payments }) : 0;
  const realDue = editingJob ? balanceDue({ ...editingJob, parts, payments }) : 0;

  const resetForm = () => setForm(EMPTY);

  const addPart = () => {
    if (!newPart.partName) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Part name is required.' });
      return;
    }
    if (!editingJob) return;
    const total = (Number(newPart.qty) || 0) * (Number(newPart.sellingPrice) || 0);
    const part: RepairJobPart = {
      id: `PART-${editingJob.id}-${parts.length + 1}`,
      partName: newPart.partName,
      partId: newPart.partId,
      qty: Number(newPart.qty) || 1,
      purchaseCost: Number(newPart.purchaseCost) || 0,
      sellingPrice: Number(newPart.sellingPrice) || 0,
      total,
    };
    const updatedParts = [...parts, part];
    setParts(updatedParts);
    store.updateRepairJob({ ...editingJob, parts: updatedParts });
    setNewPart({ partName: '', partId: '', qty: 1, purchaseCost: 0, sellingPrice: 0 });
    toast({ title: 'Part Added', description: `${part.partName} added to ${editingJob.id}.` });
  };

  const addPayment = () => {
    const amt = Number(newPayment.amount);
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Enter a payment amount greater than zero.' });
      return;
    }
    if (!editingJob) return;
    const payment: RepairJobPayment = {
      id: `PMT-${editingJob.id}-${payments.length + 1}`,
      date: newPayment.date, amount: amt, method: newPayment.method, notes: newPayment.notes || undefined,
    };
    setPayments([...payments, payment]);
    store.addRepairJobPayment(editingJob.id, payment);
    setNewPayment({ amount: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast({ title: 'Payment Recorded', description: `₹${amt.toLocaleString()} recorded for ${editingJob.id}.` });
  };

  const addNote = () => {
    if (!newNote.trim() || !editingJob) return;
    const note = { id: `NOTE-${editingJob.id}-${notesLog.length + 1}`, date: new Date().toISOString(), text: newNote.trim() };
    const updated = [...notesLog, note];
    setNotesLog(updated);
    store.updateRepairJob({ ...editingJob, notesLog: updated });
    setNewNote('');
    toast({ title: 'Note Added' });
  };

  const handleSave = () => {
    if (!form.customerName || !form.mobile) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Customer name and mobile are required.' });
      return;
    }
    if (!form.problemDescription) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Problem / complaint description is required.' });
      return;
    }

    const now = new Date().toISOString();

    if (isEditing && editingJob) {
      // A status change made here (instead of via the separate Status
      // modal) still gets its own audit trail entry, exactly like that
      // modal creates one — so the history stays complete no matter which
      // screen was used to change it.
      const statusChanged = form.status !== editingJob.status;
      const nextStatusHistory = statusChanged
        ? [...statusHistory, { id: `SH-${editingJob.id}-${statusHistory.length + 1}`, status: form.status, changedAt: now, note: 'Status changed from Edit Repair Job' } as RepairStatusHistoryEntry]
        : statusHistory;

      const updated: RepairJob = {
        ...editingJob,
        customerName: form.customerName,
        mobile: form.mobile,
        email: form.email || undefined,
        address: form.address || undefined,
        productType: form.productType,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber || undefined,
        productSize: form.productSize || undefined,
        problemDescription: form.problemDescription,
        customerNotes: form.customerNotes || undefined,
        technicianId: form.technicianId || undefined,
        technicianName: form.technicianName || undefined,
        receivedDate: form.receivedDate,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        estimatedCost: Number(form.estimatedCost) || 0,
        advancePayment: Number(form.advancePayment) || 0,
        status: form.status,
        warrantyDuration: form.warrantyDuration || undefined,
        parts,
        payments,
        notesLog,
        statusHistory: nextStatusHistory,
        updatedAt: now
      };
      store.updateRepairJob(updated);
      toast({ title: 'Repair Job Updated', description: `${updated.id} saved successfully.` });
    } else {
      const advance = Number(form.advancePayment) || 0;
      const initialPayments: RepairJobPayment[] = [];
      if (advance > 0) {
        initialPayments.push({
          id: `PMT-${jobId}-1`,
          date: form.receivedDate,
          amount: advance,
          method: 'Cash',
          notes: 'Advance payment at intake'
        });
      }
      const newJob: RepairJob = {
        id: jobId,
        customerName: form.customerName,
        mobile: form.mobile,
        email: form.email || undefined,
        address: form.address || undefined,
        productType: form.productType,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber || undefined,
        productSize: form.productSize || undefined,
        problemDescription: form.problemDescription,
        customerNotes: form.customerNotes || undefined,
        technicianId: form.technicianId || undefined,
        technicianName: form.technicianName || undefined,
        receivedDate: form.receivedDate,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        estimatedCost: Number(form.estimatedCost) || 0,
        advancePayment: advance,
        status: form.status,
        warrantyDuration: form.warrantyDuration || undefined,
        parts: [],
        labourCharges: 0,
        otherCharges: 0,
        discount: 0,
        payments: initialPayments,
        notesLog: [],
        statusHistory: [{ id: `SH-${jobId}-1`, status: form.status, changedAt: now, note: 'Repair job created' }],
        notifications: [{ id: `NT-${jobId}-1`, trigger: 'Repair Received', message: `Your repair job ${jobId} has been received.`, sentAt: null }],
        createdAt: now,
        updatedAt: now
      };
      store.addRepairJob(newJob)
        .then(() => toast({ title: 'Repair Job Created', description: `${newJob.id} saved successfully.` }))
        .catch((err: any) => toast({ variant: 'destructive', title: 'Save Failed', description: err?.message || `Could not save ${newJob.id} to the server. Please try again.` }));
    }

    resetForm();
    onDone?.();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">{isEditing ? 'Edit Repair Job' : 'New Repair'}</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Repair Module</p>
        </div>
        {isEditing && (
          <Button variant="ghost" onClick={() => onDone?.()} className="text-slate-500"><X className="w-4 h-4 mr-2" /> Close</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Customer Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Repair ID</Label>
                <Input readOnly value={jobId} className="bg-slate-950 border-slate-800 font-code h-11 text-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Name</Label>
                <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Mobile</Label>
                <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> Product Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
                <Input value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })} placeholder="e.g. TV, AC, Laptop" className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Brand Code (Brand)</Label>
                <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Full Code (Model)</Label>
                <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC] font-code" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Serial Number</Label>
                <Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC] font-code" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Product / TV Size</Label>
                <Input value={form.productSize} onChange={e => setForm({ ...form, productSize: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Warranty</Label>
                <Select value={form.warrantyDuration} onValueChange={v => setForm({ ...form, warrantyDuration: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {WARRANTY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Problem / Complaint</Label>
              <Textarea value={form.problemDescription} onChange={e => setForm({ ...form, problemDescription: e.target.value })} className="bg-slate-950 border-slate-800 min-h-[90px] text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Notes</Label>
              <Textarea value={form.customerNotes} onChange={e => setForm({ ...form, customerNotes: e.target.value })} className="bg-slate-950 border-slate-800 min-h-[70px] text-[#F8FAFC]" />
            </div>
          </div>

          {/* Repair Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Repair Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Technician</Label>
                <Select
                  value={form.technicianId || undefined}
                  onValueChange={v => {
                    const emp = activeTechnicians.find((e: any) => e.id === v);
                    setForm({ ...form, technicianId: v, technicianName: emp?.name || '' });
                  }}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue placeholder="Select Technician" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {activeTechnicians.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">No active employees found</div>
                    )}
                    {activeTechnicians.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.designation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Repair Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as RepairJobStatus })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {REPAIR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Repair Received Date</Label>
                <Input type="date" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Expected Delivery Date</Label>
                <Input type="date" value={form.expectedDeliveryDate} onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
            </div>
          </div>

          {/* Parts, Payments, Notes, Status History — only meaningful once
              the job actually exists on the server (a brand-new job has no
              id-scoped children to attach these to yet). */}
          {isEditing && editingJob && (
            <>
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><PackagePlus className="w-3.5 h-3.5" /> Parts</h4>
                <div className="space-y-2">
                  {parts.length === 0 && <p className="text-xs text-slate-600 italic">No parts added yet.</p>}
                  {parts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{p.partName} {p.partId ? <span className="text-slate-500 font-code">({p.partId})</span> : null}</p>
                        <p className="text-slate-500">Qty {p.qty} • Cost ₹{p.purchaseCost.toLocaleString()} • Sell ₹{p.sellingPrice.toLocaleString()}</p>
                      </div>
                      <span className="font-code font-bold text-emerald-400 shrink-0">₹{p.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800">
                  <Input value={newPart.partName} onChange={e => setNewPart({ ...newPart, partName: e.target.value })} placeholder="Part name" className="bg-slate-950 border-slate-800 h-10 text-xs col-span-2 sm:col-span-1" />
                  <Input type="number" value={newPart.qty} onChange={e => setNewPart({ ...newPart, qty: Number(e.target.value) || 1 })} placeholder="Qty" className="bg-slate-950 border-slate-800 h-10 text-xs" />
                  <Input type="number" value={newPart.purchaseCost} onChange={e => setNewPart({ ...newPart, purchaseCost: Number(e.target.value) || 0 })} placeholder="Cost" className="bg-slate-950 border-slate-800 h-10 text-xs" />
                  <Input type="number" value={newPart.sellingPrice} onChange={e => setNewPart({ ...newPart, sellingPrice: Number(e.target.value) || 0 })} placeholder="Sell Price" className="bg-slate-950 border-slate-800 h-10 text-xs" />
                  <Button onClick={addPart} size="sm" className="bg-orange-600 hover:bg-orange-700 h-10 text-[10px] uppercase font-bold"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Payments</h4>
                  <span className="text-[10px] font-bold text-slate-400">Paid ₹{realPaid.toLocaleString()} / Due ₹{Math.max(0, realDue).toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {payments.length === 0 && <p className="text-xs text-slate-600 italic">No payments recorded yet.</p>}
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200">{p.date} <Badge variant="outline" className="ml-1 text-[8px] border-slate-700">{p.method}</Badge></div>
                        {p.notes && <p className="text-slate-500 truncate">{p.notes}</p>}
                      </div>
                      <span className="font-code font-bold text-emerald-400 shrink-0">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                  <Input type="number" value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="Amount" className="bg-slate-950 border-slate-800 h-10 text-xs" />
                  <Select value={newPayment.method} onValueChange={v => setNewPayment({ ...newPayment, method: v as RepairJobPaymentMethod })}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newPayment.date} onChange={e => setNewPayment({ ...newPayment, date: e.target.value })} className="bg-slate-950 border-slate-800 h-10 text-xs" />
                  <Button onClick={addPayment} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-10 text-[10px] uppercase font-bold"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><StickyNote className="w-3.5 h-3.5" /> Notes Log</h4>
                <div className="space-y-2">
                  {notesLog.length === 0 && <p className="text-xs text-slate-600 italic">No notes yet.</p>}
                  {notesLog.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <p className="text-slate-200">{n.text}</p>
                      <p className="text-slate-600 text-[10px] mt-1">{format(new Date(n.date), 'dd MMM yyyy, hh:mm a')}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." className="bg-slate-950 border-slate-800 min-h-[44px] text-xs flex-1" />
                  <Button onClick={addNote} size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-11 text-[10px] uppercase font-bold shrink-0"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History className="w-3.5 h-3.5" /> Status History</h4>
                <div className="space-y-2">
                  {statusHistory.length === 0 && <p className="text-xs text-slate-600 italic">No status history yet.</p>}
                  {[...statusHistory].reverse().map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800/70">
                      <Badge className={`text-[9px] uppercase`}>{s.status}</Badge>
                      <span className="text-slate-500">{format(new Date(s.changedAt), 'dd MMM yyyy, hh:mm a')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Billing summary */}
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 space-y-4 lg:sticky lg:top-4">
            <h4 className="text-[11px] font-black uppercase text-[#123C8C] tracking-tighter flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Estimate</h4>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Estimated Cost</Label>
              <Input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Advance Payment</Label>
              <Input type="number" value={form.advancePayment} onChange={e => setForm({ ...form, advancePayment: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              {billingStarted ? (
                <>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Grand Total</span><span className="font-code font-bold text-slate-200">₹{realTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Total Paid</span><span className="font-code font-bold text-emerald-400">₹{realPaid.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <span className="text-xs font-black uppercase text-slate-100">Balance Due</span>
                    <span className="text-2xl font-headline font-black text-rose-400">₹{Math.max(0, realDue).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Estimated Cost</span><span className="font-code font-bold text-slate-200">₹{(Number(form.estimatedCost) || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Advance Paid</span><span className="font-code font-bold text-emerald-400">₹{(Number(form.advancePayment) || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <span className="text-xs font-black uppercase text-slate-100">Remaining Amount</span>
                    <span className="text-2xl font-headline font-black text-rose-400">₹{remainingAmount.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <Button onClick={handleSave} className="w-full bg-[#0066FF] hover:bg-blue-600 h-11 font-bold uppercase text-xs">
                {isEditing ? 'Update Repair Job' : 'Save Repair Job'}
              </Button>
              <Button onClick={() => { resetForm(); onDone?.(); }} variant="ghost" className="w-full h-11 font-bold uppercase text-xs text-slate-500">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
