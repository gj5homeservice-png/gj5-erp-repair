"use client"

import React, { useState } from 'react';
import { 
  Printer, 
  Receipt,
  FileDown,
  Plus,
  Trash2,
  Package,
  User,
  Save,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useErpStore } from '@/hooks/use-erp-store';
import { useToast } from '@/hooks/use-toast';

export function BillingModule({ store }: { store: any }) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState("");
  const [mobile, setMobile] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);

  const subtotal = qty * rate;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const handleSave = () => {
    if (!customer || !product) {
      toast({ variant: "destructive", title: "Error", description: "Customer and Product are required." });
      return;
    }
    const inv = {
      id: `INV${Date.now()}`,
      invoiceNumber: `INV-${String(store.invoices.length + 1).padStart(6, '0')}`,
      customerName: customer,
      mobile: mobile,
      items: [{ name: product, quantity: qty, rate: rate, total: subtotal + gst }],
      total: total,
      timestamp: new Date().toISOString()
    };
    store.addInvoice(inv);
    toast({ title: "Invoice Saved", description: "Record committed to local ledger." });
    setCustomer(""); setMobile(""); setProduct(""); setQty(1); setRate(0);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="border-b border-slate-800 p-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0066FF] rounded-xl text-white">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-headline font-bold">Billing System</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Standard Fiscal Entry</p>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Customer Name" value={customer} onChange={e => setCustomer(e.target.value)} className="bg-slate-950" />
            <Input placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} className="bg-slate-950" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Product Name" value={product} onChange={e => setProduct(e.target.value)} className="bg-slate-950" />
            <Input type="number" placeholder="Rate" value={rate} onChange={e => setRate(Number(e.target.value))} className="bg-slate-950" />
            <Input type="number" placeholder="Qty" value={qty} onChange={e => setQty(Number(e.target.value))} className="bg-slate-950" />
          </div>

          <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold">₹{subtotal.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-slate-500">GST (18%):</span>
                <span className="font-bold">₹{gst.toLocaleString()}</span>
             </div>
             <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-lg font-bold">Total Amount:</span>
                <span className="text-2xl font-black text-emerald-400">₹{total.toLocaleString()}</span>
             </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 h-12 font-bold uppercase text-[10px]"><Save className="w-4 h-4 mr-2" /> Save Bill</Button>
            <Button onClick={() => window.print()} variant="outline" className="border-slate-800 h-12 font-bold uppercase text-[10px]"><Printer className="w-4 h-4 mr-2" /> Print</Button>
            <Button variant="outline" className="border-slate-800 h-12 font-bold uppercase text-[10px]"><FileDown className="w-4 h-4 mr-2" /> PDF</Button>
            <Button variant="outline" className="border-slate-800 h-12 font-bold uppercase text-[10px] text-emerald-400"><MessageSquare className="w-4 h-4 mr-2" /> WhatsApp</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}