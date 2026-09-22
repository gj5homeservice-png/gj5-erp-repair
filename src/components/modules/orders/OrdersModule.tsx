"use client"

import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Eye, Pencil, Printer, Receipt, Wallet, Trash2, AlertTriangle, RefreshCw, X, Loader2, ArrowRightCircle,
  ClipboardList, Sparkles, Hourglass, CheckCircle2, Cog, PackageCheck, Truck, Ban, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/client-api';
import { buildRecordHtml, printHtmlDocument } from '@/lib/print-document';
import {
  normalizeOrderStatus, normalizePaymentStatus, remaining, deliveryLabelForOrder,
  ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE, ORDER_TRANSITIONS, PAYMENT_STATUSES, PAYMENT_STATUS_BADGE,
  type OrderStatus,
} from '@/lib/sales-utils';
import type { CustomerOrder } from '@/lib/types';
import { TransactionForm } from '@/components/modules/sales/TransactionForm';
import { SummaryCard, PaymentDialog, ConfirmDialog, usePaymentHistory, money } from '@/components/modules/sales/shared';

const PAGE_SIZE = 25;
const ALL = 'All';

export function OrdersModule({ store, onNavigate }: { store: any; onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<CustomerOrder | null>(null);
  const [viewing, setViewing] = useState<CustomerOrder | null>(null);
  const [paying, setPaying] = useState<CustomerOrder | null>(null);
  const [deleting, setDeleting] = useState<CustomerOrder | null>(null);
  const [statusFor, setStatusFor] = useState<CustomerOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [paymentFilter, setPaymentFilter] = useState(ALL);
  const [customerFilter, setCustomerFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const perms = store.session?.permissions;
  const can = (action: 'create' | 'edit' | 'delete' | 'print') => !perms || !!perms.Orders?.[action];

  const orders: CustomerOrder[] = store.customerOrders || [];

  const count = (...s: OrderStatus[]) => orders.filter(o => s.includes(normalizeOrderStatus(o.orderStatus))).length;
  const stats = {
    total: orders.length,
    new: count('NEW'),
    pending: count('NEW', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'),
    confirmed: count('CONFIRMED'),
    processing: count('PROCESSING'),
    ready: count('READY'),
    delivered: count('DELIVERED'),
    cancelled: count('CANCELLED'),
  };

  const customerOptions = useMemo(() => {
    const m = new Map<string, string>();
    orders.forEach(o => { if (o.customerId) m.set(o.customerId, o.customerName || o.customerId); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      const day = (o.orderDate || '').slice(0, 10);
      return (!q || o.id.toLowerCase().includes(q) || (o.customerName || '').toLowerCase().includes(q) || (o.mobile || '').includes(q) ||
          `${o.brand} ${o.model} ${o.productName || ''}`.toLowerCase().includes(q)) &&
        (statusFilter === ALL || normalizeOrderStatus(o.orderStatus) === statusFilter) &&
        (paymentFilter === ALL || normalizePaymentStatus(o.paymentStatus) === paymentFilter) &&
        (customerFilter === ALL || o.customerId === customerFilter) &&
        (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [orders, search, statusFilter, paymentFilter, customerFilter, dateFrom, dateTo]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  const anyFilter = search || statusFilter !== ALL || paymentFilter !== ALL || customerFilter !== ALL || dateFrom || dateTo;
  const clearFilters = () => { setSearch(''); setStatusFilter(ALL); setPaymentFilter(ALL); setCustomerFilter(ALL); setDateFrom(''); setDateTo(''); setPage(1); };

  const refresh = async () => {
    setRefreshing(true);
    try { await store.refreshData(); } finally { setTimeout(() => setRefreshing(false), 500); }
  };
  const fail = (title: string, e: any) => toast({ variant: 'destructive', title, description: e?.message || 'Please try again.' });

  const print = async (o: CustomerOrder, receipt: boolean) => {
    setBusyId(o.id);
    try {
      const pay = await apiFetch(`/api/erp/customer-orders/${o.id}/payments`).then(j => j.data || []).catch(() => []);
      printHtmlDocument(`${receipt ? 'Receipt' : 'Order'} ${o.id}`, buildRecordHtml({
        title: receipt ? 'Order Receipt' : 'Order Summary', idLabel: 'Order ID', profile: store.companyProfile || {}, payments: pay, receipt,
        record: {
          id: o.id, date: o.orderDate, customerId: o.customerId, customerName: o.customerName, mobile: o.mobile,
          brand: o.brand, model: o.model, productName: o.productName, quantity: o.quantity, unitPrice: o.unitPrice, subtotal: o.subtotal,
          discount: o.discount, gstEnabled: o.gstEnabled, gstRate: o.gstRate, gstAmount: o.gstAmount, deliveryCharge: o.deliveryCharge,
          total: o.totalAmount, amountPaid: o.amountPaid, paymentStatus: o.paymentStatus,
          statusLabel: ORDER_STATUS_LABEL[normalizeOrderStatus(o.orderStatus)], notes: o.notes, expectedDeliveryDate: o.expectedDeliveryDate,
        },
      }));
    } catch (e) { fail('Print failed', e); } finally { setBusyId(null); }
  };

  const recordPayment = async (o: CustomerOrder, p: { amount: number; method: string; paidOn: string; note: string }) => {
    await apiFetch(`/api/erp/customer-orders/${o.id}/payments`, { method: 'POST', body: JSON.stringify(p) });
    await store.refreshData();
    toast({ title: 'Payment Recorded', description: `₹${p.amount.toLocaleString('en-IN')} added to order ${o.id}.` });
    setPaying(null);
    setViewing(null);
  };

  const deleteOrder = async (o: CustomerOrder) => {
    await apiFetch(`/api/erp/customer-orders/${o.id}`, { method: 'DELETE' });
    await store.refreshData();
    toast({ title: 'Order Deleted', description: `Order ${o.id} was removed.` });
    setDeleting(null);
  };

  const changeStatus = async (o: CustomerOrder, next: OrderStatus) => {
    const json = await apiFetch(`/api/erp/customer-orders/${o.id}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) });
    await store.refreshData();
    const saleId = json.data?.saleId;
    toast({
      title: `Order ${ORDER_STATUS_LABEL[next]}`,
      description: saleId ? `Order ${o.id} was delivered and recorded as sale ${saleId}. Stock has been updated.` : `Order ${o.id} is now ${ORDER_STATUS_LABEL[next]}.`,
    });
    setStatusFor(null);
  };

  if (view === 'form') {
    return (
      <TransactionForm
        store={store} mode="order" editing={editing}
        onClose={() => { setView('list'); setEditing(null); }}
        onSaved={(msg) => { toast({ title: 'Saved', description: msg }); setView('list'); setEditing(null); }}
      />
    );
  }

  const Actions = ({ o, compact }: { o: CustomerOrder; compact?: boolean }) => {
    const busy = busyId === o.id;
    const st = normalizeOrderStatus(o.orderStatus);
    const closed = st === 'DELIVERED' || st === 'CANCELLED';
    const item = (icon: React.ReactNode, title: string, onClick: () => void, hover: string, disabled = false) => (
      <Button size={compact ? 'sm' : 'icon'} variant="ghost" title={title} aria-label={title} disabled={disabled || busy}
        className={`${compact ? 'h-8 px-2 text-[11px]' : 'h-7 w-6'} text-slate-400 ${hover}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {icon}{compact && <span className="ml-1">{title}</span>}
      </Button>
    );
    return (
      <>
        {item(<Eye className="w-3.5 h-3.5" />, 'View', () => setViewing(o), 'hover:text-blue-400')}
        {can('edit') && item(<Pencil className="w-3.5 h-3.5" />, 'Edit', () => { setEditing(o); setView('form'); }, 'hover:text-amber-400', closed)}
        {can('edit') && item(<ArrowRightCircle className="w-3.5 h-3.5" />, 'Update Status', () => setStatusFor(o), 'hover:text-purple-400', closed)}
        {can('edit') && item(<Wallet className="w-3.5 h-3.5" />, 'Payment', () => setPaying(o), 'hover:text-cyan-400', st === 'CANCELLED' || !!o.saleId || remaining(o.totalAmount, o.amountPaid) <= 0)}
        {can('print') && item(<Printer className="w-3.5 h-3.5" />, 'Print', () => print(o, false), 'hover:text-slate-100')}
        {can('print') && item(<Receipt className="w-3.5 h-3.5" />, 'Print Receipt', () => print(o, true), 'hover:text-emerald-400')}
        {can('delete') && item(<Trash2 className="w-3.5 h-3.5" />, 'Delete', () => setDeleting(o), 'hover:text-rose-500', !!o.saleId)}
      </>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-3xl font-headline font-bold text-slate-100 tracking-tight">Orders</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Customer orders from request to delivery</p>
        </div>
        {can('create') && (
          <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => { setEditing(null); setView('form'); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Order
          </Button>
        )}
      </div>

      {store.dataError && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> Unable to load orders. Please try again.</div>
          <Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={refresh}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <SummaryCard label="Total Orders" value={stats.total} icon={ClipboardList} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="New Orders" value={stats.new} icon={Sparkles} colorClass="bg-cyan-600/10 text-cyan-400" />
        <SummaryCard label="Pending Orders" value={stats.pending} icon={Hourglass} colorClass="bg-amber-600/10 text-amber-400" />
        <SummaryCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} colorClass="bg-indigo-600/10 text-indigo-400" />
        <SummaryCard label="Processing" value={stats.processing} icon={Cog} colorClass="bg-purple-600/10 text-purple-400" />
        <SummaryCard label="Ready for Delivery" value={stats.ready} icon={PackageCheck} colorClass="bg-lime-600/10 text-lime-400" />
        <SummaryCard label="Delivered" value={stats.delivered} icon={Truck} colorClass="bg-emerald-600/10 text-emerald-400" />
        <SummaryCard label="Cancelled" value={stats.cancelled} icon={Ban} colorClass="bg-rose-600/10 text-rose-400" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search Order ID, Customer, Mobile, Product..."
              className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
          </div>
          <Button variant="outline" className="h-10 border-slate-800 text-slate-300" onClick={refresh}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {anyFilter && <Button variant="ghost" className="h-10 text-slate-400" onClick={clearFilters}><X className="w-4 h-4 mr-1" /> Clear</Button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value={ALL}>All Payments</SelectItem>
              {PAYMENT_STATUSES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={v => { setCustomerFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 max-h-72">
              <SelectItem value={ALL}>All Customers</SelectItem>
              {customerOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" aria-label="From date" title="From date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Input type="date" aria-label="To date" title="To date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4 gap-3">
          <span>{orders.length === 0 ? 'No orders found.' : 'No orders match these filters.'}</span>
          {orders.length === 0 && can('create') && <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] not-italic" onClick={() => { setEditing(null); setView('form'); }}><Plus className="w-4 h-4 mr-1" /> New Order</Button>}
          {orders.length > 0 && <Button size="sm" variant="outline" className="border-slate-800 not-italic" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <MobileCardList>
            {paged.map(o => {
              const st = normalizeOrderStatus(o.orderStatus); const ps = normalizePaymentStatus(o.paymentStatus);
              return (
                <MobileCard key={o.id} onClick={() => setViewing(o)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><span className="font-code font-bold text-blue-400 text-sm">{o.id}</span><p className="font-bold text-sm text-slate-200 break-words">{o.customerName}</p></div>
                    <Badge className={`${ORDER_STATUS_BADGE[st]} text-[9px] uppercase shrink-0`}>{ORDER_STATUS_LABEL[st]}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <MobileCardRow label="Date" value={o.orderDate} />
                    <MobileCardRow label="Mobile" value={o.mobile} />
                    <MobileCardRow label="Product" value={`${o.brand} ${o.model}`} noTruncate />
                    <MobileCardRow label="Amount" value={money(o.totalAmount)} />
                    <MobileCardRow label="Payment" value={<Badge className={`${PAYMENT_STATUS_BADGE[ps]} text-[9px] uppercase`}>{ps}</Badge>} />
                    <MobileCardRow label="Delivery" value={deliveryLabelForOrder(st, o.deliveryRequired)} />
                    <MobileCardRow label="Expected" value={o.expectedDeliveryDate} />
                  </div>
                  <MobileCardActions><Actions o={o} compact /></MobileCardActions>
                </MobileCard>
              );
            })}
          </MobileCardList>

          <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden [&_th]:px-2 [&_td]:px-2 [&_td]:py-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800">
                  {['Order ID', 'Date', 'Customer / Mobile', 'Product', 'Amount', 'Payment', 'Delivery', 'Expected'].map(h => (
                    <TableHead key={h} className="text-slate-500 uppercase text-[10px] font-bold">{h}</TableHead>
                  ))}
                  <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
                  <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(o => {
                  const st = normalizeOrderStatus(o.orderStatus); const ps = normalizePaymentStatus(o.paymentStatus);
                  return (
                    <TableRow key={o.id} className="border-slate-800 hover:bg-slate-800/20">
                      <TableCell className="font-code font-bold text-blue-400 text-xs">{o.id}</TableCell>
                      <TableCell className="text-xs text-slate-300 whitespace-nowrap">{o.orderDate}</TableCell>
                      <TableCell className="text-xs">
                        <span className="block font-bold text-slate-200">{o.customerName}</span>
                        <span className="block text-[11px] text-slate-400 font-code">{o.mobile}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{o.brand} {o.model}</TableCell>
                      <TableCell className="text-xs font-code text-slate-200 whitespace-nowrap">
                        {money(o.totalAmount)}
                        {ps === 'Partial' && <span className="block text-[10px] text-amber-400">Due {money(remaining(o.totalAmount, o.amountPaid))}</span>}
                      </TableCell>
                      <TableCell><Badge className={`${PAYMENT_STATUS_BADGE[ps]} text-[9px] uppercase`}>{ps}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-300 whitespace-nowrap">{deliveryLabelForOrder(st, o.deliveryRequired)}</TableCell>
                      <TableCell className="text-xs text-slate-300 whitespace-nowrap">{o.expectedDeliveryDate || '—'}</TableCell>
                      <TableCell><Badge className={`${ORDER_STATUS_BADGE[st]} text-[9px] uppercase max-w-[96px] text-center leading-tight`}>{ORDER_STATUS_LABEL[st]}</Badge></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-0.5">{busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <Actions o={o} />}</div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} order{filtered.length === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <span>Page {Math.min(page, pages)} of {pages}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}

      <OrderDetails order={viewing} onClose={() => setViewing(null)} onOpenSales={onNavigate ? () => { setViewing(null); onNavigate('Sales'); } : undefined}
        onPay={can('edit') ? (o) => { setViewing(null); setPaying(o); } : undefined}
        onEdit={can('edit') ? (o) => { setViewing(null); setEditing(o); setView('form'); } : undefined} />

      <PaymentDialog open={!!paying} onClose={() => setPaying(null)} title="Record Payment" refLabel={paying ? `Order ${paying.id} • ${paying.customerName}` : ''}
        total={paying?.totalAmount || 0} paid={paying?.amountPaid || 0} onSubmit={(p) => recordPayment(paying!, p)} />

      <StatusDialog order={statusFor} onClose={() => setStatusFor(null)} onSubmit={(next) => changeStatus(statusFor!, next)} />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Order?" confirmLabel="Delete Order"
        message={<>Delete order <b>{deleting?.id}</b> for {deleting?.customerName}? An order that has received money can’t be deleted — cancel it instead so the payment stays on record.</>}
        onConfirm={() => deleteOrder(deleting!)} />
    </div>
  );
}

function StatusDialog({ order, onClose, onSubmit }: { order: CustomerOrder | null; onClose: () => void; onSubmit: (next: OrderStatus) => Promise<void> }) {
  const [next, setNext] = useState<OrderStatus | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => { if (order) { setNext(ORDER_TRANSITIONS[normalizeOrderStatus(order.orderStatus)][0] || ''); setError(null); setBusy(false); } }, [order]);
  if (!order) return null;
  const current = normalizeOrderStatus(order.orderStatus);
  const options = ORDER_TRANSITIONS[current];

  const submit = async () => {
    if (!next) return;
    setBusy(true); setError(null);
    try { await onSubmit(next); } catch (e: any) { setError(e?.message || 'Could not update the status.'); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle className="text-lg font-headline font-bold">Update Status — {order.id}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 text-xs text-slate-400">Current: <Badge className={`${ORDER_STATUS_BADGE[current]} text-[9px] uppercase`}>{ORDER_STATUS_LABEL[current]}</Badge></div>
        {options.length === 0 ? (
          <p className="text-sm text-slate-400">This order is {ORDER_STATUS_LABEL[current]} and can’t be moved any further.</p>
        ) : (
          <div className="space-y-3">
            <Select value={next} onValueChange={(v) => setNext(v as OrderStatus)}>
              <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue placeholder="Select the next status" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {options.map(s => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            {next === 'DELIVERED' && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Marking this order Delivered records it as a Sale and takes {order.quantity} unit(s) out of stock. If stock is short, the change is refused.
              </p>
            )}
            {next === 'CANCELLED' && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                A cancelled order is closed for good and never touches stock.{order.amountPaid > 0 ? ` The ₹${order.amountPaid.toLocaleString('en-IN')} received stays on record — refund it separately.` : ''}
              </p>
            )}
          </div>
        )}
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Close</Button>
          {options.length > 0 && <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={submit} disabled={busy || !next}>{busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Update Status</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetails({ order, onClose, onPay, onEdit, onOpenSales }: {
  order: CustomerOrder | null; onClose: () => void; onPay?: (o: CustomerOrder) => void; onEdit?: (o: CustomerOrder) => void; onOpenSales?: () => void;
}) {
  const { payments, loading } = usePaymentHistory('customer-orders', order?.id || null);
  if (!order) return null;
  const st = normalizeOrderStatus(order.orderStatus); const ps = normalizePaymentStatus(order.paymentStatus);
  const closed = st === 'DELIVERED' || st === 'CANCELLED';
  const rows: [string, React.ReactNode][] = [
    ['Customer', `${order.customerName} (${order.customerId})`], ['Mobile', order.mobile],
    ['Product', `${order.brand} ${order.model}`], ['Product ID', order.productId || '—'],
    ['Quantity', order.quantity], ['Unit Price', money(order.unitPrice)], ['Order Date', order.orderDate],
    ['Discount', money(order.discount)], ['GST', order.gstEnabled ? `${order.gstRate}% (${money(order.gstAmount)})` : 'Not applied'],
    ['Delivery Charge', money(order.deliveryCharge)], ['Delivery', deliveryLabelForOrder(st, order.deliveryRequired)],
    ['Expected Delivery', order.expectedDeliveryDate || '—'],
    ['Sale', order.saleId || 'Not yet delivered'],
    ...(order.notes ? [['Notes', order.notes] as [string, React.ReactNode]] : []),
  ];
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-headline font-bold flex flex-wrap items-center gap-2">
            Order {order.id}
            <Badge className={`${ORDER_STATUS_BADGE[st]} text-[9px] uppercase`}>{ORDER_STATUS_LABEL[st]}</Badge>
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
          {[['Total', order.totalAmount, 'text-slate-100'], ['Paid', order.amountPaid, 'text-emerald-400'], ['Remaining', remaining(order.totalAmount, order.amountPaid), 'text-rose-400']].map(([l, v, c]) => (
            <div key={l as string} className="bg-slate-950 border border-slate-800 rounded-xl py-2.5">
              <p className="text-[9px] uppercase font-bold text-slate-500">{l as string}</p><p className={`text-sm font-black font-code ${c}`}>{money(v as number)}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Payment History</p>
          {loading ? <p className="text-xs text-slate-500">Loading...</p> : payments.length === 0 ? (
            <p className="text-xs text-slate-600 italic">{order.saleId ? `Payments moved to sale ${order.saleId}.` : 'No payments recorded.'}</p>
          ) : (
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
          {order.saleId && onOpenSales && <Button variant="outline" className="border-slate-800" onClick={onOpenSales}>Open Sales</Button>}
          {onEdit && !closed && <Button variant="outline" className="border-slate-800" onClick={() => onEdit(order)}><Pencil className="w-4 h-4 mr-1.5" /> Edit</Button>}
          {onPay && st !== 'CANCELLED' && !order.saleId && remaining(order.totalAmount, order.amountPaid) > 0 && <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => onPay(order)}><Wallet className="w-4 h-4 mr-1.5" /> Add Payment</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
