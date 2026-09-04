"use client"

import React, { useState, useMemo } from 'react';
import { Search, Eye, Pencil, RefreshCw, StickyNote, PackagePlus, Wallet, Printer, Trash2 } from 'lucide-react';
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
import { RepairJob, RepairJobStatus } from '@/lib/types';
import { displayAmount } from '@/lib/repair-utils';

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
          <SelectTrigger className="w-44 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="All">All Status</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="w-44 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="All">All Technicians</SelectItem>
            {technicians.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-40 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
        <Input value={brandFilter} onChange={e => setBrandFilter(e.target.value)} placeholder="Filter by Brand..." className="w-40 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-800">
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Repair ID</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Customer</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Mobile</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Product</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Problem</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Technician</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Received</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Expected</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Amount</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(j => (
                <TableRow key={j.id} className="border-slate-800 hover:bg-slate-800/20">
                  <TableCell className="font-code font-bold text-blue-400 text-xs">{j.id}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-200">{j.customerName}</TableCell>
                  <TableCell className="text-xs text-slate-400 font-code">{j.mobile}</TableCell>
                  <TableCell className="text-xs text-slate-300">{j.brand} {j.model}</TableCell>
                  <TableCell className="text-xs text-slate-300 max-w-[160px] truncate" title={j.problemDescription}>{j.problemDescription}</TableCell>
                  <TableCell className="text-xs text-slate-300">{j.technicianName || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-300">{j.receivedDate}</TableCell>
                  <TableCell className="text-xs text-slate-300">{j.expectedDeliveryDate || '—'}</TableCell>
                  <TableCell className="text-xs font-code text-slate-200">₹{displayAmount(j).toLocaleString()}</TableCell>
                  <TableCell><Badge className={`${STATUS_COLORS[j.status] || ''} text-[9px] uppercase`}>{j.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 flex-wrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" title="View" onClick={() => setViewingJob(j)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" title="Edit" onClick={() => setEditingJob(j)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-purple-400" title="Update Status" onClick={() => setStatusJob(j)}><RefreshCw className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-cyan-400" title="Add Note" onClick={() => setNoteJob(j)}><StickyNote className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-orange-400" title="Add Parts" onClick={() => setPartJob(j)}><PackagePlus className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400" title="Payment" onClick={() => setPaymentJob(j)}><Wallet className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-lime-400" title="Print Receipt" onClick={() => setReceiptJob(j)}><Printer className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" title="Delete" onClick={() => setDeletingId(j.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="h-24 text-center text-slate-600 text-xs italic">
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
      <RepairDeleteModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        jobId={deletingId || ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
