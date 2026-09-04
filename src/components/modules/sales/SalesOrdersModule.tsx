"use client"

import React, { useState, useMemo } from 'react';
import { Search, Eye, Pencil, Receipt, Truck, Trash2, X } from 'lucide-react';
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
import { NewSaleModule } from './NewSaleModule';
import { SalesOrder } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  Processing: 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Completed: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Cancelled: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
};

export function SalesOrdersModule({ store, onGoToInvoices, onGoToLogistics }: { store: any; onGoToInvoices?: () => void; onGoToLogistics?: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [deliveryFilter, setDeliveryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const orders: SalesOrder[] = store.salesOrders || [];

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchesSearch = !q || o.id.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.mobile?.includes(q);
      const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
      const matchesPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;
      const matchesDelivery = deliveryFilter === 'All' || o.deliveryStatus === deliveryFilter;
      const matchesDate = !dateFilter || o.saleDate === dateFilter;
      return matchesSearch && matchesStatus && matchesPayment && matchesDelivery && matchesDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter, paymentFilter, deliveryFilter, dateFilter]);

  const handleGenerateInvoice = (order: SalesOrder) => {
    if (order.invoiceId) {
      toast({ title: 'Invoice Already Exists', description: `Invoice ${order.invoiceId} is already linked to this order.` });
      return;
    }
    store.generateSalesInvoice(order);
    toast({ title: 'Invoice Generated', description: `Invoice created for order ${order.id}.` });
    onGoToInvoices?.();
  };

  const confirmDelete = () => {
    if (deletingId) {
      store.deleteSalesOrder(deletingId);
      toast({ title: 'Order Removed', description: `Order ${deletingId} has been deleted.` });
    }
    setDeletingId(null);
  };

  if (editingOrder) {
    return <NewSaleModule store={store} editingOrder={editingOrder} onDone={() => setEditingOrder(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Orders</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">All Retail Sales Records</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Order ID, Customer, Mobile..." className="pl-10 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {['All', 'New', 'Processing', 'Completed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s} Status</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {['All', 'Paid', 'Unpaid', 'Partial'].map(s => <SelectItem key={s} value={s}>{s} Payment</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
          <SelectTrigger className="w-44 h-10 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {['All', 'Not Required', 'Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed Delivery'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-40 h-10 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Order ID</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Sale Date</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Customer</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Mobile</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Product</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Amount</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Payment</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Delivery</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="font-code font-bold text-blue-400 text-xs">{o.id}</TableCell>
                <TableCell className="text-xs text-slate-300">{o.saleDate}</TableCell>
                <TableCell className="text-xs font-bold text-slate-200">{o.customerName}</TableCell>
                <TableCell className="text-xs text-slate-400 font-code">{o.mobile}</TableCell>
                <TableCell className="text-xs text-slate-300">{o.brand} {o.model}</TableCell>
                <TableCell className="text-xs font-code text-slate-200">₹{o.grandTotal.toLocaleString()}</TableCell>
                <TableCell><Badge className={`${STATUS_COLORS[o.paymentStatus] || ''} text-[9px] uppercase`}>{o.paymentStatus}</Badge></TableCell>
                <TableCell><Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] uppercase">{o.deliveryStatus}</Badge></TableCell>
                <TableCell><Badge className={`${STATUS_COLORS[o.orderStatus] || ''} text-[9px] uppercase`}>{o.orderStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" onClick={() => setViewingOrder(o)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" onClick={() => setEditingOrder(o)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400" onClick={() => handleGenerateInvoice(o)}><Receipt className="w-3.5 h-3.5" /></Button>
                    {o.deliveryRequired && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-cyan-400" onClick={() => onGoToLogistics?.()}><Truck className="w-3.5 h-3.5" /></Button>}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => setDeletingId(o.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="h-24 text-center text-slate-600 text-xs italic">No sales orders found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">Order {viewingOrder.id}</h3>
              <button onClick={() => setViewingOrder(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-2 text-xs">
              {[
                ['Customer', viewingOrder.customerName], ['Mobile', viewingOrder.mobile],
                ['Product', `${viewingOrder.brand} ${viewingOrder.model}`], ['Quantity', viewingOrder.quantity],
                ['Sale Date', viewingOrder.saleDate], ['Payment', viewingOrder.paymentStatus],
                ['Delivery', viewingOrder.deliveryStatus], ['Grand Total', `₹${viewingOrder.grandTotal.toLocaleString()}`],
                ['Balance Due', `₹${viewingOrder.balanceDue.toLocaleString()}`], ['Invoice', viewingOrder.invoiceId || 'Not generated']
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-500 uppercase font-bold">{label}</span>
                  <span className="text-slate-200 font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-rose-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-lg font-headline font-bold text-white mb-2">Delete Order?</h3>
            <p className="text-xs text-slate-400 mb-6">This will permanently remove order {deletingId} and its linked delivery record.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
