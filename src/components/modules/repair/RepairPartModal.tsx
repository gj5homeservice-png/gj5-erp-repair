"use client"

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RepairJob, RepairJobPart } from '@/lib/types';

interface RepairPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
  store: any;
}

const EMPTY_PART = { partName: '', partId: '', qty: 1, purchaseCost: 0, sellingPrice: 0, notes: '' };

export function RepairPartModal({ isOpen, onClose, job, store }: RepairPartModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_PART);

  const total = (Number(form.qty) || 0) * (Number(form.sellingPrice) || 0);

  const resetAndClose = () => {
    setForm(EMPTY_PART);
    onClose();
  };

  const handleSave = () => {
    if (!job) return;
    if (!form.partName) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Part name is required.' });
      return;
    }
    const part: RepairJobPart = {
      id: `PART-${job.id}-${job.parts.length + 1}`,
      partName: form.partName,
      partId: form.partId,
      qty: Number(form.qty) || 1,
      purchaseCost: Number(form.purchaseCost) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      total,
      notes: form.notes || undefined
    };
    store.updateRepairJob({ ...job, parts: [...job.parts, part] });
    toast({ title: 'Part Added', description: `${part.partName} added to ${job.id}.` });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Part {job ? `— ${job.id}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Part Name</Label>
              <Input value={form.partName} onChange={e => setForm({ ...form, partName: e.target.value })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Part ID</Label>
              <Input value={form.partId} onChange={e => setForm({ ...form, partId: e.target.value })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Quantity</Label>
              <Input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: Number(e.target.value) || 1 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Purchase Cost</Label>
              <Input type="number" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Selling Price</Label>
              <Input type="number" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Total</Label>
              <Input readOnly value={`₹${total.toLocaleString()}`} className="bg-slate-950 border-slate-800 h-10 text-emerald-400 font-bold" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-slate-950 border-slate-800 min-h-[70px] text-[#F8FAFC]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 font-bold uppercase text-xs px-8">Add Part</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
