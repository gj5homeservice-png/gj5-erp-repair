"use client"

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  FileDown, 
  Edit, 
  Trash2, 
  Eye, 
  History,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Invoice } from '@/lib/types';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { jsPDF } from 'jspdf';

interface InvoiceHistoryModuleProps {
  store: any;
  onEditInvoice: (invoice: Invoice) => void;
}

export function InvoiceHistoryModule({ store, onEditInvoice }: InvoiceHistoryModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('All');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredInvoices = useMemo(() => {
    return (store.invoices || []).filter((inv: Invoice) => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.mobile.includes(searchQuery);

      const date = parseISO(inv.timestamp);
      let matchesTime = true;
      if (timeFilter === 'Today') matchesTime = isToday(date);
      else if (timeFilter === 'This Week') matchesTime = isThisWeek(date);
      else if (timeFilter === 'This Month') matchesTime = isThisMonth(date);
      else if (timeFilter === 'This Year') matchesTime = isThisYear(date);

      return matchesSearch && matchesTime;
    }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [store.invoices, searchQuery, timeFilter]);

  const handleDownloadPDF = (inv: Invoice) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('GJ5 HOME SERVICE', 15, 25);
      doc.setFontSize(10);
      doc.text('Invoice Number: ' + inv.invoiceNumber, 15, 32);
      doc.text('Date: ' + format(parseISO(inv.timestamp), 'dd/MM/yyyy'), 15, 37);
      
      doc.text('Customer: ' + inv.customerName, 15, 50);
      doc.text('Mobile: ' + inv.mobile, 15, 55);
      doc.text('Address: ' + inv.address, 15, 60);

      doc.text('Device: ' + inv.brand + ' ' + inv.model, 15, 75);
      doc.text('Job ID: ' + inv.jobId, 15, 80);

      let y = 100;
      doc.text('Description', 15, y);
      doc.text('Amount', 170, y);
      doc.line(15, y + 2, 195, y + 2);
      
      y += 10;
      inv.items.forEach(item => {
        doc.text(item.name + ' (Qty: ' + item.quantity + ')', 15, y);
        doc.text('INR ' + item.total.toFixed(2), 170, y);
        y += 8;
      });
      
      doc.text('Labour Charges', 15, y);
      doc.text('INR ' + inv.labourCharges.toFixed(2), 170, y);
      
      y += 15;
      doc.text('Total Amount:', 140, y);
      doc.text('INR ' + inv.total.toFixed(2), 170, y);

      doc.save(`${inv.invoiceNumber}.pdf`);
      toast({ title: "PDF Generated", description: "Your invoice has been downloaded." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "PDF Error", description: "Failed to generate PDF." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Invoice History Hub</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Full Financial Audit Trail</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search ID, Name, Mob..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 bg-slate-950 border-slate-800 h-11"
            />
          </div>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-36 bg-slate-950 border-slate-800 h-11 text-xs font-bold uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="font-headline text-slate-400 text-[10px] uppercase">Invoice Info</TableHead>
                <TableHead className="font-headline text-slate-400 text-[10px] uppercase">Customer</TableHead>
                <TableHead className="font-headline text-slate-400 text-[10px] uppercase">Amount & Status</TableHead>
                <TableHead className="font-headline text-slate-400 text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv: Invoice) => (
                <TableRow key={inv.id} className="border-slate-800/50 hover:bg-slate-800/20">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-code font-bold text-[#0066FF] text-xs">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{inv.jobId} • {format(parseISO(inv.timestamp), 'dd MMM yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-500 font-code">{inv.mobile}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-code font-bold text-emerald-400">₹{inv.total.toLocaleString()}</span>
                      <Badge className={cn("w-fit text-[8px] uppercase mt-1", 
                        inv.paymentStatus === 'Paid' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {inv.paymentStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewingInvoice(inv)} className="h-8 w-8 text-blue-400"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onEditInvoice(inv)} className="h-8 w-8 text-amber-400"><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(inv)} className="h-8 w-8 text-emerald-400"><Download className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteInvoiceId(inv.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500 italic">No invoices found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          {viewingInvoice && (
            <>
              <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-400" /> {viewingInvoice.invoiceNumber} Details
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  Committed on {format(parseISO(viewingInvoice.timestamp), 'dd MMMM yyyy, hh:mm a')}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <Label className="text-[9px] text-slate-500 uppercase font-black">Customer Details</Label>
                    <p className="font-bold">{viewingInvoice.customerName}</p>
                    <p className="text-xs text-slate-400">{viewingInvoice.mobile}</p>
                    <p className="text-xs text-slate-400 truncate">{viewingInvoice.address}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <Label className="text-[9px] text-slate-500 uppercase font-black">Job Context</Label>
                    <p className="font-bold">{viewingInvoice.brand} {viewingInvoice.model}</p>
                    <p className="text-xs text-[#0066FF] font-code font-bold">JOB ID: {viewingInvoice.jobId}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[9px] text-slate-500 uppercase font-black">Itemized Ledger</Label>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
                    {viewingInvoice.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                        <span className="text-slate-300">{item.name} x {item.quantity}</span>
                        <span className="font-code font-bold">₹{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs py-1 text-slate-400 italic">
                      <span>Labour & Service Charges</span>
                      <span className="font-code">₹{viewingInvoice.labourCharges.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                   <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                      <span>Subtotal</span>
                      <span>₹{viewingInvoice.subtotal.toLocaleString()}</span>
                   </div>
                   {viewingInvoice.taxEnabled && (
                     <div className="flex justify-between text-[10px] text-blue-400 uppercase font-bold">
                        <span>GST (18%)</span>
                        <span>₹{viewingInvoice.gst.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="font-headline font-bold uppercase">Total Payable</span>
                      <span className="font-code font-bold text-xl text-emerald-400">₹{viewingInvoice.total.toLocaleString()}</span>
                   </div>
                </div>
              </div>
              <DialogFooter className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-2">
                <Button variant="outline" onClick={() => setViewingInvoice(null)} className="border-slate-800">Close</Button>
                <Button onClick={() => handleDownloadPDF(viewingInvoice)} className="bg-[#0066FF] hover:bg-blue-600">
                  <Printer className="w-4 h-4 mr-2" /> Print Invoice
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DeleteJobModal 
        isOpen={!!deleteInvoiceId} 
        onClose={() => setDeleteInvoiceId(null)} 
        jobId={store.invoices.find((i: any) => i.id === deleteInvoiceId)?.invoiceNumber || ''} 
        onConfirm={() => { if (deleteInvoiceId) store.deleteInvoice(deleteInvoiceId); setDeleteInvoiceId(null); }} 
      />
    </div>
  );
}
