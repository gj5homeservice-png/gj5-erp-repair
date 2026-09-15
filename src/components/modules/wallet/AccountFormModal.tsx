"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountType } from '@/lib/types';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: { id: string; name: string }[];
  onSubmit: (data: { name: string; type: AccountType; linkedEmployeeId?: string; openingBalance: number }) => Promise<any>;
}

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank' },
  { value: 'EMPLOYEE', label: 'Employee (custody account)' },
  { value: 'RUNNER', label: 'Runner (custody account)' },
];

// Add a new named company money location — Cash/UPI/Bank, or a custody
// account representing an employee/runner who currently holds company
// money. Type and opening balance are locked forever once created (see
// accounts.ts's updateAccount) — changing either later would silently
// corrupt what the account's running balance means.
export function AccountFormModal({ isOpen, onClose, employees, onSubmit }: AccountFormModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CASH');
  const [linkedEmployeeId, setLinkedEmployeeId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCustody = type === 'EMPLOYEE' || type === 'RUNNER';

  const reset = () => {
    setName(''); setType('CASH'); setLinkedEmployeeId(''); setOpeningBalance('');
  };

  const handleSave = async () => {
    if (submitting) return;
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Give this account a name, e.g. "UPI-1" or "Runner 1".' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), type, linkedEmployeeId: linkedEmployeeId || undefined, openingBalance: Number(openingBalance) || 0 });
      toast({ title: 'Account Added', description: `${name.trim()} is ready to use.` });
      reset();
      onClose();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Add Account', description: err?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-400" /> Add Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Account Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Owner Cash, UPI-1, Runner 1" className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isCustody && employees.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Link to Employee (optional)</Label>
              <Select value={linkedEmployeeId} onValueChange={setLinkedEmployeeId}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="No link" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Opening Balance (₹)</Label>
            <Input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0" className="bg-slate-900 border-slate-800 h-10 font-code text-[#F8FAFC]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs px-8">{submitting ? 'Saving...' : 'Add Account'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
