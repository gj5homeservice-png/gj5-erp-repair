"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, Pencil, Trash2, Plus,
  ChevronLeft, ChevronRight, AlertTriangle, Users, UserCheck, UserPlus,
  CreditCard, Wrench, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import { useToast } from '@/hooks/use-toast';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { DeleteCustomerDialog } from './DeleteCustomerDialog';
import { CUSTOMER_CATEGORIES } from '@/lib/customer-categories';

// This module never calls the shared bootstrap store for its data (unlike
// most other modules) — customer list + stats is fetched on its own only
// while this page is open, and full profile detail (repair jobs, bookings,
// sales, invoices, notes, timeline) is fetched only when one profile is
// actually opened. Keeps this module's data cost at zero for every other
// page load, and avoids ever pulling every repair/booking/invoice/sale
// record into memory just to show a customer list.
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

async function customersApiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.error || `Request to ${path} failed`);
  }
  return json;
}

export interface CustomerListItem {
  id: string;
  name: string | null;
  mobile: string | null;
  alternateMobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
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

const FILTERS = ['All Customers', 'Active', 'Inactive', 'Pending Payment', 'Active Repair', 'New Customers'] as const;
type FilterOption = typeof FILTERS[number];
const SORT_OPTIONS = ['Recent Activity', 'Name', 'Total Repairs', 'Pending Amount'] as const;
type SortOption = typeof SORT_OPTIONS[number];
const PAGE_SIZES = [10, 25, 50, 100];

function SummaryCard({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: any; colorClass: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wide truncate">{label}</p>
        <p className="text-xl font-headline font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4 gap-3">
      <Users className="w-7 h-7 text-slate-700" />
      {hasAny ? (
        <span>No customers match your search/filters.</span>
      ) : (
        <>
          <span className="not-italic font-bold text-slate-400 text-sm">No Customers Found</span>
          <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={onAdd}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>
        </>
      )}
    </div>
  );
}

export function CustomerDepartmentModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('All Customers');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [sortBy, setSortBy] = useState<SortOption>('Recent Activity');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const json = await customersApiFetch('/api/erp/customers');
      setCustomers(json.data || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshSpin(true);
    load().finally(() => setTimeout(() => setRefreshSpin(false), 600));
  };

  const isNew = (c: CustomerListItem) => {
    if (!c.createdAt) return false;
    return (Date.now() - new Date(c.createdAt).getTime()) <= 30 * 24 * 60 * 60 * 1000;
  };

