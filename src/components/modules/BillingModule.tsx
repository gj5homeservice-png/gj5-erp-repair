"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Calculator, 
  Receipt,
  Monitor,
  Layout,
  Search,
  FileDown,
  Truck,
  Plus,
  Trash2,
  Check,
  Package,
  History,
  Tag,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { StockItem, InvoiceItem, Invoice } from '@/lib/types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const INVOICE_THEMES = [
  { id: 'classic-blue', name: 'Classic Blue', primary: '#0066FF', secondary: '#E6F0FF', text: 'text-[#0066FF]', bg: 'bg-[#0066FF]' },
  { id: 'modern-yellow', name: 'Modern Yellow', primary: '#F59E0B', secondary: '#FEF3C7', text: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]' },
  { id: 'corporate-red', name: 'Corporate Red', primary: '#EF4444', secondary: '#FEE2E2', text: 'text-[#EF4444]', bg: 'bg-[#EF4444]' },
  { id: 'premium-indigo', name: 'Premium Indigo', primary: '#4F46E5', secondary: '#E0E7FF', text: 'text-[#4F46E5]', bg: 'bg-[#4F46E5]' },
];

const INITIAL_BILL_DATA = {
  jobId: '',
  customerId: '',
  customerName: '',
  mobile: '',
  address: '',
  brand: '',
  model: '',
  labourCharges: 0,
  deliveryCharge: 0,
  additionalCharges: 0,
  discount: 0,
  taxEnabled: true,
  paymentStatus: 'Paid' as const,
  items: [] as InvoiceItem[]
};

