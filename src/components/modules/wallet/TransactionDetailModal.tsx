"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { LedgerEntry } from '@/lib/wallet-engine';

const SOURCE_TAB: Record<LedgerEntry['sourceModule'], string | null> = {
  Repair: 'Repair Jobs',
  Sales: 'Invoice History',
  Salary: 'Salary',
  Stock: 'Stock',
  Expense: null,
  Wallet: null,
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-200 text-right">{value}</span>
    </div>
  );
}

export function TransactionDetailModal({
  entry,
  onClose,
  onNavigate,
}: {
  entry: (LedgerEntry & { balance: number }) | null;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const targetTab = entry ? SOURCE_TAB[entry.sourceModule] : null;
  const dateObj = entry?.date ? parseISO(entry.date) : null;

  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {entry.direction === 'INCOME' ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-rose-400" />}
                Transaction Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <div className="flex items-center justify-between p-4 mb-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <p className="text-[9px] uppercase font-black text-slate-500">{entry.category}</p>
                  <p className={cn("text-2xl font-headline font-black", entry.direction === 'INCOME' ? 'text-emerald-400' : 'text-rose-400')}>
                    {entry.direction === 'INCOME' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <Badge className={cn("text-[9px] uppercase h-5 px-2 border-0",
                  entry.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                  entry.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-500/10 text-slate-400'
                )}>
                  {entry.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-0.5">
                <Row label="Transaction ID" value={<span className="font-code text-xs">{entry.id}</span>} />
                <Row label="Date" value={dateObj && isValid(dateObj) ? format(dateObj, 'dd MMMM yyyy') : entry.date} />
                <Row label="Source Module" value={entry.sourceModule} />
                <Row label="Source Record" value={<span className="font-code">{entry.sourceRecordId}</span>} />
                <Row label="Description" value={entry.description} />
                <Row label="Customer / Vendor" value={entry.customerOrVendor} />
                <Row label="Technician" value={entry.technician} />
                <Row label="Reference" value={entry.reference} />
                <Row label="Payment Method" value={entry.paymentMethod} />
                <Row label="Balance After" value={`₹${entry.balance.toLocaleString('en-IN')}`} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} className="text-slate-400">Close</Button>
              {targetTab && onNavigate && (
                <Button onClick={() => { onNavigate(targetTab); onClose(); }} className="bg-[#123C8C] hover:bg-[#0D2E63] font-bold uppercase text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Source
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
