"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { CustomerListItem } from './CustomerDepartmentModule';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

export function DeleteCustomerDialog({
  customer, onClose, onDeleted,
}: {
  customer: CustomerListItem | null;
  onClose: () => void;
  onDeleted: (result: { deleted: boolean; deactivated: boolean }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!customer) return;
    setBusy(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/erp/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not remove this customer.');
      onDeleted(json.data);
    } catch (err: any) {
      setError(err?.message || 'Could not remove this customer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const hasHistory = customer && ((customer.totalRepairs || 0) > 0 || (customer.totalPurchases || 0) > 0 || (customer.pendingAmount || 0) > 0);

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-headline font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Delete Customer?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-300">
          Are you sure you want to delete this customer{customer?.name ? ` (${customer.name})` : ''}?
        </p>
        {hasHistory && (
          <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded-lg p-2.5">
            This customer has repair, booking, sales or invoice history. That history is never deleted — this customer will be marked <strong>Inactive</strong> instead of removed, so all existing records stay exactly as they are.
          </p>
        )}
        {error && <p className="text-xs text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg p-2.5">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {hasHistory ? 'Deactivate Customer' : 'Delete Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
