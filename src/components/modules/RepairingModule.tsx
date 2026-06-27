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
import { RepairCall, RepairStatus, VisitHistoryEntry } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { StickerModal } from './repairing/StickerModal';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { differenceInDays, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function RepairingModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<RepairCall | null>(null);
  const [stickerCall, setStickerCall] = useState<RepairCall | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Active');
  const [viewMode, setViewMode] = useState<'Repairing' | 'Inquiries'>('Repairing');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const stats = useMemo(() => {
    const allCalls: RepairCall[] = store.calls || [];
    const totalActive = allCalls.filter((c: RepairCall) => c.status !== 'Completed' && c.status !== 'Rejected').length;
    const pending = allCalls.filter((c: RepairCall) => c.status === 'Pending').length;
    const completed = allCalls.filter((c: RepairCall) => c.status === 'Completed').length;
    const rejected = allCalls.filter((c: RepairCall) => c.status === 'Rejected').length;
    const repeat = allCalls.filter((c: RepairCall) => (c.repeatCount || 0) > 0).length;
    const exchange = allCalls.filter((c: RepairCall) => c.status === 'Exchange' || c.status === 'Purchase').length;
    const warranty = allCalls.filter((c: RepairCall) => c.status === 'Completed' && c.warrantyExpiry).length;
    return { totalActive, pending, completed, rejected, exchange, repeat, warranty };
  }, [store.calls]);

  const filteredCalls = useMemo<RepairCall[]>(() => {
    const allCalls: RepairCall[] = store.calls || [];
    return allCalls.filter((c: RepairCall) => {
      const matchesSearch = 
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile?.includes(searchQuery);

      let matchesFilter = true;
      if (activeFilter === 'Active') matchesFilter = c.status !== 'Completed' && c.status !== 'Rejected';
      else if (activeFilter === 'Pending') matchesFilter = c.status === 'Pending';
      else if (activeFilter === 'Completed') matchesFilter = c.status === 'Completed';
      else if (activeFilter === 'Rejected') matchesFilter = c.status === 'Rejected';
      else if (activeFilter === 'Repeat') matchesFilter = (c.repeatCount || 0) > 0;
      else if (activeFilter === 'Exchange') matchesFilter = c.status === 'Exchange' || c.status === 'Purchase';
      else if (activeFilter === 'Warranty') matchesFilter = c.status === 'Completed' && !!c.warrantyExpiry;

      return (matchesSearch || !searchQuery) && matchesFilter;
    });
  }, [store.calls, searchQuery, activeFilter]);

  const toggleRowExpansion = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) newExpandedRows.delete(id);
    else newExpandedRows.add(id);
    setExpandedRows(newExpandedRows);
  };

  const calculateWarrantyLeft = (expiry?: string) => {
    if (!expiry) return null;
    const diff = differenceInDays(parseISO(expiry), new Date());
    return diff > 0 ? diff : 0;
  };

  const handleStatusChange = (call: RepairCall, newStatus: RepairStatus) => {
    store.updateCall({ 
      ...call, 
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
          <Button className="flex-1 sm:flex-none rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 shadow-lg shadow-blue-500/20 px-3 md:px-4" onClick={() => { setEditingCall(null); setModalOpen(true); }}>
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
                {filteredCalls.map((call: RepairCall) => {
                  const isExpanded = expandedRows.has(call.id);
                  const wDays = calculateWarrantyLeft(call.warrantyExpiry);
                  
                  return (
                    <React.Fragment key={call.id}>
                      <TableRow className="border-slate-800/50 hover:bg-slate-800/20">
                        <TableCell className="px-2">
                          {(call.visitHistory && call.visitHistory.length > 0) && (
                            <button onClick={() => toggleRowExpansion(call.id)} className="p-1 hover:bg-slate-700 rounded-md transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="font-code font-bold text-blue-400 text-xs md:text-sm px-2">
                          <div className="flex flex-col gap-0.5">
                            {call.id}
                            {((call.repeatCount || 0) > 0) && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[8px] md:text-[9px] w-fit uppercase font-black px-1.5 py-0">{call.repeatCount + 1}nd Visit</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex flex-col"><span className="font-semibold text-xs md:text-sm">{call.customerName}</span><span className="text-[10px] md:text-xs text-slate-500">{call.mobile}</span></div>
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{call.category}</span>
                            <span className="text-xs md:text-sm truncate max-w-[120px]">{call.brand} {call.model}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-2">
                           <div className="flex flex-col gap-0.5 items-center">
                              <span className="text-[9px] md:text-[10px] text-slate-400 whitespace-nowrap">{call.warrantyDuration || 'No Warranty'}</span>
                              {call.status === 'Completed' && wDays !== null && (
                                <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 uppercase">L: {wDays}D</span>
                              )}
                           </div>
                        </TableCell>
                        <TableCell className="px-2">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <button className="outline-none">
                                 <Badge className={cn("text-[9px] md:text-[10px] font-bold uppercase border whitespace-nowrap", 
                                   call.status === 'Pending' ? "bg-yellow-500/10 text-[#FFD700] border-yellow-500/20" : 
                                   call.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                                   call.status === 'Rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                                   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                 )}>
                                   {call.status}
                                 </Badge>
                               </button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100">
                               {['Pending', 'Completed', 'Rejected', 'Exchange', 'Purchase'].map((s) => (
                                 <DropdownMenuItem 
                                   key={`status-${call.id}-${s}`} 
                                   onClick={() => handleStatusChange(call, s as RepairStatus)}
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
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400" title="Location" onClick={() => handleMapClick(call.address)}><MapPin className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit" onClick={() => { setEditingCall(call); setModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400" title="Print" onClick={() => setStickerCall(call)}><PrinterIcon className="w-3.5 h-3.5" /></Button>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10" title="Delete" onClick={() => setDeleteJobId(call.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                           </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && call.visitHistory && (
                        <TableRow className="bg-slate-950/50 hover:bg-slate-950/50 border-slate-800">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-4 py-4 md:px-12 md:py-6 space-y-4">
                              <h4 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Visit Ledger
                              </h4>
                              <div className="rounded-xl border border-slate-800 overflow-hidden overflow-x-auto">
                                <Table>
                                  <TableHeader className="bg-slate-900">
                                    <TableRow className="border-slate-800">
                                      <TableHead className="text-[9px] font-bold uppercase whitespace-nowrap">Date</TableHead>
                                      <TableHead className="text-[9px] font-bold uppercase">Complaint</TableHead>
                                      <TableHead className="text-[9px] font-bold uppercase text-right">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {call.visitHistory.map((v: VisitHistoryEntry, i: number) => (
                                      <TableRow key={v.id || `visit-${call.id}-${i}`} className="border-slate-800 bg-slate-900/30">
                                        <TableCell className="text-[10px] whitespace-nowrap">
                                          <p className="font-bold">{v.date}</p>
                                          <p className="text-[9px] text-slate-500">{v.time}</p>
                                        </TableCell>
                                        <TableCell className="text-[10px] min-w-[150px]">
                                          <p className="font-medium text-slate-200 line-clamp-2">{v.complaintDescription}</p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant="outline" className="text-[8px] uppercase border-slate-700 px-1 py-0">{v.status}</Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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

      <CallModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} editingCall={editingCall} store={store} />
      <StickerModal isOpen={!!stickerCall} onClose={() => setStickerCall(null)} call={stickerCall} shopLogo={store.shopLogo} />
      <DeleteJobModal 
        isOpen={!!deleteJobId} 
        onClose={() => setDeleteJobId(null)} 
        jobId={deleteJobId || ''} 
        onConfirm={() => { if (deleteJobId) store.deleteCall(deleteJobId); setDeleteJobId(null); }} 
      />
    </div>
  );
}
