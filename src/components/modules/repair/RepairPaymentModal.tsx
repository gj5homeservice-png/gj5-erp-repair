"use client"

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RepairJob, RepairJobPayment, RepairJobPaymentMethod } from '@/lib/types';
import { balanceDue } from '@/lib/repair-utils';

interface RepairPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
  store: any;
}

const METHODS: RepairJobPaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

export function RepairPaymentModal({ isOpen, onClose, job, store }: RepairPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<RepairJobPaymentMethod>('Cash');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const due = job ? balanceDue(job) : 0;

  const resetAndClose = () => {
    setAmount(0);
    setMethod('Cash');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    onClose();
  };

  const handleSave = () => {
    if (!job) return;
    if (!amount || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Enter a payment amount greater than zero.' });
      return;
    }
    const payment: RepairJobPayment = {
      id: `PMT-${job.id}-${job.payments.length + 1}`,
      date, amount: Number(amount), method, notes: notes || undefined
    };
    store.addRepairJobPayment(job.id, payment);
    toast({ title: 'Payment Recorded', description: `₹${amount.toLocaleString()} recorded for ${job.id}.` });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Add Payment {job ? `— ${job.id}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {job && <p className="text-xs text-slate-400">Balance Due: <span className="font-code font-bold text-rose-400">₹{due.toLocaleString()}</span></p>}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as RepairJobPaymentMethod)}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-slate-950 border-slate-800 min-h-[70px] text-[#F8FAFC]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs px-8">Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
