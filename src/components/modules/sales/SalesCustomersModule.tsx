"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/lib/types';

export function SalesCustomersModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({ name: '', mobile: '', email: '', address: '' });

  const merged = useMemo(() => {
    const map = new Map<string, any>();
    (store.salesCustomers || []).forEach((c: Customer) => {
      map.set(c.id, { id: c.id, name: c.name, mobile: c.mobile, email: c.email, address: c.address, manuallyAdded: true });
    });
    (store.salesOrders || []).forEach((o: any) => {
      const existing = map.get(o.customerId) || {};
      const ordersForCustomer = (store.salesOrders || []).filter((x: any) => x.customerId === o.customerId);
      map.set(o.customerId, {
        id: o.customerId,
        name: existing.name || o.customerName,
        mobile: existing.mobile || o.mobile,
        email: existing.email || o.email,
        address: existing.address || o.address,
        totalOrders: ordersForCustomer.length,
        totalPurchase: ordersForCustomer.reduce((a: number, x: any) => a + (x.grandTotal || 0), 0),
        lastPurchase: ordersForCustomer.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0]?.saleDate
      });
    });
    return Array.from(map.values());
  }, [store.salesCustomers, store.salesOrders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return merged.filter(c => !q || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q) || c.id?.toLowerCase().includes(q));
  }, [merged, search]);

  const openAdd = () => { setEditingCustomer(null); setForm({ name: '', mobile: '', email: '', address: '' }); setModalOpen(true); };
  const openEdit = (c: any) => {
    const existing = (store.salesCustomers || []).find((sc: Customer) => sc.id === c.id);
    setEditingCustomer(existing || { id: c.id, name: c.name, mobile: c.mobile, email: c.email, address: c.address, createdAt: new Date().toISOString() });
    setForm(existing || c);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.mobile) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Name and mobile are required.' });
      return;
    }
    if (editingCustomer) {
      store.updateSalesCustomer({ ...editingCustomer, ...form } as Customer);
      toast({ title: 'Customer Updated' });
    } else {
      const id = store.findOrCreateSalesCustomerId(form.mobile || '');
      store.addSalesCustomer({ id, name: form.name, mobile: form.mobile, email: form.email, address: form.address, createdAt: new Date().toISOString() } as Customer);
      toast({ title: 'Customer Added' });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    store.deleteSalesCustomer(id);
    toast({ title: 'Customer Removed' });
  };

  const purchaseHistory = (customerId: string) => (store.salesOrders || []).filter((o: any) => o.customerId === customerId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Customers</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Retail Customer Directory</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0066FF] hover:bg-blue-600 h-10 font-bold uppercase text-[10px] px-6">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer name, mobile, ID..." className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-[#F8FAFC]" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Customer ID</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Name</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Mobile</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Email</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Address</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Orders</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Total Purchase</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Last Purchase</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="font-code font-bold text-blue-400 text-xs">{c.id}</TableCell>
                <TableCell className="text-xs font-bold text-slate-200">{c.name}</TableCell>
                <TableCell className="text-xs text-slate-400 font-code">{c.mobile}</TableCell>
                <TableCell className="text-xs text-slate-400">{c.email || '—'}</TableCell>
                <TableCell className="text-xs text-slate-400">{c.address || '—'}</TableCell>
                <TableCell className="text-xs text-slate-300">{c.totalOrders || 0}</TableCell>
                <TableCell className="text-xs font-code text-slate-200">₹{(c.totalPurchase || 0).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-slate-400">{c.lastPurchase || '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" onClick={() => setViewingCustomer(c)}><History className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    {c.manuallyAdded && <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-slate-600 text-xs italic">No customers found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Mobile</Label><Input value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Address</Label><Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 px-8 font-bold">Save</Button>
            </div>
          </div>
        </div>
      )}

      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">Purchase History — {viewingCustomer.name}</h3>
              <button onClick={() => setViewingCustomer(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              {purchaseHistory(viewingCustomer.id).map((o: any) => (
                <div key={o.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">{o.id} — {o.brand} {o.model}</p>
                    <p className="text-slate-500">{o.saleDate}</p>
                  </div>
                  <span className="font-code text-slate-300">₹{o.grandTotal.toLocaleString()}</span>
                </div>
              ))}
              {purchaseHistory(viewingCustomer.id).length === 0 && <p className="text-xs text-slate-500 italic text-center py-6">No purchases yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
