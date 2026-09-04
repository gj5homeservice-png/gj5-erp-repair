"use client"

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RepairJob, RepairJobNote } from '@/lib/types';

interface RepairNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
  store: any;
}

export function RepairNoteModal({ isOpen, onClose, job, store }: RepairNoteModalProps) {
  const { toast } = useToast();
  const [text, setText] = useState('');

  const resetAndClose = () => {
    setText('');
    onClose();
  };

  const handleSave = () => {
    if (!job) return;
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'Empty Note', description: 'Enter some text before saving.' });
      return;
    }
    const note: RepairJobNote = {
      id: `NOTE-${job.id}-${job.notesLog.length + 1}`,
      date: new Date().toISOString(),
      text: text.trim()
    };
    store.updateRepairJob({ ...job, notesLog: [...job.notesLog, note] });
    toast({ title: 'Note Added', description: `Note added to ${job.id}.` });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Add Repair Note {job ? `— ${job.id}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1">
          <Label className="text-[10px] uppercase font-bold text-slate-500">Note</Label>
          <Textarea value={text} onChange={e => setText(e.target.value)} className="bg-slate-950 border-slate-800 min-h-[120px] text-[#F8FAFC]" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 font-bold uppercase text-xs px-8">Add Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
