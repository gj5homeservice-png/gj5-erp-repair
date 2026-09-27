"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { useCustomerSearch } from './CustomerSearch';
import { buildTelLink, buildWhatsAppLink } from '@/lib/customer-utils';

// App-wide Ctrl+K (Cmd+K on Mac) quick search — today searches customers
// (by Customer ID, name, mobile, WhatsApp, email or GSTIN); the same
// fast/indexed endpoint every picker in the app uses, so it's never slower
// here than anywhere else. Mounted once at the dashboard root.
export function GlobalQuickSearch({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useCustomerSearch(query, { limit: 8 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const openCustomer = (id: string) => { setOpen(false); onOpenCustomer(id); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 p-0 gap-0 top-[20%] translate-y-0">
        <div className="relative border-b border-slate-800">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Customer: ID, name, mobile, WhatsApp, email or GSTIN..."
            className="w-full h-14 pl-11 pr-4 bg-transparent outline-none text-sm text-[#F8FAFC] placeholder:text-slate-600"
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() && <p className="px-4 py-8 text-center text-xs text-slate-600 italic">Type to search customers by ID, name, mobile, WhatsApp, email or GSTIN.</p>}
          {query.trim() && !loading && results.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-600 italic">No customer matches "{query}".</p>}
          {results.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/40 border-b border-slate-800/50 last:border-0">
              <button className="min-w-0 text-left flex-1" onClick={() => openCustomer(c.id)}>
                <span className="font-code text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 mr-2">{c.id}</span>
                <span className="text-sm font-bold text-slate-200">{c.name || 'Unnamed'}</span>
                <span className="block text-[11px] text-slate-500 font-code mt-0.5">{c.mobile}{c.city ? ` • ${c.city}` : ''}</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {buildTelLink(c.mobile) && <a href={buildTelLink(c.mobile)!} onClick={e => e.stopPropagation()} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10"><Phone className="w-3.5 h-3.5" /></a>}
                {buildWhatsAppLink(c.whatsappNumber || c.mobile) && <a href={buildWhatsAppLink(c.whatsappNumber || c.mobile)!} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded text-lime-400 hover:bg-lime-500/10"><MessageCircle className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600 flex items-center justify-between">
          <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd> to close</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">K</kbd> anywhere to search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
