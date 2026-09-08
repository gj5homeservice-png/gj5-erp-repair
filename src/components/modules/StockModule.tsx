"use client"

import React, { useState, useMemo, useRef } from 'react';
import { 
  Box, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  Package,
  History,
  QrCode,
  Barcode as BarcodeIcon,
  Download,
  Printer,
  X,
  Camera,
  ImageIcon,
  ChevronRight,
  Filter,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Tag,
  ArrowRightLeft,
  ChevronDown,
  User,
  Smartphone,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Save,
  CheckCircle2,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StockItem, StockMovement, StockMovementType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { Separator } from '@/components/ui/separator';
import { CompanyLogo } from '@/components/CompanyLogo';
import { addLogoToPdf } from '@/lib/branding';

const MOVEMENT_TYPES: { value: StockMovementType; label: string; color: string }[] = [
  { value: 'PURCHASE', label: 'Purchase Entry', color: 'text-emerald-400' },
  { value: 'SALE', label: 'Sales Entry', color: 'text-blue-400' },
  { value: 'RETURN', label: 'Customer Return', color: 'text-amber-400' },
  { value: 'DAMAGE', label: 'Damage/Loss', color: 'text-rose-500' },
  { value: 'SCRAP', label: 'Scrap/Waste', color: 'text-slate-500' },
  { value: 'INWARD', label: 'Inward Adjustment', color: 'text-emerald-500' },
  { value: 'OUTWARD', label: 'Outward Adjustment', color: 'text-rose-400' }
];

const INITIAL_FORM: Partial<StockItem> = {
  name: '', brand: '', category: 'Spare Parts', purchasePrice: 0, sellingPrice: 0, 
  quantity: 0, minStockLevel: 5, barcode: '', images: [], description: '',
  supplierName: '', supplierMobile: '', purchaseDate: format(new Date(), 'yyyy-MM-dd'),
  warrantyPeriod: 'No Warranty'
};

export function StockModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Stock Adjustment States
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjType, setAdjType] = useState<StockMovementType>('PURCHASE');
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<StockItem>>({ ...INITIAL_FORM, minStockLevel: store.settings?.defaultMinStockLevel ?? 5 });

  const stats = useMemo(() => {
    const totalItems = store.stock.length;
    const lowStock = store.stock.filter((i: StockItem) => i.quantity > 0 && i.quantity <= i.minStockLevel).length;
    const outOfStock = store.stock.filter((i: StockItem) => i.quantity === 0).length;
    const inventoryValue = store.stock.reduce((acc: number, curr: StockItem) => acc + (curr.purchasePrice * curr.quantity), 0);
    const potentialProfit = store.stock.reduce((acc: number, curr: StockItem) => acc + ((curr.sellingPrice - curr.purchasePrice) * curr.quantity), 0);
    return { totalItems, lowStock, outOfStock, inventoryValue, potentialProfit };
  }, [store.stock]);

  const filteredStock = useMemo(() => {
    return (store.stock || []).filter((item: StockItem) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [store.stock, searchQuery]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if ((formData.images?.length || 0) + files.length > 10) {
      toast({ variant: "destructive", title: "Limit Reached", description: "Maximum 10 photos allowed per asset." });
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    if (!formData.name || formData.purchasePrice === undefined) {
      toast({ variant: "destructive", title: "Incomplete Data", description: "Name and Purchase Price are mandatory." });
      return;
    }
    
    const item = {
      ...formData,
      id: editingItem?.id || `STK-${Date.now().toString().slice(-6)}`,
      brand: formData.brand || 'Generic',
      barcode: formData.barcode || `BC-${Date.now().toString().slice(-8)}`,
      lastUpdated: new Date().toISOString(),
      history: editingItem?.history || []
    } as StockItem;

    // Log Initial Entry for New Item
    if (!editingItem) {
      const movement: StockMovement = {
        id: `MOV-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'PURCHASE',
        quantity: item.quantity,
        notes: `Initial Inventory Registration. Supplier: ${item.supplierName || 'Direct'}`,
        performedBy: 'Admin'
      };
      item.history = [movement];
      item.addedBy = 'Admin';
    } else {
      item.editedBy = 'Admin';
    }

    store.updateStockItem(item);
    setModalOpen(false);
    setEditingItem(null);
    setFormData({ ...INITIAL_FORM, minStockLevel: store.settings?.defaultMinStockLevel ?? 5 });
    toast({ title: "Asset Registry Updated", description: `${item.name} has been securely recorded.` });
  };

  const handleStockAdjustment = () => {
    if (!viewingItem || !adjQty || isNaN(Number(adjQty))) return;
    
    const qty = Number(adjQty);
    let newTotal = viewingItem.quantity;
    
    // Logic for different movement types
    const positiveTypes: StockMovementType[] = ['PURCHASE', 'RETURN', 'INWARD'];
    if (positiveTypes.includes(adjType)) {
      newTotal += qty;
    } else {
      newTotal = Math.max(0, newTotal - qty);
    }

    const movement: StockMovement = {
      id: `MOV-${Date.now()}`,
      date: new Date().toISOString(),
      type: adjType,
      quantity: qty,
      notes: adjNotes || `Manual ${adjType} adjustment`,
      performedBy: 'Admin'
    };

    const updatedItem: StockItem = {
      ...viewingItem,
      quantity: newTotal,
      lastUpdated: new Date().toISOString(),
      history: [movement, ...(viewingItem.history || [])]
    };

    store.updateStockItem(updatedItem);
    setViewingItem(updatedItem);
    setIsAdjusting(false);
    setAdjQty('');
    setAdjNotes('');
    toast({ title: "Ledger Balanced", description: `${adjType} movement recorded successfully.` });
  };

  const exportToExcel = () => {
    const data = store.stock.map((i: StockItem) => ({
      ID: i.id,
      Name: i.name,
      Brand: i.brand,
      Category: i.category,
      Quantity: i.quantity,
      Purchase_Price: i.purchasePrice,
      Selling_Price: i.sellingPrice,
      Unit_Profit: i.sellingPrice - i.purchasePrice,
      Inventory_Value: i.purchasePrice * i.quantity,
      Supplier: i.supplierName,
      Last_Updated: format(parseISO(i.lastUpdated), 'dd MMM yyyy')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Inventory");
    XLSX.writeFile(wb, `GJ5_Enterprise_Inventory_${format(new Date(), 'dd_MMM_yyyy')}.xlsx`);
  };

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Enterprise Inventory Suite</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Global Asset Control & Yield Analytics</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToExcel} className="border-slate-800 h-10 font-bold uppercase text-[10px]">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Inventory
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormData({ ...INITIAL_FORM, minStockLevel: store.settings?.defaultMinStockLevel ?? 5 }); setModalOpen(true); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px] px-6">
            <Plus className="w-4 h-4 mr-2" /> Register New Asset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Asset Valuation', value: `₹${stats.inventoryValue.toLocaleString()}`, sub: 'Purchase Cost Basis', icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Profit Potential', value: `₹${stats.potentialProfit.toLocaleString()}`, sub: 'Expected ROI', icon: ArrowUpRight, color: 'text-emerald-400' },
          { label: 'Master Registry', value: stats.totalItems, sub: 'SKU Families', icon: Layers, color: 'text-purple-400' },
          { label: 'Low Stock', value: stats.lowStock, sub: 'Critical Levels', icon: AlertTriangle, color: stats.lowStock > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500' },
          { label: 'Out of Stock', value: stats.outOfStock, sub: 'Zero Inventory', icon: X, color: stats.outOfStock > 0 ? 'text-rose-500' : 'text-slate-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg">
            <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex justify-between items-start">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <div className={cn("p-1.5 rounded-lg bg-slate-950", s.color)}><s.icon className="w-3.5 h-3.5" /></div>
              </div>
              <h3 className={cn("text-lg md:text-xl font-headline font-bold", s.color)}>{s.value}</h3>
              <p className="text-[8px] md:text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search by Name, SKU, Barcode, Brand..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-slate-800 h-11 px-4 text-xs font-bold uppercase"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
           <Button variant="outline" className="border-slate-800 h-11 px-4 text-xs font-bold uppercase"><Camera className="w-4 h-4 mr-2" /> Scan</Button>
        </div>
      </div>

      <MobileCardList>
        {filteredStock.map((item: StockItem) => (
          <MobileCard key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} /> : <ImageIcon className="w-5 h-5 text-slate-800" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-100 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-blue-500 font-code font-bold uppercase">{item.brand}</span>
                    <Badge variant="outline" className="text-[8px] uppercase border-slate-800 h-4 px-1">{item.category}</Badge>
                  </div>
                </div>
              </div>
              <span className={cn("font-code font-bold text-lg shrink-0",
                item.quantity === 0 ? "text-rose-600" :
                item.quantity <= item.minStockLevel ? "text-amber-500" :
                "text-emerald-400")}>
                {item.quantity}
              </span>
            </div>
            <div className="space-y-1.5">
              <MobileCardRow label="ID" value={item.id} />
              <MobileCardRow label="Barcode" value={item.barcode} />
              <MobileCardRow label="Buy Price" value={`₹${item.purchasePrice?.toLocaleString() || 0}`} />
              <MobileCardRow label="Sell Price" value={<span className="text-blue-400 font-bold">₹{item.sellingPrice?.toLocaleString() || 0}</span>} />
              <MobileCardRow label="Updated" value={item.lastUpdated ? format(parseISO(item.lastUpdated), 'dd MMM yyyy') : 'N/A'} />
            </div>
            <MobileCardActions>
              <Button variant="ghost" size="icon" onClick={() => { setViewingItem(item); setIsDetailOpen(true); }} className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"><Eye className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFormData(item); setModalOpen(true); }} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(item.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
            </MobileCardActions>
          </MobileCard>
        ))}
        {filteredStock.length === 0 && (
          <div className="h-32 flex items-center justify-center text-center text-slate-500 font-medium italic text-sm rounded-2xl border border-slate-800 bg-slate-900/20">No assets found in master registry.</div>
        )}
      </MobileCardList>

      <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-4">Asset Identity</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Class / SKU</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Availability</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Financials</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-4">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.map((item: StockItem) => (
              <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative group">
                       {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} /> : <ImageIcon className="w-6 h-6 text-slate-800" />}
                       <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setViewingItem(item); setIsDetailOpen(true); }}>
                          <Eye className="w-4 h-4 text-white" />
                       </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] text-blue-500 font-code font-bold uppercase">{item.brand}</span>
                         <span className="text-[8px] text-slate-600 font-bold">• ID: {item.id}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] uppercase border-slate-800 w-fit h-4 px-1">{item.category}</Badge>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-code font-medium">
                         <BarcodeIcon className="w-3 h-3" /> {item.barcode}
                      </div>
                   </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <span className={cn("font-code font-bold text-lg", 
                         item.quantity === 0 ? "text-rose-600" : 
                         item.quantity <= item.minStockLevel ? "text-amber-500" : 
                         "text-emerald-400")}>
                         {item.quantity}
                       </span>
                       {item.quantity <= item.minStockLevel && item.quantity > 0 && <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                       {item.quantity === 0 && <X className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <p className="text-[8px] text-slate-600 uppercase font-black">Last Update: {item.lastUpdated ? format(parseISO(item.lastUpdated), 'dd MMM') : 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="font-code text-[11px] text-slate-500">Buy: ₹{item.purchasePrice?.toLocaleString() || 0}</span>
                      <span className="font-code text-xs text-blue-400 font-bold">Sell: ₹{item.sellingPrice?.toLocaleString() || 0}</span>
                      <span className="text-[9px] text-emerald-500 font-bold mt-0.5">Yield: +₹{((item.sellingPrice || 0) - (item.purchasePrice || 0)).toLocaleString()}</span>
                   </div>
                </TableCell>
                <TableCell className="text-right px-4">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="icon" onClick={() => { setViewingItem(item); setIsDetailOpen(true); }} className="h-9 w-9 text-emerald-400 hover:bg-emerald-500/10"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFormData(item); setModalOpen(true); }} className="h-9 w-9 text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(item.id)} className="h-9 w-9 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStock.length === 0 && <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500 font-medium italic">No assets found in master registry.</TableCell></TableRow>}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Detail & Enterprise History Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[90vh] flex flex-col">
           {viewingItem && (
             <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <DialogHeader className="px-8 pt-8 pb-4 border-b border-slate-800 flex flex-row justify-between items-center bg-slate-900/50 space-y-0 shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                         <QrCode className="w-7 h-7" />
                      </div>
                      <div>
                         <DialogTitle className="text-2xl font-headline font-bold">{viewingItem.name}</DialogTitle>
                         <div className="flex items-center gap-3">
                            <Badge className="text-[10px] uppercase bg-slate-800 text-blue-400 border-blue-400/20 px-2">{viewingItem.id}</Badge>
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{viewingItem.brand} • {viewingItem.category}</span>
                         </div>
                      </div>
                   </div>
                   <TabsList className="bg-slate-800/50 border border-slate-700 h-10 p-1">
                      <TabsTrigger value="overview" className="text-xs px-4">Asset Matrix</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs px-4">Item Ledger</TabsTrigger>
                      <TabsTrigger value="labels" className="text-xs px-4">Label Console</TabsTrigger>
                   </TabsList>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <TabsContent value="overview" className="space-y-10 mt-0 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                         <div className="lg:col-span-5 space-y-6">
                            <div className="space-y-4">
                               <h4 className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest"><ImageIcon className="w-3.5 h-3.5" /> High-Res Asset Gallery</h4>
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {viewingItem.images?.map((img, i) => (
                                    <div key={i} className="aspect-square rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 group">
                                       <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Asset ${i}`} />
                                    </div>
                                  ))}
                                  {(!viewingItem.images || viewingItem.images.length === 0) && (
                                    <div className="col-span-2 aspect-video rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-700 gap-2">
                                       <ImageIcon className="w-8 h-8" />
                                       <span className="text-xs font-bold uppercase">No Visuals Registered</span>
                                    </div>
                                  )}
                               </div>
                            </div>
                            
                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                               <h4 className="text-[11px] uppercase font-bold text-blue-400 flex items-center gap-2 tracking-widest"><User className="w-3.5 h-3.5" /> Supplier Archive</h4>
                               <div className="grid grid-cols-1 gap-3 text-sm">
                                  <div className="flex justify-between">
                                     <span className="text-slate-500">Primary Supplier</span>
                                     <span className="font-bold text-slate-200">{viewingItem.supplierName || '--'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                     <span className="text-slate-500">Contact Node</span>
                                     <span className="font-code font-bold text-blue-400">{viewingItem.supplierMobile || '--'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                     <span className="text-slate-500">Warranty Context</span>
                                     <span className="font-bold text-slate-200">{viewingItem.warrantyPeriod}</span>
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="lg:col-span-7 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                               <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase">Avg Purchase</span>
                                  <p className="text-xl font-code font-bold">₹{viewingItem.purchasePrice?.toLocaleString() || 0}</p>
                               </div>
                               <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase">Fixed Selling</span>
                                  <p className="text-xl font-code font-bold text-blue-400">₹{viewingItem.sellingPrice?.toLocaleString() || 0}</p>
                               </div>
                               <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-1">
                                  <span className="text-[9px] text-emerald-500 font-bold uppercase">Net Profit/U</span>
                                  <p className="text-xl font-code font-bold text-emerald-400">₹{((viewingItem.sellingPrice || 0) - (viewingItem.purchasePrice || 0)).toLocaleString()}</p>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <div className="flex justify-between items-center">
                                  <h4 className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest"><ArrowRightLeft className="w-3.5 h-3.5" /> Stock Adjustment Center</h4>
                                  <Button size="sm" onClick={() => setIsAdjusting(!isAdjusting)} variant={isAdjusting ? "destructive" : "outline"} className="h-8 text-[10px] uppercase font-bold">
                                     {isAdjusting ? "Cancel Operation" : "Post Adjustment"}
                                  </Button>
                               </div>
                               
                               {isAdjusting ? (
                                 <div className="p-6 bg-slate-950 rounded-3xl border border-blue-500/30 space-y-6 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       <div className="space-y-1">
                                          <Label className="text-[10px] uppercase font-bold text-slate-400">Movement Class</Label>
                                          <select 
                                            value={adjType} 
                                            onChange={e => setAdjType(e.target.value as StockMovementType)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl h-10 px-3 text-xs text-white"
                                          >
                                            {MOVEMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                          </select>
                                       </div>
                                       <div className="space-y-1">
                                          <Label className="text-[10px] uppercase font-bold text-slate-400">Delta Quantity</Label>
                                          <Input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} className="bg-slate-900 border-slate-800 h-10 font-code" placeholder="e.g. 5" />
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <Label className="text-[10px] uppercase font-bold text-slate-400">Ledger Remarks</Label>
                                       <Input value={adjNotes} onChange={e => setAdjNotes(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-xs" placeholder="e.g. Inward from Mumbai Hub" />
                                    </div>
                                    <Button onClick={handleStockAdjustment} disabled={!adjQty} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs shadow-lg shadow-emerald-500/20">Commit Ledger Balance</Button>
                                 </div>
                               ) : (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center gap-2">
                                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Assets In-Hand</p>
                                       <h3 className={cn("text-5xl font-headline font-black", (viewingItem.quantity || 0) <= (viewingItem.minStockLevel || 0) ? "text-amber-500" : "text-white")}>{viewingItem.quantity || 0}</h3>
                                       <Badge variant="outline" className="text-[9px] uppercase border-slate-700">{viewingItem.minStockLevel || 0} Min Target</Badge>
                                    </div>
                                    <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center gap-2">
                                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Total Stock Valuation</p>
                                       <h3 className="text-4xl font-headline font-black text-blue-500">₹{((viewingItem.quantity || 0) * (viewingItem.purchasePrice || 0)).toLocaleString()}</h3>
                                       <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Est. Profit: ₹{(((viewingItem.sellingPrice || 0) - (viewingItem.purchasePrice || 0)) * (viewingItem.quantity || 0)).toLocaleString()}</p>
                                    </div>
                                 </div>
                               )}

                               <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
                                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asset Description</h5>
                                  <p className="text-xs text-slate-500 italic leading-relaxed">{viewingItem.description || "No enterprise description registered for this SKU."}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="history" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> Item Ledger History</h4>
                         <Badge className="bg-slate-900 border-slate-800 text-[9px] uppercase text-slate-400">Audit Trail Active</Badge>
                      </div>
                      <MobileCardList>
                        {viewingItem.history?.map((mov: StockMovement) => (
                          <MobileCard key={mov.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] text-slate-300 font-bold">{mov.date ? format(parseISO(mov.date), 'dd MMM yyyy') : 'N/A'}</p>
                                <p className="text-[9px] text-slate-600 uppercase font-black">{mov.date ? format(parseISO(mov.date), 'hh:mm a') : 'N/A'}</p>
                              </div>
                              <Badge className={cn("text-[8px] uppercase px-1.5 h-4 border-0",
                                ['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                              )}>
                                {mov.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              <MobileCardRow label="Flow Delta" value={
                                <span className={cn("font-code font-bold", ['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? "text-emerald-400" : "text-rose-400")}>
                                  {['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? '+' : '-'}{mov.quantity}
                                </span>
                              } />
                              <MobileCardRow label="Reference" value={mov.referenceId} />
                              <MobileCardRow label="Remarks" value={mov.customerName || mov.notes} />
                              <MobileCardRow label="By" value={mov.performedBy || "System"} />
                            </div>
                          </MobileCard>
                        ))}
                        {(!viewingItem.history || viewingItem.history.length === 0) && (
                          <div className="h-32 flex items-center justify-center text-center text-slate-700 text-xs italic rounded-2xl border border-slate-800 bg-slate-950">No transaction movement recorded for this asset.</div>
                        )}
                      </MobileCardList>

                      <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
                         <div className="overflow-x-auto">
                         <Table>
                            <TableHeader className="bg-slate-900/60">
                               <TableRow className="border-slate-800">
                                  <TableHead className="text-[9px] uppercase font-bold px-6">Chronology</TableHead>
                                  <TableHead className="text-[9px] uppercase font-bold">Event Class</TableHead>
                                  <TableHead className="text-[9px] uppercase font-bold">Flow Delta</TableHead>
                                  <TableHead className="text-[9px] uppercase font-bold">Context / Remarks</TableHead>
                                  <TableHead className="text-[9px] uppercase font-bold text-right px-6">Identity</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                               {viewingItem.history?.map((mov: StockMovement) => (
                                 <TableRow key={mov.id} className="border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                                    <TableCell className="px-6">
                                       <div className="flex flex-col">
                                          <span className="text-[10px] text-slate-300 font-bold">{mov.date ? format(parseISO(mov.date), 'dd MMM yyyy') : 'N/A'}</span>
                                          <span className="text-[9px] text-slate-600 uppercase font-black">{mov.date ? format(parseISO(mov.date), 'hh:mm a') : 'N/A'}</span>
                                       </div>
                                    </TableCell>
                                    <TableCell>
                                       <Badge className={cn("text-[8px] uppercase px-1.5 h-4 border-0", 
                                         ['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                       )}>
                                          {mov.type.replace('_', ' ')}
                                       </Badge>
                                    </TableCell>
                                    <TableCell className="font-code font-bold text-xs">
                                       <span className={['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? "text-emerald-400" : "text-rose-400"}>
                                          {['PURCHASE', 'INWARD', 'RETURN'].includes(mov.type) ? '+' : '-'}{mov.quantity}
                                       </span>
                                    </TableCell>
                                    <TableCell>
                                       <div className="flex flex-col max-w-[200px]">
                                          <span className="text-[10px] font-bold text-blue-400 truncate">{mov.referenceId || '--'}</span>
                                          <span className="text-[9px] text-slate-500 italic truncate" title={mov.notes}>{mov.customerName || mov.notes}</span>
                                       </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                       <span className="text-[9px] font-black uppercase text-slate-600">{mov.performedBy || "System"}</span>
                                    </TableCell>
                                 </TableRow>
                               ))}
                               {(!viewingItem.history || viewingItem.history.length === 0) && (
                                 <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-700 text-xs italic">No transaction movement recorded for this asset.</TableCell></TableRow>
                               )}
                            </TableBody>
                         </Table>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="labels" className="mt-0 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-full overflow-x-auto">
                      <div id="print-label-area" className="bg-white p-6 rounded-xl text-black shadow-2xl flex flex-col items-center gap-6 w-[500px] mx-auto">
                         <div className="flex justify-between items-start w-full border-b-2 border-slate-900 pb-3 mb-2">
                            <div className="flex items-center gap-3">
                               {store.companyProfile?.logoUrl && (
                                 <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                                   <CompanyLogo src={store.companyProfile.logoUrl} className="w-full h-full" />
                                 </div>
                               )}
                               <div className="flex flex-col">
                                  <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{store.companyProfile?.companyName?.toUpperCase() || 'GJ5 HOME SERVICE'}</h2>
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1">Enterprise Asset Tag</span>
                               </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                               <h3 className="text-xl font-black text-red-600 leading-none tracking-tighter">88669 83900</h3>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-8 w-full">
                            <div className="bg-white border-2 border-slate-900 p-2 rounded-xl shrink-0">
                               <QRCodeSVG value={JSON.stringify({ id: viewingItem.id, sku: viewingItem.barcode })} size={120} level="H" />
                            </div>
                            <div className="flex flex-col items-center justify-center flex-1 space-y-3">
                               <div className="flex flex-col items-center">
                                  <Barcode value={viewingItem.barcode || 'N/A'} height={60} width={2.2} displayValue={false} background="transparent" margin={0} />
                                  <span className="text-sm font-black uppercase tracking-widest mt-1">{viewingItem.barcode || 'N/A'}</span>
                               </div>
                               <div className="w-full space-y-1 text-center">
                                  <p className="text-xs font-black uppercase truncate max-w-[220px]">{viewingItem.name}</p>
                                  <div className="flex items-center justify-center gap-2">
                                     <span className="text-[9px] font-black bg-black text-white px-3 py-0.5 rounded-full uppercase">SKU: {viewingItem.id}</span>
                                     <span className="text-[9px] font-black border border-black px-2 py-0.5 rounded-full uppercase">{viewingItem.brand}</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                         <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Printer className="w-4 h-4" /> Calibration Logic</h4>
                            <ul className="text-[10px] text-slate-400 space-y-3 list-disc pl-4 italic leading-relaxed">
                               <li>Primary Sticker Target: <span className="text-white font-bold">100mm x 50mm (4x2 Inch)</span>.</li>
                               <li>Left Node: <span className="text-blue-400">High-Density QR</span> containing full JSON asset metadata.</li>
                               <li>Right Node: <span className="text-emerald-400">Linear Barcode (Code128)</span> for laser scanner compatibility.</li>
                               <li>Security: <span className="text-rose-400 font-bold">Tamper-Proof Tracking</span> enabled for SKU identification.</li>
                            </ul>
                            <Button onClick={handlePrintLabel} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs shadow-lg shadow-emerald-500/20">Execute Print Sequence</Button>
                         </div>
                         
                         <div className="p-6 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-700"><Camera className="w-6 h-6" /></div>
                            <div className="space-y-1">
                               <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Camera Link Active</h5>
                               <p className="text-[10px] text-slate-600 leading-tight">Use mobile console to scan existing asset tags for instant reconciliation.</p>
                            </div>
                            <Button disabled variant="ghost" className="text-[9px] uppercase font-black tracking-widest text-slate-500">Awaiting External Connection</Button>
                         </div>
                      </div>
                   </TabsContent>
                </div>

                <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 shrink-0">
                   <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="px-8 font-bold uppercase text-xs">Terminate Session</Button>
                </DialogFooter>
             </Tabs>
           )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Enterprise Modal */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100 max-w-5xl p-0 overflow-hidden shadow-2xl flex flex-col h-[90vh]">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                   <Package className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl md:text-2xl font-headline font-bold">
                      {editingItem ? 'Master SKU Adjustment' : 'Asset Lifecycle Registration'}
                   </DialogTitle>
                   <DialogDescription className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Enterprise Inventory Archive Node</DialogDescription>
                </div>
             </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-8 space-y-10">
                  <div className="space-y-6">
                     <h4 className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest"><Layers className="w-4 h-4" /> Core Classification</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Official Asset Name</Label>
                          <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Backlight Strips 32\" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Brand Hierarchy</Label>
                              <Input value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Sony" />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Category Node</Label>
                              <Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest"><TrendingUp className="w-4 h-4" /> Yield & Logistics Matrix</h4>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">In-Hand Units</Label>
                           <Input type="number" value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code font-bold text-blue-400" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Purchase Cost (₹)</Label>
                           <Input type="number" value={formData.purchasePrice || 0} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Market Rate (₹)</Label>
                           <Input type="number" value={formData.sellingPrice || 0} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code text-emerald-400 font-bold" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Min Alert Level</Label>
                           <Input type="number" value={formData.minStockLevel || 0} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest"><User className="w-4 h-4" /> Sourcing Registry</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Supplier Authority</Label>
                           <Input value={formData.supplierName || ''} onChange={e => setFormData({...formData, supplierName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="Authorized Vendor" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Supplier Mobile</Label>
                           <Input value={formData.supplierMobile || ''} onChange={e => setFormData({...formData, supplierMobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-bold text-slate-400">Warranty Context</Label>
                           <Input value={formData.warrantyPeriod || ''} onChange={e => setFormData({...formData, warrantyPeriod: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. 6 Months" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-400">Internal SKU Context</Label>
                     <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-slate-950 border-slate-800 min-h-[100px] text-xs resize-none" placeholder="Detailed technical specifications..." />
                  </div>
               </div>

               <div className="lg:col-span-4 space-y-8">
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Asset Visuals</Label>
                        <span className="text-[8px] font-black text-blue-500 uppercase">{formData.images?.length || 0} / 10 Assets</span>
                     </div>
                     <div className="p-8 bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 group hover:border-blue-500/50 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all"><Camera className="w-5 h-5" /></div>
                        <span className="text-[10px] text-slate-600 uppercase font-black">Upload ID Photos</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                     </div>
                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {formData.images?.map((img, i) => (
                           <div key={i} className="relative group aspect-square rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
                              <img src={img} className="w-full h-full object-cover" alt={`Preview ${i}`} />
                              <button onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: formData.images?.filter((_, idx) => idx !== i)}) }} className="absolute inset-0 bg-rose-600/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash className="w-4 h-4" /></button>
                           </div>
                        ))}
                     </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-6">
                    <div className="space-y-1">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Barcode Hierarchy</Label>
                       <div className="flex gap-2">
                          <Input value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code text-xs" placeholder="Laser/Scan ID" />
                          <Button variant="outline" className="h-11 w-12 border-slate-800" onClick={() => setFormData({...formData, barcode: `BC-${Date.now().toString().slice(-8)}`})}><BarcodeIcon className="w-4 h-4" /></Button>
                       </div>
                    </div>
                    
                    <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-600/20 space-y-3">
                       <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Lifecycle Sync</h5>
                       <p className="text-[10px] text-slate-500 leading-tight italic">Inventory levels are integrated with the Repair Module. Billing this SKU will trigger automatic stock depletion and P&L ledger updates.</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 shrink-0 gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="px-8 font-bold uppercase text-xs tracking-widest">Discard Entry</Button>
            <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 font-bold px-12 h-12 rounded-xl shadow-lg shadow-blue-500/20 uppercase text-xs tracking-widest"><Save className="w-4 h-4 mr-2" /> Commit to Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security: Password Protected Delete */}
      <DeleteJobModal 
        isOpen={!!deleteItemId} 
        onClose={() => setDeleteItemId(null)} 
        jobId={store.stock.find((s: any) => s.id === deleteItemId)?.name || ''} 
        onConfirm={() => { if (deleteItemId) store.deleteStockItem(deleteItemId); setDeleteItemId(null); }} 
      />

      <style jsx global>{`
        @media print {
          @page {
            size: 100mm 50mm;
            margin: 0;
          }
          body * {
            visibility: hidden;
            background: white !important;
          }
          #print-label-area, #print-label-area * {
            visibility: visible;
          }
          #print-label-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100mm !important;
            height: 50mm !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
