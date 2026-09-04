"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Pencil, ArrowDownCircle, ArrowUpCircle, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { StockItem, StockMovement } from '@/lib/types';

const EMPTY: Partial<StockItem> = {
  name: '', brand: '', category: 'TV', model: '', screenSize: '', serialNumber: '',
  purchasePrice: 0, sellingPrice: 0, quantity: 0, minStockLevel: 5, storeLocation: 'SHOWROOM'
};

function stockStatus(item: StockItem) {
  if (item.quantity === 0) return { label: 'Out of Stock', cls: 'bg-rose-600/10 text-rose-400 border-rose-600/20' };
  if (item.quantity <= item.minStockLevel) return { label: 'Low Stock', cls: 'bg-amber-600/10 text-amber-400 border-amber-600/20' };
  return { label: 'In Stock', cls: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' };
}

export function SalesStockModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState<Partial<StockItem>>(EMPTY);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);

  const stock: StockItem[] = store.stock || [];
  const brands = useMemo(() => Array.from(new Set(stock.map(s => s.brand).filter(Boolean))), [stock]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stock.filter(s => {
      const matchesSearch = !q || s.name?.toLowerCase().includes(q) || s.brand?.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q);
      const matchesBrand = brandFilter === 'All' || s.brand === brandFilter;
      const status = stockStatus(s).label;
      const matchesStatus = statusFilter === 'All' || status === statusFilter;
      return matchesSearch && matchesBrand && matchesStatus;
    });
  }, [stock, search, brandFilter, statusFilter]);

  const openAdd = () => { setEditingItem(null); setForm({ ...EMPTY, minStockLevel: store.settings?.defaultMinStockLevel ?? 5 }); setModalOpen(true); };
  const openEdit = (item: StockItem) => { setEditingItem(item); setForm(item); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.brand) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Product name and brand are required.' });
      return;
    }
    const item: StockItem = {
      ...(editingItem || {}),
      ...form,
      id: editingItem?.id || `STK-${Date.now().toString().slice(-6)}`,
      barcode: editingItem?.barcode || form.barcode || `BC-${Date.now().toString().slice(-8)}`,
      images: editingItem?.images || [],
      lastUpdated: new Date().toISOString(),
      history: editingItem?.history || [{
        id: `MOV-${Date.now()}`, date: new Date().toISOString(), type: 'PURCHASE',
        quantity: form.quantity || 0, notes: 'Initial Sales Stock Registration', performedBy: 'Sales Admin'
      }]
    } as StockItem;
    store.updateStockItem(item);
    toast({ title: editingItem ? 'Product Updated' : 'Product Added', description: `${item.name} saved to shared inventory.` });
    setModalOpen(false);
  };

  const handleAdjustSave = () => {
    if (!adjustItem || !adjustQty || Number(adjustQty) <= 0) return;
    const qty = Number(adjustQty);
    const newQty = adjustDirection === 'IN' ? adjustItem.quantity + qty : Math.max(0, adjustItem.quantity - qty);
    const movement: StockMovement = {
      id: `MOV-${Date.now()}`, date: new Date().toISOString(),
      type: adjustDirection === 'IN' ? 'INWARD' : 'OUTWARD',
      quantity: qty, notes: `Sales Stock ${adjustDirection === 'IN' ? 'In' : 'Out'}`, performedBy: 'Sales Admin'
    };
    store.updateStockItem({ ...adjustItem, quantity: newQty, lastUpdated: new Date().toISOString(), history: [movement, ...(adjustItem.history || [])] });
    toast({ title: 'Stock Updated', description: `${adjustItem.name} ${adjustDirection === 'IN' ? 'increased' : 'decreased'} by ${qty}.` });
    setAdjustItem(null); setAdjustQty('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Stock</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Products Available For Sale</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0066FF] hover:bg-blue-600 h-10 font-bold uppercase text-[10px] px-6">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product, brand, barcode..." className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-[#F8FAFC]" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-40 h-11 bg-slate-900/50 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="All">All Brands</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-11 bg-slate-900/50 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Product ID</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Brand</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Name</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Model</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Size</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Serial No.</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Purchase ₹</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Selling ₹</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Available</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Status</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Location</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(item => {
              const status = stockStatus(item);
              return (
                <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/20">
                  <TableCell className="font-code font-bold text-blue-400 text-xs">{item.id}</TableCell>
                  <TableCell className="text-xs text-slate-300">{item.brand}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-200">{item.name}</TableCell>
                  <TableCell className="text-xs text-slate-400">{item.model || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-400">{item.screenSize || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-400 font-code">{item.serialNumber || '—'}</TableCell>
                  <TableCell className="text-xs font-code text-slate-400">₹{item.purchasePrice.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-code text-slate-200">₹{item.sellingPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-200">{item.quantity}</TableCell>
                  <TableCell><Badge className={`${status.cls} text-[9px] uppercase`}>{status.label}</Badge></TableCell>
                  <TableCell className="text-xs text-slate-400">{item.storeLocation || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400" onClick={() => { setAdjustItem(item); setAdjustDirection('IN'); }}><ArrowDownCircle className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-400" onClick={() => { setAdjustItem(item); setAdjustDirection('OUT'); }}><ArrowUpCircle className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-cyan-400" onClick={() => setHistoryItem(item)}><History className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={12} className="h-24 text-center text-slate-600 text-xs italic">No products found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">{editingItem ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2"><Label className="text-[10px] uppercase font-bold text-slate-500">Product Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Brand</Label><Input value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Model Number</Label><Input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Screen Size</Label><Input value={form.screenSize || ''} onChange={e => setForm({ ...form, screenSize: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Serial Number</Label><Input value={form.serialNumber || ''} onChange={e => setForm({ ...form, serialNumber: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Purchase Price</Label><Input type="number" value={form.purchasePrice || 0} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Selling Price</Label><Input type="number" value={form.sellingPrice || 0} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Quantity</Label><Input type="number" value={form.quantity || 0} onChange={e => setForm({ ...form, quantity: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Min Stock Level</Label><Input type="number" value={form.minStockLevel || 0} onChange={e => setForm({ ...form, minStockLevel: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
              <div className="space-y-1 col-span-2"><Label className="text-[10px] uppercase font-bold text-slate-500">Store Location</Label><Input value={form.storeLocation || ''} onChange={e => setForm({ ...form, storeLocation: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" /></div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 px-8 font-bold">Save</Button>
            </div>
          </div>
        </div>
      )}

      {adjustItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-headline font-bold text-white mb-4">{adjustDirection === 'IN' ? 'Stock In' : 'Stock Out'} — {adjustItem.name}</h3>
            <Label className="text-[10px] uppercase font-bold text-slate-500">Quantity</Label>
            <Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="bg-slate-900 border-slate-800 h-11 mt-1 mb-6 text-[#F8FAFC]" />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => { setAdjustItem(null); setAdjustQty(''); }}>Cancel</Button>
              <Button className="flex-1 bg-[#0066FF] hover:bg-blue-600" onClick={handleAdjustSave}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">Stock History — {historyItem.name}</h3>
              <button onClick={() => setHistoryItem(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              {(historyItem.history || []).map((m: StockMovement) => (
                <div key={m.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">{m.type}</p>
                    <p className="text-slate-500">{format(new Date(m.date), 'dd MMM yyyy, hh:mm a')} — {m.notes}</p>
                  </div>
                  <span className="font-code text-slate-300">{m.quantity}</span>
                </div>
              ))}
              {(historyItem.history || []).length === 0 && <p className="text-xs text-slate-500 italic text-center py-6">No movement history.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
