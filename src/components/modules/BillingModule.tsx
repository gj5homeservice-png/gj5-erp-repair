"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Receipt,
  Monitor,
  Search,
  FileDown,
  Plus,
  Trash2,
  Package,
  User,
  Save,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Separator } from '@/components/ui/separator';

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
  const [billData, setBillData] = useState(INITIAL_BILL_DATA);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();

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

  // Auto-link job details when Job ID is entered
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
    
    const nextInvNo = editingInvoiceId 
      ? store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber 
      : `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`;

    const invoiceData: Invoice = {
      id: editingInvoiceId || `INV${Date.now()}`,
      invoiceNumber: nextInvNo,
      ...billData,
      subtotal,
      gst,
      total,
      profit,
      timestamp: finalTimestamp
    };

    if (editingInvoiceId) store.updateInvoice(invoiceData);
    else store.addInvoice(invoiceData);

    toast({ title: "Bill Saved", description: `Invoice ${nextInvNo} recorded successfully.` });
    setEditingInvoiceId(null);
    setBillData(INITIAL_BILL_DATA);
  };

  const handleWhatsApp = () => {
    if (!billData.mobile) return;
    const msg = `GJ5 PLUS BILLING SYSTEM\n\nHello ${billData.customerName},\nYour invoice for Job ${billData.jobId || 'N/A'} is ready.\n\nTotal Payable: ₹${total.toFixed(2)}\nStatus: ${billData.paymentStatus}\n\nThank you for choosing GJ5 HOME SERVICE!`;
    const url = `https://web.whatsapp.com/send?phone=91${billData.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const invNo = editingInvoiceId ? store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber : `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`;
    
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('GJ5 PLUS BILLING SYSTEM', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Service & Repair Solutions', 105, 26, { align: 'center' });
    doc.text('Mo: 88669 83900', 105, 31, { align: 'center' });

    doc.rect(15, 40, 180, 25);
    doc.text(`Customer: ${billData.customerName}`, 20, 47);
    doc.text(`Mobile: ${billData.mobile}`, 20, 53);
    doc.text(`Address: ${billData.address}`, 20, 59);

    doc.text(`Invoice No: ${invNo}`, 190, 47, { align: 'right' });
    doc.text(`Date: ${format(new Date(invoiceDate), 'dd/MM/yyyy')}`, 190, 53, { align: 'right' });
    doc.text(`Job ID: ${billData.jobId || 'N/A'}`, 190, 59, { align: 'right' });

    let y = 75;
    doc.setFillColor(30, 41, 59);
    doc.rect(15, y, 180, 10, 'F');
    doc.setTextColor(255);
    doc.text('Product Name', 20, y + 7);
    doc.text('Qty', 120, y + 7);
    doc.text('Rate', 150, y + 7);
    doc.text('Total', 190, y + 7, { align: 'right' });

    doc.setTextColor(0);
    y += 15;
    
    billData.items.forEach(item => {
      doc.text(item.name, 20, y);
      doc.text(item.quantity.toString(), 122, y);
      doc.text(item.unitPrice.toFixed(2), 152, y);
      doc.text(item.total.toFixed(2), 190, y, { align: 'right' });
      y += 8;
    });

    if (billData.labourCharges > 0) {
      doc.text('Labour/Service Charges', 20, y);
      doc.text('1', 122, y);
      doc.text(billData.labourCharges.toFixed(2), 152, y);
      doc.text(billData.labourCharges.toFixed(2), 190, y, { align: 'right' });
      y += 8;
    }

    y += 10;
    doc.line(15, y, 195, y);
    y += 10;
    doc.text(`Subtotal:`, 150, y);
    doc.text(`INR ${subtotal.toFixed(2)}`, 190, y, { align: 'right' });
    
    if (billData.discount > 0) {
      y += 7;
      doc.text(`Discount:`, 150, y);
      doc.text(`- INR ${billData.discount.toFixed(2)}`, 190, y, { align: 'right' });
    }

    if (billData.taxEnabled) {
      y += 7;
      doc.text(`GST (18%):`, 150, y);
      doc.text(`INR ${gst.toFixed(2)}`, 190, y, { align: 'right' });
    }

    y += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total:`, 150, y);
    doc.text(`INR ${total.toFixed(2)}`, 190, y, { align: 'right' });

    doc.save(`GJ5_PLUS_${invNo}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <Receipt className="w-48 h-48 rotate-12" />
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-headline font-black uppercase tracking-tight text-white">GJ5 PLUS BILLING SYSTEM</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Industrial Grade Fiscal Node</p>
              </div>
            </div>
            {editingInvoiceId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingInvoiceId(null); setBillData(INITIAL_BILL_DATA); }} className="text-slate-500 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User className="w-3 h-3" /> Customer Matrix
                </h4>
                <div className="grid grid-cols-1 gap-3">
                   <Input value={billData.customerName} onChange={e => setBillData({...billData, customerName: e.target.value})} className="bg-slate-950 border-slate-800 h-12 rounded-xl focus:ring-blue-600" placeholder="Customer Full Name" />
                   <Input value={billData.mobile} onChange={e => setBillData({...billData, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-12 rounded-xl" placeholder="Mobile Number (10 Digit)" />
                   <Input value={billData.address} onChange={e => setBillData({...billData, address: e.target.value})} className="bg-slate-950 border-slate-800 h-12 rounded-xl" placeholder="Site Address" />
                </div>
             </div>
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Document Metadata
                </h4>
                <div className="grid grid-cols-1 gap-3">
                   <div className="space-y-1">
                      <Label className="text-[9px] text-slate-600 uppercase font-black">Invoice Date</Label>
                      <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-slate-950 border-slate-800 h-12 rounded-xl text-xs" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[9px] text-slate-600 uppercase font-black">Reference Job ID</Label>
                      <div className="relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                         <Input value={billData.jobId} onChange={e => setBillData({...billData, jobId: e.target.value})} className="pl-11 bg-slate-950 border-slate-800 h-12 rounded-xl font-code font-bold text-blue-500" placeholder="e.g. TV1001" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <Separator className="bg-slate-800" />

          <div className="space-y-4 relative z-10">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> Itemized Ledger</h3>
                <div className="w-64">
                   <Select onValueChange={addItemFromStock}>
                     <SelectTrigger className="bg-slate-950 border-slate-800 text-[10px] font-black h-10 rounded-xl uppercase"><SelectValue placeholder="Add From Inventory..." /></SelectTrigger>
                     <SelectContent className="bg-slate-900 border-slate-800">
                       {store.stock.map((s: StockItem) => <SelectItem key={s.id} value={s.id}>{s.name} (₹{s.sellingPrice})</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
             </div>
             
             <div className="bg-slate-950/50 rounded-[1.5rem] border border-slate-800 p-2 space-y-2">
                {billData.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800/50 group hover:border-blue-500/30 transition-all">
                      <div className="flex flex-col">
                         <span className="font-bold text-sm text-slate-100">{item.name}</span>
                         <span className="text-[10px] text-slate-500 font-code mt-1">QTY: {item.quantity} | UNIT: ₹{item.unitPrice}</span>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className="font-code font-bold text-emerald-400 text-base">₹{item.total.toFixed(2)}</span>
                         <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-white p-2 hover:bg-rose-500/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                ))}
                {billData.items.length === 0 && <div className="py-12 text-center flex flex-col items-center gap-3 opacity-20"><Package className="w-12 h-12" /><p className="text-xs font-black uppercase tracking-[0.2em]">Awaiting Asset Entry</p></div>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Service Fees (₹)</Label>
                <Input type="number" value={billData.labourCharges} onChange={e => setBillData({...billData, labourCharges: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-12 rounded-xl font-code font-bold" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Discount (₹)</Label>
                <Input type="number" value={billData.discount} onChange={e => setBillData({...billData, discount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-12 rounded-xl font-code font-bold text-rose-500" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase">Pay State</Label>
                <Select value={billData.paymentStatus} onValueChange={v => setBillData({...billData, paymentStatus: v as any})}>
                   <SelectTrigger className="bg-slate-950 border-slate-800 h-12 rounded-xl text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                   <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Paid">Fully Settled</SelectItem>
                      <SelectItem value="Pending">Unpaid Ledger</SelectItem>
                      <SelectItem value="Partially Paid">Partial Credit</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-blue-600/5 rounded-2xl border border-blue-500/20 relative z-10">
             <div className="space-y-0.5">
                <Label className="text-sm font-black uppercase tracking-tighter">Tax Compliance (GST 18%)</Label>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Apply Statutory Goods & Service Tax</p>
             </div>
             <Switch checked={billData.taxEnabled} onCheckedChange={v => setBillData({...billData, taxEnabled: v})} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
           <Button onClick={handleSaveInvoice} className="h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-500/20">
              <Save className="w-4 h-4 mr-2" /> Save Bill
           </Button>
           <Button onClick={() => window.print()} variant="outline" className="h-14 border-slate-700 hover:bg-slate-800 rounded-2xl font-black uppercase text-xs">
              <Printer className="w-4 h-4 mr-2" /> Print
           </Button>
           <Button onClick={handleDownloadPDF} variant="outline" className="h-14 border-slate-700 hover:bg-slate-800 rounded-2xl font-black uppercase text-xs">
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
             <Monitor className="w-5 h-5 text-slate-600" /> Digital Render Engine
           </h3>
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-full border border-slate-800 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase text-slate-500">Live Preview v2.1</span>
           </div>
        </div>

        <div id="gj5-plus-render" className="bg-white rounded-[2.5rem] p-10 text-black min-h-[850px] shadow-2xl relative overflow-hidden border border-slate-200">
           {/* Decorative Watermark */}
           <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.02] -translate-y-12 translate-x-12 pointer-events-none">
              <Receipt className="w-full h-full text-blue-600" />
           </div>

           <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
              <div className="flex flex-col">
                 <h1 className="text-5xl font-black uppercase italic leading-none tracking-tighter text-blue-600">GJ5 PLUS</h1>
                 <p className="text-[14px] font-black text-slate-800 uppercase tracking-[0.3em] mt-2">Professional Billing Node</p>
                 <div className="mt-8 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Service Unit</p>
                    <p className="text-sm font-black text-slate-900">GJ5 HOME SERVICE - 8866983900</p>
                    <p className="text-[10px] text-slate-400">SURAT, GUJARAT, INDIA</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end gap-3">
                 <div className="px-6 py-1.5 rounded-full text-[11px] font-black uppercase bg-blue-600 text-white shadow-lg">
                    Official Tax Invoice
                 </div>
                 <div className="mt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Node</p>
                    <h2 className="text-3xl font-black text-slate-900 font-code">{editingInvoiceId ? store.invoices.find((i: any) => i.id === editingInvoiceId)?.invoiceNumber : `INV-${String(1001 + store.invoices.length).padStart(4, '0')}`}</h2>
                    <p className="text-[12px] font-bold text-slate-600 mt-2 uppercase">Date: {format(new Date(invoiceDate), 'dd/MM/yyyy')}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-16 py-8 border-b-2 border-slate-100 mb-10">
              <div className="space-y-5">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recipient Identity</p>
                 </div>
                 <div className="pl-4 space-y-1.5">
                    <h4 className="text-xl font-black tracking-tight">{billData.customerName || 'UNREGISTERED CLIENT'}</h4>
                    <p className="text-base font-bold text-slate-700 font-code">MO: {billData.mobile || 'NO-CONTACT'}</p>
                    <p className="text-[12px] font-medium text-slate-500 max-w-[280px] uppercase leading-relaxed mt-3">{billData.address || 'SITE ADDRESS NOT REGISTERED'}</p>
                 </div>
              </div>
              <div className="text-right space-y-5">
                 <div className="flex items-center gap-3 justify-end">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Operational Context</p>
                    <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                 </div>
                 <div className="pr-4 space-y-1.5">
                    <h4 className="text-xl font-black tracking-tight">{billData.brand} {billData.model}</h4>
                    <p className="text-base font-bold text-blue-600 font-code uppercase">JOB REF: {billData.jobId || 'WALK-IN-CASE'}</p>
                    <div className="flex justify-end gap-3 mt-3">
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase">{billData.paymentStatus}</span>
                      <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black uppercase text-blue-600">Secure Audit</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex-1">
              <table className="w-full text-[13px]">
                 <thead>
                    <tr className="bg-slate-900 text-white shadow-xl">
                       <th className="p-5 text-left font-black tracking-widest rounded-l-2xl">PRODUCT FAMILY / DESCRIPTION</th>
                       <th className="p-5 text-center font-black tracking-widest">QTY</th>
                       <th className="p-5 text-center font-black tracking-widest">RATE</th>
                       <th className="p-5 text-right font-black tracking-widest rounded-r-2xl">TOTAL (INR)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {billData.items.length === 0 ? (
                       <tr>
                         <td className="p-6 font-black uppercase text-slate-900">Standard Service / Tech Repair Asset</td>
                         <td className="p-6 text-center font-bold">1</td>
                         <td className="p-6 text-center font-code font-bold">₹{billData.labourCharges.toFixed(2)}</td>
                         <td className="p-6 text-right font-code font-black">₹{billData.labourCharges.toFixed(2)}</td>
                       </tr>
                    ) : (
                      <>
                        {billData.items.map((item, i) => (
                          <tr key={i}>
                             <td className="p-6 font-black uppercase text-slate-900">{item.name}</td>
                             <td className="p-6 text-center font-bold">{item.quantity}</td>
                             <td className="p-6 text-center font-code font-bold">₹{item.unitPrice.toFixed(2)}</td>
                             <td className="p-6 text-right font-code font-black text-blue-600">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        {billData.labourCharges > 0 && (
                          <tr>
                             <td className="p-6 font-black uppercase text-slate-500">Service Engineering / Labor Fees</td>
                             <td className="p-6 text-center font-bold">1</td>
                             <td className="p-6 text-center font-code font-bold">₹{billData.labourCharges.toFixed(2)}</td>
                             <td className="p-6 text-right font-code font-black text-blue-600">₹{billData.labourCharges.toFixed(2)}</td>
                          </tr>
                        )}
                      </>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="mt-16 flex justify-end">
              <div className="w-80 space-y-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-black uppercase tracking-widest">Net Subtotal</span>
                    <span className="font-code font-bold text-slate-600">₹{subtotal.toFixed(2)}</span>
                 </div>
                 {billData.discount > 0 && (
                   <div className="flex justify-between text-[11px]">
                      <span className="text-rose-500 font-black uppercase tracking-widest">Promo Discount</span>
                      <span className="font-code font-bold text-rose-500">-₹{billData.discount.toFixed(2)}</span>
                   </div>
                 )}
                 {billData.taxEnabled && (
                   <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-black uppercase tracking-widest">IGST / CGST (18%)</span>
                      <span className="font-code font-bold text-slate-600">₹{gst.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="pt-6 border-t-2 border-slate-200 mt-4 flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-[0.2em] text-slate-900">Total Payable</span>
                    <span className="font-black text-3xl italic tracking-tighter text-blue-600">₹{total.toFixed(2)}</span>
                 </div>
              </div>
           </div>

           <div className="mt-20 pt-10 border-t-2 border-slate-900 flex justify-between items-end relative z-10">
              <div className="space-y-5">
                 <div className="flex items-center gap-3">
                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Authenticity Verified • GJ5-PLUS-NODE-V2</p>
                 </div>
              </div>
              <div className="text-right space-y-16">
                 <div className="space-y-2">
                    <div className="w-56 h-px bg-slate-900 ml-auto"></div>
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-900">Authorized Signatory</p>
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digitally Generated Instrument - Standard Enterprise Protocol</p>
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
          #gj5-plus-render, #gj5-plus-render * {
            visibility: visible;
          }
          #gj5-plus-render {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
