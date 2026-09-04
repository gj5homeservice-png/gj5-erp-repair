"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RepairJob, RepairJobStatus, RepairStatusHistoryEntry } from '@/lib/types';
import { balanceDue } from '@/lib/repair-utils';

interface RepairStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
  store: any;
}

const REPAIR_STATUSES: RepairJobStatus[] = [
  'Received', 'Inspection', 'Estimate Sent', 'Approved', 'In Progress',
  'Waiting for Parts', 'Ready', 'Delivered', 'Cancelled'
];

export function RepairStatusModal({ isOpen, onClose, job, store }: RepairStatusModalProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RepairJobStatus>('Received');
  const [note, setNote] = useState('');
  const [confirmingBalance, setConfirmingBalance] = useState(false);

  useEffect(() => {
    if (job) setStatus(job.status);
  }, [job]);

  const resetAndClose = () => {
    setNote('');
    setConfirmingBalance(false);
    onClose();
  };

  const applyStatusChange = () => {
    if (!job) return;
    const entry: RepairStatusHistoryEntry = {
      id: `SH-${job.id}-${job.statusHistory.length + 1}`,
      status, changedAt: new Date().toISOString(), note: note || undefined
    };
    store.updateRepairJob({ ...job, status, statusHistory: [...job.statusHistory, entry] });
    toast({ title: 'Status Updated', description: `${job.id} is now "${status}".` });
    resetAndClose();
  };

  const handleSave = () => {
    if (!job) return;
    if (status === 'Delivered' && balanceDue(job) > 0 && !confirmingBalance) {
      setConfirmingBalance(true);
      return;
    }
    applyStatusChange();
  };

  if (job && confirmingBalance) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogContent className="max-w-sm bg-[#0F172A] border-amber-500/30 text-slate-100 text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-amber-400"><AlertTriangle className="w-5 h-5" /> Balance Due</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 py-2">
            Balance due for {job.id} is <span className="font-code font-bold text-rose-400">₹{balanceDue(job).toLocaleString()}</span>. Mark it as Delivered anyway?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1 border-slate-800" onClick={() => setConfirmingBalance(false)}>Back</Button>
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={applyStatusChange}>Deliver Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Update Status {job ? `— ${job.id}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Repair Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as RepairJobStatus)}>
              <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {REPAIR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} className="bg-slate-950 border-slate-800 min-h-[80px] text-[#F8FAFC]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 font-bold uppercase text-xs px-8">Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
