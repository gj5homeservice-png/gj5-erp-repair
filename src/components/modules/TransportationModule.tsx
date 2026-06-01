"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Search, 
  TrendingUp,
  Navigation,
  Package,
  Calendar,
  CheckCircle as CheckCircleIcon,
  User,
  FileDown,
  MessageSquare,
  FileStack,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ImageIcon
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function TransportationModule({ store }: { store: any }) {
  const [formData, setFormData] = useState({ runnerName: '', runnerMobile: '', jobId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const { toast } = useToast();

  const stats = useMemo(() => {
    const logs = store.transportationLogs || [];
    return { 
      total: logs.length,
      pPickup: logs.filter((l: any) => l.status === 'Pending Pickup').length,
      pDelivery: logs.filter((l: any) => l.status === 'Pending Delivery').length,
    };
  }, [store.transportationLogs]);

  const filteredLogs = useMemo(() => {
    return (store.transportationLogs || []).filter((log: any) => 
      log.runnerName.toLowerCase().includes(searchQuery.toLowerCase()) || log.jobId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [store.transportationLogs, searchQuery]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Total Logs', value: stats.total, icon: Package, color: 'bg-blue-600' },
          { label: 'Pending Pickup', value: stats.pPickup, icon: Clock, color: 'bg-amber-600' },
          { label: 'Pending Delivery', value: stats.pDelivery, icon: CheckCircleIcon, color: 'bg-emerald-600' }
        ].map((k, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <h3 className="text-lg md:text-xl font-headline font-bold">{k.value}</h3>
              </div>
              <div className={cn("p-2 rounded-xl text-white", k.color)}><k.icon className="w-4 h-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 font-headline text-base md:text-xl">
              <Truck className="w-5 h-5 md:w-6 h-6 text-[#0066FF]" /> Runner Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Runner Name</Label>
                <Input value={formData.runnerName} onChange={e => setFormData({...formData, runnerName: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11" placeholder="Runner Name" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Link Active Job</Label>
                <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue placeholder="Select Job" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {store.calls.filter((c: any) => c.status !== 'Completed').map((c: any) => <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => store.addTransportLog({id: `LOG${Date.now()}`, runnerName: formData.runnerName, jobId: formData.jobId, dispatchTime: new Date().toISOString(), status: 'Pending Pickup'})} className="w-full h-11 bg-[#0066FF] font-bold uppercase text-xs md:text-sm">Assign Runner</Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 font-headline text-base md:text-lg">
                 <FileStack className="w-5 h-5 text-emerald-500" /> Manifest Control
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 md:p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-500 uppercase">Dispatch Mobile</Label>
                <Input value={recipientMobile} onChange={e => setRecipientMobile(e.target.value)} placeholder="9876543210" className="bg-slate-950 border-slate-800 h-10 text-xs" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                 <Button variant="outline" className="h-10 text-xs border-slate-800 justify-start"><FileDown className="w-4 h-4 mr-2" /> Download Pickup</Button>
                 <Button variant="outline" className="h-10 text-xs border-slate-800 justify-start"><FileDown className="w-4 h-4 mr-2" /> Download Delivery</Button>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg md:text-xl font-headline font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> Transit Log</h3>
          <Input placeholder="Filter Logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 bg-slate-950 border-slate-800 w-full sm:w-64 text-xs" />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-[10px] md:text-xs">Runner</TableHead>
                  <TableHead className="text-[10px] md:text-xs">Job</TableHead>
                  <TableHead className="text-[10px] md:text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => (
                  <TableRow key={log.id} className="border-slate-800/50">
                    <TableCell className="font-bold text-xs whitespace-nowrap">{log.runnerName}</TableCell>
                    <TableCell><Badge variant="outline" className="font-code text-[10px]">{log.jobId}</Badge></TableCell>
                    <TableCell>
                      <Select value={log.status} onValueChange={v => store.updateTransportLogStatus(log.id, v)}>
                        <SelectTrigger className="h-8 text-[9px] bg-slate-950 border-slate-800 w-28 md:w-36"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                          <SelectItem value="OK Pickup">OK Pickup</SelectItem>
                          <SelectItem value="Pending Delivery">Pending Delivery</SelectItem>
                          <SelectItem value="OK Delivery">OK Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
