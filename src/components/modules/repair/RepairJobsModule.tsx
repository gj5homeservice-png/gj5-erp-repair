"use client"

import React, { useState, useMemo } from 'react';
import { Search, Eye, Pencil, RefreshCw, StickyNote, PackagePlus, Wallet, Printer, Trash2, Receipt, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RepairFormModule } from './RepairFormModule';
import { RepairDetailsModal } from './RepairDetailsModal';
import { RepairStatusModal } from './RepairStatusModal';
import { RepairNoteModal } from './RepairNoteModal';
import { RepairPartModal } from './RepairPartModal';
import { RepairPaymentModal } from './RepairPaymentModal';
import { RepairReceiptModal } from './RepairReceiptModal';
import { RepairDeleteModal } from './RepairDeleteModal';
import { StickerModal } from '../repairing/StickerModal';
import { RepairJob, RepairJobStatus } from '@/lib/types';
import { displayAmount } from '@/lib/repair-utils';
import { MobileCard, MobileCardList, MobileCardRow } from '@/components/ui/mobile-card';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  Received: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  Inspection: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
  'Estimate Sent': 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Approved: 'bg-teal-600/10 text-teal-400 border-teal-600/20',
  'In Progress': 'bg-purple-600/10 text-purple-400 border-purple-600/20',
  'Waiting for Parts': 'bg-orange-600/10 text-orange-400 border-orange-600/20',
  Ready: 'bg-lime-600/10 text-lime-400 border-lime-600/20',
  Delivered: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Cancelled: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
};

const ALL_STATUSES: RepairJobStatus[] = [
  'Received', 'Inspection', 'Estimate Sent', 'Approved', 'In Progress',
  'Waiting for Parts', 'Ready', 'Delivered', 'Cancelled'
];

interface ActionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  hoverClass: string;
}

