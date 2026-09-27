"use client"

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, GitMerge, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/client-api';
import { CustomerPicker } from './CustomerSearch';
import type { CustomerListItem } from './CustomerDepartmentModule';

// Authorized-administrator-only (gated server-side behind Customer
// Department's 'delete' permission — see /api/erp/customers/merge). Moves
// every Sales/Orders/Repair Jobs/Invoices/Wallet/Online Booking/Notes row
// from the duplicate over to the primary; the duplicate is marked `Merged`,
// never deleted, so its history and audit trail stay intact and reachable.
export function MergeCustomersDialog({
  customer, onClose, onMerged,
}: {
  customer: CustomerListItem | null; // the row the "Merge" action was clicked from — pre-filled as the duplicate
  onClose: () => void;
  onMerged: () => void;
}) {
  const [primary, setPrimary] = useState<{ id: string; name: string; mobile: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) { setPrimary(null); setError(null); setBusy(false); }
  }, [customer]);

  if (!customer) return null;

  const confirm = async () => {
    if (!primary) { setError('Choose the customer this one should be merged into.'); return; }
    setBusy(true); setError(null);
    try {
      await apiFetch('/api/erp/customers/merge', { method: 'POST', body: JSON.stringify({ primaryId: primary.id, duplicateId: customer.id }) });
      onMerged();
    } catch (err: any) {
      setError(err?.message || 'Could not merge these customers. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-headline font-bold flex items-center gap-2"><GitMerge className="w-5 h-5 text-purple-400" /> Merge Customer</DialogTitle>
        </DialogHeader>
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Duplicate (will be merged away)</p>
          <p className="font-code text-xs font-bold text-amber-400">{customer.id}</p>
          <p className="text-sm font-bold text-slate-200">{customer.name}</p>
          <p className="text-xs text-slate-400 font-code">{customer.mobile}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500">Merge into (primary — keeps this Customer ID)</p>
          <CustomerPicker selected={primary} onSelect={(c) => setPrimary(c ? { id: c.id, name: c.name || '', mobile: c.mobile || '' } : null)} />
        </div>
        <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Every sale, order, repair job, invoice, wallet entry and note under <b>{customer.id}</b> moves to the primary customer. Nothing is deleted — {customer.id} is marked <b>Merged</b> and stays visible in its own history and audit log.
        </p>
        {error && <p className="text-xs text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg p-2.5">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={confirm} disabled={busy || !primary}>
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Merge Customers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
