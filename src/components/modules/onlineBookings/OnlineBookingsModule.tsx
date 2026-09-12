"use client"

import React, { useMemo, useState } from 'react';
import {
  Search, RefreshCw, XCircle, Eye, Trash2, Wrench, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardList, MobileCardRow } from '@/components/ui/mobile-card';
import { OnlineBooking, OnlineBookingStatus } from '@/lib/types';
import { OnlineBookingDetailsModal } from './OnlineBookingDetailsModal';

const ALL_STATUSES: OnlineBookingStatus[] = [
  'New', 'Pending Review', 'Confirmed', 'Assigned', 'Visit Scheduled',
  'In Progress', 'Completed', 'Rejected', 'Cancelled', 'Converted',
];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  'Pending Review': 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Confirmed: 'bg-teal-600/10 text-teal-400 border-teal-600/20',
  Assigned: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
  'Visit Scheduled': 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
  'In Progress': 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20',
  Completed: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Rejected: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
  Cancelled: 'bg-slate-600/10 text-slate-400 border-slate-600/20',
  Converted: 'bg-lime-600/10 text-lime-400 border-lime-600/20',
};

const DATE_PRESETS = ['All Time', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom Range'] as const;
type DatePreset = typeof DATE_PRESETS[number];
const SORT_OPTIONS = ['Booking Date', 'Preferred Date', 'Customer', 'Status', 'Priority'] as const;
type SortOption = typeof SORT_OPTIONS[number];
const PAGE_SIZES = [10, 25, 50, 100];

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }

function matchesDatePreset(dateStr: string, preset: DatePreset, from: string, to: string): boolean {
  if (preset === 'All Time') return true;
  const d = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  if (preset === 'Today') return d.getTime() === today.getTime();
  if (preset === 'Yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return d.getTime() === y.getTime();
  }
  if (preset === 'This Week') {
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return d.getTime() >= weekStart.getTime() && d.getTime() <= today.getTime();
  }
  if (preset === 'This Month') {
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  }
  if (preset === 'Custom Range') {
    if (!from && !to) return true;
    if (from && d.getTime() < startOfDay(new Date(from)).getTime()) return false;
    if (to && d.getTime() > startOfDay(new Date(to)).getTime()) return false;
    return true;
  }
  return true;
}

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

const EMPTY_FILTERS = {
  search: '', status: 'All', deviceType: 'All', brand: '', technician: 'All',
  paymentStatus: 'All', priority: 'All', source: 'All',
  datePreset: 'All Time' as DatePreset, dateFrom: '', dateTo: '', preferredDate: '',
};

