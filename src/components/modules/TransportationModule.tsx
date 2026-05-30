"use client"

import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Send, 
  MapPin, 
  Clock, 
  Search, 
  MessageSquare, 
  Paperclip,
  TrendingUp,
  Navigation,
  Package,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export function TransportationModule({ store }: { store: any }) {
  const [formData, setFormData] = useState({ runnerName: '', runnerMobile: '', jobId: '' });
  const [activeTpl, setActiveTpl] = useState(0);
  const [templates] = useState([
    "Dispatch Alert: Runner [Runner] assigned to Job [JobID].",
    "Transit Update: Item [JobID] is currently in-transit.",
    "Delivered: Item [JobID] reached workshop successfully."
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const total = store.transportationLogs?.length || 0;
    const pendingPickup = store.transportationLogs?.filter((l: any) => l.status === 'Pending Pickup').length || 0;
    const inTransit = store.transportationLogs?.filter((l: any) => l.status === 'In Transit').length || 0;
    const delivered = store.transportationLogs?.filter((l: any) => l.status === 'Delivered To Shop').length || 0;
    
    return { 
      total, 
      pendingPickup, 
      inTransit, 
      delivered,
      activeFleet: '100%'
    };
  }, [store.transportationLogs]);

  const filteredLogs = useMemo(() => {
    return (store.transportationLogs || []).filter((log: any) => {
      const matchesSearch = 
        log.runnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [store.transportationLogs, searchQuery]);

  const handleDispatch = () => {
    if (!formData.runnerName || !formData.jobId) return;
    const job = store.calls.find((c: any) => c.id === formData.jobId);
    
    store.addTransportLog({
      id: `LOG${Date.now()}`,
      runnerName: formData.runnerName,
      runnerMobile: formData.runnerMobile,
      jobId: formData.jobId,
      customerName: job?.customerName || 'Unknown',
      address: job?.address || 'N/A',
      dispatchTime: new Date().toISOString(),
      status: 'Pending Pickup'
    });
    
    window.open(`https://web.whatsapp.com/send?phone=91${formData.runnerMobile}&text=${encodeURIComponent(templates[activeTpl].replace('[Runner]', formData.runnerName).replace('[JobID]', formData.jobId))}`, '_blank');
    setFormData({ runnerName: '', runnerMobile: '', jobId: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Logs', value: stats.total, icon: Package, color: 'bg-blue-600' },
          { label: 'Pending Pickup', value: stats.pendingPickup, icon: Clock, color: 'bg-amber-600' },
          { label: 'In Transit', value: stats.inTransit, icon: Navigation, color: 'bg-blue-500' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircleIcon, color: 'bg-emerald-600' },
          { label: 'Fleet Active', value: stats.activeFleet, icon: TrendingUp, color: 'bg-cyan-600' }
        ].map((k, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div><p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p><h3 className="text-xl font-headline font-bold">{k.value}</h3></div>
              <div className={cn("p-2 rounded-xl text-white", k.color)}><k.icon className="w-4 h-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <Truck className="w-6 h-6 text-[#0066FF]" /> Runner Transit Initializer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Runner Name</Label>
                  <Input 
                    value={formData.runnerName} 
                    onChange={e => setFormData({...formData, runnerName: e.target.value})} 
                    className="bg-slate-950 border-slate-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Runner Mobile</Label>
                  <Input 
                    value={formData.runnerMobile} 
                    onChange={e => setFormData({...formData, runnerMobile: e.target.value})} 
                    className="bg-slate-950 border-slate-800 h-11" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Active Job Linker</Label>
                <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
                    <SelectValue placeholder="Link active service job..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {store.calls.filter((c: any) => c.status !== 'Completed').map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.id} - {c.customerName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleDispatch} className="w-full h-12 bg-[#0066FF] hover:bg-blue-600 rounded-xl font-bold uppercase shadow-lg shadow-blue-500/20">
                <Navigation className="w-5 h-5 mr-2" /> 🚀 Dispatch & Send to Runner
              </Button>
            </div>
            <div className="col-span-5 space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <MessageSquare className="w-5 h-5 text-emerald-500" /> Dispatch Templates
               </h3>
               {templates.map((t, i) => (
                 <div key={i} className={cn("p-4 rounded-xl border cursor-pointer transition-all", activeTpl === i ? "bg-emerald-500/5 border-emerald-500/40" : "bg-slate-900/40 border-slate-800")} onClick={() => setActiveTpl(i)}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tpl {i+1}</span>
                      <Paperclip className="w-3 h-3 text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{t}</p>
                 </div>
               ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold flex items-center gap-2"><Clock className="w-6 h-6 text-emerald-500" /> Live Transit Directory</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Filter Runner, Job, Customer..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 h-10 bg-slate-950 border-slate-800" 
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead>Runner Info</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer Profile</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Dispatch Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log: any) => (
                <TableRow key={log.id} className="border-slate-800/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{log.runnerName}</span>
                      <span className="text-xs text-slate-500">{log.runnerMobile || 'No Mobile'}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-code">{log.jobId}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{log.customerName}</span>
                      <span className="text-[10px] text-blue-400">{log.customerMobile}</span>
                    </div>
                  </TableCell>
                  <TableCell><div className="flex items-center gap-2 text-xs text-slate-400"><MapPin className="w-3 h-3" /><span className="truncate max-w-[150px]">{log.address}</span></div></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                       <Calendar className="w-3 h-3" />
                       {format(new Date(log.dispatchTime), 'dd/MM HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={log.status} onValueChange={v => store.updateTransportLogStatus(log.id, v)}>
                      <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                        <SelectItem value="Picked Up">Picked Up</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered To Shop">Delivered To Shop</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">No active transits logged.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