// Shared icon+label pill button used by both the desktop action row and the
// mobile card's action area, so the 9 actions look and behave identically
// everywhere — no separate "collapsed" variant exists anymore.
function ActionButton({ action, className }: { action: ActionDef; className?: string }) {
  const Icon = action.icon;
  return (
    <Button
      variant="outline"
      onClick={action.onClick}
      title={action.label}
      className={cn(
        'h-10 min-h-[40px] gap-1.5 px-3 rounded-xl border-slate-700 bg-slate-950/60 text-slate-300 text-xs font-bold hover:bg-slate-800 hover:text-white transition-colors',
        action.hoverClass,
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{action.label}</span>
    </Button>
  );
}

export function RepairJobsModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [technicianFilter, setTechnicianFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const [editingJob, setEditingJob] = useState<RepairJob | null>(null);
  const [viewingJob, setViewingJob] = useState<RepairJob | null>(null);
  const [statusJob, setStatusJob] = useState<RepairJob | null>(null);
  const [noteJob, setNoteJob] = useState<RepairJob | null>(null);
  const [partJob, setPartJob] = useState<RepairJob | null>(null);
  const [paymentJob, setPaymentJob] = useState<RepairJob | null>(null);
  const [receiptJob, setReceiptJob] = useState<RepairJob | null>(null);
  const [labelJob, setLabelJob] = useState<RepairJob | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const jobs: RepairJob[] = store.repairJobs || [];
  const technicians = useMemo(() => (store.employees || []).filter((e: any) => e.status === 'Active'), [store.employees]);

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const q = search.toLowerCase();
      const matchesSearch = !q || j.id.toLowerCase().includes(q) || j.customerName?.toLowerCase().includes(q) ||
        j.mobile?.includes(q) || j.serialNumber?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
      const matchesTechnician = technicianFilter === 'All' || j.technicianId === technicianFilter;
      const matchesDate = !dateFilter || j.receivedDate === dateFilter;
      const matchesBrand = !brandFilter || j.brand?.toLowerCase().includes(brandFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesTechnician && matchesDate && matchesBrand;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, search, statusFilter, technicianFilter, dateFilter, brandFilter]);

  const confirmDelete = () => {
    if (deletingId) {
      store.deleteRepairJob(deletingId);
      toast({ title: 'Repair Job Removed', description: `${deletingId} has been deleted.` });
    }
    setDeletingId(null);
  };

  if (editingJob) {
    return <RepairFormModule store={store} editingJob={editingJob} onDone={() => setEditingJob(null)} />;
  }

  // All 9 actions are always directly visible now — no "More" menu, no
  // dropdown, no second click. Every handler here is exactly the same
  // function that used to be wired to the 4 primary icons or the More
  // menu's items; nothing about what each action does has changed.
  const actionsFor = (j: RepairJob): ActionDef[] => [
    { key: 'view', label: 'View', icon: Eye, onClick: () => setViewingJob(j), hoverClass: 'hover:text-blue-400 hover:border-blue-500/50' },
    { key: 'edit', label: 'Edit', icon: Pencil, onClick: () => setEditingJob(j), hoverClass: 'hover:text-amber-400 hover:border-amber-500/50' },
    { key: 'print', label: 'Print', icon: Printer, onClick: () => setLabelJob(j), hoverClass: 'hover:text-lime-400 hover:border-lime-500/50' },
    { key: 'delete', label: 'Delete', icon: Trash2, onClick: () => setDeletingId(j.id), hoverClass: 'hover:text-rose-500 hover:border-rose-500/50' },
    { key: 'status', label: 'Update Status', icon: RefreshCw, onClick: () => setStatusJob(j), hoverClass: 'hover:text-purple-400 hover:border-purple-500/50' },
    { key: 'note', label: 'Add Note', icon: StickyNote, onClick: () => setNoteJob(j), hoverClass: 'hover:text-cyan-400 hover:border-cyan-500/50' },
    { key: 'parts', label: 'Add Parts', icon: PackagePlus, onClick: () => setPartJob(j), hoverClass: 'hover:text-orange-400 hover:border-orange-500/50' },
    { key: 'payment', label: 'Payment', icon: Wallet, onClick: () => setPaymentJob(j), hoverClass: 'hover:text-emerald-400 hover:border-emerald-500/50' },
    { key: 'receipt', label: 'Print Receipt', icon: Receipt, onClick: () => setReceiptJob(j), hoverClass: 'hover:text-slate-100 hover:border-slate-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Repair Jobs</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">All Repair Records</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Repair ID, Customer, Mobile, Serial..." className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="All">All Status</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="All">All Technicians</SelectItem>
            {technicians.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full sm:w-40 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
        <Input value={brandFilter} onChange={e => setBrandFilter(e.target.value)} placeholder="Filter by Brand..." className="w-full sm:w-40 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
      </div>

      {/* MOBILE — unchanged card layout/data; the action area now lists all
          9 actions directly (wraps into as many rows as needed) instead of
          4 icons + a More menu. */}
      <MobileCardList>
        {filtered.map(j => (
          <MobileCard key={j.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="font-code font-bold text-blue-400 text-sm">{j.id}</span>
                <span className="font-bold text-sm text-slate-200 break-words">{j.customerName}</span>
              </div>
              <Badge className={`${STATUS_COLORS[j.status] || ''} text-[9px] uppercase shrink-0`}>{j.status}</Badge>
            </div>
            <div className="space-y-1.5">
              <MobileCardRow label="Mobile" value={j.mobile} />
              <MobileCardRow label="Category" value={j.productType} />
              <MobileCardRow label="Brand Code" value={j.brand} noTruncate />
              <MobileCardRow label="Full Code" value={j.model} noTruncate />
              <MobileCardRow label="Serial No." value={j.serialNumber} noTruncate />
              <MobileCardRow label="Problem" value={j.problemDescription} noTruncate />
              <MobileCardRow label="Technician" value={j.technicianName || '—'} />
              <MobileCardRow label="Warranty" value={j.warrantyDuration} />
              <MobileCardRow label="Received" value={j.receivedDate} />
              <MobileCardRow label="Expected" value={j.expectedDeliveryDate || '—'} />
              <MobileCardRow label="Amount" value={`₹${displayAmount(j).toLocaleString()}`} />
            </div>
            <div className="flex flex-wrap gap-2 pt-3 mt-1 border-t border-slate-800/80">
              {actionsFor(j).map(action => (
                <ActionButton key={action.key} action={action} className="flex-1 min-w-[calc(50%-4px)] justify-center" />
              ))}
            </div>
          </MobileCard>
        ))}
        {filtered.length === 0 && (
          <div className="h-24 flex items-center justify-center text-center text-slate-600 text-xs italic rounded-2xl border border-slate-800 bg-slate-900/20 px-4">
            {jobs.length === 0 ? 'No repair jobs yet. Create one from "New Repair".' : 'No repair jobs match your search/filters.'}
          </div>
        )}
      </MobileCardList>

      {/* DESKTOP — the 9 data columns keep their own compact table row
          exactly as before (see the width/padding notes below); the
          "Actions" column is gone and replaced by a full-width row directly
          underneath each job's data, listing all 9 actions with icon +
          label so nothing is ever hidden behind a second click. */}
      <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-800">
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Repair ID</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Customer</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Mobile</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Product</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Problem</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Technician</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Received</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Expected</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Amount</TableHead>
                <TableHead className="px-2 py-2.5 text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(j => (
                <React.Fragment key={j.id}>
                  <TableRow className="border-slate-800/0 hover:bg-slate-800/20">
                    <TableCell className="px-2 py-2.5 font-code font-bold text-blue-400 text-xs">{j.id}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs font-bold text-slate-200 max-w-[120px] truncate" title={j.customerName}>{j.customerName}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-400 font-code whitespace-nowrap">{j.mobile}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[150px]">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold break-words">{j.brand}</span>
                        <span className="text-slate-400 break-words">{j.model}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[130px]" title={j.problemDescription}>{j.problemDescription}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-300 max-w-[90px] truncate" title={j.technicianName || undefined}>{j.technicianName || '—'}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{j.receivedDate}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-slate-300 whitespace-nowrap">{j.expectedDeliveryDate || '—'}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs font-code text-slate-200 whitespace-nowrap">₹{displayAmount(j).toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-2.5"><Badge className={`${STATUS_COLORS[j.status] || ''} text-[9px] uppercase`}>{j.status}</Badge></TableCell>
                  </TableRow>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableCell colSpan={10} className="px-2 pt-0 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {actionsFor(j).map(action => <ActionButton key={action.key} action={action} />)}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="h-24 text-center text-slate-600 text-xs italic">
                  {jobs.length === 0 ? 'No repair jobs yet. Create one from "New Repair".' : 'No repair jobs match your search/filters.'}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <RepairDetailsModal isOpen={!!viewingJob} onClose={() => setViewingJob(null)} job={viewingJob} />
      <RepairStatusModal isOpen={!!statusJob} onClose={() => setStatusJob(null)} job={statusJob} store={store} />
      <RepairNoteModal isOpen={!!noteJob} onClose={() => setNoteJob(null)} job={noteJob} store={store} />
      <RepairPartModal isOpen={!!partJob} onClose={() => setPartJob(null)} job={partJob} store={store} />
      <RepairPaymentModal isOpen={!!paymentJob} onClose={() => setPaymentJob(null)} job={paymentJob} store={store} />
      <RepairReceiptModal isOpen={!!receiptJob} onClose={() => setReceiptJob(null)} job={receiptJob} store={store} />
      <StickerModal
        isOpen={!!labelJob}
        onClose={() => setLabelJob(null)}
        call={labelJob}
        shopLogo={store.companyProfile?.logoUrl}
        companyName={store.companyProfile?.companyName}
      />
      <RepairDeleteModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        jobId={deletingId || ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
