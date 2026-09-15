"use client"

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const INCOME_CATEGORIES = ['Service Charge', 'Commission', 'Rental Income', 'Interest', 'Investment Return', 'Other Income'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

interface OtherIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; category: string; description: string; date: string; paymentMethod: string; reference: string; notes: string }) => void;
}

// A legitimate, categorized manual income entry — distinct from the generic
// "Manual Adjustment" (Credit/Debit) feature, which remains untouched for
// plain balance corrections. This one always carries a category, which is
// exactly what src/lib/wallet-engine.ts uses to tell the two apart and count
// only this kind toward real business income.
export function OtherIncomeModal({ isOpen, onClose, onSubmit }: OtherIncomeModalProps) {
  const [form, setForm] = useState({
    amount: '',
    category: INCOME_CATEGORIES[0],
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: PAYMENT_METHODS[0],
    reference: '',
    notes: '',
  });

  const reset = () => setForm({ amount: '', category: INCOME_CATEGORIES[0], description: '', date: format(new Date(), 'yyyy-MM-dd'), paymentMethod: PAYMENT_METHODS[0], reference: '', notes: '' });

  const handleSubmit = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    onSubmit({ ...form, amount: amt });
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-400" /> Add Other Business Income</DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">Records real income that isn't a repair payment or a sale — counted toward Total Income immediately.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-slate-900 border-slate-800 h-11 font-code" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-slate-900 border-slate-800 h-11" placeholder="What is this income for?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Reference (optional)</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="bg-slate-900 border-slate-800 h-11" placeholder="Receipt / reference number" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-slate-900 border-slate-800 min-h-[70px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.amount} className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs px-8">Add Income</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
