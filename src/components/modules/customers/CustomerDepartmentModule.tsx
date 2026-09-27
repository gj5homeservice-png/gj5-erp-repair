"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, Pencil, Trash2, Plus, Phone, MessageCircle, ShoppingCart, Wrench, GitMerge, Download,
  ChevronLeft, ChevronRight, AlertTriangle, Users, UserCheck, UserPlus, ClipboardList,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/client-api';
import { buildTelLink, buildWhatsAppLink } from '@/lib/customer-utils';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { DeleteCustomerDialog } from './DeleteCustomerDialog';
import { MergeCustomersDialog } from './MergeCustomersDialog';
import { CustomerQuickLookup } from './CustomerSearch';
import { CUSTOMER_CATEGORIES } from '@/lib/customer-categories';

// This module never calls the shared bootstrap store for its data (unlike
// most other modules) — customer list + stats is fetched on its own only
// while this page is open, and full profile detail (repair jobs, bookings,
// sales, orders, invoices, notes, timeline) is fetched only when one profile
// is actually opened. Search/filter/sort/pagination all happen SERVER-SIDE
// (see /api/erp/customers with query params) so this stays fast whether the
// tenant has 50 customers or 100,000 — the browser only ever holds one page.

export interface CustomerListItem {
  id: string;
  name: string | null;
  mobile: string | null;
  alternateMobile: string | null;
  whatsappNumber: string | null;
  email: string | null;
  facebookId: string | null;
  instagramId: string | null;
  gstin: string | null;
  dateOfBirth: string | null;
  photo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  area: string | null;
  status: string;
  category: string;
  source: string;
  createdAt: string | null;
  updatedAt: string | null;
  totalRepairs: number;
  activeRepairs: number;
  completedRepairs: number;
  totalPurchases: number;
  pendingAmount: number;
  lastActivity: string | null;
}

const FILTERS = ['All Customers', 'Active', 'Inactive', 'Pending Payment', 'Active Repair', 'Has Orders', 'Has Sales', 'New Customers'] as const;
type FilterOption = typeof FILTERS[number];
const SORT_OPTIONS = ['Recent Activity', 'Name', 'Total Repairs', 'Pending Amount'] as const;
type SortOption = typeof SORT_OPTIONS[number];
const PAGE_SIZES = [10, 25, 50, 100];
const THIRTY_DAYS_AGO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function SummaryCard({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: any; colorClass: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wide truncate">{label}</p>
        <p className="text-xl font-headline font-black text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4 gap-3">
      <Users className="w-7 h-7 text-slate-600" />
      {hasAny ? (
        <span>No customers match your search/filters.</span>
      ) : (
        <>
          <span className="not-italic font-bold text-slate-400 text-sm">No Customers Found</span>
          <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] not-italic" onClick={onAdd}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>
        </>
      )}
    </div>
  );
}

