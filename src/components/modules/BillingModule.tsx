
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
  ShieldCheck,
  Building,
  Mail,
  Smartphone,
  CreditCard,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsPDF } from 'jspdf';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Invoice, InvoiceItem, StockItem } from '@/lib/types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const INITIAL_ITEM: Partial<InvoiceItem> = {
  id: '', name: '', brand: '', size: '', quantity: 1, rate: 0, gstPercent: 18, discount: 0, amount: 0
};

const COMPANY_DETAILS = {
  name: 'GJ5 PLUS HOME SERVICE',
  address: 'Shop No. 12, Enterprise Hub, Varachha, Surat - 395006',
  mobile: '+91 88669 83900',
  email: 'service@gj5plus.com',
  gstin: '24ABCDE1234F1Z5'
};

export function BillingModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Partial<Invoice>>({
    invoiceNumber: `INV-${String(store.invoices.length + 1).padStart(6, '0')}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    customerName: '',
    customerMobile: '',
    customerAddress: '',
    customerGSTIN: '',
    items: [],
    paymentStatus: 'Unpaid',
    paymentMode: 'UPI',
    terms: '1. Goods once sold will not be taken back.\n2. Service warranty only covers functional parts.',
    warranty: '90 Days Service Warranty'
  });

  const [currentItem, setCurrentItem] = useState<Partial<InvoiceItem>>(INITIAL_ITEM);

  const totals = useMemo(() => {
    const subtotal = invoice.items?.reduce((acc, item) => acc + (item.rate * item.quantity), 0) || 0;
    const totalDiscount = invoice.items?.reduce((acc, item) => acc + item.discount, 0) || 0;
    const taxableAmount = subtotal - totalDiscount;
    const totalGst = invoice.items?.reduce((acc, item) => acc + (item.amount - (item.rate * item.quantity - item.discount)), 0) || 0;
    const grandTotal = taxableAmount + totalGst;

    return { subtotal, totalDiscount, cgst: totalGst / 2, sgst: totalGst / 2, grandTotal };
  }, [invoice.items]);

  const handleAddItem = () => {
    if (!currentItem.name || !currentItem.rate) return;
    
    const amount = (currentItem.rate! * currentItem.quantity!) - (currentItem.discount || 0);
    const gstAmount = amount * (currentItem.gstPercent! / 100);
    const finalAmount = amount + gstAmount;

    const newItem = { ...currentItem, amount: finalAmount } as InvoiceItem;
    setInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    setCurrentItem(INITIAL_ITEM);
  };

  const handleRemoveItem = (index: number) => {
    setInvoice(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
  };

  const handleSaveInvoice = () => {
    if (!invoice.customerName || !invoice.items?.length) {
      toast({ variant: "destructive", title: "Missing Data", description: "Customer and items are required." });
      return;
    }

    const finalInvoice = {
      ...invoice,
      id: `INV${Date.now()}`,
      ...totals,
      timestamp: new Date().toISOString()
    } as Invoice;

    store.addInvoice(finalInvoice);
    toast({ title: "Invoice Committed", description: `Invoice ${finalInvoice.invoiceNumber} saved successfully.` });
    
    // Reset form with next number
    setInvoice({
      ...invoice,
      invoiceNumber: `INV-${String(store.invoices.length + 2).padStart(6, '0')}`,
      customerName: '', customerMobile: '', customerAddress: '', customerGSTIN: '',
      items: []
    });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = 210;
    const height = 297;

    // Header Color Bar
    doc.setFillColor(15, 23, 42); // Navy
    doc.rect(0, 0, width, 30, 'F');
    doc.setFillColor(220, 38, 38); // Red
    doc.rect(width - 60, 0, 60, 30, 'F');

    // Branding
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GJ5 PLUS', 15, 18);
    doc.setFontSize(10);
    doc.text('ENTERPRISE ERP', 15, 24);

    doc.setFontSize(18);
    doc.text('TAX INVOICE', width - 15, 18, { align: 'right' });

    // Company Info
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_DETAILS.name, 15, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_DETAILS.address, 15, 45);
    doc.text(`Mo: ${COMPANY_DETAILS.mobile} | Email: ${COMPANY_DETAILS.email}`, 15, 50);
    doc.text(`GSTIN: ${COMPANY_DETAILS.gstin}`, 15, 55);

    // Invoice Meta
    doc.rect(width - 70, 35, 55, 25);
    doc.text(`Inv No: ${invoice.invoiceNumber}`, width - 65, 42);
    doc.text(`Date: ${format(parseISO(invoice.date!), 'dd/MM/yyyy')}`, width - 65, 48);
    doc.text(`Status: ${invoice.paymentStatus}`, width - 65, 54);

    // Billing Info
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 15, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customerName!, 15, 76);
    doc.text(invoice.customerAddress!, 15, 81);
    doc.text(`Mobile: ${invoice.customerMobile}`, 15, 86);
    if (invoice.customerGSTIN) doc.text(`GSTIN: ${invoice.customerGSTIN}`, 15, 91);

    // Table Header
    let y = 100;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, width - 30, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Item / Description', 20, y + 5);
    doc.text('Qty', 110, y + 5);
    doc.text('Rate', 130, y + 5);
    doc.text('GST', 155, y + 5);
    doc.text('Amount', 195, y + 5, { align: 'right' });

    // Table Body
    y += 12;
    doc.setFont('helvetica', 'normal');
    invoice.items?.forEach(item => {
      doc.text(`${item.name} (${item.brand})`, 20, y);
      doc.text(item.quantity.toString(), 112, y);
      doc.text(item.rate.toFixed(2), 130, y);
      doc.text(`${item.gstPercent}%`, 155, y);
      doc.text(item.amount.toFixed(2), 195, y, { align: 'right' });
      y += 8;
    });

    // Calculations
    y += 10;
    doc.line(15, y, width - 15, y);
    y += 10;
    doc.text('Subtotal:', width - 80, y);
    doc.text(`INR ${totals.subtotal.toFixed(2)}`, width - 15, y, { align: 'right' });
    
    y += 6;
    doc.text('CGST:', width - 80, y);
    doc.text(`INR ${totals.cgst.toFixed(2)}`, width - 15, y, { align: 'right' });

    y += 6;
    doc.text('SGST:', width - 80, y);
    doc.text(`INR ${totals.sgst.toFixed(2)}`, width - 15, y, { align: 'right' });

    if (totals.totalDiscount > 0) {
      y += 6;
      doc.setTextColor(220, 38, 38);
      doc.text('Discount:', width - 80, y);
      doc.text(`- INR ${totals.totalDiscount.toFixed(2)}`, width - 15, y, { align: 'right' });
      doc.setTextColor(0);
    }

    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.rect(width - 85, y - 6, 70, 10);
    doc.text('Grand Total:', width - 80, y);
    doc.text(`INR ${totals.grandTotal.toFixed(2)}`, width - 15, y, { align: 'right' });

    // Footer
    y = height - 60;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.terms!, 15, y + 5, { maxWidth: 100 });

    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', width - 50, y + 30);
    doc.line(width - 60, y + 25, width - 15, y + 25);

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-10">
      {/* Control Panel */}
      <div className="xl:col-span-7 space-y-6">
        <Card className="bg-slate-900/40 border-slate-800 shadow-2xl">
          <CardHeader className="border-b border-slate-800 p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-xl shadow-rose-500/20">
                  <Receipt className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-headline font-black uppercase tracking-tight">GJ5 PLUS BILLING</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Industrial GST Invoice Engine</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase">System Date</p>
                <p className="font-code font-bold text-blue-400">{invoice.date}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <User className="w-3 h-3" /> Party Details
                </h4>
                <div className="space-y-3">
                  <Input value={invoice.customerName} onChange={e => setInvoice({...invoice, customerName: e.target.value})} placeholder="Customer / Party Name" className="bg-slate-950 h-12" />
                  <Input value={invoice.customerMobile} onChange={e => setInvoice({...invoice, customerMobile: e.target.value})} placeholder="Mobile Number" className="bg-slate-950 h-12" />
                  <Input value={invoice.customerAddress} onChange={e => setInvoice({...invoice, customerAddress: e.target.value})} placeholder="Billing Address" className="bg-slate-950 h-12" />
                  <Input value={invoice.customerGSTIN} onChange={e => setInvoice({...invoice, customerGSTIN: e.target.value})} placeholder="Customer GSTIN (Optional)" className="bg-slate-950 h-12 uppercase" />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Document Info
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input readOnly value={invoice.invoiceNumber} className="bg-slate-800 font-code font-bold text-blue-400 h-12" />
                    <Input type="date" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} className="bg-slate-950 h-12" />
                  </div>
                  <Select value={invoice.paymentStatus} onValueChange={v => setInvoice({...invoice, paymentStatus: v as any})}>
                    <SelectTrigger className="bg-slate-950 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Paid">Fully Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid / Credit</SelectItem>
                      <SelectItem value="Partial">Partial Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={invoice.paymentMode} onValueChange={v => setInvoice({...invoice, paymentMode: v as any})}>
                    <SelectTrigger className="bg-slate-950 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                      <SelectItem value="Cash">Cash Transaction</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit">Credit Line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <Package className="w-3 h-3" /> Add Items to Ledger
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} placeholder="Item Description" className="bg-slate-950 h-11 md:col-span-2" />
                <Input type="number" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: Number(e.target.value)})} placeholder="Rate" className="bg-slate-950 h-11 font-code" />
                <Button onClick={handleAddItem} className="bg-blue-600 h-11 rounded-xl"><Plus className="w-4 h-4" /> Add Item</Button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <Input value={currentItem.brand} onChange={e => setCurrentItem({...currentItem, brand: e.target.value})} placeholder="Brand" className="bg-slate-950 h-10 text-xs" />
                <Input value={currentItem.size} onChange={e => setCurrentItem({...currentItem, size: e.target.value})} placeholder="Size" className="bg-slate-950 h-10 text-xs" />
                <Input type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: Number(e.target.value)})} placeholder="Qty" className="bg-slate-950 h-10 text-xs font-code" />
                <Input type="number" value={currentItem.discount} onChange={e => setCurrentItem({...currentItem, discount: Number(e.target.value)})} placeholder="Disc" className="bg-slate-950 h-10 text-xs font-code" />
                <Select value={String(currentItem.gstPercent)} onValueChange={v => setCurrentItem({...currentItem, gstPercent: Number(v)})}>
                  <SelectTrigger className="bg-slate-950 h-10 text-xs"><SelectValue placeholder="GST%" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-2 space-y-2">
              {invoice.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{item.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-black">{item.brand} | GST: {item.gstPercent}% | QTY: {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-code font-bold text-emerald-400">₹{item.amount.toLocaleString()}</span>
                    <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-white p-2 hover:bg-rose-500/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <div className="py-12 text-center opacity-20 flex flex-col items-center gap-2">
                  <Package className="w-12 h-12" />
                  <p className="text-xs font-black uppercase tracking-widest">No Items in Invoice</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
           <Button onClick={handleSaveInvoice} className="h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-500/20">
              <Save className="w-4 h-4 mr-2" /> Save Invoice
           </Button>
           <Button onClick={() => window.print()} variant="outline" className="h-14 border-slate-700 hover:bg-slate-800 rounded-2xl font-black uppercase text-xs">
              <Printer className="w-4 h-4 mr-2" /> Print A4
           </Button>
           <Button onClick={handleDownloadPDF} variant="outline" className="h-14 border-slate-700 hover:bg-slate-800 rounded-2xl font-black uppercase text-xs">
              <FileDown className="w-4 h-4 mr-2" /> Download PDF
           </Button>
           <Button variant="outline" className="h-14 border-emerald-800/50 hover:bg-emerald-500/10 text-emerald-400 rounded-2xl font-black uppercase text-xs">
              <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
           </Button>
        </div>
      </div>

      {/* Live Professional Render Engine */}
      <div className="xl:col-span-5 space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-headline font-black uppercase tracking-widest flex items-center gap-2">
             <Monitor className="w-5 h-5 text-slate-600" /> Professional Render
           </h3>
           <Badge className="bg-slate-900 border-slate-800 text-emerald-400">VYAPAR MODE v2.0</Badge>
        </div>

        <div id="invoice-render" className="bg-white rounded-[2rem] p-10 text-black min-h-[850px] shadow-2xl relative overflow-hidden border border-slate-200">
           {/* Vyapar style header */}
           <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
              <div className="flex flex-col">
                 <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">GJ5 PLUS</h1>
                 <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mt-2">Professional Home Service Node</p>
                 <div className="mt-6 space-y-1">
                    <p className="text-sm font-black text-slate-900 uppercase">Authorized Service Unit</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase">{COMPANY_DETAILS.address}</p>
                    <p className="text-[10px] text-slate-900 font-bold">GSTIN: {COMPANY_DETAILS.gstin}</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end">
                 <h2 className="text-3xl font-black text-rose-600 tracking-tighter">TAX INVOICE</h2>
                 <div className="mt-6 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Node</p>
                    <p className="text-xl font-black font-code">{invoice.invoiceNumber}</p>
                    <p className="text-[11px] font-bold text-slate-600 uppercase">Date: {format(parseISO(invoice.date!), 'dd/MM/yyyy')}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 py-6 border-b-2 border-slate-100 mb-8">
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill To / Party Identity</p>
                 <div className="space-y-1">
                    <h4 className="text-lg font-black tracking-tight">{invoice.customerName || 'UNREGISTERED CLIENT'}</h4>
                    <p className="text-[11px] font-bold text-slate-700 font-code">MO: {invoice.customerMobile || 'NO-CONTACT'}</p>
                    <p className="text-[11px] font-medium text-slate-500 uppercase leading-relaxed mt-2">{invoice.customerAddress || 'SITE ADDRESS NOT REGISTERED'}</p>
                    {invoice.customerGSTIN && <p className="text-[10px] font-black text-rose-600 uppercase">GSTIN: {invoice.customerGSTIN}</p>}
                 </div>
              </div>
              <div className="text-right space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiscal State</p>
                 <div className="space-y-2">
                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase border-2", 
                      invoice.paymentStatus === 'Paid' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-rose-50 border-rose-200 text-rose-600"
                    )}>{invoice.paymentStatus}</Badge>
                    <p className="text-[11px] font-bold text-slate-900 uppercase">Mode: {invoice.paymentMode}</p>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Due Date: {format(parseISO(invoice.dueDate!), 'dd/MM/yyyy')}</p>
                 </div>
              </div>
           </div>

           <table className="w-full text-[11px] mb-10">
              <thead>
                 <tr className="bg-slate-900 text-white">
                    <th className="p-3 text-left font-black tracking-widest rounded-l-lg">DESCRIPTION</th>
                    <th className="p-3 text-center font-black tracking-widest">QTY</th>
                    <th className="p-3 text-center font-black tracking-widest">RATE</th>
                    <th className="p-3 text-center font-black tracking-widest">GST%</th>
                    <th className="p-3 text-right font-black tracking-widest rounded-r-lg">AMOUNT</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {invoice.items?.map((item, i) => (
                    <tr key={i}>
                       <td className="p-4 font-black uppercase text-slate-900">{item.name} <span className="text-slate-400 font-bold ml-2">({item.brand})</span></td>
                       <td className="p-4 text-center font-bold">{item.quantity}</td>
                       <td className="p-4 text-center font-code">₹{item.rate.toFixed(2)}</td>
                       <td className="p-4 text-center font-bold">{item.gstPercent}%</td>
                       <td className="p-4 text-right font-code font-black text-slate-900">₹{item.amount.toFixed(2)}</td>
                    </tr>
                 ))}
                 {(!invoice.items || invoice.items.length === 0) && (
                   <tr><td colSpan={5} className="p-20 text-center text-slate-200 font-black uppercase tracking-[0.5em]">Awaiting Data Input</td></tr>
                 )}
              </tbody>
           </table>

           <div className="mt-auto pt-8 border-t-2 border-slate-100 flex justify-between">
              <div className="w-1/2 space-y-4">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warranty Context</p>
                    <p className="text-xs font-bold text-slate-800">{invoice.warranty}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                    <div className="h-16 w-32 border-b border-slate-300"></div>
                 </div>
              </div>
              <div className="w-80 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                 <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">Subtotal</span>
                    <span className="font-code font-bold">₹{totals.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">CGST (9%)</span>
                    <span className="font-code font-bold">₹{totals.cgst.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">SGST (9%)</span>
                    <span className="font-code font-bold">₹{totals.sgst.toFixed(2)}</span>
                 </div>
                 {totals.totalDiscount > 0 && (
                   <div className="flex justify-between text-[10px] text-rose-600">
                      <span className="font-bold uppercase">Discount</span>
                      <span className="font-code font-bold">-₹{totals.totalDiscount.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900">Total Payable</span>
                    <span className="font-black text-2xl tracking-tighter text-rose-600">₹{totals.grandTotal.toFixed(2)}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: a4; margin: 0; }
          body * { visibility: hidden; background: white !important; }
          #invoice-render, #invoice-render * { visibility: visible; }
          #invoice-render {
            position: fixed; left: 0; top: 0;
            width: 210mm !important; height: 297mm !important;
            margin: 0 !important; padding: 20mm !important;
            box-shadow: none !important; border: none !important; border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
