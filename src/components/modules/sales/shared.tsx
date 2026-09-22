"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, X, Loader2, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerFormModal } from '@/components/modules/customers/CustomerFormModal';
import { apiFetch } from '@/lib/client-api';
import { PAYMENT_METHODS, remaining, round2, validatePayment } from '@/lib/sales-utils';
import { format } from 'date-fns';

// Pieces shared by the Sales and Orders modules. Customers come from the
// Customer Department's own table (GET /api/erp/customers) and products from
// the existing Stock list (store.stock) — nothing here keeps a copy of either.

export const money = (n: number | undefined | null) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export function SummaryCard({ label, value, icon: Icon, colorClass }: { label: string; value: React.ReactNode; icon: any; colorClass: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wide truncate">{label}</p>
        <p className="text-lg font-headline font-black text-slate-100 truncate">{value}</p>
      </div>
    </div>
  );
}

export interface DirectoryCustomer {
  id: string; name: string | null; mobile: string | null; email?: string | null; address?: string | null;
  city?: string | null; pincode?: string | null; status?: string | null;
}

export function useCustomerDirectory() {
  const [customers, setCustomers] = useState<DirectoryCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const json = await apiFetch('/api/erp/customers');
      setCustomers(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { customers, loading, error, reload };
}

// ----------------------------------------------------------- customer picker

export function CustomerPicker({
  selected, onSelect, disabled, directory,
}: {
  selected: { id: string; name: string; mobile: string } | null;
  onSelect: (c: DirectoryCustomer | null) => void;
  disabled?: boolean;
  directory: ReturnType<typeof useCustomerDirectory>;
}) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return directory.customers
      .filter(c => c.status !== 'Inactive')
      .filter(c => c.id.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q) || (c.mobile || '').includes(q))
      .slice(0, 6);
  }, [query, directory.customers]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 truncate">{selected.name}</p>
          <p className="text-[11px] text-slate-500 font-code">{selected.id} • {selected.mobile}</p>
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" className="text-slate-400 shrink-0" onClick={() => onSelect(null)}>
            <X className="w-4 h-4 mr-1" /> Change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={directory.loading ? 'Loading customers...' : 'Search customer by name, mobile or Customer ID...'}
          className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]"
        />
        {query.trim() && (
          <div className="absolute z-30 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            {matches.map(c => (
              <button key={c.id} type="button" onClick={() => { onSelect(c); setQuery(''); }}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex justify-between gap-3">
                <span className="font-bold truncate">{c.name || 'Unnamed'} <span className="text-slate-500 font-code font-normal">{c.id}</span></span>
                <span className="text-slate-500 font-code shrink-0">{c.mobile}</span>
              </button>
            ))}
            {matches.length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No customer matches “{query}”.</p>}
          </div>
        )}
      </div>
      {directory.error && <p className="text-[11px] text-rose-400">{directory.error} <button type="button" className="underline" onClick={directory.reload}>Retry</button></p>}
      <Button type="button" variant="outline" size="sm" className="border-slate-800 text-slate-300" onClick={() => setShowAdd(true)}>
        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add New Customer
      </Button>
      <CustomerFormModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        initialMobile={/^[0-9]{10}$/.test(query.trim()) ? query.trim() : undefined}
        onSaved={async (c) => {
          setShowAdd(false);
          await directory.reload();
          if (c?.id) { onSelect(c); setQuery(''); }
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------ product picker

export function ProductPicker({
  stock, selectedId, onSelect, disabled,
}: {
  stock: any[];
  selectedId: string;
  onSelect: (item: any | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const selected = useMemo(() => stock.find(s => s.id === selectedId) || null, [stock, selectedId]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stock.filter(s =>
      (s.name || '').toLowerCase().includes(q) || (s.brand || '').toLowerCase().includes(q) ||
      (s.model || '').toLowerCase().includes(q) || (s.barcode || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, stock]);

  if (selectedId && selected) {
    return (
      <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
        <div className="min-w-0 flex items-center gap-3">
          <Package className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{selected.name}{selected.brand ? ` (${selected.brand})` : ''}</p>
            <p className="text-[11px] text-slate-500 font-code">{selected.id} • In stock: {selected.quantity}</p>
          </div>
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" className="text-slate-400 shrink-0" onClick={() => onSelect(null)}>
            <X className="w-4 h-4 mr-1" /> Change
          </Button>
        )}
      </div>
    );
  }
  if (selectedId && !selected) {
    return (
      <div className="flex items-center justify-between gap-3 bg-slate-950 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Product {selectedId} is no longer in Stock.</span>
        {!disabled && <Button type="button" variant="ghost" size="sm" className="text-slate-400" onClick={() => onSelect(null)}>Change</Button>}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
      <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Stock: product, brand, model or barcode..."
        className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
      {query.trim() && (
        <div className="absolute z-30 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {matches.map(s => (
            <button key={s.id} type="button" onClick={() => { onSelect(s); setQuery(''); }}
              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex justify-between gap-3">
              <span className="font-bold truncate">{s.name}{s.brand ? ` (${s.brand})` : ''}</span>
              <span className={`font-code shrink-0 ${s.quantity > 0 ? 'text-slate-500' : 'text-rose-400'}`}>Stock: {s.quantity}</span>
            </button>
          ))}
          {matches.length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No product in Stock matches “{query}”. Add it in the Stock module first.</p>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ payment dialog

export function PaymentDialog({
  open, onClose, title, refLabel, total, paid, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  refLabel: string;
  total: number;
  paid: number;
  onSubmit: (payment: { amount: number; method: string; paidOn: string; note: string }) => Promise<void>;
}) {
  const balance = remaining(total, paid);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('Cash');
  const [paidOn, setPaidOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setAmount(balance > 0 ? String(balance) : ''); setNote(''); setError(null); setBusy(false); setPaidOn(format(new Date(), 'yyyy-MM-dd')); }
  }, [open, balance]);

  const submit = async () => {
    const problem = validatePayment(amount, balance);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      await onSubmit({ amount: round2(Number(amount)), method, paidOn, note });
    } catch (e: any) {
      setError(e?.message || 'Could not record this payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle className="text-lg font-headline font-bold">{title}</DialogTitle></DialogHeader>
        <p className="text-[11px] text-slate-500 font-code -mt-2">{refLabel}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Total', total, 'text-slate-100'], ['Paid', paid, 'text-emerald-400'], ['Remaining', balance, 'text-rose-400']].map(([l, v, c]) => (
            <div key={l as string} className="bg-slate-950 border border-slate-800 rounded-xl py-2.5">
              <p className="text-[9px] uppercase font-bold text-slate-500">{l as string}</p>
              <p className={`text-sm font-black font-code ${c}`}>{money(v as number)}</p>
            </div>
          ))}
        </div>
        {balance <= 0 ? (
          <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Fully paid — nothing left to collect.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Amount</Label>
                <Input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Date</Label>
              <Input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Note (optional)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="bg-slate-900 border-slate-800 text-[#F8FAFC]" />
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Close</Button>
          {balance > 0 && (
            <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Record Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------ confirm dialog

export function ConfirmDialog({
  open, onClose, title, message, confirmLabel, onConfirm, destructive = true,
}: {
  open: boolean; onClose: () => void; title: string; message: React.ReactNode; confirmLabel: string;
  onConfirm: () => Promise<void>; destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setBusy(false); setError(null); } }, [open]);

  const run = async () => {
    setBusy(true); setError(null);
    try { await onConfirm(); } catch (e: any) { setError(e?.message || 'That did not work. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-sm bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-headline font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> {title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-slate-300">{message}</div>
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={run} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------ payment history

export function usePaymentHistory(kind: 'sales-orders' | 'customer-orders', id: string | null) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!id) { setPayments([]); return; }
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/erp/${kind}/${id}/payments`)
      .then(j => { if (!cancelled) setPayments(j.data || []); })
      .catch(() => { if (!cancelled) setPayments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, id]);
  return { payments, loading };
}