  const summary = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === 'Active').length,
    newCustomers: customers.filter(isNew).length,
    pendingPayment: customers.filter(c => c.pendingAmount > 0).length,
    activeRepair: customers.filter(c => c.activeRepairs > 0).length,
    completedRepairs: customers.filter(c => c.completedRepairs > 0).length,
  }), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.filter(c => {
      const matchesSearch = !q ||
        c.id.toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'All Customers' ? true :
        filter === 'Active' ? c.status === 'Active' :
        filter === 'Inactive' ? c.status === 'Inactive' :
        filter === 'Pending Payment' ? c.pendingAmount > 0 :
        filter === 'Active Repair' ? c.activeRepairs > 0 :
        filter === 'New Customers' ? isNew(c) : true;
      const matchesCategory = categoryFilter === 'All Categories' || c.category === categoryFilter;
      return matchesSearch && matchesFilter && matchesCategory;
    });

    list = list.slice().sort((a, b) => {
      switch (sortBy) {
        case 'Name': return (a.name || '').localeCompare(b.name || '');
        case 'Total Repairs': return b.totalRepairs - a.totalRepairs;
        case 'Pending Amount': return b.pendingAmount - a.pendingAmount;
        default: return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
      }
    });
    return list;
  }, [customers, search, filter, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleted = (result: { deleted: boolean; deactivated: boolean }) => {
    toast({
      title: result.deleted ? 'Customer Deleted' : 'Customer Deactivated',
      description: result.deleted
        ? 'The customer record has been removed.'
        : 'This customer has repair, booking, sales or invoice history, so it was deactivated instead of deleted — that history is untouched.',
    });
    setDeletingCustomer(null);
    load();
  };

  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Customer Department</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Manage all customers and their complete history</p>
        </div>
        <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Customer
        </Button>
      </div>

      {loadError && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> Unable to load customer data. Please try again.</div>
          <Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={handleRefresh}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Customers" value={summary.total} icon={Users} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="Active Customers" value={summary.active} icon={UserCheck} colorClass="bg-emerald-600/10 text-emerald-400" />
        <SummaryCard label="New Customers" value={summary.newCustomers} icon={UserPlus} colorClass="bg-cyan-600/10 text-cyan-400" />
        <SummaryCard label="Pending Payment" value={summary.pendingPayment} icon={CreditCard} colorClass="bg-amber-600/10 text-amber-400" />
        <SummaryCard label="Active Repair" value={summary.activeRepair} icon={Wrench} colorClass="bg-purple-600/10 text-purple-400" />
        <SummaryCard label="Completed Repairs" value={summary.completedRepairs} icon={CheckCircle2} colorClass="bg-lime-600/10 text-lime-400" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search Customer ID, Name, Mobile, Email..."
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
            {paged.map(c => (
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
                  <MobileCardRow label="Email" value={c.email || '—'} />
                  <MobileCardRow label="Total Repairs" value={c.totalRepairs} />
                  <MobileCardRow label="Total Purchases" value={c.totalPurchases} />
                  <MobileCardRow label="Pending" value={money(c.pendingAmount)} />
                  <MobileCardRow label="Last Activity" value={c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'} />
                </div>
                <MobileCardActions>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-400" title="View" onClick={(e) => { e.stopPropagation(); setViewingCustomerId(c.id); }}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-amber-400" title="Edit" onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-500 hover:bg-rose-500/10" title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingCustomer(c); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </MobileCardActions>
              </MobileCard>
            ))}
            {paged.length === 0 && <EmptyState hasAny={customers.length > 0} onAdd={() => setShowAddForm(true)} />}
          </MobileCardList>

          <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-800">
                    {['Customer ID', 'Name', 'Category', 'Mobile', 'Email', 'Address', 'Total Repairs', 'Total Purchases', 'Pending Amount', 'Last Activity', 'Status', 'Actions'].map(h => (
                      <TableHead key={h} className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(c => (
                    <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/20 cursor-pointer" onClick={() => setViewingCustomerId(c.id)}>
                      <TableCell className="px-2 py-2.5 font-code font-bold text-blue-400 text-xs whitespace-nowrap">{c.id}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs font-bold text-slate-200 max-w-[130px] truncate" title={c.name || ''}>{c.name || 'Unnamed'}</TableCell>
                      <TableCell className="px-2 py-2.5">
                        <Badge variant="outline" className="text-[9px] uppercase border-slate-700 text-slate-300 whitespace-nowrap">{c.category || 'Customer'}</Badge>
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-400 font-code whitespace-nowrap">{c.mobile || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[140px] truncate" title={c.email || ''}>{c.email || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[150px] truncate" title={c.address || ''}>{c.address || '—'}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 text-center">{c.totalRepairs}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 text-center">{c.totalPurchases}</TableCell>
                      <TableCell className={`px-2 py-2.5 text-xs font-bold whitespace-nowrap ${c.pendingAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{money(c.pendingAmount)}</TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="px-2 py-2.5">
                        <Badge className={`text-[9px] uppercase ${c.status === 'Active' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'bg-slate-600/10 text-slate-400 border-slate-600/20'}`}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" title="View" onClick={() => setViewingCustomerId(c.id)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" title="Edit" onClick={() => setEditingCustomer(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" title="Delete" onClick={() => setDeletingCustomer(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="h-40">
                      <EmptyState hasAny={customers.length > 0} onAdd={() => setShowAddForm(true)} />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Rows per page</span>
                <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-20 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="ml-2">{filtered.length} total record{filtered.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
                <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <CustomerFormModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSaved={() => { setShowAddForm(false); load(); }}
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
      />
      <DeleteCustomerDialog
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
