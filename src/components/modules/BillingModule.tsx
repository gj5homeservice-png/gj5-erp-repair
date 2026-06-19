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
  ArrowLeft,
  User,
  MessageSquare,
  Save,
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';

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
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { toast } = useToast();

  const activeTheme = useMemo(() => 
    INVOICE_THEMES.find(t => t.id === activeThemeId) || INVOICE_THEMES[0]
  , [activeThemeId]);

  useEffect(() => {
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
      setInvoiceDate(inv.timestamp.split('T')[0]);
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
    return itemsTotal + billData.labourCharges + billData.deliveryCharge + billData.additionalCharges;
  }, [billData]);

  const gst = billData.taxEnabled ? (subtotal - billData.discount) * 0.18 : 0;
  const total = (subtotal - billData.discount) + gst;

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
    if (!billData.customerName || !billData.mobile) {
      toast({ variant: "destructive", title: "Validation Error", description: "Customer name and mobile are required." });
      return;
    }

    const profit = billData.items.reduce((acc, curr) => acc + (curr.unitPrice - curr.purchasePrice), 0) + billData.labourCharges;
    const finalTimestamp = new Date(invoiceDate).toISOString();
    
    if (editingInvoiceId) {
      const updatedInvoice: Invoice = {
        id: editingInvoiceId,
        invoiceNumber: store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber || `INV-${String(1000 + store.invoices.length).padStart(4, '0')}`,
        ...billData,
        subtotal,
        gst,
        total,
        profit,
        timestamp: finalTimestamp
      };
      store.updateInvoice(updatedInvoice);
      toast({ title: "Invoice Updated", description: `Record ${updatedInvoice.invoiceNumber} has been updated.` });
      setEditingInvoiceId(null);
      setBillData(INITIAL_BILL_DATA);
    } else {
      const invoice: Invoice = {
        id: `INV${Date.now()}`,
        invoiceNumber: `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`,
        ...billData,
        subtotal,
        gst,
        total,
        profit,
        timestamp: finalTimestamp
      };
      store.addInvoice(invoice);
      toast({ title: "Bill Saved", description: `Invoice ${invoice.invoiceNumber} committed to ledger.` });
      setBillData(INITIAL_BILL_DATA);
    }
  };

  const handleWhatsApp = () => {
    if (!billData.mobile) return;
    const msg = `Hello ${billData.customerName}, your invoice from GJ5 HOME SERVICE is ready. Total: ₹${total.toFixed(2)}. Job ID: ${billData.jobId || 'N/A'}. Thank you for choosing us!`;
    const url = `https://web.whatsapp.com/send?phone=91${billData.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const formattedDate = format(new Date(invoiceDate), 'dd/MM/yyyy');
      const invNo = editingInvoiceId ? store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber : `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`;
      
      const themeColor = activeTheme.primary;
      const themeRGB = hexToRgb(themeColor);

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.text('GJ5 PLUS BILLING SYSTEM', 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text('GJ5 HOME SERVICE | Professional Care', 15, 31);
      doc.text('Customer Care: 8866983900', 15, 36);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Invoice No: ${invNo}`, 195, 25, { align: 'right' });
      doc.text(`Date: ${formattedDate}`, 195, 31, { align: 'right' });

      let currentY = 55;
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER DETAILS', 15, currentY);
      doc.line(15, currentY + 1, 195, currentY + 1);

      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${billData.customerName || 'N/A'}`, 15, currentY);
      doc.text(`Mobile: ${billData.mobile || 'N/A'}`, 15, currentY + 6);
      doc.text(`Address: ${billData.address || 'N/A'}`, 15, currentY + 12);

      currentY += 25;
      doc.setFillColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.rect(15, currentY, 180, 10, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.text('PRODUCT NAME', 20, currentY + 7);
      doc.text('QTY', 120, currentY + 7, { align: 'center' });
      doc.text('RATE', 155, currentY + 7, { align: 'center' });
      doc.text('TOTAL', 190, currentY + 7, { align: 'right' });

      currentY += 10;
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      
      if (billData.items.length === 0) {
        doc.text('Service/Repair Only', 20, currentY + 7);
        doc.text('1', 120, currentY + 7, { align: 'center' });
        doc.text(billData.labourCharges.toFixed(2), 155, currentY + 7, { align: 'center' });
        doc.text(billData.labourCharges.toFixed(2), 190, currentY + 7, { align: 'right' });
        currentY += 10;
      } else {
        billData.items.forEach(item => {
          doc.text(item.name, 20, currentY + 7);
          doc.text(String(item.quantity), 120, currentY + 7, { align: 'center' });
          doc.text(item.unitPrice.toFixed(2), 155, currentY + 7, { align: 'center' });
          doc.text(item.total.toFixed(2), 190, currentY + 7, { align: 'right' });
          currentY += 10;
        });
        if (billData.labourCharges > 0) {
          doc.text('Labour / Service Charges', 20, currentY + 7);
          doc.text('1', 120, currentY + 7, { align: 'center' });
          doc.text(billData.labourCharges.toFixed(2), 155, currentY + 7, { align: 'center' });
          doc.text(billData.labourCharges.toFixed(2), 190, currentY + 7, { align: 'right' });
          currentY += 10;
        }
      }

      currentY += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal:', 140, currentY);
      doc.text(subtotal.toFixed(2), 190, currentY, { align: 'right' });
      
      if (billData.discount > 0) {
        currentY += 7;
        doc.text('Discount:', 140, currentY);
        doc.text(`- ${billData.discount.toFixed(2)}`, 190, currentY, { align: 'right' });
      }

      if (billData.taxEnabled) {
        currentY += 7;
        doc.text('GST (18%):', 140, currentY);
        doc.text(gst.toFixed(2), 190, currentY, { align: 'right' });
      }

      currentY += 12;
      doc.setFontSize(14);
      doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.text('Grand Total:', 140, currentY);
      doc.text(`INR ${total.toFixed(2)}`, 190, currentY, { align: 'right' });

      doc.save(`GJ5_PLUS_${invNo}.pdf`);
    } catch (e) { console.error(e); }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 102, b: 255 };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl text-white shadow-xl", activeTheme.bg)}>
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-headline font-black uppercase tracking-tight">GJ5 PLUS BILLING SYSTEM</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Industrial Finance Interface</p>
              </div>
            </div>
            {editingInvoiceId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingInvoiceId(null); setBillData(INITIAL_BILL_DATA); }} className="text-slate-500 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> Customer Profile
                </Label>
                <div className="grid grid-cols-1 gap-3">
                   <Input value={billData.customerName} onChange={e => setBillData({...billData, customerName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="Full Name" />
                   <Input value={billData.mobile} onChange={e => setBillData({...billData, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="Mobile Number" />
                   <Input value={billData.address} onChange={e => setBillData({...billData, address: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="Address" />
                </div>
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Document Registry
                </Label>
                <div className="grid grid-cols-1 gap-3">
                   <div className="space-y-1">
                      <Label className="text-[9px] text-slate-600 uppercase font-bold">Invoice Date</Label>
                      <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[9px] text-slate-600 uppercase font-bold">Link Repair Job ID</Label>
                      <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                         <Input value={billData.jobId} onChange={e => setBillData({...billData, jobId: e.target.value})} className="pl-10 bg-slate-950 border-slate-800 h-11 font-code font-bold text-blue-400" placeholder="e.g. TV1001" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <Separator className="bg-slate-800" />

          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> Product Ledger</h3>
                <div className="w-64">
                   <Select onValueChange={addItemFromStock}>
                     <SelectTrigger className="bg-slate-950 border-slate-800 text-[10px] font-bold h-9 uppercase"><SelectValue placeholder="Add Part From Stock..." /></SelectTrigger>
                     <SelectContent className="bg-slate-900 border-slate-800">
                       {store.stock.map((s: StockItem) => <SelectItem key={s.id} value={s.id}>{s.name} (Qty: {s.quantity})</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
             </div>
             <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2">
                {billData.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                      <div className="flex flex-col">
                         <span className="font-bold text-xs">{item.name}</span>
                         <span className="text-[9px] text-slate-500 font-code">Qty: {item.quantity} | Rate: ₹{item.unitPrice}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="font-code font-bold text-emerald-400 text-sm">₹{item.total.toFixed(2)}</span>
                         <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                ))}
                {billData.items.length === 0 && <p className="text-[10px] text-slate-700 py-4 text-center italic uppercase font-black tracking-widest">Awaiting Part Entry</p>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Service Charges (₹)</Label>
                <Input type="number" value={billData.labourCharges} onChange={e => setBillData({...billData, labourCharges: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code font-bold" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Discount (₹)</Label>
                <Input type="number" value={billData.discount} onChange={e => setBillData({...billData, discount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code font-bold text-rose-400" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Payment Lifecycle</Label>
                <Select value={billData.paymentStatus} onValueChange={v => setBillData({...billData, paymentStatus: v as any})}>
                   <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                   <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Paid">Fully Paid</SelectItem>
                      <SelectItem value="Pending">Unpaid/Pending</SelectItem>
                      <SelectItem value="Partially Paid">Partial Credit</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-600/5 rounded-2xl border border-blue-500/20">
             <div className="space-y-0.5">
                <Label className="text-sm font-black uppercase tracking-tighter">Tax Compliance (GST 18%)</Label>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Apply Integrated Goods & Service Tax</p>
             </div>
             <Switch checked={billData.taxEnabled} onCheckedChange={v => setBillData({...billData, taxEnabled: v})} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
           <Button onClick={handleSaveInvoice} className="h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-500/20">
              <Save className="w-4 h-4 mr-2" /> Save Bill
           </Button>
           <Button onClick={handlePrint} variant="outline" className="h-14 border-slate-700 rounded-2xl font-black uppercase text-xs">
              <Printer className="w-4 h-4 mr-2" /> Print
           </Button>
           <Button onClick={handleDownloadPDF} variant="outline" className="h-14 border-slate-700 rounded-2xl font-black uppercase text-xs">
              <FileDown className="w-4 h-4 mr-2" /> PDF
           </Button>
           <Button onClick={handleWhatsApp} variant="outline" className="h-14 border-emerald-800/50 hover:bg-emerald-500/10 text-emerald-400 rounded-2xl font-black uppercase text-xs">
              <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-headline font-black uppercase tracking-widest flex items-center gap-2">
             <Monitor className="w-5 h-5 text-slate-600" /> GJ5 Plus Render Engine
           </h3>
           <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
              {INVOICE_THEMES.map(theme => (
                <button key={theme.id} onClick={() => setActiveThemeId(theme.id)} className={cn("w-7 h-7 rounded-xl border-2 transition-all active:scale-90", activeThemeId === theme.id ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50", theme.bg)} />
              ))}
           </div>
        </div>

        <div id="gj5-plus-invoice" className="bg-white rounded-[2rem] p-8 text-black min-h-[750px] shadow-2xl relative overflow-hidden border border-slate-200">
           {/* Decorative Background Elements */}
           <div className={cn("absolute top-0 right-0 w-48 h-48 opacity-[0.03] -translate-y-12 translate-x-12", activeTheme.text)}>
              <Receipt className="w-full h-full" />
           </div>

           <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
              <div className="flex flex-col">
                 <h1 className={cn("text-4xl font-black uppercase italic leading-none tracking-tighter", activeTheme.text)}>GJ5 PLUS</h1>
                 <p className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em] mt-1">Billing System Node</p>
                 <div className="mt-6 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Enterprise Service Partner</p>
                    <p className="text-xs font-black text-slate-800">GJ5 HOME SERVICE - 8866983900</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                 <div className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-md", activeTheme.bg)}>
                    Official Invoice
                 </div>
                 <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Node</p>
                    <h2 className="text-2xl font-black text-slate-800 font-code">{editingInvoiceId ? store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber : `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`}</h2>
                    <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase">Date: {format(new Date(invoiceDate), 'dd/MM/yyyy')}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 py-6 border-b-2 border-slate-100 mb-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className={cn("w-1 h-4 rounded-full", activeTheme.bg)}></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</p>
                 </div>
                 <div className="pl-3 space-y-1">
                    <h4 className="text-lg font-black tracking-tight">{billData.customerName || 'UNIDENTIFIED CLIENT'}</h4>
                    <p className="text-sm font-bold text-slate-600 font-code">{billData.mobile || 'NO-CONTACT'}</p>
                    <p className="text-[11px] font-bold text-slate-500 max-w-[250px] uppercase leading-tight mt-2">{billData.address || 'SITE ADDRESS NOT REGISTERED'}</p>
                 </div>
              </div>
              <div className="text-right space-y-4">
                 <div className="flex items-center gap-2 justify-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Context</p>
                    <div className={cn("w-1 h-4 rounded-full", activeTheme.bg)}></div>
                 </div>
                 <div className="pr-3 space-y-1">
                    <h4 className="text-lg font-black tracking-tight">{billData.brand} {billData.model}</h4>
                    <p className="text-sm font-bold text-blue-600 font-code uppercase">JOB ID: {billData.jobId || 'WALK-IN'}</p>
                    <div className="flex justify-end gap-2 mt-1">
                      <span className="px-2 py-0.5 border border-slate-300 rounded-md text-[9px] font-black uppercase">{billData.paymentStatus}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex-1">
              <table className="w-full text-[12px]">
                 <thead>
                    <tr className={cn("text-white shadow-md", activeTheme.bg)}>
                       <th className="p-4 text-left font-black tracking-widest rounded-l-xl">PRODUCT NAME</th>
                       <th className="p-4 text-center font-black tracking-widest">QTY</th>
                       <th className="p-4 text-center font-black tracking-widest">RATE</th>
                       <th className="p-4 text-right font-black tracking-widest rounded-r-xl">TOTAL (INR)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {billData.items.length === 0 ? (
                       <tr className="border-b border-slate-50">
                         <td className="p-4 font-black uppercase text-slate-800">Primary Repair / Service Asset</td>
                         <td className="p-4 text-center font-bold">1</td>
                         <td className="p-4 text-center font-code font-bold">₹{billData.labourCharges.toFixed(2)}</td>
                         <td className="p-4 text-right font-code font-black">₹{billData.labourCharges.toFixed(2)}</td>
                       </tr>
                    ) : (
                      <>
                        {billData.items.map((item, i) => (
                          <tr key={i} className="border-b border-slate-50">
                             <td className="p-4 font-black uppercase text-slate-800">{item.name}</td>
                             <td className="p-4 text-center font-bold">{item.quantity}</td>
                             <td className="p-4 text-center font-code font-bold">₹{item.unitPrice.toFixed(2)}</td>
                             <td className="p-4 text-right font-code font-black">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        {billData.labourCharges > 0 && (
                          <tr className="border-b border-slate-50">
                             <td className="p-4 font-black uppercase text-slate-500">Service / Labour Fees</td>
                             <td className="p-4 text-center font-bold">1</td>
                             <td className="p-4 text-center font-code font-bold">₹{billData.labourCharges.toFixed(2)}</td>
                             <td className="p-4 text-right font-code font-black">₹{billData.labourCharges.toFixed(2)}</td>
                          </tr>
                        )}
                      </>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="mt-12 flex justify-end">
              <div className="w-72 space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                 <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-black uppercase tracking-widest">Subtotal</span>
                    <span className="font-code font-bold text-slate-600">₹{subtotal.toFixed(2)}</span>
                 </div>
                 {billData.discount > 0 && (
                   <div className="flex justify-between text-[11px]">
                      <span className="text-rose-500 font-black uppercase tracking-widest">Discount</span>
                      <span className="font-code font-bold text-rose-500">-₹{billData.discount.toFixed(2)}</span>
                   </div>
                 )}
                 {billData.taxEnabled && (
                   <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-black uppercase tracking-widest">GST (18%)</span>
                      <span className="font-code font-bold text-slate-600">₹{gst.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="pt-4 border-t-2 border-slate-200 mt-2 flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-800">Grand Total</span>
                    <span className={cn("font-black text-2xl italic tracking-tighter", activeTheme.text)}>₹{total.toFixed(2)}</span>
                 </div>
              </div>
           </div>

           <div className="mt-16 pt-8 border-t-2 border-slate-900 flex justify-between items-end">
              <div className="space-y-4">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Verify Authenticity • System Generated Node</p>
              </div>
              <div className="text-right space-y-12">
                 <div className="space-y-1">
                    <div className="w-48 h-px bg-slate-900 ml-auto"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Authorized Signatory</p>
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Computer Generated Receipt - No Physical Stamp Required</p>
              </div>
           </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: a4;
            margin: 0;
          }
          body * {
            visibility: hidden;
            background: white !important;
          }
          #gj5-plus-invoice, #gj5-plus-invoice * {
            visibility: visible;
          }
          #gj5-plus-invoice {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}