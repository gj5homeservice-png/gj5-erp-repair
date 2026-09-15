"use client"

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, HandCoins, Undo2, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/lib/types';

export type MoveMode = 'TRANSFER' | 'ADVANCE' | 'SETTLEMENT' | 'REFUND';

interface AccountMoveModalProps {
  isOpen: boolean;
  mode: MoveMode;
  onClose: () => void;
  accounts: Account[];
  onSubmit: (data: { fromAccountId: string; toAccountId?: string; amount: number; note: string }) => Promise<any>;
}

const COMPANY_TYPES = new Set(['CASH', 'UPI', 'BANK']);
const CUSTODY_TYPES = new Set(['EMPLOYEE', 'RUNNER']);

const CONFIG: Record<MoveMode, { title: string; icon: any; fromLabel: string; toLabel: string; button: string; needsTo: boolean }> = {
  TRANSFER: { title: 'Transfer Between Accounts', icon: ArrowLeftRight, fromLabel: 'From Account', toLabel: 'To Account', button: 'Transfer', needsTo: true },
  ADVANCE: { title: 'Give Employee/Runner Advance', icon: HandCoins, fromLabel: 'From Account', toLabel: 'To Employee/Runner', button: 'Give Advance', needsTo: true },
  SETTLEMENT: { title: 'Settle / Return Money', icon: Undo2, fromLabel: 'From Employee/Runner', toLabel: 'To Account', button: 'Record Settlement', needsTo: true },
  REFUND: { title: 'Refund to Customer', icon: Receipt, fromLabel: 'Paid From Account', toLabel: '', button: 'Record Refund', needsTo: false },
};

// One flexible modal shared by all four money-movement flows — same shape
// (from account, optional to account, amount, note), each just filters
// which accounts are selectable and which backend endpoint it calls (via
// the caller-supplied onSubmit). This is deliberately NOT income/expense —
// see wallet-engine.ts's TRANSFER_LIKE_CATEGORIES for why these never
// affect Profit/Loss (except REFUND, which does).
export function AccountMoveModal({ isOpen, mode, onClose, accounts, onSubmit }: AccountMoveModalProps) {
  const { toast } = useToast();
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cfg = CONFIG[mode];
  const active = accounts.filter(a => a.isActive);

  const fromOptions = mode === 'SETTLEMENT' ? active.filter(a => CUSTODY_TYPES.has(a.type)) : active;
  const toOptions = mode === 'ADVANCE'
    ? active.filter(a => CUSTODY_TYPES.has(a.type))
    : mode === 'SETTLEMENT'
      ? active.filter(a => COMPANY_TYPES.has(a.type))
      : active.filter(a => a.id !== fromAccountId);

  useEffect(() => {
    if (!isOpen) { setFromAccountId(''); setToAccountId(''); setAmount(''); setNote(''); }
  }, [isOpen]);

  const handleSave = async () => {
    if (submitting) return;
    const amt = Number(amount);
    if (!fromAccountId) {
      toast({ variant: 'destructive', title: 'Account Required', description: `Select ${cfg.fromLabel.toLowerCase()}.` });
      return;
    }
    if (cfg.needsTo && !toAccountId) {
      toast({ variant: 'destructive', title: 'Account Required', description: `Select ${cfg.toLabel.toLowerCase()}.` });
      return;
    }
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Enter an amount greater than zero.' });
      return;
    }
    if (cfg.needsTo && fromAccountId === toAccountId) {
      toast({ variant: 'destructive', title: 'Invalid Selection', description: 'From and To accounts must be different.' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ fromAccountId, toAccountId: cfg.needsTo ? toAccountId : undefined, amount: amt, note });
      toast({ title: 'Recorded', description: `₹${amt.toLocaleString()} recorded successfully.` });
      onClose();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Save', description: err?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = cfg.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="w-5 h-5 text-blue-400" /> {cfg.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">{cfg.fromLabel}</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {fromOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name} (₹{a.currentBalance.toLocaleString()})</SelectItem>)}
              </SelectContent>
            </Select>
            {fromOptions.length === 0 && <p className="text-[10px] text-amber-400">No eligible accounts yet — add one first.</p>}
          </div>
          {cfg.needsTo && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">{cfg.toLabel}</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {toOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name} (₹{a.currentBalance.toLocaleString()})</SelectItem>)}
                </SelectContent>
              </Select>
              {toOptions.length === 0 && <p className="text-[10px] text-amber-400">No eligible accounts yet — add one first.</p>}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-900 border-slate-800 h-10 font-code text-[#F8FAFC]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Note (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs px-8">{submitting ? 'Saving...' : cfg.button}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
