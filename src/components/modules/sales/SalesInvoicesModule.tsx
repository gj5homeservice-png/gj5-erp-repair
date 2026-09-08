"use client"

import React, { useState, useMemo } from 'react';
import { Search, Eye, Printer, FileDown, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { addLogoToPdf } from '@/lib/branding';

export function SalesInvoicesModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  const invoices = store.salesInvoices || [];
  const orderById = useMemo(() => {
    const map = new Map<string, any>();
    (store.salesOrders || []).forEach((o: any) => map.set(o.id, o));
    return map;
  }, [store.salesOrders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((i: any) => !q || i.invoiceNumber.toLowerCase().includes(q) || i.customerName?.toLowerCase().includes(q) || i.orderId?.toLowerCase().includes(q))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, search]);

  const buildPdf = (inv: any) => {
    const order = orderById.get(inv.orderId);
    const profile = store.companyProfile || {};
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    const hasLogo = addLogoToPdf(doc, profile.logoUrl, 15, 8, 24, 24);
    const headerTextX = hasLogo ? 44 : 15;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE', headerTextX, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SALES TAX INVOICE', headerTextX, 27);
    doc.text(`GSTIN: ${profile.gstNumber || 'N/A'}`, headerTextX, 33);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${inv.invoiceNumber}`, 150, 50);
    doc.text(`Date: ${format(new Date(inv.invoiceDate), 'dd/MM/yyyy')}`, 150, 56);
    doc.text(`Order ID: ${inv.orderId}`, 150, 62);

    doc.setDrawColor(200);
    doc.line(15, 45, 195, 45);
    doc.text('BILL TO:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(inv.customerName || 'Walk-in Customer', 15, 62);
    doc.text(inv.mobile || '--', 15, 68);
    if (order) doc.text(`${order.brand || ''} ${order.model || ''}`, 15, 74);

    let y = 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal:', 130, y); doc.text(`Rs. ${(order?.subtotal ?? inv.amount - inv.gstAmount).toLocaleString()}`, 195, y, { align: 'right' }); y += 8;
    doc.text('GST:', 130, y); doc.text(`Rs. ${inv.gstAmount.toLocaleString()}`, 195, y, { align: 'right' }); y += 8;
    doc.setFontSize(13);
    doc.text('GRAND TOTAL:', 130, y); doc.text(`Rs. ${inv.amount.toLocaleString()}`, 195, y, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Powered by GOOD JOB 5 ERP Solutions.', 15, 280);
    return doc;
  };

  const handlePrint = (inv: any) => {
    const doc = buildPdf(inv);
    doc.autoPrint?.();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleDownload = (inv: any) => {
    const doc = buildPdf(inv);
    doc.save(`${inv.invoiceNumber}.pdf`);
    toast({ title: 'Invoice Downloaded', description: `${inv.invoiceNumber}.pdf saved.` });
  };

  const handleSend = (inv: any) => {
    const msg = `Hello ${inv.customerName}, your invoice ${inv.invoiceNumber} for Rs. ${inv.amount.toLocaleString()} is ready. Thank you for shopping with GJ5!`;
    const url = `https://web.whatsapp.com/send?phone=91${inv.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Invoices</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">System-Generated & Permanent</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Invoice No, Customer, Order ID..." className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-[#F8FAFC]" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Invoice No.</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Date</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Customer</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Order ID</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Amount</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">GST</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Payment</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv: any) => (
              <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="font-code font-bold text-blue-400 text-xs">{inv.invoiceNumber}</TableCell>
                <TableCell className="text-xs text-slate-300">{format(new Date(inv.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-xs font-bold text-slate-200">{inv.customerName}</TableCell>
                <TableCell className="text-xs text-slate-400 font-code">{inv.orderId}</TableCell>
                <TableCell className="text-xs font-code text-slate-200">₹{inv.amount.toLocaleString()}</TableCell>
                <TableCell className="text-xs font-code text-slate-400">₹{inv.gstAmount.toLocaleString()}</TableCell>
                <TableCell><Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] uppercase">{inv.paymentStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-400" onClick={() => setViewingInvoice(inv)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-400" onClick={() => handlePrint(inv)}><Printer className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400" onClick={() => handleDownload(inv)}><FileDown className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-cyan-400" onClick={() => handleSend(inv)}><Send className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-600 text-xs italic">No invoices generated yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">{viewingInvoice.invoiceNumber}</h3>
              <button onClick={() => setViewingInvoice(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-2 text-xs">
              {[
                ['Customer', viewingInvoice.customerName], ['Mobile', viewingInvoice.mobile],
                ['Order ID', viewingInvoice.orderId], ['Date', format(new Date(viewingInvoice.invoiceDate), 'dd/MM/yyyy')],
                ['Amount', `₹${viewingInvoice.amount.toLocaleString()}`], ['GST', `₹${viewingInvoice.gstAmount.toLocaleString()}`],
                ['Payment Status', viewingInvoice.paymentStatus]
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-500 uppercase font-bold">{label}</span>
                  <span className="text-slate-200 font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
