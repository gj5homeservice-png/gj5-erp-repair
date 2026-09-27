"use client"

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Eye, Pencil, Printer, FileText, Wallet, Trash2, AlertTriangle, RefreshCw, X, Loader2,
  ShoppingCart, CalendarDays, CalendarRange, BadgeCheck, Clock, Ban, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import { format, isToday, isThisMonth, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/client-api';
import { downloadInvoicePdf } from '@/lib/invoice-pdf';
import { buildRecordHtml, printHtmlDocument } from '@/lib/print-document';
import {
  normalizeSaleStatus, normalizePaymentStatus, isActiveSale, remaining,
  SALE_STATUSES, PAYMENT_STATUSES, SALE_STATUS_BADGE, PAYMENT_STATUS_BADGE,
  type SaleStatus, type PaymentStatus,
} from '@/lib/sales-utils';
import type { SalesOrder } from '@/lib/types';
import { TransactionForm } from './TransactionForm';
import { SummaryCard, PaymentDialog, ConfirmDialog, usePaymentHistory, money } from './shared';

const PAGE_SIZE = 25;
const ALL = 'All';

const sd = (s?: string) => {
  if (!s) return null;
  try { return parseISO(s.length > 10 ? s : `${s}T00:00:00`); } catch { return null; }
};

export function SalesModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [initialCustomer, setInitialCustomer] = useState<{ id: string; name: string; mobile: string } | null>(null);

  // "Create Sale" from a Customer Profile lands here with the customer
  // already picked — consumed once, then cleared so it never re-triggers.
  useEffect(() => {
    if (store.pendingCustomerAction?.action === 'sale') {
      setInitialCustomer(store.pendingCustomerAction.customer);
      setEditing(null);
      setView('form');
      store.setPendingCustomerAction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.pendingCustomerAction]);
  const [viewing, setViewing] = useState<SalesOrder | null>(null);
  const [paying, setPaying] = useState<SalesOrder | null>(null);
  const [deleting, setDeleting] = useState<SalesOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState(ALL);
  const [paymentFilter, setPaymentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [brandFilter, setBrandFilter] = useState(ALL);
  const [page, setPage] = useState(1);

  const perms = store.session?.permissions;
  const can = (action: 'create' | 'edit' | 'delete' | 'print') => !perms || !!perms.Sales?.[action];

  const sales: SalesOrder[] = store.salesOrders || [];
  const invoices: any[] = store.invoices || [];
  const invoiceOf = (s: SalesOrder) => invoices.find(i => i.id === s.billingInvoiceId) || null;

  const stats = useMemo(() => {
    const active = sales.filter(s => isActiveSale(normalizeSaleStatus(s.orderStatus)));
    const sum = (list: SalesOrder[], f: (s: SalesOrder) => number) => list.reduce((a, s) => a + (Number(f(s)) || 0), 0);
    return {
      total: sum(active, s => s.grandTotal),
      today: sum(active.filter(s => { const d = sd(s.saleDate); return d && isToday(d); }), s => s.grandTotal),
      month: sum(active.filter(s => { const d = sd(s.saleDate); return d && isThisMonth(d); }), s => s.grandTotal),
      paid: sum(active, s => s.amountPaid),
      pending: sum(active, s => remaining(s.grandTotal, s.amountPaid)),
      cancelled: sales.filter(s => normalizeSaleStatus(s.orderStatus) === 'Cancelled').length,
    };
  }, [sales]);

  const customerOptions = useMemo(() => {
    const m = new Map<string, string>();
    sales.forEach(s => { if (s.customerId) m.set(s.customerId, s.customerName || s.customerId); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sales]);
  const brandOptions = useMemo(() => Array.from(new Set(sales.map(s => s.brand).filter(Boolean))).sort(), [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter(s => {
      const inv = invoiceOf(s);
      const matchesSearch = !q ||
        s.id.toLowerCase().includes(q) || (inv?.invoiceNumber || '').toLowerCase().includes(q) ||
        (s.customerName || '').toLowerCase().includes(q) || (s.mobile || '').includes(q) ||
        `${s.brand} ${s.model}`.toLowerCase().includes(q);
      const day = (s.saleDate || '').slice(0, 10);
      return matchesSearch &&
        (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo) &&
        (customerFilter === ALL || s.customerId === customerFilter) &&
        (paymentFilter === ALL || normalizePaymentStatus(s.paymentStatus) === paymentFilter) &&
        (statusFilter === ALL || normalizeSaleStatus(s.orderStatus) === statusFilter) &&
        (brandFilter === ALL || s.brand === brandFilter);
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, invoices, search, dateFrom, dateTo, customerFilter, paymentFilter, statusFilter, brandFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  const anyFilter = search || dateFrom || dateTo || customerFilter !== ALL || paymentFilter !== ALL || statusFilter !== ALL || brandFilter !== ALL;
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setCustomerFilter(ALL); setPaymentFilter(ALL); setStatusFilter(ALL); setBrandFilter(ALL); setPage(1); };

  const refresh = async () => {
    setRefreshing(true);
    try { await store.refreshData(); } finally { setTimeout(() => setRefreshing(false), 500); }
  };

  const fail = (title: string, e: any) => toast({ variant: 'destructive', title, description: e?.message || 'Please try again.' });

  // ---- printing / invoices -------------------------------------------------

  const printSale = async (s: SalesOrder) => {
    setBusyId(s.id);
    try {
      const pay = await apiFetch(`/api/erp/sales-orders/${s.id}/payments`).then(j => j.data || []).catch(() => []);
      const inv = invoiceOf(s);
      printHtmlDocument(`Sale ${s.id}`, buildRecordHtml({
        title: 'Sale Summary', idLabel: 'Sale ID', profile: store.companyProfile || {}, payments: pay,
        record: {
          id: s.id, date: s.saleDate, customerId: s.customerId, customerName: s.customerName, mobile: s.mobile, address: s.address,
          brand: s.brand, model: s.model, quantity: s.quantity, unitPrice: s.unitPrice, subtotal: s.subtotal, discount: s.discount,
          gstEnabled: s.gstEnabled, gstRate: s.gstRate, gstAmount: s.gstAmount, deliveryCharge: s.deliveryCharge,
          total: s.grandTotal, amountPaid: s.amountPaid, paymentStatus: s.paymentStatus,
          statusLabel: normalizeSaleStatus(s.orderStatus).toUpperCase(), notes: s.notes, invoiceNumber: inv?.invoiceNumber,
        },
      }));
    } catch (e) { fail('Print failed', e); } finally { setBusyId(null); }
  };

  // Prints via the ONE invoice engine: creates the sale's Billing invoice if it
  // doesn't have one yet, then uses the same PDF as Invoice History.
  const printInvoice = async (s: SalesOrder) => {
    setBusyId(s.id);
    try {
      let invoiceId = s.billingInvoiceId;
      if (!invoiceOf(s)) {
        const json = await apiFetch(`/api/erp/sales-orders/${s.id}/invoice`, { method: 'POST' });
        invoiceId = json.data?.invoiceId || json.invoiceId;
        if (json.data?.created) toast({ title: 'Invoice Generated', description: 'The invoice was added to Invoice History.' });
        await store.refreshData();
      }
      const list = await apiFetch('/api/erp/invoices').then(j => j.data || []);
      const inv = list.find((i: any) => i.id === invoiceId);
      if (!inv) throw new Error('The invoice could not be found. Please refresh and try again.');
      downloadInvoicePdf(inv, store.companyProfile || {});
    } catch (e) { fail('Invoice failed', e); } finally { setBusyId(null); }
  };

  const recordPayment = async (s: SalesOrder, p: { amount: number; method: string; paidOn: string; note: string }) => {
    await apiFetch(`/api/erp/sales-orders/${s.id}/payments`, { method: 'POST', body: JSON.stringify(p) });
    await store.refreshData();
    toast({ title: 'Payment Recorded', description: `₹${p.amount.toLocaleString('en-IN')} added to sale ${s.id}.` });
    setPaying(null);
    setViewing(null);
  };

  const deleteSale = async (s: SalesOrder) => {
    await apiFetch(`/api/erp/sales-orders/${s.id}`, { method: 'DELETE' });
    await store.refreshData();
    toast({ title: 'Sale Deleted', description: `Sale ${s.id} was removed and its stock returned.` });
    setDeleting(null);
  };

  if (view === 'form') {
    return (
      <TransactionForm
        store={store} mode="sale" editing={editing} initialCustomer={initialCustomer}
        onClose={() => { setView('list'); setEditing(null); setInitialCustomer(null); }}
        onSaved={(msg) => { toast({ title: 'Saved', description: msg }); setView('list'); setEditing(null); setInitialCustomer(null); }}
      />
    );
  }

  const Actions = ({ s, compact }: { s: SalesOrder; compact?: boolean }) => {
    const busy = busyId === s.id;
    const btn = compact ? 'h-8 px-2 text-[11px]' : 'h-7 w-6';
    const item = (icon: React.ReactNode, title: string, onClick: () => void, hover: string, disabled = false) => (
      <Button size={compact ? 'sm' : 'icon'} variant="ghost" title={title} aria-label={title} disabled={disabled || busy}
        className={`${btn} text-slate-400 ${hover}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {icon}{compact && <span className="ml-1">{title}</span>}
      </Button>
    );
    const active = isActiveSale(normalizeSaleStatus(s.orderStatus));
    return (
      <>
        {item(<Eye className="w-3.5 h-3.5" />, 'View', () => setViewing(s), 'hover:text-blue-400')}
        {can('edit') && item(<Pencil className="w-3.5 h-3.5" />, 'Edit', () => { setEditing(s); setView('form'); }, 'hover:text-amber-400')}
        {can('print') && item(<Printer className="w-3.5 h-3.5" />, 'Print', () => printSale(s), 'hover:text-slate-100')}
        {can('print') && item(<FileText className="w-3.5 h-3.5" />, 'Print Invoice', () => printInvoice(s), 'hover:text-emerald-400', !active)}
        {can('edit') && item(<Wallet className="w-3.5 h-3.5" />, 'Payment', () => setPaying(s), 'hover:text-cyan-400', !active || remaining(s.grandTotal, s.amountPaid) <= 0)}
        {can('delete') && item(<Trash2 className="w-3.5 h-3.5" />, 'Delete', () => setDeleting(s), 'hover:text-rose-500')}
      </>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-3xl font-headline font-bold text-slate-100 tracking-tight">Sales</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Product sales, payments and invoices</p>
        </div>
        {can('create') && (
          <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => { setEditing(null); setView('form'); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Sale
          </Button>
        )}
      </div>

      {store.dataError && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> Unable to load sales. Please try again.</div>
          <Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={refresh}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Sales" value={money(stats.total)} icon={ShoppingCart} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="Today's Sales" value={money(stats.today)} icon={CalendarDays} colorClass="bg-purple-600/10 text-purple-400" />
        <SummaryCard label="This Month's Sales" value={money(stats.month)} icon={CalendarRange} colorClass="bg-cyan-600/10 text-cyan-400" />
        <SummaryCard label="Paid Sales" value={money(stats.paid)} icon={BadgeCheck} colorClass="bg-emerald-600/10 text-emerald-400" />
        <SummaryCard label="Pending Payment" value={money(stats.pending)} icon={Clock} colorClass="bg-amber-600/10 text-amber-400" />
        <SummaryCard label="Cancelled Sales" value={stats.cancelled} icon={Ban} colorClass="bg-rose-600/10 text-rose-400" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search Sale ID, Invoice No., Customer, Mobile, Product..."
              className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
          </div>
          <Button variant="outline" className="h-10 border-slate-800 text-slate-300" onClick={refresh}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {anyFilter && <Button variant="ghost" className="h-10 text-slate-400" onClick={clearFilters}><X className="w-4 h-4 mr-1" /> Clear</Button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Input type="date" aria-label="From date" title="From date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Input type="date" aria-label="To date" title="To date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Select value={customerFilter} onValueChange={v => { setCustomerFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 max-h-72">
              <SelectItem value={ALL}>All Customers</SelectItem>
              {customerOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value={ALL}>All Payments</SelectItem>
              {PAYMENT_STATUSES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {SALE_STATUSES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={v => { setBrandFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 max-h-72">
              <SelectItem value={ALL}>All Brands</SelectItem>
              {brandOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4 gap-3">
          <span>{sales.length === 0 ? 'No sales found.' : 'No sales match these filters.'}</span>
          {sales.length === 0 && can('create') && <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] not-italic" onClick={() => { setEditing(null); setView('form'); }}><Plus className="w-4 h-4 mr-1" /> New Sale</Button>}
          {sales.length > 0 && <Button size="sm" variant="outline" className="border-slate-800 not-italic" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <MobileCardList>
            {paged.map(s => {
              const st = normalizeSaleStatus(s.orderStatus); const ps = normalizePaymentStatus(s.paymentStatus); const inv = invoiceOf(s);
              return (
                <MobileCard key={s.id} onClick={() => setViewing(s)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><span className="font-code font-bold text-blue-400 text-sm">{s.id}</span><p className="font-bold text-sm text-slate-200 break-words">{s.customerName}</p></div>
                    <Badge className={`${SALE_STATUS_BADGE[st]} text-[9px] uppercase shrink-0`}>{st}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <MobileCardRow label="Invoice" value={inv?.invoiceNumber || '—'} />
                    <MobileCardRow label="Date" value={s.saleDate} />
                    <MobileCardRow label="Mobile" value={s.mobile} />
                    <MobileCardRow label="Product" value={`${s.brand} ${s.model}`} noTruncate />
                    <MobileCardRow label="Amount" value={money(s.grandTotal)} />
                    <MobileCardRow label="Payment" value={<Badge className={`${PAYMENT_STATUS_BADGE[ps]} text-[9px] uppercase`}>{ps}</Badge>} />
                    {ps === 'Partial' && <MobileCardRow label="Remaining" value={money(remaining(s.grandTotal, s.amountPaid))} />}
                  </div>
                  <MobileCardActions><Actions s={s} compact /></MobileCardActions>
                </MobileCard>
              );
            })}
          </MobileCardList>

          <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden [&_th]:px-2 [&_td]:px-2 [&_td]:py-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800">
                  {['Sale ID', 'Invoice No.', 'Date', 'Customer / Mobile', 'Product', 'Amount', 'Payment', 'Sale Status'].map(h => (
                    <TableHead key={h} className="text-slate-500 uppercase text-[10px] font-bold">{h}</TableHead>
                  ))}
                  <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(s => {
                  const st = normalizeSaleStatus(s.orderStatus); const ps = normalizePaymentStatus(s.paymentStatus); const inv = invoiceOf(s);
                  return (
                    <TableRow key={s.id} className="border-slate-800 hover:bg-slate-800/20">
                      <TableCell className="font-code font-bold text-blue-400 text-xs">{s.id}</TableCell>
                      <TableCell className="font-code text-xs text-slate-300">{inv?.invoiceNumber || <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-xs text-slate-300 whitespace-nowrap">{s.saleDate}</TableCell>
                      <TableCell className="text-xs">
                        <span className="block font-bold text-slate-200">{s.customerName}</span>
                        <span className="block text-[11px] text-slate-400 font-code">{s.mobile}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{s.brand} {s.model}</TableCell>
                      <TableCell className="text-xs font-code text-slate-200 whitespace-nowrap">
                        {money(s.grandTotal)}
                        {ps === 'Partial' && <span className="block text-[10px] text-amber-400">Due {money(remaining(s.grandTotal, s.amountPaid))}</span>}
                      </TableCell>
                      <TableCell><Badge className={`${PAYMENT_STATUS_BADGE[ps]} text-[9px] uppercase`}>{ps}</Badge></TableCell>
                      <TableCell><Badge className={`${SALE_STATUS_BADGE[st]} text-[9px] uppercase`}>{st}</Badge></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-0.5">{busyId === s.id ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <Actions s={s} />}</div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} sale{filtered.length === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <span>Page {Math.min(page, pages)} of {pages}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}

      <SaleDetails sale={viewing} invoice={viewing ? invoiceOf(viewing) : null} onClose={() => setViewing(null)}
        onPay={can('edit') ? (s) => { setViewing(null); setPaying(s); } : undefined}
        onEdit={can('edit') ? (s) => { setViewing(null); setEditing(s); setView('form'); } : undefined} />

      <PaymentDialog open={!!paying} onClose={() => setPaying(null)} title="Record Payment" refLabel={paying ? `Sale ${paying.id} • ${paying.customerName}` : ''}
        total={paying?.grandTotal || 0} paid={paying?.amountPaid || 0} onSubmit={(p) => recordPayment(paying!, p)} />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Sale?" confirmLabel="Delete Sale"
        message={<>Delete sale <b>{deleting?.id}</b> for {deleting?.customerName}? Its stock is returned to inventory and its payment history is removed. A sale that has an invoice can’t be deleted — cancel it after removing the invoice instead.</>}
        onConfirm={() => deleteSale(deleting!)} />
    </div>
  );
}

function SaleDetails({ sale, invoice, onClose, onPay, onEdit }: {
  sale: SalesOrder | null; invoice: any | null; onClose: () => void; onPay?: (s: SalesOrder) => void; onEdit?: (s: SalesOrder) => void;
}) {
  const { payments, loading } = usePaymentHistory('sales-orders', sale?.id || null);
  if (!sale) return null;
  const st = normalizeSaleStatus(sale.orderStatus); const ps = normalizePaymentStatus(sale.paymentStatus);
  const rows: [string, React.ReactNode][] = [
    ['Customer', `${sale.customerName} (${sale.customerId})`], ['Mobile', sale.mobile],
    ['Product', `${sale.brand} ${sale.model}`], ['Product ID', sale.productId || '—'],
    ['Quantity', sale.quantity], ['Unit Price', money(sale.unitPrice)], ['Sale Date', sale.saleDate],
    ['Discount', money(sale.discount)], ['GST', sale.gstEnabled ? `${sale.gstRate}% (${money(sale.gstAmount)})` : 'Not applied'],
    ['Delivery Charge', money(sale.deliveryCharge)], ['Payment Method', sale.paymentMethod || '—'],
    ['Delivery', sale.deliveryRequired ? sale.deliveryStatus : 'Not required'],
    ['Invoice', invoice ? invoice.invoiceNumber : 'Not generated'],
    ...(sale.sourceOrderId ? [['From Order', sale.sourceOrderId] as [string, React.ReactNode]] : []),
    ...(sale.notes ? [['Notes', sale.notes] as [string, React.ReactNode]] : []),
  ];
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-headline font-bold flex flex-wrap items-center gap-2">
            Sale {sale.id}
            <Badge className={`${SALE_STATUS_BADGE[st]} text-[9px] uppercase`}>{st}</Badge>
            <Badge className={`${PAYMENT_STATUS_BADGE[ps]} text-[9px] uppercase`}>{ps}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 text-xs">
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between gap-4 py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500 uppercase font-bold shrink-0">{l}</span><span className="text-slate-200 font-bold text-right break-words">{v}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Total', sale.grandTotal, 'text-slate-100'], ['Paid', sale.amountPaid, 'text-emerald-400'], ['Remaining', remaining(sale.grandTotal, sale.amountPaid), 'text-rose-400']].map(([l, v, c]) => (
            <div key={l as string} className="bg-slate-950 border border-slate-800 rounded-xl py-2.5">
              <p className="text-[9px] uppercase font-bold text-slate-500">{l as string}</p><p className={`text-sm font-black font-code ${c}`}>{money(v as number)}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Payment History</p>
          {loading ? <p className="text-xs text-slate-500">Loading...</p> : payments.length === 0 ? <p className="text-xs text-slate-600 italic">No payments recorded.</p> : (
            <div className="space-y-1">
              {payments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-400">{p.paidOn} • {p.method}{p.note ? ` • ${p.note}` : ''}</span><span className="font-code font-bold text-emerald-400">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {onEdit && <Button variant="outline" className="border-slate-800" onClick={() => onEdit(sale)}><Pencil className="w-4 h-4 mr-1.5" /> Edit</Button>}
          {onPay && isActiveSale(st) && remaining(sale.grandTotal, sale.amountPaid) > 0 && <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => onPay(sale)}><Wallet className="w-4 h-4 mr-1.5" /> Add Payment</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
