"use client"

import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  Receipt,
  FileDown,
  Plus,
  Trash2,
  Save,
  MessageSquare,
  Search,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  Package,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MapPin,
  Tag,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useErpStore } from '@/hooks/use-erp-store';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Invoice, InvoiceItem } from '@/lib/types';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

export function BillingModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState({ name: '', mobile: '', address: '', gstin: '', id: '' });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', brand: '', size: '', qty: 1, rate: 0, gst: 18, discount: 0 });
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Credit'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchStock, setSearchStock] = useState('');

  const nextInvoiceNumber = useMemo(() => {
    return `INV-${String(store.invoices.length + 1).padStart(6, '0')}`;
  }, [store.invoices]);

  const filteredStock = useMemo(() => {
    if (!searchStock) return [];
    return store.stock.filter((s: any) => 
      s.name.toLowerCase().includes(searchStock.toLowerCase()) || 
      s.barcode.toLowerCase().includes(searchStock.toLowerCase())
    ).slice(0, 5);
  }, [store.stock, searchStock]);

  const handleSelectItem = (stockItem: any) => {
    setNewItem({
      ...newItem,
      name: stockItem.name,
      brand: stockItem.brand,
      rate: stockItem.sellingPrice,
      qty: 1
    });
    setSearchStock('');
  };

  const addItem = () => {
    if (!newItem.name || newItem.rate <= 0) return;
    const amount = newItem.qty * newItem.rate;
    const item: InvoiceItem = {
      id: `ITEM-${Date.now()}`,
      name: newItem.name,
      brand: newItem.brand,
      size: newItem.size,
      quantity: newItem.qty,
      rate: newItem.rate,
      gstPercent: newItem.gst,
      discount: newItem.discount,
      amount: amount
    };
    setItems([...items, item]);
    setNewItem({ name: '', brand: '', size: '', qty: 1, rate: 0, gst: 18, discount: 0 });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const calculations = useMemo(() => {
    const subtotal = items.reduce((acc, curr) => acc + curr.amount, 0);
    const totalDiscount = items.reduce((acc, curr) => acc + (curr.discount || 0), 0);
    const taxableAmount = subtotal - totalDiscount;
    const cgst = taxableAmount * 0.09; 
    const sgst = taxableAmount * 0.09;
    const grandTotal = taxableAmount + cgst + sgst;
    return { subtotal, totalDiscount, cgst, sgst, grandTotal };
  }, [items]);

  const handleSave = () => {
    if (!customer.name || items.length === 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Customer name and at least one item are required." });
      return;
    }

    const newInvoice: Invoice = {
      id: `INV${Date.now()}`,
      invoiceNumber: nextInvoiceNumber,
      date: invoiceDate,
      dueDate: dueDate,
      customerId: customer.id || `CUST${Date.now().toString().slice(-6)}`,
      customerName: customer.name,
      mobile: customer.mobile,
      address: customer.address,
      customerGSTIN: customer.gstin,
      items: items,
      subtotal: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      cgst: calculations.cgst,
      sgst: calculations.sgst,
      grandTotal: calculations.grandTotal,
      paymentStatus: paymentStatus,
      paymentMode: paymentMode,
      timestamp: new Date().toISOString()
    };

    store.addInvoice(newInvoice);
    toast({ title: "Invoice Committed", description: `Billing record ${newInvoice.invoiceNumber} saved and inventory adjusted.` });
    
    setCustomer({ name: '', mobile: '', address: '', gstin: '', id: '' });
    setItems([]);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const brandColor = [18, 60, 140]; // GJ5 ERP Blue #123C8C
    const accentColor = [229, 57, 53]; // GJ5 ERP Red #E53935
    const profile = store.companyProfile || {};

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName?.toUpperCase() || 'GJ5 ERP', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('POWERED BY GOOD JOB 5 ERP', 15, 27);
    doc.text(`GSTIN: ${profile.gstNumber || 'N/A'}`, 15, 33);

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE', 195, 25, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${nextInvoiceNumber}`, 150, 50);
    doc.text(`Date: ${format(new Date(invoiceDate), 'dd/MM/yyyy')}`, 150, 56);
    doc.text(`Due Date: ${format(new Date(dueDate), 'dd/MM/yyyy')}`, 150, 62);

    doc.setDrawColor(200);
    doc.line(15, 45, 195, 45);
    doc.setFontSize(11);
    doc.text('BILL TO:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(customer.name || 'Walk-in Customer', 15, 62);
    doc.text(customer.mobile || '--', 15, 68);
    doc.text(customer.address || 'Surat, Gujarat', 15, 74, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 110, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}`, 110, 80, { maxWidth: 85 });

    let y = 90;
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(15, y, 180, 10, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM DESCRIPTION', 20, y + 7);
    doc.text('QTY', 110, y + 7, { align: 'center' });
    doc.text('RATE', 140, y + 7, { align: 'center' });
    doc.text('GST%', 165, y + 7, { align: 'center' });
    doc.text('AMOUNT', 190, y + 7, { align: 'right' });

    y += 10;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    items.forEach((item, index) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text(item.name, 20, y + 7);
      doc.text(String(item.quantity), 110, y + 7, { align: 'center' });
      doc.text(item.rate.toLocaleString(), 140, y + 7, { align: 'center' });
      doc.text(`${item.gstPercent}%`, 165, y + 7, { align: 'center' });
      doc.text(item.amount.toLocaleString(), 190, y + 7, { align: 'right' });
      y += 10;
      doc.setDrawColor(240);
      doc.line(15, y, 195, y);
    });

    y += 10;
    const rightX = 195;
    const labelX = 150;
    
    const drawTotalRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(label, labelX, y);
      doc.text(value, rightX, y, { align: 'right' });
      y += 7;
    };

    drawTotalRow('Subtotal:', calculations.subtotal.toLocaleString());
    drawTotalRow('Discount:', `-${calculations.totalDiscount.toLocaleString()}`);
    drawTotalRow('CGST (9%):', calculations.cgst.toLocaleString());
    drawTotalRow('SGST (9%):', calculations.sgst.toLocaleString());
    
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(labelX - 10, y - 5, 55, 12, 'F');
    doc.setTextColor(255);
    drawTotalRow('GRAND TOTAL:', `INR ${calculations.grandTotal.toLocaleString()}`, true);

    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('TERMS & CONDITIONS:', 15, 260);
    doc.text('1. Goods once sold will not be taken back.', 15, 265);
    doc.text(`2. Support Hub: ${profile.whatsapp || '+91 88669 83900'}`, 15, 270);
    doc.text('3. Powered by GOOD JOB 5 ERP Solutions.', 15, 275);
    
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATORY', 195, 285, { align: 'right' });
    doc.line(150, 280, 195, 280);

    doc.save(`${nextInvoiceNumber}.pdf`);
    toast({ title: "PDF Generated", description: "Official GJ5 ERP manifest ready for dispatch." });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 print:bg-white print:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-6">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-[#123C8C] rounded-xl text-white shadow-lg shadow-blue-900/20">
                        <Receipt className="w-6 h-6" />
                     </div>
                     <div>
                        <h2 className="text-xl font-headline font-bold">{store.companyProfile?.companyName?.toUpperCase() || 'GJ5 ERP BILLING'}</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">GOOD JOB 5 ERP ENGINE v4.0</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <Badge className="bg-[#123C8C] font-code text-sm px-3 py-1">{nextInvoiceNumber}</Badge>
                     <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Next Sequence</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Client Metadata</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Official Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="pl-10 h-11 border-slate-800 bg-white text-slate-900" placeholder="Enter Full Name" />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Communication Node (Mobile)</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Input value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} className="pl-10 h-11 border-slate-800 bg-white text-slate-900" placeholder="10 Digit Number" />
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Client GSTIN (Optional)</Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Input value={customer.gstin} onChange={e => setCustomer({...customer, gstin: e.target.value})} className="pl-10 h-11 border-slate-800 bg-white text-slate-900" placeholder="24XXXXX..." />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Shipping / Billing Destination</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="pl-10 h-11 border-slate-800 bg-white text-slate-900" placeholder="Full Address Node" />
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-6 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Item Discovery</h4>
                <div className="space-y-4">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                      <Input 
                        placeholder="Scan Barcode or Search Asset Registry..." 
                        value={searchStock}
                        onChange={e => setSearchStock(e.target.value)}
                        className="pl-10 h-12 border-slate-800 font-bold bg-white text-slate-900" 
                      />
                      {filteredStock.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 mt-1 rounded-xl shadow-2xl overflow-hidden">
                           {filteredStock.map((s: any) => (
                             <button key={s.id} onClick={() => handleSelectItem(s)} className="w-full text-left p-3 hover:bg-slate-100 flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{s.name}</p>
                                  <p className="text-[9px] text-slate-500 uppercase">{s.brand} • SKU: {s.id}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-code font-bold text-emerald-600">₹{s.sellingPrice}</p>
                                  <p className="text-[9px] text-slate-600 uppercase">Stock: {s.quantity}</p>
                                </div>
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2 space-y-1">
                         <Label className="text-[9px] uppercase font-bold text-slate-500">Asset Label</Label>
                         <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="h-10 text-xs border-slate-800 bg-white text-slate-900" />
                      </div>
                      <div className="space-y-1">
                         <Label className="text-[9px] uppercase font-bold text-slate-500">Qty</Label>
                         <Input type="number" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})} className="h-10 font-code text-xs border-slate-800 bg-white text-slate-900" />
                      </div>
                      <div className="space-y-1">
                         <Label className="text-[9px] uppercase font-bold text-slate-500">Rate (₹)</Label>
                         <Input type="number" value={newItem.rate} onChange={e => setNewItem({...newItem, rate: Number(e.target.value)})} className="h-10 font-code text-xs text-[#123C8C] font-bold border-slate-800 bg-white text-slate-900" />
                      </div>
                      <div className="flex items-end">
                         <Button onClick={addItem} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10"><Plus className="w-4 h-4 mr-2" /> Add</Button>
                      </div>
                   </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[9px] uppercase font-bold">Item Description</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-center">Qty</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-center">Rate</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-right">Amount</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold w-10"></TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {items.map(item => (
                           <TableRow key={item.id} className="border-slate-800/50">
                              <TableCell>
                                 <p className="text-xs font-bold text-slate-200">{item.name}</p>
                                 <p className="text-[9px] text-slate-500 uppercase">{item.brand}</p>
                              </TableCell>
                              <TableCell className="text-center font-code text-xs">{item.quantity}</TableCell>
                              <TableCell className="text-center font-code text-xs">₹{item.rate.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-code text-xs font-bold text-emerald-400">₹{item.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                 <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-7 w-7 text-[#E53935] hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                              </TableCell>
                           </TableRow>
                         ))}
                         {items.length === 0 && (
                           <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-600 text-xs italic">No items listed in current manifest.</TableCell></TableRow>
                         )}
                      </TableBody>
                   </Table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Fiscal Node</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Payment Mode</Label>
                          <Select value={paymentMode} onValueChange={v => setPaymentMode(v as any)}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="UPI">Digital UPI</SelectItem>
                                <SelectItem value="Cash">Cash Currency</SelectItem>
                                <SelectItem value="Bank Transfer">Bank RTGS/NEFT</SelectItem>
                                <SelectItem value="Credit">Credit Archive</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Payment Status</Label>
                          <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v as any)}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="Paid">Confirmed Paid</SelectItem>
                                <SelectItem value="Unpaid">Pending Audit</SelectItem>
                                <SelectItem value="Partial">Token Received</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Invoice Date</Label>
                          <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-11 text-xs border-slate-800 bg-white text-slate-900" />
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Settlement Deadline</Label>
                          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 text-xs border-slate-800 bg-white text-slate-900" />
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 space-y-4">
                    <h4 className="text-[11px] font-black uppercase text-[#123C8C] tracking-tighter flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5" /> Settlement Ledger</h4>
                    <div className="space-y-2.5">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500 uppercase font-bold">Base Assessment</span>
                          <span className="font-code font-bold">₹{calculations.subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-[#123C8C]">
                          <span className="uppercase font-bold">Integrated CGST (9%)</span>
                          <span className="font-code font-bold">+₹{calculations.cgst.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-[#123C8C]">
                          <span className="uppercase font-bold">Integrated SGST (9%)</span>
                          <span className="font-code font-bold">+₹{calculations.sgst.toLocaleString()}</span>
                       </div>
                       <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black uppercase text-slate-100">Total Receivable</span>
                            <p className="text-[8px] text-slate-600 font-bold uppercase italic">Inclusive of all taxes</p>
                          </div>
                          <span className="text-3xl font-headline font-black text-emerald-400">₹{calculations.grandTotal.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-white text-slate-950 rounded-2xl shadow-2xl overflow-hidden sticky top-24 scale-[0.9] origin-top border-4 border-slate-800/20">
              <CardHeader className="bg-[#0F172A] p-4 flex flex-row justify-between items-center space-y-0">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white italic leading-none">{store.companyProfile?.companyName?.toUpperCase() || 'GJ5 ERP'}</span>
                    <span className="text-[6px] font-bold text-[#123C8C] uppercase tracking-widest mt-1">Live Manifest Preview</span>
                 </div>
                 <Badge className="bg-[#E53935] text-[8px] uppercase border-0">A4 Calibration</Badge>
              </CardHeader>
              <div className="aspect-[1/1.414] p-8 flex flex-col gap-6">
                 <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col">
                       <h2 className="text-xl font-black italic tracking-tighter leading-none text-[#123C8C]">{store.companyProfile?.companyName?.toUpperCase() || 'GJ5 ERP'}</h2>
                       <span className="text-[7px] font-bold text-slate-600 mt-1 uppercase">{store.companyProfile?.address || ''}, {store.companyProfile?.city || ''} • MO: {store.companyProfile?.whatsapp || ''}</span>
                    </div>
                    <div className="text-right">
                       <h3 className="text-xs font-black uppercase text-[#E53935]">Tax Invoice</h3>
                       <span className="text-[7px] font-bold font-code">{nextInvoiceNumber}</span>
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-start text-[8px]">
                    <div className="flex flex-col gap-1">
                       <span className="font-black text-slate-400 uppercase">Bill To:</span>
                       <span className="font-bold text-[10px]">{customer.name || 'CLIENT NAME'}</span>
                       <span className="font-medium text-slate-600">{customer.mobile || 'MOBILE NO'}</span>
                       <span className="font-medium text-slate-600 max-w-[120px]">{customer.address || 'CLIENT ADDRESS'}</span>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                       <span className="font-black text-slate-400 uppercase">Date:</span>
                       <span className="font-bold">{format(new Date(invoiceDate), 'dd/MM/yyyy')}</span>
                    </div>
                 </div>

                 <div className="flex-1">
                    <div className="grid grid-cols-12 border-y border-slate-200 py-2 text-[8px] font-black uppercase text-slate-400 mb-2">
                       <span className="col-span-8">Description</span>
                       <span className="col-span-1 text-center">Qty</span>
                       <span className="col-span-3 text-right">Amount</span>
                    </div>
                    <div className="space-y-2">
                       {items.map((it, idx) => (
                         <div key={idx} className="grid grid-cols-12 text-[9px] font-bold border-b border-slate-50 pb-1">
                            <div className="col-span-8">
                               <p className="leading-tight">{it.name}</p>
                               <span className="text-[6px] text-slate-500 uppercase">{it.brand}</span>
                            </div>
                            <span className="col-span-1 text-center">{it.quantity}</span>
                            <span className="col-span-3 text-right">₹{it.amount}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1.5 border-t-2 border-slate-900 pt-4">
                    <div className="flex justify-between text-[8px]">
                       <span className="font-bold text-slate-500 uppercase">Subtotal Assessment</span>
                       <span className="font-bold">₹{calculations.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                       <span className="font-bold text-slate-500 uppercase">Total Integrated GST</span>
                       <span className="font-bold">₹{calculations.cgst + calculations.sgst}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black border-t border-slate-100 pt-1">
                       <span className="uppercase">Net Payable</span>
                       <span className="text-[#E53935] italic">₹{calculations.grandTotal}</span>
                    </div>
                 </div>
                 <div className="mt-auto pt-4 text-center">
                    <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">GOOD JOB 5 ERP - Smart Business Solutions</p>
                 </div>
              </div>
           </Card>

           <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleSave} className="h-12 bg-[#123C8C] hover:bg-[#0D2E63] font-bold uppercase text-xs shadow-xl"><Save className="w-4 h-4 mr-2" /> Commit Invoice</Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="h-12 border-slate-800 bg-slate-900/50 font-bold uppercase text-xs hover:bg-slate-800"><FileDown className="w-4 h-4 mr-2" /> PDF Render</Button>
              <Button onClick={() => window.print()} variant="outline" className="h-12 border-slate-800 bg-slate-900/50 font-bold uppercase text-xs hover:bg-slate-800"><Printer className="w-4 h-4 mr-2" /> Thermal Print</Button>
              <Button variant="outline" className="h-12 border-slate-800 bg-slate-900/50 font-bold uppercase text-xs text-emerald-400 hover:bg-emerald-500/10"><MessageSquare className="w-4 h-4 mr-2" /> WhatsApp</Button>
           </div>
        </div>
      </div>
    </div>
  );
}
