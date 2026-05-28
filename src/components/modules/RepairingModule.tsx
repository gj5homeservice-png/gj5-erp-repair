"use client"

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Receipt, 
  Edit, 
  MessageCircle,
  TrendingUp,
  History,
  Search,
  RefreshCw,
  Tv,
  Printer as PrinterIcon,
  ShieldCheck,
  Building2
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RepairCall, RepairStatus } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { StickerModal } from './repairing/StickerModal';
import { format, differenceInDays, addMonths, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface RepairingModuleProps {
  store: any;
  onInvoiceRequest?: (call: RepairCall) => void;
}

type FilterStatus = 'All' | 'Active' | RepairStatus | 'Repeat' | 'ExchangePurchase' | 'Warranty';

export function RepairingModule({ store, onInvoiceRequest }: RepairingModuleProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<RepairCall | null>(null);
  const [stickerCall, setStickerCall] = useState<RepairCall | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Active');

  const stats = useMemo(() => {
    const now = new Date();
    const totalActive = store.calls.filter((c: RepairCall) => c.status !== 'Completed' && c.status !== 'Rejected').length;
    const pending = store.calls.filter((c: RepairCall) => c.status === 'Pending').length;
    const completed = store.calls.filter((c: RepairCall) => c.status === 'Completed').length;
    const rejected = store.calls.filter((c: RepairCall) => c.status === 'Rejected').length;
    const repeats = store.calls.filter((c: RepairCall) => (c.visitHistory?.length || 0) > 1).length;
    const exchangePurchase = store.calls.filter((c: RepairCall) => c.status === 'Exchange' || c.status === 'Purchase').length;
    const warranty = store.calls.filter((c: RepairCall) => {
      if (!c.warrantyExpiry) return false;
      return new Date(c.warrantyExpiry) > now;
    }).length;
    return { totalActive, pending, completed, rejected, repeats, exchangePurchase, warranty };
  }, [store.calls]);

  const filteredCalls = useMemo(() => {
    const now = new Date();
    return store.calls.filter((c: RepairCall) => {
      const matchesSearch = 
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile?.includes(searchQuery);

      let matchesFilter = true;
      if (activeFilter === 'Active') matchesFilter = c.status !== 'Completed' && c.status !== 'Rejected';
      else if (activeFilter === 'Pending') matchesFilter = c.status === 'Pending';
      else if (activeFilter === 'Completed') matchesFilter = c.status === 'Completed';
      else if (activeFilter === 'Rejected') matchesFilter = c.status === 'Rejected';
      else if (activeFilter === 'Repeat') matchesFilter = (c.visitHistory?.length || 0) > 1;
      else if (activeFilter === 'ExchangePurchase') matchesFilter = c.status === 'Exchange' || c.status === 'Purchase';
      else if (activeFilter === 'Warranty') matchesFilter = c.warrantyExpiry && new Date(c.warrantyExpiry) > now;

      return (matchesSearch || !searchQuery) && matchesFilter;
    });
  }, [store.calls, searchQuery, activeFilter]);

  const calculateWarrantyExpiry = (duration: string, customValue?: string) => {
    const now = new Date();
    if (duration === '1 Month') return addMonths(now, 1).toISOString();
    if (duration === '3 Months') return addMonths(now, 3).toISOString();
    if (duration === '6 Months') return addMonths(now, 6).toISOString();
    if (duration === 'Custom Duration' && customValue) {
      const days = parseInt(customValue);
      if (!isNaN(days)) return addDays(now, days).toISOString();
    }
    return undefined;
  };

  const handleStatusChange = (callId: string, status: RepairStatus) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      let warrantyExpiry = call.warrantyExpiry;
      if (status === 'Completed' && call.warrantyDuration && call.warrantyDuration !== 'None') {
        warrantyExpiry = calculateWarrantyExpiry(call.warrantyDuration, call.warrantyCustomValue);
      }
      store.updateCall({ ...call, status, warrantyExpiry, updatedAt: new Date().toISOString() });
    }
  };

  const handlePriceChange = (callId: string, takePrice: number) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      store.updateCall({ ...call, takePrice });
    }
  };

  const handleStoreLocationChange = (callId: string, storeLocation: string) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      store.updateCall({ ...call, storeLocation });
    }
  };

  const handleWarrantyChange = (callId: string, duration: string) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      const isCompleted = call.status === 'Completed';
      const warrantyExpiry = isCompleted && duration !== 'None' 
        ? calculateWarrantyExpiry(duration, call.warrantyCustomValue) 
        : undefined;
      store.updateCall({ ...call, warrantyDuration: duration, warrantyExpiry });
    }
  };

  const handleCustomWarrantyChange = (callId: string, value: string) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      const isCompleted = call.status === 'Completed';
      const warrantyExpiry = isCompleted && call.warrantyDuration === 'Custom Duration'
        ? calculateWarrantyExpiry('Custom Duration', value)
        : undefined;
      store.updateCall({ ...call, warrantyCustomValue: value, warrantyExpiry });
    }
  };

  const calculateWarrantyLeft = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = parseISO(expiryDate);
    const diff = differenceInDays(expiry, now);
    return diff > 0 ? diff : 0;
  };

  const openMap = (address: string, pincode: string) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(address + ' ' + (pincode || ''))}`;
    window.open(url, '_blank');
  };

  const handleEdit = (call: RepairCall) => {
    setEditingCall(call);
    setModalOpen(true);
  };

  const visibleKpis = [
    { id: 'totalActive', title: 'Total Active', value: stats.totalActive, icon: TrendingUp, color: 'bg-[#0066FF]', active: activeFilter === 'Active', filter: 'Active' },
    { id: 'pending', title: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#FFD700]', textColor: 'text-black', active: activeFilter === 'Pending', filter: 'Pending' },
    { id: 'completed', title: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-500', active: activeFilter === 'Completed', filter: 'Completed' },
    { id: 'rejected', title: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-[#FF3366]', active: activeFilter === 'Rejected', filter: 'Rejected' },
    { id: 'repeat', title: 'Repeat', value: stats.repeats, icon: RefreshCw, color: 'bg-purple-600', active: activeFilter === 'Repeat', filter: 'Repeat' },
    { id: 'exchange', title: 'Exchange/Pur', value: stats.exchangePurchase, icon: Tv, color: 'bg-cyan-500', active: activeFilter === 'ExchangePurchase', filter: 'ExchangePurchase' },
    { id: 'warranty', title: 'Warranty Calls', value: stats.warranty, icon: ShieldCheck, color: 'bg-orange-500', active: activeFilter === 'Warranty', filter: 'Warranty' },
  ].filter(kpi => store.visibility.kpis[kpi.id as keyof typeof store.visibility.kpis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className={cn(
          "grid gap-4 flex-1 w-full",
          visibleKpis.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
        )}>
          {visibleKpis.map(kpi => (
            <StatCard 
              key={kpi.id}
              title={kpi.title} 
              value={kpi.value} 
              icon={kpi.icon} 
              color={kpi.color} 
              textColor={kpi.textColor}
              active={kpi.active}
              onClick={() => setActiveFilter(kpi.filter as FilterStatus)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Smart Search Job, Mobile, Customer..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-10 bg-slate-950 border-slate-800 h-11"
           />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-700 h-11 px-6" onClick={() => { setSearchQuery(''); setActiveFilter('Active'); }}>
            <History className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button className="flex-1 md:flex-none rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 px-6 shadow-lg shadow-blue-500/20" onClick={() => { setEditingCall(null); setModalOpen(true); }}>
            <Plus className="w-5 h-5 mr-2" /> Log New Service Call
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="w-[140px] font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Job ID</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Customer Details</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Device Profile</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Log Timestamp</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">
                {activeFilter === 'ExchangePurchase' ? 'Store Location' : 'Warranty Tracker'}
              </TableHead>
              <TableHead className="font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Status & Aging</TableHead>
              <TableHead className="text-right font-headline text-slate-400 font-medium uppercase text-[11px] tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.map((call: RepairCall) => {
              const latestVisit = call.visitHistory?.[call.visitHistory.length - 1];
              const isExchangePurchase = call.status === 'Exchange' || call.status === 'Purchase';
              const showWarranty = call.status === 'Pending' || call.status === 'Completed';
              const warrantyLeft = calculateWarrantyLeft(call.warrantyExpiry);
              
              return (
                <TableRow key={call.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                  <TableCell className="font-code font-bold text-blue-400">
                    <div className="flex flex-col gap-1">
                      <span>{call.id}</span>
                      <Badge variant="outline" className="w-fit text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20 px-1.5 py-0">
                        VISITS: {call.visitHistory?.length || 0}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100">{call.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-code">{call.customerId}</span>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {call.mobile}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{call.brand} {call.model}</span>
                      <span className="text-xs text-slate-400">{call.category} • {call.screenSize}" Inch</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-400">
                      {latestVisit ? format(new Date(latestVisit.timestamp), 'dd/MM/yyyy') : '--/--/----'}
                      <br />
                      {latestVisit ? format(new Date(latestVisit.timestamp), 'hh:mm a') : '--:-- --'}
                    </div>
                  </TableCell>
                  <TableCell>
                     {showWarranty ? (
                       <div className="flex flex-col gap-2 min-w-[140px]">
                          <Select 
                            value={call.warrantyDuration || 'None'} 
                            onValueChange={(v) => handleWarrantyChange(call.id, v)}
                          >
                            <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                              <SelectItem value="None">No Warranty</SelectItem>
                              <SelectItem value="1 Month">1 Month</SelectItem>
                              <SelectItem value="3 Months">3 Months</SelectItem>
                              <SelectItem value="6 Months">6 Months</SelectItem>
                              <SelectItem value="Custom Duration">Custom Duration</SelectItem>
                            </SelectContent>
                          </Select>
                          {call.warrantyDuration === 'Custom Duration' && (
                            <Input 
                              value={call.warrantyCustomValue || ''}
                              onChange={(e) => handleCustomWarrantyChange(call.id, e.target.value)}
                              placeholder="e.g. 15 DAY"
                              className="h-7 text-[10px] bg-slate-950 border-slate-800"
                            />
                          )}
                       </div>
                     ) : isExchangePurchase ? (
                        <div className="flex flex-col gap-2 min-w-[140px]">
                           <Select 
                             value={call.storeLocation || 'GODOWN'} 
                             onValueChange={(v) => handleStoreLocationChange(call.id, v)}
                           >
                             <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                               <SelectItem value="SHOWROOM">SHOWROOM</SelectItem>
                               <SelectItem value="SERVICE CENTER">SERVICE CENTER</SelectItem>
                               <SelectItem value="GODOWN">GODOWN</SelectItem>
                               <SelectItem value="OTHER">OTHER</SelectItem>
                             </SelectContent>
                           </Select>
                        </div>
                     ) : (
                       <div className="h-8 w-full bg-slate-900/20 rounded border border-dashed border-slate-800/50"></div>
                     )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            call.status === 'Pending' ? "bg-yellow-500/10 text-[#FFD700] border border-yellow-500/20" :
                            call.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            call.status === 'Rejected' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          )}>
                            {call.status}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-800">
                          <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Pending')}>Pending</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Completed')}>Completed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Rejected')}>Rejected</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Exchange')}>Exchange</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Purchase')}>Purchase</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {isExchangePurchase ? (
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">₹</span>
                          <Input 
                            type="number" 
                            value={call.takePrice || ''} 
                            onChange={(e) => handlePriceChange(call.id, Number(e.target.value))}
                            placeholder="Take Price"
                            className="h-7 pl-5 text-[10px] bg-slate-950 border-slate-800 w-24"
                          />
                        </div>
                      ) : (
                        warrantyLeft !== null && call.status === 'Completed' && (
                          <div className="text-[10px] text-orange-400 font-bold uppercase animate-pulse">
                            Warranty Left: {warrantyLeft} Days
                          </div>
                        )
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => openMap(call.address, call.pincode)}>
                        <MapPin className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(call)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => setStickerCall(call)}>
                        <PrinterIcon className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-blue-400" onClick={() => onInvoiceRequest?.(call)}>
                        <Receipt className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CallModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        editingCall={editingCall}
        onSave={(data) => {
          if (editingCall || store.calls.find((c:any) => c.id === data.id)) store.updateCall(data);
          else store.addCall(data);
          setModalOpen(false);
        }}
        store={store}
      />

      <StickerModal 
        isOpen={!!stickerCall} 
        onClose={() => setStickerCall(null)} 
        call={stickerCall}
        shopLogo={store.shopLogo}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, textColor = "text-white", active, onClick }: any) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "bg-slate-900/40 border-slate-800 overflow-hidden group cursor-pointer transition-all",
        active ? "ring-2 ring-blue-500 scale-[1.02]" : "hover:bg-slate-800/60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">{title}</p>
            <h3 className="text-xl font-headline font-bold">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-xl", color, textColor)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
