"use client"

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Edit, 
  MessageCircle,
  TrendingUp,
  Search,
  Tv,
  Printer as PrinterIcon,
  NotebookTabs
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
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RepairCall, RepairStatus, Inquiry } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { StickerModal } from './repairing/StickerModal';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function RepairingModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<RepairCall | null>(null);
  const [stickerCall, setStickerCall] = useState<RepairCall | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<any>('Active');
  const [viewMode, setViewMode] = useState<'Repairing' | 'Inquiries'>('Repairing');

  const stats = useMemo(() => {
    const totalActive = store.calls.filter((c: any) => c.status !== 'Completed' && c.status !== 'Rejected').length;
    const pending = store.calls.filter((c: any) => c.status === 'Pending').length;
    const completed = store.calls.filter((c: any) => c.status === 'Completed').length;
    const rejected = store.calls.filter((c: any) => c.status === 'Rejected').length;
    const exchange = store.calls.filter((c: any) => c.status === 'Exchange' || c.status === 'Purchase').length;
    return { totalActive, pending, completed, rejected, exchange };
  }, [store.calls]);

  const filteredCalls = useMemo(() => {
    return store.calls.filter((c: RepairCall) => {
      const matchesSearch = 
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile?.includes(searchQuery);

      let matchesFilter = true;
      if (activeFilter === 'Active') matchesFilter = c.status !== 'Completed' && c.status !== 'Rejected';
      else if (activeFilter === 'Pending') matchesFilter = c.status === 'Pending';
      else if (activeFilter === 'Completed') matchesFilter = c.status === 'Completed';
      else if (activeFilter === 'Rejected') matchesFilter = c.status === 'Rejected';
      else if (activeFilter === 'Exchange') matchesFilter = c.status === 'Exchange' || c.status === 'Purchase';

      return (matchesSearch || !searchQuery) && matchesFilter;
    });
  }, [store.calls, searchQuery, activeFilter]);

  const calculateWarrantyLeft = (expiry?: string) => {
    if (!expiry) return null;
    const diff = differenceInDays(parseISO(expiry), new Date());
    return diff > 0 ? diff : 0;
  };

  const visibleKpis = [
    { id: 'totalActive', title: 'Total Active', value: stats.totalActive, icon: TrendingUp, color: 'bg-[#0066FF]', active: activeFilter === 'Active', filter: 'Active' },
    { id: 'pending', title: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#FFD700]', textColor: 'text-black', active: activeFilter === 'Pending', filter: 'Pending' },
    { id: 'completed', title: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-500', active: activeFilter === 'Completed', filter: 'Completed' },
    { id: 'rejected', title: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-[#FF3366]', active: activeFilter === 'Rejected', filter: 'Rejected' },
    { id: 'exchange', title: 'Exchange/Pur', value: stats.exchange, icon: Tv, color: 'bg-cyan-500', active: activeFilter === 'Exchange', filter: 'Exchange' },
  ].filter(kpi => store.visibility.kpis[kpi.id as keyof typeof store.visibility.kpis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 5-CARD ANALYTICS HEADER HARDCODE */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {visibleKpis.map(kpi => (
          <Card key={kpi.id} onClick={() => { setViewMode('Repairing'); setActiveFilter(kpi.filter); }} className={cn("bg-slate-900/40 border-slate-800 cursor-pointer transition-all", kpi.active ? "ring-2 ring-blue-500" : "hover:bg-slate-800/60")}>
            <CardContent className="p-4 flex justify-between items-start">
               <div><p className="text-slate-400 text-[10px] uppercase font-bold mb-1">{kpi.title}</p><h3 className="text-xl font-headline font-bold">{kpi.value}</h3></div>
               <div className={cn("p-2 rounded-xl", kpi.color, kpi.textColor || "text-white")}><kpi.icon className="w-4 h-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input placeholder="Smart Search Job, Mobile..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-slate-950 border-slate-800 h-11" />
        </div>
        <div className="flex gap-4">
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
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Job ID</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Customer</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Device Profile</TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Timestamp</TableHead>
                {/* DYNAMIC COLUMN MATRIX */}
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase text-center">
                  {filteredCalls.some(c => c.status === 'Exchange' || c.status === 'Purchase') ? 'STORE LOCATION' : 'WARRANTY TRACKER'}
                </TableHead>
                <TableHead className="font-headline text-slate-400 text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-right font-headline text-slate-400 text-[11px] uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => {
                const isExPur = call.status === 'Exchange' || call.status === 'Purchase';
                const showWarranty = call.status === 'Pending' || call.status === 'Completed';
                const wDays = calculateWarrantyLeft(call.warrantyExpiry);
                
                return (
                  <TableRow key={call.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell className="font-code font-bold text-blue-400">{call.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col"><span className="font-semibold">{call.customerName}</span><span className="text-xs text-slate-500">{call.mobile}</span></div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col"><span className="text-sm">{call.brand} {call.model}</span><span className="text-[10px] text-slate-400 uppercase">{call.category} • {call.screenSize}"</span></div>
                    </TableCell>
                    <TableCell><div className="text-[10px] text-slate-400">{format(new Date(call.createdAt), 'dd/MM/yy')}<br/>{format(new Date(call.createdAt), 'hh:mm a')}</div></TableCell>
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
                         <DropdownMenuTrigger className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", 
                           call.status === 'Pending' ? "bg-yellow-500/10 text-[#FFD700] border-yellow-500/20" : 
                           call.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                           call.status === 'Rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                           "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                         )}>
                           {call.status}
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="bg-slate-900 border-slate-800">
                           {['Pending', 'Completed', 'Rejected', 'Exchange', 'Purchase'].map(s => (
                             <DropdownMenuItem key={s} onClick={() => store.updateCall({...call, status: s as RepairStatus})}>{s}</DropdownMenuItem>
                           ))}
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button size="sm" variant="ghost" onClick={() => { setEditingCall(call); setModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                         <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => setStickerCall(call)}><PrinterIcon className="w-4 h-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
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
                    <TableCell className="text-xs text-slate-500">{format(new Date(inq.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
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
