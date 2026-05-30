
"use client"

import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutGrid,
  Monitor,
  Cpu,
  Package,
  Wrench,
  Boxes,
  ShoppingBag,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RepairCall, RepairStatus } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { StickerModal } from './repairing/StickerModal';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_CATEGORIES = [
  { id: 'TV Repair', name: 'TV Repair', icon: Tv, prefix: 'TV' },
  { id: 'CCTV', name: 'CCTV', icon: Monitor, prefix: 'CCTV' },
  { id: 'Computer / Laptop', name: 'Computer / Laptop', icon: Cpu, prefix: 'PC' },
  { id: 'Wholesale', name: 'Wholesale', icon: Package, prefix: 'WS' },
  { id: 'Technician', name: 'Technician', icon: Wrench, prefix: 'TECH' },
  { id: 'Spare Parts', name: 'Spare Parts', icon: Boxes, prefix: 'SP' },
  { id: 'Accessories', name: 'Accessories', icon: ShoppingBag, prefix: 'ACC' },
  { id: 'Other Product', name: 'Other Products', icon: MoreHorizontal, prefix: 'OTH' },
];

export function RepairingModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<RepairCall | null>(null);
  const [stickerCall, setStickerCall] = useState<RepairCall | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<any>('Active');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'Repairing' | 'Inquiries'>('Repairing');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch (e) {
      // Silently catch permission request errors
    }
  }, []);

  const stats = useMemo(() => {
    const totalActive = store.calls.filter((c: any) => c.status !== 'Completed' && c.status !== 'Rejected').length;
    const pending = store.calls.filter((c: any) => c.status === 'Pending').length;
    const completed = store.calls.filter((c: any) => c.status === 'Completed').length;
    const rejected = store.calls.filter((c: any) => c.status === 'Rejected').length;
    const repeat = store.calls.filter((c: any) => (c.repeatCount || 0) > 0).length;
    const exchange = store.calls.filter((c: any) => c.status === 'Exchange' || c.status === 'Purchase').length;
    const warranty = store.calls.filter((c: any) => c.status === 'Completed' && c.warrantyExpiry).length;
    return { totalActive, pending, completed, rejected, exchange, repeat, warranty };
  }, [store.calls]);

  const filteredCalls = useMemo(() => {
    return store.calls.filter((c: RepairCall) => {
      // Category filter (stays in logic, but UI button is removed)
      const matchesCategory = selectedProductCategory ? c.category === selectedProductCategory : true;

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

      return matchesCategory && (matchesSearch || !searchQuery) && matchesFilter;
    });
  }, [store.calls, searchQuery, activeFilter, selectedProductCategory]);

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
    if (!address || address.trim() === '') {
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    try {
      const win = window.open(url, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        throw new Error("Pop-up blocked");
      }
    } catch (e) {
      console.warn("Map pop-up blocked", e);
      toast({
        variant: "destructive",
        title: "Pop-up Blocked",
        description: "Your browser prevented opening the map. Please allow pop-ups."
      });
    }
  };

  const visibleKpis = [
    { id: 'totalActive', title: 'Total Active', value: stats.totalActive, icon: TrendingUp, color: 'bg-[#0066FF]', filter: 'Active' },
    { id: 'pending', title: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#FFD700]', textColor: 'text-black', filter: 'Pending' },
    { id: 'completed', title: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-500', filter: 'Completed' },
    { id: 'repeat', title: 'Repeat Call', value: stats.repeat, icon: RefreshCw, color: 'bg-purple-500', filter: 'Repeat' },
    { id: 'rejected', title: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-[#FF3366]', filter: 'Rejected' },
    { id: 'exchange', title: 'Exchange/Pur', value: stats.exchange, icon: Tv, color: 'bg-cyan-500', filter: 'Exchange' },
    { id: 'warranty', title: 'Warranty Calls', value: stats.warranty, icon: History, color: 'bg-amber-600', filter: 'Warranty' },
  ].filter(kpi => store.visibility.kpis[kpi.id as keyof typeof store.visibility.kpis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {visibleKpis.map(kpi => (
          <Card key={kpi.id} onClick={() => { setViewMode('Repairing'); setActiveFilter(kpi.filter); }} className={cn("bg-slate-900/40 border-slate-800 cursor-pointer transition-all", activeFilter === kpi.filter ? "ring-2 ring-blue-500" : "hover:bg-slate-800/60")}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
               <div className={cn("p-2 rounded-xl", kpi.color, kpi.textColor || "text-white")}><kpi.icon className="w-4 h-4" /></div>
               <div><p className="text-slate-400 text-[10px] uppercase font-bold">{kpi.title}</p><h3 className="text-xl font-headline font-bold">{kpi.value}</h3></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Smart Search Job, Mobile, Category..." 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
             className="pl-10 bg-slate-950 border-slate-800 h-11" 
           />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-slate-700 h-11" onClick={() => setViewMode(viewMode === 'Repairing' ? 'Inquiries' : 'Repairing')}>
            <NotebookTabs className="w-4 h-4 mr-2" /> {viewMode === 'Repairing' ? "Inquiries" : "Repair Hub"}
          </Button>
          <Button className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 shadow-lg shadow-blue-500/20" onClick={() => { setEditingCall(null); setModalOpen(true); }}>
            <Plus className="w-5 h-5 mr-2" /> Log New Case
          </Button>
        </div>
      </div>

      {viewMode === 'Repairing' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Job ID</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Customer</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Category / Profile</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase text-center">
                  {filteredCalls.some(c => c.status === 'Exchange' || c.status === 'Purchase') ? 'STORE LOCATION' : 'WARRANTY TRACKER'}
                </TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-right font-headline text-slate-400 text-[11px] uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => {
                const isExpanded = expandedRows.has(call.id);
                const isExPur = call.status === 'Exchange' || call.status === 'Purchase';
                const showWarranty = call.status === 'Pending' || call.status === 'Completed';
                const wDays = calculateWarrantyLeft(call.warrantyExpiry);
                
                return (
                  <React.Fragment key={call.id}>
                    <TableRow className="border-slate-800/50 hover:bg-slate-800/20">
                      <TableCell>
                        {(call.visitHistory && call.visitHistory.length > 0) && (
                          <button onClick={() => toggleRowExpansion(call.id)} className="p-1 hover:bg-slate-700 rounded-md transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-code font-bold text-blue-400">
                        <div className="flex flex-col gap-1">
                          {call.id}
                          {((call.repeatCount || 0) > 0) && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] w-fit uppercase font-black">Visits: {(call.repeatCount || 0) + 1}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col"><span className="font-semibold">{call.customerName}</span><span className="text-xs text-slate-500">{call.mobile}</span></div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter mb-0.5">{call.category}</span>
                          <span className="text-sm">{call.brand} {call.model}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{call.screenSize && `${call.screenSize}"`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         {showWarranty && (
                           <div className="flex flex-col gap-1 items-center">
                              <span className="text-[10px] text-slate-400">{call.warrantyDuration || 'No Warranty'}</span>
                              {call.status === 'Completed' && wDays !== null && (
                                <span className="text-[9px] font-bold text-emerald-400 uppercase animate-pulse">Left: {wDays} Days</span>
                              )}
                           </div>
                         )}
                         {isExPur && (
                           <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-cyan-400 uppercase">{call.storeLocation || 'GODOWN'}</span>
                         )}
                      </TableCell>
                      <TableCell>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <button className="outline-none">
                               <Badge className={cn("text-[10px] font-bold uppercase border cursor-pointer hover:opacity-80 transition-opacity", 
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
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                             onClick={() => handleMapClick(call.address)}
                           >
                             <MapPin className="w-4 h-4" />
                           </Button>
                           <Button size="sm" variant="ghost" onClick={() => { setEditingCall(call); setModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                           <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => setStickerCall(call)}><PrinterIcon className="w-4 h-4" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && call.visitHistory && (
                      <TableRow className="bg-slate-950/50 hover:bg-slate-950/50 border-slate-800">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-12 py-6 space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <History className="w-4 h-4" /> Chronological History Ledger
                            </h4>
                            <div className="rounded-xl border border-slate-800 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-900">
                                  <TableRow className="border-slate-800">
                                    <TableHead className="text-[10px] font-bold uppercase">#</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Date & Time</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Complaint / Notes</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-right">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {call.visitHistory.map((v, i) => (
                                    <TableRow key={v.id || `visit-${call.id}-${i}`} className="border-slate-800 bg-slate-900/30">
                                      <TableCell className="font-code text-slate-500">{i + 1}</TableCell>
                                      <TableCell className="text-xs">
                                        <p className="font-bold">{v.date}</p>
                                        <p className="text-[10px] text-slate-500">{v.time}</p>
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        <p className="font-medium text-slate-200">{v.complaintDescription}</p>
                                        {v.technicianNotes && <p className="text-[10px] italic text-slate-500 mt-1">Tech: {v.technicianNotes}</p>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="outline" className="text-[9px] uppercase border-slate-700">{v.status}</Badge>
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
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-headline font-bold">Walk-In Inquiry Directory</h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/60"><TableRow className="border-slate-800"><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {store.inquiries.map((inq: any) => (
                  <TableRow key={inq.id} className="border-slate-800/50">
                    <TableCell className="text-xs text-slate-500">{inq.createdAt ? new Date(inq.createdAt).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell><div className="flex flex-col"><span className="font-bold">{inq.customerName}</span><span className="text-xs text-blue-400">{inq.mobile}</span></div></TableCell>
                    <TableCell className="text-sm italic text-slate-300">"{inq.notes}"</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <CallModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} editingCall={editingCall} store={store} />
      <StickerModal isOpen={!!stickerCall} onClose={() => setStickerCall(null)} call={stickerCall} shopLogo={store.shopLogo} />
    </div>
  );
}
