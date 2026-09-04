"use client"

import React, { useState, useMemo } from 'react';
import { Truck, Clock, PackageCheck, CheckCircle2, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SalesDelivery, SalesDeliveryStatus } from '@/lib/types';

const STATUSES: SalesDeliveryStatus[] = ['Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed Delivery'];

const STATUS_COLORS: Record<string, string> = {
  'Pending Pickup': 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  'Picked Up': 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  'In Transit': 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
  'Out for Delivery': 'bg-purple-600/10 text-purple-400 border-purple-600/20',
  'Delivered': 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  'Failed Delivery': 'bg-rose-600/10 text-rose-400 border-rose-600/20',
};

export function SalesLogisticsModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const deliveries: SalesDelivery[] = store.salesDeliveries || [];
  const today = format(new Date(), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    const totalDeliveries = deliveries.length;
    const pendingPickup = deliveries.filter(d => d.deliveryStatus === 'Pending Pickup').length;
    const pendingDelivery = deliveries.filter(d => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(d.deliveryStatus)).length;
    const deliveredToday = deliveries.filter(d => d.deliveryStatus === 'Delivered' && d.updatedAt?.startsWith(today)).length;
    const activeRunners = new Set(deliveries.filter(d => d.runnerName && d.deliveryStatus !== 'Delivered' && d.deliveryStatus !== 'Failed Delivery').map(d => d.runnerName)).size;
    return { totalDeliveries, pendingPickup, pendingDelivery, deliveredToday, activeRunners };
  }, [deliveries, today]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return deliveries.filter(d => !q || d.customerName?.toLowerCase().includes(q) || d.mobile?.includes(q) || d.orderId?.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [deliveries, search]);

  const handleStatusChange = (id: string, status: SalesDeliveryStatus) => {
    store.updateSalesDeliveryStatus(id, status);
    toast({ title: 'Delivery Updated', description: `Status changed to ${status}. Linked Sales Order synced.` });
  };

  const handleRunnerBlur = (delivery: SalesDelivery, name: string) => {
    if (name === (delivery.runnerName || '')) return;
    store.updateSalesDelivery({ ...delivery, runnerName: name });
    toast({ title: 'Runner Assigned', description: `${name || 'Unassigned'} linked to order ${delivery.orderId}.` });
  };

  const cards = [
    { label: 'Total Deliveries', value: stats.totalDeliveries, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Pending Pickup', value: stats.pendingPickup, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Pending Delivery', value: stats.pendingDelivery, icon: PackageCheck, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Delivered Today', value: stats.deliveredToday, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Active Runners', value: stats.activeRunners, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Logistics</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Product Delivery Dispatch — Separate from Repair Logistics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl relative overflow-hidden">
            <div className={cn("p-2.5 rounded-xl w-fit", c.bg, c.color)}><c.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
              <h3 className="text-lg font-headline font-black text-white">{c.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, mobile, order ID..." className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-[#F8FAFC]" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Order ID</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Runner</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Customer</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Mobile</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Address</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Product</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Payment</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(d => (
              <TableRow key={d.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="font-code font-bold text-blue-400 text-xs">{d.orderId}</TableCell>
                <TableCell>
                  <Input
                    defaultValue={d.runnerName || ''}
                    placeholder="Assign runner"
                    onBlur={e => handleRunnerBlur(d, e.target.value)}
                    className="h-8 w-32 text-xs bg-slate-950 border-slate-800 text-[#F8FAFC]"
                  />
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-200">{d.customerName}</TableCell>
                <TableCell className="text-xs text-slate-400 font-code">{d.mobile}</TableCell>
                <TableCell className="text-xs text-slate-400 max-w-[160px] truncate">{d.address || '—'}</TableCell>
                <TableCell className="text-xs text-slate-300">{d.product}</TableCell>
                <TableCell><Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] uppercase">{d.paymentStatus}</Badge></TableCell>
                <TableCell>
                  <Select value={d.deliveryStatus} onValueChange={v => handleStatusChange(d.id, v as SalesDeliveryStatus)}>
                    <SelectTrigger className={cn("h-8 w-40 text-[10px] uppercase font-bold border", STATUS_COLORS[d.deliveryStatus])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-600 text-xs italic">No deliveries yet. Enable "Delivery Required" on a New Sale to create one automatically.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