export function OnlineBookingsModule({ store }: { store: any }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sortBy, setSortBy] = useState<SortOption>('Booking Date');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewingBooking, setViewingBooking] = useState<OnlineBooking | null>(null);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const bookings: OnlineBooking[] = store.onlineBookings || [];
  const technicians = useMemo(() => (store.employees || []).filter((e: any) => e.status === 'Active'), [store.employees]);
  const deviceTypes = useMemo(() => Array.from(new Set(bookings.map(b => b.deviceType))).filter(Boolean), [bookings]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Total: bookings.length };
    for (const s of ALL_STATUSES) c[s] = 0;
    for (const b of bookings) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = bookings.filter(b => {
      const matchesSearch = !q ||
        b.id.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerMobile.includes(q) ||
        (b.customerEmail || '').toLowerCase().includes(q) ||
        b.deviceType.toLowerCase().includes(q) ||
        b.brand.toLowerCase().includes(q) ||
        (b.model || '').toLowerCase().includes(q);
      const matchesStatus = filters.status === 'All' || b.status === filters.status;
      const matchesDevice = filters.deviceType === 'All' || b.deviceType === filters.deviceType;
      const matchesBrand = !filters.brand || b.brand.toLowerCase().includes(filters.brand.toLowerCase());
      const matchesTech = filters.technician === 'All' || b.technicianId === filters.technician;
      const matchesPayment = filters.paymentStatus === 'All' || b.paymentStatus === filters.paymentStatus;
      const matchesPriority = filters.priority === 'All' || b.priority === filters.priority;
      const matchesSource = filters.source === 'All' || b.source === filters.source;
      const matchesDate = matchesDatePreset(b.createdAt, filters.datePreset, filters.dateFrom, filters.dateTo);
      const matchesPreferredDate = !filters.preferredDate || b.preferredDate === filters.preferredDate;
      return matchesSearch && matchesStatus && matchesDevice && matchesBrand && matchesTech && matchesPayment && matchesPriority && matchesSource && matchesDate && matchesPreferredDate;
    });

    const priorityRank: Record<string, number> = { Urgent: 0, High: 1, Normal: 2 };
    list = list.sort((a, b) => {
      switch (sortBy) {
        case 'Preferred Date': return (b.preferredDate || '').localeCompare(a.preferredDate || '');
        case 'Customer': return a.customerName.localeCompare(b.customerName);
        case 'Status': return a.status.localeCompare(b.status);
        case 'Priority': return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [bookings, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClearFilters = () => { setFilters({ ...EMPTY_FILTERS }); setPage(1); };
  const handleRefresh = () => {
    setRefreshSpin(true);
    store.refreshData?.();
    setTimeout(() => setRefreshSpin(false), 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Online Bookings</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Manage repair requests received from the website</p>
        </div>
      </div>

      {store.dataError && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> Unable to load online bookings. Please try again.</div>
          <Button size="sm" variant="outline" className="border-rose-700 text-rose-300" onClick={handleRefresh}>Retry</Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <SummaryCard label="Total" value={counts.Total} icon={Globe} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="New" value={counts['New']} icon={AlertTriangle} colorClass="bg-blue-600/10 text-blue-400" />
        <SummaryCard label="Pending" value={counts['Pending Review']} icon={RefreshCw} colorClass="bg-amber-600/10 text-amber-400" />
        <SummaryCard label="Confirmed" value={counts['Confirmed']} icon={CheckCircle2} colorClass="bg-teal-600/10 text-teal-400" />
        <SummaryCard label="Assigned" value={counts['Assigned']} icon={Wrench} colorClass="bg-purple-600/10 text-purple-400" />
        <SummaryCard label="In Progress" value={counts['In Progress']} icon={RefreshCw} colorClass="bg-indigo-600/10 text-indigo-400" />
        <SummaryCard label="Completed" value={counts['Completed']} icon={CheckCircle2} colorClass="bg-emerald-600/10 text-emerald-400" />
        <SummaryCard label="Cancelled" value={counts['Cancelled'] + counts['Rejected']} icon={XCircle} colorClass="bg-rose-600/10 text-rose-400" />
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              placeholder="Search Booking ID, Customer, Mobile, Email, Device, Brand, Model..."
              className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
          </div>
          <Button variant="outline" className="h-10 border-slate-800 text-slate-300" onClick={handleClearFilters}>
            <XCircle className="w-4 h-4 mr-1.5" /> Clear Filters
          </Button>
          <Button variant="outline" className="h-10 border-slate-800 text-slate-300" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshSpin ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Select value={filters.status} onValueChange={v => { setFilters(f => ({ ...f, status: v })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Status</SelectItem>
              {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.deviceType} onValueChange={v => { setFilters(f => ({ ...f, deviceType: v })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Device Types</SelectItem>
              {deviceTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={filters.brand} onChange={e => { setFilters(f => ({ ...f, brand: e.target.value })); setPage(1); }} placeholder="Filter by Brand..." className="h-10 bg-slate-950 border-slate-800 text-xs" />
          <Select value={filters.technician} onValueChange={v => { setFilters(f => ({ ...f, technician: v })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Technicians</SelectItem>
              {technicians.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.paymentStatus} onValueChange={v => { setFilters(f => ({ ...f, paymentStatus: v })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Payment Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={v => { setFilters(f => ({ ...f, priority: v })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Priority</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Select value={filters.datePreset} onValueChange={v => { setFilters(f => ({ ...f, datePreset: v as DatePreset })); setPage(1); }}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {DATE_PRESETS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {filters.datePreset === 'Custom Range' && (
            <>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-10 bg-slate-950 border-slate-800 text-xs" />
              <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-10 bg-slate-950 border-slate-800 text-xs" />
            </>
          )}
          <Input type="date" value={filters.preferredDate} onChange={e => { setFilters(f => ({ ...f, preferredDate: e.target.value })); setPage(1); }} placeholder="Preferred Date" className="h-10 bg-slate-950 border-slate-800 text-xs" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {SORT_OPTIONS.map(s => <SelectItem key={s} value={s}>Sort: {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards */}
      <MobileCardList>
        {paged.map(b => (
          <MobileCard key={b.id} onClick={() => setViewingBooking(b)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="font-code font-bold text-blue-400 text-sm">{b.id}</span>
                <span className="font-bold text-sm text-slate-200 break-words">{b.customerName}</span>
              </div>
              <Badge className={`${STATUS_COLORS[b.status] || ''} text-[9px] uppercase shrink-0`}>{b.status}</Badge>
            </div>
            <div className="space-y-1.5">
              <MobileCardRow label="Mobile" value={b.customerMobile} />
              <MobileCardRow label="Device" value={b.deviceType} />
              <MobileCardRow label="Brand" value={b.brand} noTruncate />
              <MobileCardRow label="Model" value={b.model} noTruncate />
              <MobileCardRow label="Issue" value={b.problemDescription} noTruncate />
              <MobileCardRow label="Preferred" value={[b.preferredDate, b.preferredTime].filter(Boolean).join(' ') || '—'} />
              <MobileCardRow label="Priority" value={b.priority} />
              <MobileCardRow label="Technician" value={b.technicianName || '—'} />
              <MobileCardRow label="Payment" value={b.paymentStatus} />
            </div>
          </MobileCard>
        ))}
        {paged.length === 0 && (
          <EmptyState hasAny={bookings.length > 0} />
        )}
      </MobileCardList>

      {/* Desktop table */}
      <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-800">
                {['Booking ID', 'Date', 'Customer', 'Mobile', 'Device', 'Brand/Model', 'Issue', 'Preferred', 'Priority', 'Payment', 'Status', 'Technician', 'Actions'].map(h => (
                  <TableHead key={h} className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map(b => (
                <TableRow key={b.id} className="border-slate-800 hover:bg-slate-800/20 cursor-pointer" onClick={() => setViewingBooking(b)}>
                  <TableCell className="px-2 py-2.5 font-code font-bold text-blue-400 text-xs whitespace-nowrap">{b.id}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs font-bold text-slate-200 max-w-[110px] truncate" title={b.customerName}>{b.customerName}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-400 font-code whitespace-nowrap">{b.customerMobile}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{b.deviceType}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[130px]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold break-words">{b.brand}</span>
                      {b.model && <span className="text-slate-400 break-words">{b.model}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[130px]" title={b.problemDescription}>{b.problemDescription}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{b.preferredDate || '—'}{b.preferredTime ? ` ${b.preferredTime}` : ''}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs">
                    <Badge variant="outline" className={`text-[9px] uppercase ${b.priority === 'Urgent' ? 'border-rose-600 text-rose-400' : b.priority === 'High' ? 'border-amber-600 text-amber-400' : 'border-slate-700 text-slate-400'}`}>{b.priority}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{b.paymentStatus}</TableCell>
                  <TableCell className="px-2 py-2.5"><Badge className={`${STATUS_COLORS[b.status] || ''} text-[9px] uppercase`}>{b.status}</Badge></TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[100px] truncate">{b.technicianName || '—'}</TableCell>
                  <TableCell className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" title="View" onClick={() => setViewingBooking(b)}><Eye className="w-3.5 h-3.5" /></Button>
                      {!b.repairJobId && b.status !== 'Rejected' && b.status !== 'Cancelled' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-lime-400" title="Convert to Repair Job" onClick={async () => {
                          try { await store.convertBookingToRepairJob(b.id); } catch { /* surfaced via toast in modal flow */ }
                        }}><Wrench className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" title="Delete" onClick={() => { if (confirm(`Delete booking ${b.id}? This cannot be undone.`)) store.deleteOnlineBooking(b.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={13} className="h-32">
                  <EmptyState hasAny={bookings.length > 0} />
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
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

      <OnlineBookingDetailsModal
        isOpen={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
        booking={viewingBooking ? bookings.find(b => b.id === viewingBooking.id) || viewingBooking : null}
        store={store}
      />
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="h-32 flex flex-col items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4 gap-1">
      <Globe className="w-6 h-6 text-slate-700 mb-1" />
      {hasAny ? 'No bookings match your search/filters.' : 'No online bookings yet.'}
    </div>
  );
}