export function BillingModule({ store }: { store: any }) {
  const [activeThemeId, setActiveThemeId] = useState('classic-blue');
  const [billData, setBillData] = useState(INITIAL_BILL_DATA);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const { toast } = useToast();

  const activeTheme = useMemo(() => 
    INVOICE_THEMES.find(t => t.id === activeThemeId) || INVOICE_THEMES[0]
  , [activeThemeId]);

  useEffect(() => {
    // Check for edit mode from window (quick way to handle navigation between tabs)
    const win = window as any;
    if (win.__EDIT_INVOICE) {
      const inv = win.__EDIT_INVOICE as Invoice;
      setBillData({
        jobId: inv.jobId,
        customerId: inv.customerId,
        customerName: inv.customerName,
        mobile: inv.mobile,
        address: inv.address,
        brand: inv.brand,
        model: inv.model,
        labourCharges: inv.labourCharges,
        deliveryCharge: inv.deliveryCharge,
        additionalCharges: inv.additionalCharges,
        discount: inv.discount,
        taxEnabled: inv.taxEnabled,
        paymentStatus: inv.paymentStatus,
        items: inv.items
      });
      setEditingInvoiceId(inv.id);
      delete win.__EDIT_INVOICE;
    }
  }, []);

  useEffect(() => {
    if (billData.jobId && !editingInvoiceId) {
      const job = store.calls.find((c: any) => c.id.toUpperCase() === billData.jobId.toUpperCase());
      if (job) {
        setBillData(prev => ({
          ...prev,
          customerId: job.customerId,
          customerName: job.customerName,
          mobile: job.mobile,
          address: job.address,
          brand: job.brand,
          model: job.model
        }));
      }
    }
  }, [billData.jobId, store.calls, editingInvoiceId]);

  const subtotal = useMemo(() => {
    const itemsTotal = billData.items.reduce((acc, curr) => acc + curr.total, 0);
    return itemsTotal + billData.labourCharges + billData.deliveryCharge + billData.additionalCharges - billData.discount;
  }, [billData]);

  const gst = billData.taxEnabled ? subtotal * 0.18 : 0;
  const total = subtotal + gst;

  const addItemFromStock = (stockId: string) => {
    const item = store.stock.find((s: StockItem) => s.id === stockId);
    if (!item || item.quantity <= 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: "This part is not available." });
      return;
    }
    const newItem: InvoiceItem = {
      id: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.sellingPrice,
      purchasePrice: item.purchasePrice,
      total: item.sellingPrice
    };
    setBillData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (idx: number) => {
    setBillData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSaveInvoice = () => {
    const profit = billData.items.reduce((acc, curr) => acc + (curr.unitPrice - curr.purchasePrice), 0) + billData.labourCharges;
    
    if (editingInvoiceId) {
      const updatedInvoice: Invoice = {
        id: editingInvoiceId,
        invoiceNumber: store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber || `GJ5-INV-${1000 + store.invoices.length}`,
        ...billData,
        subtotal,
        gst,
        total,
        profit,
        timestamp: new Date().toISOString()
      };
      store.updateInvoice(updatedInvoice);
      toast({ title: "Invoice Updated", description: `Record ${updatedInvoice.invoiceNumber} has been updated.` });
      setEditingInvoiceId(null);
      setBillData(INITIAL_BILL_DATA);
    } else {
      const invoice: Invoice = {
        id: `INV${Date.now()}`,
        invoiceNumber: `GJ5-INV-${1000 + store.invoices.length}`,
        ...billData,
        subtotal,
        gst,
        total,
        profit,
        timestamp: new Date().toISOString()
      };
      store.addInvoice(invoice);
      toast({ title: "Invoice Committed", description: `Record ${invoice.invoiceNumber} saved and stock updated.` });
      setBillData(INITIAL_BILL_DATA);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const themeColor = activeTheme.primary;
      const themeRGB = hexToRgb(themeColor);

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.text('GJ5 HOME SERVICE', 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text('Professional Service & Repair Hub', 15, 31);
      doc.text('Customer Care: 8866983900', 15, 36);

      doc.setFontSize(24);
      doc.setTextColor(0);
      doc.text('INVOICE', 195, 25, { align: 'right' });
      
      doc.setFontSize(10);
      doc.text(`#INV-${billData.jobId || 'XXXX'}`, 195, 32, { align: 'right' });

      let currentY = 55;
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT DETAILS', 15, currentY);
      doc.text('DEVICE DETAILS', 110, currentY);

      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${billData.customerName || 'N/A'}`, 15, currentY);
      doc.text(`Job ID: ${billData.jobId || 'N/A'}`, 110, currentY);
      doc.text(`Device: ${billData.brand} ${billData.model}`, 110, currentY + 6);

      currentY += 30;
      doc.setFillColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.rect(15, currentY, 180, 10, 'F');
      doc.setTextColor(255);
      doc.text('DESCRIPTION', 20, currentY + 7);
      doc.text('AMT (INR)', 190, currentY + 7, { align: 'right' });

      currentY += 10;
      doc.setTextColor(0);
      billData.items.forEach(item => {
        doc.text(item.name, 20, currentY + 7);
        doc.text(item.total.toFixed(2), 190, currentY + 7, { align: 'right' });
        currentY += 10;
      });

      doc.text('Labour / Service Charges', 20, currentY + 7);
      doc.text(billData.labourCharges.toFixed(2), 190, currentY + 7, { align: 'right' });
      
      currentY += 20;
      doc.text('Total:', 140, currentY);
      doc.text(total.toFixed(2), 190, currentY, { align: 'right' });

      doc.save(`INV_${billData.jobId || 'GJ5'}.pdf`);
    } catch (e) { console.error(e); }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 102, b: 255 };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl text-white", activeTheme.bg)}>
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-headline font-bold">{editingInvoiceId ? "Edit Invoice" : "Billing Architecture"}</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Enterprise Finance Management</p>
              </div>
            </div>
            {editingInvoiceId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingInvoiceId(null); setBillData(INITIAL_BILL_DATA); }} className="text-slate-500 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Search className="w-3 h-3" /> Job ID Lookup
                </Label>
                <Input value={billData.jobId} onChange={e => setBillData({...billData, jobId: e.target.value})} className={cn("bg-slate-950 border-slate-800 font-code font-bold", activeTheme.text)} placeholder="TV1001" />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Parts In-Stock</Label>
                <Select onValueChange={addItemFromStock}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs"><SelectValue placeholder="Add Spare Part..." /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {store.stock.map((s: StockItem) => <SelectItem key={s.id} value={s.id}>{s.name} (Qty: {s.quantity})</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Package className="w-4 h-4" /> Item Ledger</h3>
             <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
                {billData.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg text-xs">
                      <div className="flex flex-col">
                         <span className="font-bold">{item.name}</span>
                         <span className="text-[9px] text-slate-500">Unit: ₹{item.unitPrice}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="font-code font-bold text-emerald-400">₹{item.total}</span>
                         <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                ))}
                {billData.items.length === 0 && <p className="text-[10px] text-slate-600 italic">No spare parts attached.</p>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Labour Charges</Label>
                <Input type="number" value={billData.labourCharges} onChange={e => setBillData({...billData, labourCharges: Number(e.target.value)})} className="bg-slate-950 border-slate-800 text-right h-10" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Discount (₹)</Label>
                <Input type="number" value={billData.discount} onChange={e => setBillData({...billData, discount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 text-right h-10" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
               <Label className="text-sm font-bold">Apply 18% GST</Label>
               <Switch checked={billData.taxEnabled} onCheckedChange={v => setBillData({...billData, taxEnabled: v})} />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] font-bold text-slate-500 uppercase">Payment Status</Label>
               <Select value={billData.paymentStatus} onValueChange={v => setBillData({...billData, paymentStatus: v as any})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                     <SelectItem value="Paid">Paid</SelectItem>
                     <SelectItem value="Pending">Pending</SelectItem>
                     <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  </SelectContent>
               </Select>
            </div>
          </div>

          <div className={cn("p-4 rounded-2xl border space-y-2", activeTheme.bg + "/5", "border-" + activeTheme.id)}>
             <div className="flex justify-between text-xs">
                <span className="text-slate-400 uppercase font-bold">Subtotal</span>
                <span className="font-code font-bold">₹{subtotal.toFixed(2)}</span>
             </div>
             {billData.taxEnabled && (
               <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase font-bold">GST (18%)</span>
                  <span className="font-code font-bold">₹{gst.toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="font-headline font-bold text-lg uppercase">Total Payable</span>
                <span className={cn("font-code font-bold text-xl", activeTheme.text)}>₹{total.toFixed(2)}</span>
             </div>
          </div>
        </div>

        <div className="flex gap-3">
           <Button onClick={handleSaveInvoice} className={cn("flex-1 h-12 shadow-lg text-white font-bold", activeTheme.bg)}>
              <Check className="w-5 h-5 mr-2" /> {editingInvoiceId ? "Update & Save" : "Save & Commit Invoice"}
           </Button>
           <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 h-12 border-slate-700">
              <FileDown className="w-5 h-5 mr-2" /> Download PDF
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-headline font-bold uppercase flex items-center gap-2">
             <Monitor className="w-5 h-5 text-slate-500" /> Professional Preview
           </h3>
           <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              {INVOICE_THEMES.map(theme => (
                <button key={theme.id} onClick={() => setActiveThemeId(theme.id)} className={cn("w-6 h-6 rounded-md border-2", activeThemeId === theme.id ? "border-white" : "border-transparent", theme.bg)} />
              ))}
           </div>
        </div>

        <div className="bg-white rounded-2xl p-8 text-black min-h-[600px] shadow-2xl relative overflow-hidden">
           <div className="flex justify-between border-b-2 border-slate-100 pb-6">
              <div className="flex flex-col">
                 <h1 className={cn("text-2xl font-black uppercase italic leading-none", activeTheme.text)}>GJ5 HOME SERVICE</h1>
                 <p className="text-[10px] font-bold text-slate-500 mt-1">Professional Electronics Care</p>
              </div>
              <div className="text-right">
                 <h2 className="text-3xl font-black text-slate-800">INVOICE</h2>
                 <p className="text-[10px] font-mono text-slate-400">#GJ5-{billData.jobId || 'XXXX'}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8 py-8">
              <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase">Customer Details</p>
                 <h4 className="text-base font-black">{billData.customerName || 'N/A'}</h4>
                 <p className="text-[10px] font-bold text-slate-600">{billData.mobile || 'N/A'}</p>
              </div>
              <div className="space-y-1 text-right">
                 <p className="text-[9px] font-black text-slate-400 uppercase">Device Context</p>
                 <h4 className="text-base font-black">{billData.brand} {billData.model}</h4>
                 <p className="text-[10px] font-bold text-slate-600">Job ID: {billData.jobId || 'N/A'}</p>
              </div>
           </div>

           <div className="flex-1">
              <table className="w-full text-[11px]">
                 <thead>
                    <tr className={cn("text-white", activeTheme.bg)}>
                       <th className="p-2 text-left">DESCRIPTION</th>
                       <th className="p-2 text-right">TOTAL (INR)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {billData.items.map((item, i) => (
                       <tr key={i}>
                          <td className="p-2 font-bold">{item.name}</td>
                          <td className="p-2 text-right font-mono">₹{item.total.toFixed(2)}</td>
                       </tr>
                    ))}
                    <tr>
                       <td className="p-2 font-bold">Labour & Service Charges</td>
                       <td className="p-2 text-right font-mono">₹{billData.labourCharges.toFixed(2)}</td>
                    </tr>
                 </tbody>
              </table>
           </div>

           <div className="mt-8 pt-8 border-t-2 border-slate-100 flex justify-end">
              <div className="w-48 space-y-2">
                 <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                    <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                 </div>
                 {billData.taxEnabled && (
                   <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">GST (18%)</span>
                      <span className="font-bold">₹{gst.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="flex justify-between pt-2 border-t border-slate-900 mt-2">
                    <span className="font-black text-sm uppercase">Total</span>
                    <span className={cn("font-black text-lg italic", activeTheme.text)}>₹{total.toFixed(2)}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
