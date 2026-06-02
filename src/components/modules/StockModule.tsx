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
  ChevronDown
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { StockItem, StockMovement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';

export function StockModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<StockItem>>({
    name: '', brand: '', category: 'Spare Parts', purchasePrice: 0, sellingPrice: 0, quantity: 0, minStockLevel: 5, barcode: '', images: []
  });

  const filteredStock = useMemo(() => {
    return (store.stock || []).filter((item: StockItem) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [store.stock, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = store.stock.length;
    const lowStock = store.stock.filter((i: StockItem) => i.quantity <= i.minStockLevel).length;
    const inventoryValue = store.stock.reduce((acc: number, curr: StockItem) => acc + (curr.purchasePrice * curr.quantity), 0);
    const potentialProfit = store.stock.reduce((acc: number, curr: StockItem) => acc + ((curr.sellingPrice - curr.purchasePrice) * curr.quantity), 0);
    return { totalItems, lowStock, inventoryValue, potentialProfit };
  }, [store.stock]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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
    if (!formData.name || formData.purchasePrice === undefined) return;
    
    const item = {
      ...formData,
      id: editingItem?.id || `STK-${Date.now().toString().slice(-6)}`,
      brand: formData.brand || 'Generic',
      barcode: formData.barcode || `BC-${Date.now().toString().slice(-8)}`,
      lastUpdated: new Date().toISOString(),
      history: editingItem?.history || []
    } as StockItem;

    // Log Inward Movement for New Item
    if (!editingItem) {
      const movement: StockMovement = {
        id: `MOV-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'INWARD',
        quantity: item.quantity,
        notes: 'Initial Stock Entry'
      };
      item.history = [movement];
    }

    store.updateStockItem(item);
    setModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', brand: '', category: 'Spare Parts', purchasePrice: 0, sellingPrice: 0, quantity: 0, minStockLevel: 5, barcode: '', images: [] });
    toast({ title: "Inventory Updated", description: `${item.name} has been recorded.` });
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
      Stock_Value: i.purchasePrice * i.quantity,
      Last_Updated: format(parseISO(i.lastUpdated), 'dd MMM yyyy')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `GJ5_Inventory_${format(new Date(), 'dd_MMM')}.xlsx`);
  };

  const downloadLabel = (item: StockItem) => {
    // Basic sticker layout logic
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
            <h2 className="text-xl md:text-2xl font-headline font-bold">Smart Inventory Suite</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Asset Control & Asset Logistics</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToExcel} className="border-slate-800 h-10 font-bold uppercase text-[10px]">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Inventory
          </Button>
          <Button onClick={() => { setEditingItem(null); setModalOpen(true); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px]">
            <Plus className="w-4 h-4 mr-2" /> Register Asset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Asset Valuation', value: `₹${stats.inventoryValue.toLocaleString()}`, sub: 'At Purchase Cost', icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Profit Potential', value: `₹${stats.potentialProfit.toLocaleString()}`, sub: 'Estimated Margin', icon: ArrowRightLeft, color: 'text-emerald-400' },
          { label: 'Total Registry', value: stats.totalItems, sub: 'SKU Count', icon: Tag, color: 'text-purple-400' },
          { label: 'Critical Alerts', value: stats.lowStock, sub: 'Below Min Level', icon: AlertTriangle, color: stats.lowStock > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <h3 className={cn("text-2xl font-headline font-bold", s.color)}>{s.value}</h3>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{s.sub}</p>
              </div>
              <div className={cn("p-3 bg-slate-950 rounded-xl", s.color)}><s.icon className="w-5 h-5" /></div>
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
           <Button variant="outline" className="border-slate-800 h-11 w-11 p-0"><Filter className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-4">Item Identity</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">SKU / Class</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Available</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Pricing (Buy/Sell)</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.map((item: StockItem) => (
              <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                       {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-800" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{item.name}</span>
                      <span className="text-[10px] text-blue-500 font-code font-bold uppercase">{item.brand}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] uppercase border-slate-800 w-fit">{item.category}</Badge>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-code">
                         <BarcodeIcon className="w-3 h-3" /> {item.barcode}
                      </div>
                   </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-code font-bold text-base", item.quantity <= item.minStockLevel ? "text-rose-500" : "text-emerald-400")}>
                      {item.quantity}
                    </span>
                    {item.quantity <= item.minStockLevel && <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />}
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="font-code text-[11px] text-slate-400 italic">B: ₹{item.purchasePrice}</span>
                      <span className="font-code text-xs text-blue-400 font-bold">S: ₹{item.sellingPrice}</span>
                   </div>
                </TableCell>
                <TableCell className="text-right px-4">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setViewingItem(item); setIsDetailOpen(true); }} className="h-8 w-8 text-emerald-400"><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFormData(item); setModalOpen(true); }} className="h-8 w-8 text-blue-400"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(item.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStock.length === 0 && <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500">No assets found in registry.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {/* Detail & History Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
           {viewingItem && (
             <Tabs defaultValue="overview" className="w-full">
                <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
                         <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-headline font-bold">{viewingItem.name}</h3>
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{viewingItem.brand} • {viewingItem.category}</p>
                      </div>
                   </div>
                   <TabsList className="bg-slate-800 h-9">
                      <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs">Movement Ledger</TabsTrigger>
                      <TabsTrigger value="labels" className="text-xs">Label Center</TabsTrigger>
                   </TabsList>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <TabsContent value="overview" className="space-y-8 mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Product Gallery</h4>
                            <div className="grid grid-cols-2 gap-2">
                               {viewingItem.images.map((img, i) => (
                                 <img key={i} src={img} className="aspect-square rounded-xl border border-slate-800 object-cover cursor-zoom-in" />
                               ))}
                               {viewingItem.images.length === 0 && <div className="aspect-square rounded-xl bg-slate-950 border border-slate-800 border-dashed flex items-center justify-center text-slate-700 text-xs italic">No Images</div>}
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                               <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                                  <span className="text-xs text-slate-500 uppercase font-bold">Purchase Rate</span>
                                  <span className="font-code font-bold text-white">₹{viewingItem.purchasePrice}</span>
                               </div>
                               <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                                  <span className="text-xs text-slate-500 uppercase font-bold">Selling Rate</span>
                                  <span className="font-code font-bold text-blue-400">₹{viewingItem.sellingPrice}</span>
                               </div>
                               <div className="flex justify-between items-center text-emerald-400 font-bold pt-2">
                                  <span className="text-xs uppercase">Net Profit/Unit</span>
                                  <span className="font-code text-lg">₹{viewingItem.sellingPrice - viewingItem.purchasePrice}</span>
                               </div>
                            </div>
                            <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2">
                               <h5 className="text-[9px] font-black uppercase text-blue-400">Inventory Insight</h5>
                               <p className="text-xs text-slate-400 italic">This asset contributes <span className="text-white font-bold">₹{((viewingItem.sellingPrice - viewingItem.purchasePrice) * viewingItem.quantity).toLocaleString()}</span> to the total potential profit margin of your current stock levels.</p>
                            </div>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="history" className="mt-0">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                         <Table>
                            <TableHeader className="bg-slate-900/60">
                               <TableRow className="border-slate-800">
                                  <TableHead className="text-[9px] uppercase">Date</TableHead>
                                  <TableHead className="text-[9px] uppercase">Event</TableHead>
                                  <TableHead className="text-[9px] uppercase">Qty</TableHead>
                                  <TableHead className="text-[9px] uppercase">Ref / Context</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                               {viewingItem.history?.map((mov: StockMovement) => (
                                 <TableRow key={mov.id} className="border-slate-800/50">
                                    <TableCell className="text-[10px] text-slate-400 whitespace-nowrap">{format(parseISO(mov.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>
                                       <Badge className={cn("text-[8px] uppercase", mov.type === 'INWARD' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                                          {mov.type}
                                       </Badge>
                                    </TableCell>
                                    <TableCell className="font-code font-bold text-xs">{mov.type === 'INWARD' ? '+' : '-'}{mov.quantity}</TableCell>
                                    <TableCell>
                                       <div className="flex flex-col">
                                          <span className="text-[10px] font-bold">{mov.referenceId || '--'}</span>
                                          <span className="text-[9px] text-slate-600 uppercase truncate max-w-[120px]">{mov.customerName || mov.notes}</span>
                                       </div>
                                    </TableCell>
                                 </TableRow>
                               ))}
                               {(!viewingItem.history || viewingItem.history.length === 0) && (
                                 <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-600 text-xs italic">No movement recorded.</TableCell></TableRow>
                               )}
                            </TableBody>
                         </Table>
                      </div>
                   </TabsContent>

                   <TabsContent value="labels" className="mt-0 flex flex-col items-center gap-10">
                      <div id="print-label-area" className="bg-white p-6 rounded-xl text-black shadow-2xl flex flex-col items-center gap-6 w-[400px]">
                         <div className="text-center space-y-1">
                            <h2 className="text-lg font-black uppercase italic tracking-tighter">GJ5 HOME SERVICE</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">88669 83900</p>
                         </div>
                         <div className="flex items-center gap-6 w-full">
                            <div className="bg-white border-2 border-slate-900 p-1.5 rounded-lg shrink-0">
                               <QRCodeSVG value={viewingItem.id} size={100} />
                            </div>
                            <div className="flex flex-col items-center justify-center flex-1">
                               <Barcode value={viewingItem.barcode} height={50} width={1.8} displayValue={false} background="transparent" margin={0} />
                               <span className="text-xs font-black uppercase mt-2">{viewingItem.barcode}</span>
                               <p className="text-[9px] font-bold uppercase mt-1 line-clamp-1">{viewingItem.name}</p>
                               <span className="text-[8px] font-black bg-black text-white px-2 py-0.5 rounded-full mt-1">ID: {viewingItem.id}</span>
                            </div>
                         </div>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 w-full max-w-lg space-y-4">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Thermal Label Center</h4>
                         <ul className="text-[10px] text-slate-400 space-y-2 list-disc pl-4 italic leading-relaxed">
                            <li>Target Sticker Size: <span className="text-white font-bold">50mm x 25mm (2x1 Inch)</span>.</li>
                            <li>QR Code contains the unique <span className="text-blue-400">Master Item ID</span> for instant scanning lookup.</li>
                            <li>Barcode provides <span className="text-emerald-400">SKU Reference</span> for laser scanner integration.</li>
                         </ul>
                         <Button onClick={() => downloadLabel(viewingItem)} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-[10px]">Execute Print Sequence</Button>
                      </div>
                   </TabsContent>
                </div>

                <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
                   <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Close Asset View</Button>
                </DialogFooter>
             </Tabs>
           )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100 max-w-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
             <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" /> {editingItem ? 'Modify Asset Data' : 'Asset Registration'}
             </DialogTitle>
             <DialogDescription className="text-slate-500 text-[10px] uppercase font-black">Professional Inventory Ledger Entry</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Asset Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Backlight Strips 32\" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Brand</Label>
                        <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Sony" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Category</Label>
                        <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Purchase Price (₹)</Label>
                      <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Selling Price (₹)</Label>
                      <Input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code text-blue-400 font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Stock Quantity</Label>
                      <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Min Alert Level</Label>
                      <Input type="number" value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11" />
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-400 flex justify-between">Asset Visuals <span className="text-blue-500">Max 4 Photos</span></Label>
                     <div className="p-4 bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 group hover:border-blue-500/50 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="w-8 h-8 text-slate-800 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] text-slate-600 uppercase font-black">Upload Product Identity</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                     </div>
                     <div className="grid grid-cols-4 gap-2 mt-4">
                        {formData.images?.map((img, i) => (
                           <div key={i} className="relative group">
                              <img src={img} className="aspect-square rounded-lg object-cover border border-slate-800" />
                              <button onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: formData.images?.filter((_, idx) => idx !== i)}) }} className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Barcode Identifier</Label>
                    <div className="flex gap-2">
                       <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" placeholder="Scan or Auto-Gen" />
                       <Button variant="outline" className="h-11 border-slate-800" onClick={() => setFormData({...formData, barcode: `BC-${Date.now().toString().slice(-8)}`})}><BarcodeIcon className="w-4 h-4" /></Button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Abort</Button>
            <Button onClick={handleSave} className="bg-[#0066FF] font-bold px-12 h-12 rounded-xl shadow-lg shadow-blue-500/20">Commit to Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteJobModal 
        isOpen={!!deleteItemId} 
        onClose={() => setDeleteItemId(null)} 
        jobId={store.stock.find((s: any) => s.id === deleteItemId)?.name || ''} 
        onConfirm={() => { if (deleteItemId) store.deleteStockItem(deleteItemId); setDeleteItemId(null); }} 
      />

      <style jsx global>{`
        @media print {
          @page {
            size: 50mm 25mm;
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
            width: 50mm !important;
            height: 25mm !important;
            padding: 1mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
