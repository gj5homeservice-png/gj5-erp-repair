"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X, Phone, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/client-api';
import { buildTelLink, buildWhatsAppLink, formatCustomerLabel } from '@/lib/customer-utils';
import { CustomerFormModal } from './CustomerFormModal';

// The ONE global customer search surface, reused by every picker/lookup in
// the app (Sales, Orders, Repair Jobs, Ctrl+K, the standalone Quick Lookup
// widget). Always calls the indexed, LIMIT-bound GET /api/erp/customers/search
// — never fetches the full customer list — so it stays fast at 10,000+
// customers. Debounced so a fast typist doesn't fire a request per keystroke.

export interface CustomerSearchResult {
  id: string; name: string | null; mobile: string | null; whatsappNumber?: string | null;
  email?: string | null; address?: string | null; city?: string | null; state?: string | null;
  pincode?: string | null; gstin?: string | null; status?: string | null;
}

export function useCustomerSearch(query: string, opts: { limit?: number; debounceMs?: number } = {}) {
  const { limit = 8, debounceMs = 250 } = opts;
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setLoading(false); setError(null); return; }
    const mySeq = ++seq.current;
    setLoading(true);
    const handle = setTimeout(() => {
      apiFetch(`/api/erp/customers/search?q=${encodeURIComponent(q)}&limit=${limit}`)
        .then(json => { if (seq.current === mySeq) { setResults(json.data || []); setError(null); } })
        .catch(e => { if (seq.current === mySeq) setError(e?.message || 'Search failed.'); })
        .finally(() => { if (seq.current === mySeq) setLoading(false); });
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [query, limit, debounceMs]);

  return { results, loading, error };
}

// ----------------------------------------------------------- customer picker

// Drop-in replacement for the Sales/Orders module's own CustomerPicker (same
// prop shape) — the only change is WHERE the matches come from.
export function CustomerPicker({
  selected, onSelect, disabled,
}: {
  selected: { id: string; name: string; mobile: string } | null;
  onSelect: (c: CustomerSearchResult | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const { results, loading, error } = useCustomerSearch(query);

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
          placeholder="Search by Customer ID, name, mobile, WhatsApp, email or GSTIN..."
          className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
        {query.trim() && (
          <div className="absolute z-30 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            {results.map(c => (
              <button key={c.id} type="button" onClick={() => { onSelect(c); setQuery(''); }}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex justify-between gap-3">
                <span className="font-bold truncate">{c.name || 'Unnamed'} <span className="text-slate-500 font-code font-normal">{c.id}</span></span>
                <span className="text-slate-500 font-code shrink-0">{c.mobile}</span>
              </button>
            ))}
            {!loading && results.length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No customer matches "{query}".</p>}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="border-slate-800 text-slate-300" onClick={() => setShowAdd(true)}>
        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add New Customer
      </Button>
      <CustomerFormModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        initialMobile={/^[0-9]{10}$/.test(query.trim()) ? query.trim() : undefined}
        onSaved={async (c) => {
          setShowAdd(false);
          if (c?.id) { onSelect(c); setQuery(''); }
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------ quick lookup

// Standalone "type an id / name / mobile, see the customer card, act on it
// immediately" widget (spec item 5) — used by the Customer Department page
// header and available for embedding anywhere a fast lookup is useful.
export function CustomerQuickLookup({
  onOpenCustomer, onCreateSale, onCreateOrder, onCreateRepair,
}: {
  onOpenCustomer: (id: string) => void;
  onCreateSale?: (c: CustomerSearchResult) => void;
  onCreateOrder?: (c: CustomerSearchResult) => void;
  onCreateRepair?: (c: CustomerSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const { results, loading } = useCustomerSearch(query, { limit: 5 });
  const top = results[0] || null;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Customer: ID, name, mobile, WhatsApp, email or GSTIN..."
          className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
      </div>
      {query.trim() && !loading && results.length === 0 && (
        <p className="text-xs text-slate-500 italic">No customer matches "{query}".</p>
      )}
      {top && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block font-code font-bold text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5 mb-1">{top.id}</span>
              <p className="text-sm font-bold text-slate-100 truncate">{top.name}</p>
              {top.mobile && <p className="text-xs text-slate-400 font-code">📞 {top.mobile}</p>}
              {(top.city || top.state) && <p className="text-xs text-slate-500">📍 {[top.city, top.state].filter(Boolean).join(', ')}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] h-8 text-xs" onClick={() => onOpenCustomer(top.id)}><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Customer</Button>
            {buildTelLink(top.mobile) && <a href={buildTelLink(top.mobile)!}><Button size="sm" variant="outline" className="border-slate-800 h-8 text-xs text-emerald-400"><Phone className="w-3.5 h-3.5 mr-1.5" /> Call</Button></a>}
            {buildWhatsAppLink(top.whatsappNumber || top.mobile) && (
              <a href={buildWhatsAppLink(top.whatsappNumber || top.mobile)!} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-slate-800 h-8 text-xs text-lime-400"><MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp</Button>
              </a>
            )}
            {onCreateSale && <Button size="sm" variant="outline" className="border-slate-800 h-8 text-xs" onClick={() => onCreateSale(top)}>Create Sale</Button>}
            {onCreateOrder && <Button size="sm" variant="outline" className="border-slate-800 h-8 text-xs" onClick={() => onCreateOrder(top)}>Create Order</Button>}
            {onCreateRepair && <Button size="sm" variant="outline" className="border-slate-800 h-8 text-xs" onClick={() => onCreateRepair(top)}>Create Repair</Button>}
          </div>
        </div>
      )}
    </div>
  );
}

export { formatCustomerLabel };
