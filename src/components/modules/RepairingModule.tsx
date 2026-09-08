"use client"

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Edit, 
  TrendingUp,
  Search,
  Tv,
  Printer as PrinterIcon,
  NotebookTabs,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { RepairJob, RepairJobStatus } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { StickerModal } from './repairing/StickerModal';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { differenceInDays, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Repairing's "Log New Case" flow creates a real RepairJob (server table
// repair_jobs, id prefix "RJ") — this list, its KPI cards, and its status
// filters all read the same store.repairJobs the "Repair Jobs" module reads,
// so both pages show the exact same database records instead of two
// disconnected local datasets. RepairJob's actual workflow statuses don't
// map 1:1 onto the older Pending/Completed/Rejected/Exchange vocabulary
// these cards were originally built around, so the mapping below is
// deliberate: Pending -> "Received" (just logged, not yet started), Done ->
// "Delivered", Reject -> "Cancelled". RepairJob has no Exchange/Purchase
// concept in its workflow, so that card is computed against real data and
// will honestly read 0 rather than being hardcoded to a fake number.
const DONE_STATUS: RepairJobStatus = 'Delivered';
const REJECTED_STATUS: RepairJobStatus = 'Cancelled';
const PENDING_STATUS: RepairJobStatus = 'Received';

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

const ALL_JOB_STATUSES: RepairJobStatus[] = [
  'Received', 'Inspection', 'Estimate Sent', 'Approved', 'In Progress',
  'Waiting for Parts', 'Ready', 'Delivered', 'Cancelled'
];

// A job counts as "repeat" when an earlier job for the same mobile number
// already exists — computed from the actual records every render, never
// stored as a separate flag, so it can't drift from the real data.
function repeatJobIds(jobs: RepairJob[]): Set<string> {
  const byMobile = new Map<string, RepairJob[]>();
  for (const j of jobs) {
    if (!j.mobile) continue;
    const list = byMobile.get(j.mobile) || [];
    list.push(j);
    byMobile.set(j.mobile, list);
  }
  const repeatIds = new Set<string>();
  for (const list of byMobile.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (let i = 1; i < list.length; i++) repeatIds.add(list[i].id);
  }
  return repeatIds;
}

export function RepairingModule({ store }: { store: any }) {
  const [showNewRepairForm, setShowNewRepairForm] = useState(false);
  const [stickerCall, setStickerCall] = useState<RepairJob | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Active');
  const [viewMode, setViewMode] = useState<'Repairing' | 'Inquiries'>('Repairing');
  const { toast } = useToast();

  const allJobs: RepairJob[] = store.repairJobs || [];
  const repeatIds = useMemo(() => repeatJobIds(allJobs), [allJobs]);

  const stats = useMemo(() => {
    const totalActive = allJobs.filter((j) => j.status !== DONE_STATUS && j.status !== REJECTED_STATUS).length;
    const pending = allJobs.filter((j) => j.status === PENDING_STATUS).length;
    const completed = allJobs.filter((j) => j.status === DONE_STATUS).length;
    const rejected = allJobs.filter((j) => j.status === REJECTED_STATUS).length;
    const repeat = allJobs.filter((j) => repeatIds.has(j.id)).length;
    const exchange = allJobs.filter((j: any) => j.status === 'Exchange' || j.status === 'Purchase').length;
    const warranty = allJobs.filter((j) => j.status === DONE_STATUS && j.warrantyExpiry).length;
    return { totalActive, pending, completed, rejected, exchange, repeat, warranty };
  }, [allJobs, repeatIds]);

  const filteredCalls = useMemo<RepairJob[]>(() => {
    return allJobs.filter((j) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        j.id.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        j.productType.toLowerCase().includes(q) ||
        j.mobile?.includes(searchQuery);

      let matchesFilter = true;
      if (activeFilter === 'Active') matchesFilter = j.status !== DONE_STATUS && j.status !== REJECTED_STATUS;
      else if (activeFilter === 'Pending') matchesFilter = j.status === PENDING_STATUS;
      else if (activeFilter === 'Completed') matchesFilter = j.status === DONE_STATUS;
      else if (activeFilter === 'Rejected') matchesFilter = j.status === REJECTED_STATUS;
      else if (activeFilter === 'Repeat') matchesFilter = repeatIds.has(j.id);
      else if (activeFilter === 'Exchange') matchesFilter = (j as any).status === 'Exchange' || (j as any).status === 'Purchase';
      else if (activeFilter === 'Warranty') matchesFilter = j.status === DONE_STATUS && !!j.warrantyExpiry;

      return (matchesSearch || !searchQuery) && matchesFilter;
    });
  }, [allJobs, searchQuery, activeFilter, repeatIds]);

  const calculateWarrantyLeft = (expiry?: string) => {
    if (!expiry) return null;
    const diff = differenceInDays(parseISO(expiry), new Date());
    return diff > 0 ? diff : 0;
  };

  const handleStatusChange = (job: RepairJob, newStatus: RepairJobStatus) => {
    store.updateRepairJob({
      ...job,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleMapClick = (address: string) => {
    if (!address || address.trim() === '') return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    try {
      window.open(url, '_blank');
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Pop-up Blocked",
        description: "Please allow pop-ups to open the map."
      });
    }
  };

  const visibleKpis = [
    { id: 'totalActive', title: 'Active', value: stats.totalActive, icon: TrendingUp, color: 'bg-[#0066FF]', filter: 'Active' },
    { id: 'pending', title: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#FFD700]', textColor: 'text-black', filter: 'Pending' },
    { id: 'completed', title: 'Done', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-500', filter: 'Completed' },
    { id: 'repeat', title: 'Repeat', value: stats.repeat, icon: RefreshCw, color: 'bg-purple-500', filter: 'Repeat' },
    { id: 'rejected', title: 'Reject', value: stats.rejected, icon: XCircle, color: 'bg-[#FF3366]', filter: 'Rejected' },
    { id: 'exchange', title: 'Ex/Pur', value: stats.exchange, icon: Tv, color: 'bg-cyan-500', filter: 'Exchange' },
    { id: 'warranty', title: 'Warranty', value: stats.warranty, icon: History, color: 'bg-amber-600', filter: 'Warranty' },
  ].filter(kpi => store.visibility.kpis[kpi.id as keyof typeof store.visibility.kpis]);

  if (showNewRepairForm) {
    return <CallModal renderAsPage isOpen={true} onClose={() => setShowNewRepairForm(false)} editingCall={null} store={store} />;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
        {visibleKpis.map(kpi => (
          <Card key={kpi.id} onClick={() => { setViewMode('Repairing'); setActiveFilter(kpi.filter); }} className={cn("bg-slate-900/40 border-slate-800 cursor-pointer transition-all h-full", activeFilter === kpi.filter ? "ring-2 ring-blue-500 bg-slate-800/60" : "hover:bg-slate-800/60")}>
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-1 md:gap-2">
               <div className={cn("p-1.5 md:p-2 rounded-xl", kpi.color, kpi.textColor || "text-white")}><kpi.icon className="w-3.5 h-3.5 md:w-4 h-4" /></div>
               <div>
                 <p className="text-slate-400 text-[9px] md:text-[10px] uppercase font-bold truncate">{kpi.title}</p>
                 <h3 className="text-lg md:text-xl font-headline font-bold">{kpi.value}</h3>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 md:p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
           <Input 
             placeholder="Search Jobs, Mobile, Category..." 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
             className="pl-10 border-slate-800 h-11 w-full" 
           />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none rounded-xl border-slate-700 h-11 px-3 md:px-4" onClick={() => setViewMode(viewMode === 'Repairing' ? 'Inquiries' : 'Repairing')}>
            <NotebookTabs className="w-4 h-4 mr-2" /> 
            <span className="hidden xs:inline">{viewMode === 'Repairing' ? "Inquiries" : "Repair Hub"}</span>
            <span className="xs:hidden">Inq</span>
          </Button>
          <Button className="flex-1 sm:flex-none rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 shadow-lg shadow-blue-500/20 px-3 md:px-4" onClick={() => setShowNewRepairForm(true)}>
            <Plus className="w-5 h-5 mr-2" /> 
            <span className="hidden xs:inline">Log New Case</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <div className="overflow-x-auto w-full">
          {viewMode === 'Repairing' ? (
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800">
                  <TableHead className="w-[40px] px-2"></TableHead>
                  <TableHead className="font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2">Job ID</TableHead>
                  <TableHead className="font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2">Customer</TableHead>
                  <TableHead className="font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2">Category</TableHead>
                  <TableHead className="font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2 text-center">Warranty</TableHead>
                  <TableHead className="font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2">Status</TableHead>
                  <TableHead className="text-right font-headline text-slate-400 text-[10px] md:text-[11px] uppercase whitespace-nowrap px-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call: RepairJob) => {
                  const wDays = calculateWarrantyLeft(call.warrantyExpiry);
                  const isRepeat = repeatIds.has(call.id);

                  return (
                    <TableRow key={call.id} className="border-slate-800/50 hover:bg-slate-800/20">
                        <TableCell className="px-2"></TableCell>
                        <TableCell className="font-code font-bold text-blue-400 text-xs md:text-sm px-2">
                          <div className="flex flex-col gap-0.5">
                            {call.id}
                            {isRepeat && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[8px] md:text-[9px] w-fit uppercase font-black px-1.5 py-0">Repeat Visit</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex flex-col"><span className="font-semibold text-xs md:text-sm">{call.customerName}</span><span className="text-[10px] md:text-xs text-slate-500">{call.mobile}</span></div>
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{call.productType}</span>
                            <span className="text-xs md:text-sm truncate max-w-[120px]">{call.brand} {call.model}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-2">
                           <div className="flex flex-col gap-0.5 items-center">
                              <span className="text-[9px] md:text-[10px] text-slate-400 whitespace-nowrap">{call.warrantyDuration || 'No Warranty'}</span>
                              {call.status === DONE_STATUS && wDays !== null && (
                                <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 uppercase">L: {wDays}D</span>
                              )}
                           </div>
                        </TableCell>
                        <TableCell className="px-2">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <button className="outline-none">
                                 <Badge className={cn("text-[9px] md:text-[10px] font-bold uppercase border whitespace-nowrap", STATUS_COLORS[call.status] || "bg-cyan-500/10 text-cyan-400 border-cyan-500/20")}>
                                   {call.status}
                                 </Badge>
                               </button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100">
                               {ALL_JOB_STATUSES.map((s) => (
                                 <DropdownMenuItem
                                   key={`status-${call.id}-${s}`}
                                   onClick={() => handleStatusChange(call, s)}
                                   className="text-xs uppercase font-bold hover:bg-slate-800 cursor-pointer"
                                 >
                                   {s}
                                 </DropdownMenuItem>
                               ))}
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right px-2">
                           <div className="flex justify-end gap-1 md:gap-2">
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400" title="Location" onClick={() => handleMapClick(call.address || '')}><MapPin className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Full edit (parts, payments, technician) — open in Repair Jobs" onClick={() => toast({ title: 'Open in Repair Jobs', description: 'Full editing — technician, parts, payments, status history — is in the Repair Jobs module.' })}><Edit className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400" title="Print" onClick={() => setStickerCall(call)}><PrinterIcon className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10" title="Delete" onClick={() => setDeleteJobId(call.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                           </div>
                        </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCalls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">No job records found matching criteria.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-[10px] md:text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[10px] md:text-[11px] uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] md:text-[11px] uppercase">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.inquiries.map((inq: any) => (
                  <TableRow key={inq.id} className="border-slate-800/50">
                    <TableCell className="text-[10px] text-slate-500 whitespace-nowrap">
                      {inq.createdAt ? format(parseISO(inq.createdAt), 'dd/MM HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col"><span className="font-bold text-xs md:text-sm">{inq.customerName}</span><span className="text-[10px] text-blue-400">{inq.mobile}</span></div>
                    </TableCell>
                    <TableCell className="text-[11px] md:text-sm italic text-slate-300 line-clamp-2">"{inq.notes}"</TableCell>
                  </TableRow>
                ))}
                {store.inquiries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-slate-500 italic">No inquiries registered.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <StickerModal isOpen={!!stickerCall} onClose={() => setStickerCall(null)} call={stickerCall} shopLogo={store.companyProfile?.logoUrl} companyName={store.companyProfile?.companyName} />
      <DeleteJobModal
        isOpen={!!deleteJobId}
        onClose={() => setDeleteJobId(null)}
        jobId={deleteJobId || ''}
        onConfirm={() => { if (deleteJobId) store.deleteRepairJob(deleteJobId); setDeleteJobId(null); }}
      />
    </div>
  );
}