export function CustomerDepartmentModule({ store, onNavigate }: { store: any; onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, newCustomers: 0, pendingPayment: 0, activeRepair: 0, withOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('All Customers');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [cityFilter, setCityFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('Recent Activity');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);
  const [mergingCustomer, setMergingCustomer] = useState<CustomerListItem | null>(null);

  const perms = store.session?.permissions;
  const can = (action: 'create' | 'edit' | 'delete' | 'export') => !perms || !!perms['Customer Department']?.[action];

  // Debounce the free-text search box only — every other filter re-fetches immediately.
  useEffect(() => {
    const h = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      setLoadError(false);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      if (search) params.set('search', search);
      if (categoryFilter !== 'All Categories') params.set('category', categoryFilter);
      if (cityFilter) params.set('city', cityFilter);
      if (createdFrom) params.set('createdFrom', createdFrom);
      if (createdTo) params.set('createdTo', createdTo);
      if (filter === 'Active') params.set('status', 'Active');
      else if (filter === 'Inactive') params.set('status', 'Inactive');
      else if (filter === 'Pending Payment') params.set('has', 'outstanding');
      else if (filter === 'Active Repair') params.set('has', 'repairs');
      else if (filter === 'Has Orders') params.set('has', 'orders');
      else if (filter === 'Has Sales') params.set('has', 'sales');
      else if (filter === 'New Customers' && !createdFrom) params.set('createdFrom', THIRTY_DAYS_AGO());

      const json = await apiFetch(`/api/erp/customers?${params.toString()}`);
      setCustomers(json.data || []);
      if (json.pagination) setPagination({ total: json.pagination.total, totalPages: json.pagination.totalPages });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, search, categoryFilter, cityFilter, createdFrom, createdTo, filter]);

  useEffect(() => { load(); }, [load]);

  // Dashboard-style stats (spec: Total/New/Active/With Outstanding/With
  // Repairs/With Orders) — one lightweight extra call, not derived from the
  // current (filtered, paginated) page, so the numbers stay correct no
  // matter what the admin is currently filtering the table by.
  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      try {
        const [all, active, outstanding, repairs, orders, recent] = await Promise.all([
          apiFetch('/api/erp/customers?page=1&pageSize=1'),
          apiFetch('/api/erp/customers?page=1&pageSize=1&status=Active'),
          apiFetch('/api/erp/customers?page=1&pageSize=1&has=outstanding'),
          apiFetch('/api/erp/customers?page=1&pageSize=1&has=repairs'),
          apiFetch('/api/erp/customers?page=1&pageSize=1&has=orders'),
          apiFetch(`/api/erp/customers?page=1&pageSize=1&createdFrom=${THIRTY_DAYS_AGO()}`),
        ]);
        if (cancelled) return;
        setSummary({
          total: all.pagination?.total || 0, active: active.pagination?.total || 0,
          newCustomers: recent.pagination?.total || 0, pendingPayment: outstanding.pagination?.total || 0,
          activeRepair: repairs.pagination?.total || 0, withOrders: orders.pagination?.total || 0,
        });
      } catch { /* dashboard stats are a nice-to-have — a failure here never blocks the list above */ }
    };
    loadSummary();
    return () => { cancelled = true; };
  }, [customers.length]);

  const handleRefresh = () => {
    setRefreshSpin(true);
    load().finally(() => setTimeout(() => setRefreshSpin(false), 600));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gj5_auth_token') : null;
      const res = await fetch('/api/erp/customers/export', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Ready', description: 'Customer list downloaded as CSV.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: err?.message || 'Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleted = (result: { deleted: boolean; deactivated: boolean }) => {
    toast({
      title: result.deleted ? 'Customer Deleted' : 'Customer Deactivated',
      description: result.deleted
        ? 'The customer record has been removed.'
        : 'This customer has repair, booking, sales, order or invoice history, so it was deactivated instead of deleted — that history is untouched.',
    });
    setDeletingCustomer(null);
    load();
  };

  const goCreate = (action: 'sale' | 'order' | 'repair', c: { id: string; name: string; mobile: string }) => {
    store.setPendingCustomerAction?.({ action, customer: c });
    onNavigate?.(action === 'sale' ? 'Sales' : action === 'order' ? 'Orders' : 'Repairing');
  };

  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-3xl font-headline font-bold text-slate-100 tracking-tight">Customer Department</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Manage all customers and their complete history</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('export') && (
            <Button variant="outline" className="border-slate-800 text-slate-300" onClick={handleExport} disabled={exporting}>
              {exporting ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />} Export
            </Button>
          )}
          {can('create') && (
            <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      <CustomerQuickLookup
        onOpenCustomer={setViewingCustomerId}
        onCreateSale={can('create') ? (c) => goCreate('sale', { id: c.id, name: c.name || '', mobile: c.mobile || '' }) : undefined}
        onCreateOrder={can('create') ? (c) => goCreate('order', { id: c.id, name: c.name || '', mobile: c.mobile || '' }) : undefined}
        onCreateRepair={can('create') ? (c) => goCreate('repair', { id: c.id, name: c.name || '', mobile: c.mobile || '' }) : undefined}
      />

      {loadError && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> Unable to load customer data. Please try again.</div>
          <Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={handleRefresh}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Customers" value={summary.total} icon={Users} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="Active Customers" value={summary.active} icon={UserCheck} colorClass="bg-emerald-600/10 text-emerald-400" />
        <SummaryCard label="New This Month" value={summary.newCustomers} icon={UserPlus} colorClass="bg-cyan-600/10 text-cyan-400" />
        <SummaryCard label="With Outstanding" value={summary.pendingPayment} icon={CreditCard} colorClass="bg-amber-600/10 text-amber-400" />
        <SummaryCard label="With Repairs" value={summary.activeRepair} icon={Wrench} colorClass="bg-purple-600/10 text-purple-400" />
        <SummaryCard label="With Orders" value={summary.withOrders} icon={ClipboardList} colorClass="bg-lime-600/10 text-lime-400" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search Customer ID, Name, Mobile, WhatsApp, Email, GSTIN..."
              className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
          </div>
          <Button variant="outline" className="h-10 border-slate-800 text-slate-300" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshSpin ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="col-span-2 sm:col-span-1">
            <Select value={filter} onValueChange={v => { setFilter(v as FilterOption); setPage(1); }}>
              <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {FILTERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All Categories">All Categories</SelectItem>
              {CUSTOMER_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }} placeholder="City" className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Input type="date" aria-label="Created from" title="Created from" value={createdFrom} onChange={e => { setCreatedFrom(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Input type="date" aria-label="Created to" title="Created to" value={createdTo} onChange={e => { setCreatedTo(e.target.value); setPage(1); }} className="h-10 bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {SORT_OPTIONS.map(s => <SelectItem key={s} value={s}>Sort: {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading customers...
        </div>
      ) : (
        <>
          <MobileCardList>
            {customers.map(c => (
              <MobileCard key={c.id} onClick={() => setViewingCustomerId(c.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-code font-bold text-blue-400 text-sm">{c.id}</span>
                    <span className="font-bold text-sm text-slate-200 break-words">{c.name || 'Unnamed'}</span>
                  </div>
                  <Badge className={`text-[9px] uppercase shrink-0 ${c.status === 'Active' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'bg-slate-600/10 text-slate-400 border-slate-600/20'}`}>{c.status}</Badge>
                </div>
                <div className="space-y-1.5">
                  <MobileCardRow label="Category" value={c.category || 'Customer'} />
                  <MobileCardRow label="Mobile" value={c.mobile || '—'} />
                  <MobileCardRow label="WhatsApp" value={c.whatsappNumber || c.mobile || '—'} />
                  <MobileCardRow label="City" value={c.city || '—'} />
                  <MobileCardRow label="Total Sales" value={c.totalPurchases} />
                  <MobileCardRow label="Outstanding" value={money(c.pendingAmount)} />
                  <MobileCardRow label="Last Activity" value={c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'} />
                </div>
                <MobileCardActions>
                  {buildTelLink(c.mobile) && <a href={buildTelLink(c.mobile)!} onClick={e => e.stopPropagation()}><Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-400" title="Call"><Phone className="w-3.5 h-3.5" /></Button></a>}
                  {buildWhatsAppLink(c.whatsappNumber || c.mobile) && <a href={buildWhatsAppLink(c.whatsappNumber || c.mobile)!} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><Button size="sm" variant="ghost" className="h-8 px-2 text-lime-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></Button></a>}
                  {can('create') && <Button size="sm" variant="ghost" className="h-8 px-2 text-cyan-400" title="Create Sale" onClick={(e) => { e.stopPropagation(); goCreate('sale', { id: c.id, name: c.name || '', mobile: c.mobile || '' }); }}><ShoppingCart className="w-3.5 h-3.5" /></Button>}
                  {can('create') && <Button size="sm" variant="ghost" className="h-8 px-2 text-orange-400" title="Create Repair" onClick={(e) => { e.stopPropagation(); goCreate('repair', { id: c.id, name: c.name || '', mobile: c.mobile || '' }); }}><Wrench className="w-3.5 h-3.5" /></Button>}
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-400" title="View" onClick={(e) => { e.stopPropagation(); setViewingCustomerId(c.id); }}><Eye className="w-3.5 h-3.5" /></Button>
                  {can('edit') && <Button size="sm" variant="ghost" className="h-8 px-2 text-amber-400" title="Edit" onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                  {can('delete') && <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-500 hover:bg-rose-500/10" title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingCustomer(c); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </MobileCardActions>
              </MobileCard>
            ))}
            {customers.length === 0 && <EmptyState hasAny={pagination.total > 0} onAdd={() => setShowAddForm(true)} />}
          </MobileCardList>

          <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-800">
                    {['Customer ID', 'Name', 'Mobile', 'WhatsApp', 'City', 'Total Sales', 'Outstanding', 'Last Activity', 'Status', 'Actions'].map(h => (
                      <TableHead key={h} className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => (
                    <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/20 cursor-pointer" onClick={() => setViewingCustomerId(c.id)}>
                      <TableCell className="px-2 py-2.5 font-code font-bold text-blue-400 text-xs whitespace-nowrap">{c.id}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs font-bold text-slate-200 max-w-[130px] truncate" title={c.name || ''}>{c.name || 'Unnamed'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-400 font-code whitespace-nowrap">{c.mobile || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-400 font-code whitespace-nowrap">{c.whatsappNumber || c.mobile || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{c.city || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 text-center">{c.totalPurchases}</TableCell>
                      <TableCell className={`px-2 py-2.5 text-xs font-bold whitespace-nowrap ${c.pendingAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{money(c.pendingAmount)}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="px-2 py-2.5">
                        <Badge className={`text-[9px] uppercase ${c.status === 'Active' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'bg-slate-600/10 text-slate-400 border-slate-600/20'}`}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          {buildTelLink(c.mobile) && <a href={buildTelLink(c.mobile)!}><Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400" title="Call"><Phone className="w-3.5 h-3.5" /></Button></a>}
                          {buildWhatsAppLink(c.whatsappNumber || c.mobile) && <a href={buildWhatsAppLink(c.whatsappNumber || c.mobile)!} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-lime-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></Button></a>}
                          {can('create') && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-cyan-400" title="Create Sale" onClick={() => goCreate('sale', { id: c.id, name: c.name || '', mobile: c.mobile || '' })}><ShoppingCart className="w-3.5 h-3.5" /></Button>}
                          {can('create') && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-orange-400" title="Create Repair" onClick={() => goCreate('repair', { id: c.id, name: c.name || '', mobile: c.mobile || '' })}><Wrench className="w-3.5 h-3.5" /></Button>}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" title="View" onClick={() => setViewingCustomerId(c.id)}><Eye className="w-3.5 h-3.5" /></Button>
                          {can('edit') && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" title="Edit" onClick={() => setEditingCustomer(c)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {can('delete') && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-purple-400" title="Merge" onClick={() => setMergingCustomer(c)}><GitMerge className="w-3.5 h-3.5" /></Button>}
                          {can('delete') && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" title="Delete" onClick={() => setDeletingCustomer(c)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="h-40">
                      <EmptyState hasAny={pagination.total > 0} onAdd={() => setShowAddForm(true)} />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {pagination.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Rows per page</span>
                <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-20 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="ml-2">{pagination.total} total record{pagination.total === 1 ? '' : 's'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs text-slate-400">Page {page} of {pagination.totalPages}</span>
                <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800" disabled={page >= pagination.totalPages} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <CustomerFormModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSaved={(c) => { setShowAddForm(false); load(); if (c?.id) setViewingCustomerId(c.id); }}
      />
      <CustomerFormModal
        isOpen={!!editingCustomer}
        editingCustomer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSaved={() => { setEditingCustomer(null); load(); }}
      />
      <CustomerProfileModal
        customerId={viewingCustomerId}
        onClose={() => setViewingCustomerId(null)}
        store={store}
        onCreateSale={can('create') ? (c) => { setViewingCustomerId(null); goCreate('sale', c); } : undefined}
        onCreateOrder={can('create') ? (c) => { setViewingCustomerId(null); goCreate('order', c); } : undefined}
        onCreateRepair={can('create') ? (c) => { setViewingCustomerId(null); goCreate('repair', c); } : undefined}
      />
      <DeleteCustomerDialog
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onDeleted={handleDeleted}
      />
      <MergeCustomersDialog
        customer={mergingCustomer}
        onClose={() => setMergingCustomer(null)}
        onMerged={() => { setMergingCustomer(null); load(); toast({ title: 'Customers Merged', description: 'History was moved to the primary record; the duplicate is preserved as Merged.' }); }}
      />
    </div>
  );
}
