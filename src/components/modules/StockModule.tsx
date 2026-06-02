"use client"

import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  Package,
  ArrowRightLeft,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { StockItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function StockModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<StockItem>>({
    name: '', category: 'Spare Parts', purchasePrice: 0, sellingPrice: 0, quantity: 0, minStockLevel: 5
  });
  const { toast } = useToast();

  const filteredStock = useMemo(() => {
    return (store.stock || []).filter((item: StockItem) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [store.stock, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = store.stock.length;
    const lowStock = store.stock.filter((i: StockItem) => i.quantity <= i.minStockLevel).length;
    const inventoryValue = store.stock.reduce((acc: number, curr: StockItem) => acc + (curr.purchasePrice * curr.quantity), 0);
    return { totalItems, lowStock, inventoryValue };
  }, [store.stock]);

  const handleSave = () => {
    if (!formData.name || formData.purchasePrice === undefined) return;
    const item = {
      ...formData,
      id: editingItem?.id || `STK${Date.now()}`,
      lastUpdated: new Date().toISOString()
    } as StockItem;
    store.updateStockItem(item);
    setModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'Spare Parts', purchasePrice: 0, sellingPrice: 0, quantity: 0, minStockLevel: 5 });
    toast({ title: "Inventory Updated", description: `${item.name} has been recorded.` });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Items', value: stats.totalItems, icon: Package, color: 'bg-blue-600' },
          { label: 'Low Stock Alerts', value: stats.lowStock, icon: AlertTriangle, color: stats.lowStock > 0 ? 'bg-rose-600' : 'bg-slate-600' },
          { label: 'Inventory Value', value: `₹${stats.inventoryValue.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-600' }
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <h3 className="text-lg md:text-xl font-headline font-bold">{s.value}</h3>
              </div>
              <div className={cn("p-2 rounded-xl text-white", s.color)}><s.icon className="w-4 h-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search parts, tools, accessories..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
        <Button onClick={() => { setEditingItem(null); setModalOpen(true); }} className="w-full sm:w-auto bg-[#0066FF] h-11 px-8 rounded-xl font-bold uppercase">
          <Plus className="w-5 h-5 mr-2" /> Add Stock Item
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase">Item Name</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Category</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Stock</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Purchase</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Selling</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Potential Profit</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.map((item: StockItem) => (
              <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <TableCell className="font-bold text-sm">{item.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{item.category}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-code font-bold", item.quantity <= item.minStockLevel ? "text-rose-500" : "text-emerald-400")}>
                      {item.quantity}
                    </span>
                    {item.quantity <= item.minStockLevel && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                  </div>
                </TableCell>
                <TableCell className="font-code text-slate-400">₹{item.purchasePrice}</TableCell>
                <TableCell className="font-code text-blue-400">₹{item.sellingPrice}</TableCell>
                <TableCell className="font-code text-emerald-400 font-bold">₹{(item.sellingPrice - item.purchasePrice) * item.quantity}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFormData(item); setModalOpen(true); }} className="h-8 w-8 text-blue-400"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => store.deleteStockItem(item.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStock.length === 0 && <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500">Inventory is empty.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? 'Update Item' : 'Add Stock Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Item Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Purchase Price (₹)</Label>
                <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                <Label>Selling Price (₹)</Label>
                <Input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>In-Stock Quantity</Label>
                <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                <Label>Min Level Alert</Label>
                <Input type="number" value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} className="bg-slate-950 border-slate-800" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0066FF] font-bold px-8">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
