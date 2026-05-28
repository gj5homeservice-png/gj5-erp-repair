"use client"

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  MoreVertical, 
  MapPin, 
  Receipt, 
  Edit, 
  MessageCircle,
  TrendingUp,
  History,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RepairCall, RepairStatus } from '@/lib/types';
import { CallModal } from './repairing/CallModal';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RepairingModuleProps {
  store: any;
  onInvoiceRequest: (call: RepairCall) => void;
}

export function RepairingModule({ store, onInvoiceRequest }: RepairingModuleProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<RepairCall | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const total = store.calls.length;
    const pending = store.calls.filter((c: RepairCall) => c.status === 'Pending').length;
    const completed = store.calls.filter((c: RepairCall) => c.status === 'Completed').length;
    const rejected = store.calls.filter((c: RepairCall) => c.status === 'Rejected').length;
    return { total, pending, completed, rejected };
  }, [store.calls]);

  const filteredCalls = useMemo(() => {
    return store.calls.filter((c: RepairCall) => 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      c.technician.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [store.calls, searchQuery]);

  const handleEdit = (call: RepairCall) => {
    setEditingCall(call);
    setModalOpen(true);
  };

  const handleStatusChange = (callId: string, status: RepairStatus) => {
    const call = store.calls.find((c: RepairCall) => c.id === callId);
    if (call) {
      store.updateCall({ ...call, status });
    }
  };

  const calculateAging = (updatedDate: string) => {
    const updated = new Date(updatedDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openMap = (address: string, pincode: string) => {
    const url = `https://www.google.com/maps/@21.1714048,72.8563712,8748m/data=!3m1!1e3?q=${encodeURIComponent(address + ' ' + pincode)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Active Calls" value={stats.total} icon={TrendingUp} color="bg-[#0066FF]" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="bg-[#FFD700]" textColor="text-black" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="bg-[#FF3366]" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Smart Search Job, Mobile, Customer..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-10 bg-slate-950 border-slate-800 focus:ring-[#0066FF] h-11"
           />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-700 h-11 px-6">
            <History className="w-4 h-4 mr-2" />
            Inquiry Log
          </Button>
          <Button 
            className="flex-1 md:flex-none rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 px-6 shadow-lg shadow-blue-500/20"
            onClick={() => {
              setEditingCall(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Log New Service Call
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="w-[120px] font-headline text-slate-400 font-medium">Job ID</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium">Customer Details</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium">Device Profile</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium">Log Timestamp</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium">Technician</TableHead>
              <TableHead className="font-headline text-slate-400 font-medium">Status & Aging</TableHead>
              <TableHead className="text-right font-headline text-slate-400 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.map((call: RepairCall) => (
              <TableRow key={call.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                <TableCell className="font-code font-bold text-blue-400">{call.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-100">{call.customerName}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {call.mobile}
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase mt-1">ID: {call.customerId}</span>
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
                    {format(new Date(call.createdAt), 'dd/MM/yyyy')}
                    <br />
                    {format(new Date(call.createdAt), 'hh:mm a')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{call.technician || 'Unassigned'}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Pickup: {call.pickupBy || 'N/A'} {call.runnerName ? `(${call.runnerName})` : ''}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          call.status === 'Pending' ? "bg-yellow-500/10 text-[#FFD700] border border-yellow-500/20" :
                          call.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {call.status}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-900 border-slate-800">
                        <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Pending')}>Pending</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Completed')}>Completed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(call.id, 'Rejected')}>Rejected</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="text-[10px] text-slate-500">
                      In Workshop: {calculateAging(call.updatedAt)} Days
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                      onClick={() => openMap(call.address, call.pincode)}
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-[#0066FF] hover:bg-[#0052CC] h-8"
                      onClick={() => onInvoiceRequest(call)}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      $ Bill
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="hover:bg-slate-800"
                      onClick={() => handleEdit(call)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, textColor = "text-white" }: any) {
  return (
    <Card className="bg-slate-900/40 border-slate-800 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-headline font-bold">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", color, textColor)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
