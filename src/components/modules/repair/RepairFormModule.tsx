"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { User, Wrench, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RepairJob, RepairJobPayment, RepairJobStatus } from '@/lib/types';
import { generateRepairJobId } from '@/lib/repair-utils';

const REPAIR_STATUSES: RepairJobStatus[] = [
  'Received', 'Inspection', 'Estimate Sent', 'Approved', 'In Progress',
  'Waiting for Parts', 'Ready', 'Delivered', 'Cancelled'
];

interface RepairFormState {
  customerName: string; mobile: string; email: string; address: string;
  productType: string; brand: string; model: string; serialNumber: string; productSize: string;
  problemDescription: string; customerNotes: string;
  technicianId: string; technicianName: string;
  receivedDate: string; expectedDeliveryDate: string;
  estimatedCost: number; advancePayment: number;
  status: RepairJobStatus;
}

const EMPTY: RepairFormState = {
  customerName: '', mobile: '', email: '', address: '',
  productType: '', brand: '', model: '', serialNumber: '', productSize: '',
  problemDescription: '', customerNotes: '',
  technicianId: '', technicianName: '',
  receivedDate: format(new Date(), 'yyyy-MM-dd'), expectedDeliveryDate: '',
  estimatedCost: 0, advancePayment: 0,
  status: 'Received'
};

export function RepairFormModule({ store, editingJob, onDone }: { store: any; editingJob?: RepairJob | null; onDone?: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editingJob;
  const [form, setForm] = useState<RepairFormState>(editingJob ? { ...EMPTY, ...editingJob } : EMPTY);

  useEffect(() => {
    setForm(editingJob ? { ...EMPTY, ...editingJob } : EMPTY);
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

  const resetForm = () => setForm(EMPTY);

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
                <Label className="text-[10px] uppercase font-bold text-slate-500">Product Type</Label>
                <Input value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })} placeholder="e.g. TV, AC, Laptop" className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Brand</Label>
                <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Model</Label>
                <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Serial Number</Label>
                <Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Product / TV Size</Label>
                <Input value={form.productSize} onChange={e => setForm({ ...form, productSize: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
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
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Estimated Cost</span><span className="font-code font-bold text-slate-200">₹{(Number(form.estimatedCost) || 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Advance Paid</span><span className="font-code font-bold text-emerald-400">₹{(Number(form.advancePayment) || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <span className="text-xs font-black uppercase text-slate-100">Remaining Amount</span>
                <span className="text-2xl font-headline font-black text-rose-400">₹{remainingAmount.toLocaleString()}</span>
              </div>
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
