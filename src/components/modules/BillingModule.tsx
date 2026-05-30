"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Calculator, 
  Check, 
  Receipt,
  Monitor,
  Layout,
  StretchVertical,
  QrCode,
  Search,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export function BillingModule({ store }: { store: any }) {
  const [billData, setBillData] = useState({
    jobId: '',
    customerId: '',
    customerName: '',
    mobile: '',
    address: '',
    brand: '',
    model: '',
    category: 'TV Repair',
    hardwareCost: 0,
    laborCost: 0,
    additionalCharges: 0,
    taxEnabled: true,
    notes: '',
    problem: ''
  });

  const [activeTemplate, setActiveTemplate] = useState('modern');

  // Auto-fetch data when Job ID is entered
  useEffect(() => {
    if (billData.jobId) {
      const job = store.calls.find((c: any) => c.id.toUpperCase() === billData.jobId.toUpperCase());
      if (job) {
        setBillData(prev => ({
          ...prev,
          customerId: job.customerId,
          customerName: job.customerName,
          mobile: job.mobile,
          address: job.address,
          brand: job.brand,
          model: job.model,
          problem: job.problemDescription || '',
          category: job.category || 'TV Repair'
        }));
      }
    }
  }, [billData.jobId, store.calls]);

  const subtotal = useMemo(() => {
    return billData.hardwareCost + billData.laborCost + billData.additionalCharges;
  }, [billData.hardwareCost, billData.laborCost, billData.additionalCharges]);

  const cgst = billData.taxEnabled ? subtotal * 0.09 : 0;
  const sgst = billData.taxEnabled ? subtotal * 0.09 : 0;
  const total = subtotal + cgst + sgst;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    const filename = `${billData.jobId || 'INV'}_Invoice.pdf`;

    // GJ5 HOME SERVICE Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('GJ5 HOME SERVICE', 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Service & Repair Hub', 20, 36);
    doc.text('Main Road, Adajan, Surat, Gujarat - 395009', 20, 41);

    // Invoice Header
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text('INVOICE', 190, 30, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`#INV-${billData.jobId || 'XXXX'}`, 190, 36, { align: 'right' });
    doc.text(`DATE: ${timestamp}`, 190, 41, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(20, 50, 190, 50);

    // Customer & Job Details
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(billData.customerName || 'N/A', 20, 66);
    doc.text(`Mobile: ${billData.mobile || 'N/A'}`, 20, 71);
    doc.text(`Address: ${billData.address || 'N/A'}`, 20, 76, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.text('JOB DETAILS:', 110, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Job ID: ${billData.jobId || 'N/A'}`, 110, 66);
    doc.text(`Device: ${billData.brand} ${billData.model}`, 110, 71);
    doc.text(`Problem: ${billData.problem}`, 110, 76, { maxWidth: 80 });

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 95, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 25, 102);
    doc.text('AMOUNT', 185, 102, { align: 'right' });

    // Table Content
    let y = 112;
    const items = [
      { desc: 'Hardware Parts Replacement', amt: billData.hardwareCost },
      { desc: 'Technician Labor / Service', amt: billData.laborCost },
      { desc: 'Additional / Misc Charges', amt: billData.additionalCharges }
    ];

    items.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.text(item.desc, 25, y);
      doc.text(`INR ${item.amt.toFixed(2)}`, 185, y, { align: 'right' });
      y += 10;
    });

    doc.line(20, y, 190, y);
    y += 10;

    // Totals
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL:', 140, y);
    doc.text(`INR ${subtotal.toFixed(2)}`, 185, y, { align: 'right' });
    y += 7;

    if (billData.taxEnabled) {
      doc.text('CGST (9%):', 140, y);
      doc.text(`INR ${cgst.toFixed(2)}`, 185, y, { align: 'right' });
      y += 7;
      doc.text('SGST (9%):', 140, y);
      doc.text(`INR ${sgst.toFixed(2)}`, 185, y, { align: 'right' });
      y += 7;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL:', 140, y + 5);
    doc.text(`INR ${total.toFixed(2)}`, 185, y + 5, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('Note: This is a computer-generated invoice. No signature required.', 105, 280, { align: 'center' });

    doc.save(filename);

    // Save invoice to store
    store.addInvoice({
      id: `INV${Date.now()}`,
      jobId: billData.jobId,
      customerId: billData.customerId,
      customerName: billData.customerName,
      mobile: billData.mobile,
      address: billData.address,
      brand: billData.brand,
      model: billData.model,
      hardwareCost: billData.hardwareCost,
      laborCost: billData.laborCost,
      additionalCharges: billData.additionalCharges,
      taxEnabled: billData.taxEnabled,
      subtotal,
      cgst,
      sgst,
      total,
      notes: billData.notes,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="space-y-8">
        <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 rounded-xl bg-[#0066FF] text-white">
                <Receipt className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-2xl font-headline font-bold">Invoice Forge</h2>
                <p className="text-sm text-slate-400">Generate professional repair bills</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Search className="w-3 h-3" /> Job ID Lookup
                </Label>
                <Input 
                  value={billData.jobId} 
                  onChange={e => setBillData({...billData, jobId: e.target.value})}
                  className="bg-slate-950 border-slate-800 font-code font-bold text-blue-400 h-11" 
                  placeholder="TV1001"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Customer Name</Label>
                <Input 
                  value={billData.customerName} 
                  readOnly={!!billData.jobId && !!billData.customerName}
                  onChange={e => setBillData({...billData, customerName: e.target.value})}
                  className="bg-slate-950 border-slate-800 h-11" 
                />
             </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-slate-800">
             <h3 className="text-lg font-headline font-bold flex items-center gap-2">
               <Calculator className="w-5 h-5 text-[#0066FF]" />
               Calculation Engine
             </h3>
             <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Parts Cost</Label>
                   <Input 
                     type="number"
                     value={billData.hardwareCost}
                     onChange={e => setBillData({...billData, hardwareCost: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-11" 
                   />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Labor Cost</Label>
                   <Input 
                     type="number"
                     value={billData.laborCost}
                     onChange={e => setBillData({...billData, laborCost: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-11" 
                   />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Additional</Label>
                   <Input 
                     type="number"
                     value={billData.additionalCharges}
                     onChange={e => setBillData({...billData, additionalCharges: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-11" 
                   />
                </div>
             </div>

             <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                   <Label className="text-lg font-headline font-bold">Apply 18% GST (Tax)</Label>
                   <p className="text-xs text-slate-500">9% CGST + 9% SGST</p>
                </div>
                <Switch 
                  checked={billData.taxEnabled}
                  onCheckedChange={v => setBillData({...billData, taxEnabled: v})}
                />
             </div>

             <div className="p-6 bg-[#0066FF]/5 rounded-2xl border border-[#0066FF]/20 space-y-3">
                <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Subtotal</span>
                   <span className="font-code">₹{subtotal.toFixed(2)}</span>
                </div>
                {billData.taxEnabled && (
                  <>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-400">CGST (9%)</span>
                       <span className="font-code">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-400">SGST (9%)</span>
                       <span className="font-code">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-3 border-t border-slate-800">
                   <span className="font-headline font-bold text-lg">Grand Total</span>
                   <span className="font-code font-bold text-2xl text-[#0066FF]">₹{total.toFixed(2)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <Label>Manual Notes / T&C</Label>
             <Input 
               value={billData.notes}
               onChange={e => setBillData({...billData, notes: e.target.value})}
               className="bg-slate-950 border-slate-800" 
               placeholder="Add special warranty or delivery notes..."
             />
          </div>
        </div>

        <div className="flex gap-4">
           <Button onClick={() => window.print()} className="flex-1 bg-slate-800 hover:bg-slate-700 h-12 text-lg font-headline rounded-xl border border-slate-700">
              <Printer className="w-5 h-5 mr-2" />
              Direct Print
           </Button>
           <Button onClick={handleDownloadPDF} className="flex-1 bg-[#0066FF] hover:bg-blue-600 h-12 text-lg font-headline rounded-xl shadow-lg shadow-blue-500/20">
              <FileDown className="w-5 h-5 mr-2" />
              Download PDF
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-headline font-bold">Invoice Preview</h3>
           <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="bg-slate-900 border border-slate-800 rounded-lg p-1">
              <TabsList className="bg-transparent border-0">
                 <TabsTrigger value="modern" className="data-[state=active]:bg-slate-800"><Monitor className="w-4 h-4 mr-2" /> Modern</TabsTrigger>
                 <TabsTrigger value="retail" className="data-[state=active]:bg-slate-800"><Layout className="w-4 h-4 mr-2" /> Retail</TabsTrigger>
                 <TabsTrigger value="thermal" className="data-[state=active]:bg-slate-800"><StretchVertical className="w-4 h-4 mr-2" /> Thermal</TabsTrigger>
              </TabsList>
           </Tabs>
        </div>

        <Card className="bg-white text-black min-h-[700px] overflow-hidden rounded-xl shadow-2xl relative">
          <CardContent className="p-0">
             {activeTemplate === 'modern' && <ModernTemplate data={billData} total={total} cgst={cgst} sgst={sgst} subtotal={subtotal} />}
             {activeTemplate === 'retail' && <RetailTemplate data={billData} total={total} cgst={cgst} sgst={sgst} subtotal={subtotal} />}
             {activeTemplate === 'thermal' && <ThermalTemplate data={billData} total={total} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ModernTemplate({ data, total, cgst, sgst, subtotal }: any) {
  return (
    <div className="p-10 font-sans h-full flex flex-col">
       <div className="flex justify-between items-start border-b-4 border-black pb-8">
          <div>
             <h1 className="text-4xl font-black italic tracking-tighter">GJ5 HOME SERVICE</h1>
             <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Service & Repair Hub</p>
          </div>
          <div className="text-right">
             <h2 className="text-2xl font-bold uppercase">Invoice</h2>
             <p className="font-mono text-sm">#INV-{data.jobId || 'XXXX'}</p>
             <p className="text-xs">{new Date().toLocaleDateString()}</p>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-10 py-10">
          <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Billed To</p>
             <h3 className="text-xl font-bold">{data.customerName || 'Customer Name'}</h3>
             <p className="text-sm text-slate-600">ID: {data.customerId}</p>
             <p className="text-sm text-slate-600">Mob: {data.mobile}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Device Details</p>
             <h3 className="text-xl font-bold">{data.brand} {data.model}</h3>
             <p className="text-sm text-slate-600">{data.category}</p>
          </div>
       </div>

       <div className="flex-1 mt-6">
          <table className="w-full text-left">
             <thead className="bg-slate-100 border-y border-slate-200">
                <tr>
                   <th className="py-3 px-4 text-xs font-bold uppercase">Description</th>
                   <th className="py-3 px-4 text-xs font-bold uppercase text-right">Amount</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                <tr>
                   <td className="py-4 px-4 text-sm font-medium">Hardware Parts Replacement</td>
                   <td className="py-4 px-4 text-sm font-mono text-right">₹{data.hardwareCost.toFixed(2)}</td>
                </tr>
                <tr>
                   <td className="py-4 px-4 text-sm font-medium">Technician Service & Labor</td>
                   <td className="py-4 px-4 text-sm font-mono text-right">₹{data.laborCost.toFixed(2)}</td>
                </tr>
                {data.additionalCharges > 0 && (
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium">Additional / Misc Charges</td>
                    <td className="py-4 px-4 text-sm font-mono text-right">₹{data.additionalCharges.toFixed(2)}</td>
                  </tr>
                )}
             </tbody>
          </table>
       </div>

       <div className="mt-10 pt-10 border-t-2 border-slate-100 flex justify-end">
          <div className="w-64 space-y-2">
             <div className="flex justify-between text-xs text-slate-500 uppercase">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
             </div>
             {data.taxEnabled && (
               <>
                 <div className="flex justify-between text-xs text-slate-500 uppercase">
                    <span>CGST (9%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-500 uppercase">
                    <span>SGST (9%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                 </div>
               </>
             )}
             <div className="flex justify-between items-center pt-4 border-t-4 border-black">
                <span className="font-black text-xl italic uppercase">Total</span>
                <span className="font-black text-2xl italic">₹{total.toFixed(2)}</span>
             </div>
          </div>
       </div>

       <div className="mt-10 bg-slate-100 p-4 rounded text-[10px] text-slate-500 leading-relaxed uppercase">
          {data.notes || 'All electronics repair jobs come with a standard 30-day service warranty unless specified. Hardware warranty as per manufacturer. No returns after delivery.'}
       </div>
    </div>
  );
}

function RetailTemplate({ data, total, cgst, sgst, subtotal }: any) {
  return (
    <div className="p-10 font-serif h-full flex flex-col">
       <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold uppercase">GJ5 HOME SERVICE</h1>
          <p className="text-sm">Main Road, Adajan, Surat, Gujarat - 395009</p>
          <p className="text-sm">Contact: +91 9988776655 | GSTIN: 24AAABC1234D1Z5</p>
       </div>
       <div className="py-6 border-b flex justify-between">
          <div>
             <p className="text-sm"><b>Bill No:</b> {data.jobId || 'XXXX'}</p>
             <p className="text-sm"><b>Date:</b> {new Date().toLocaleDateString()}</p>
          </div>
          <div>
             <p className="text-sm"><b>Customer:</b> {data.customerName}</p>
             <p className="text-sm"><b>ID:</b> {data.customerId}</p>
          </div>
       </div>
       <div className="flex-1 py-6">
          <table className="w-full border-collapse">
             <thead>
                <tr className="border-b">
                   <th className="py-2 text-left text-sm uppercase">Item Description</th>
                   <th className="py-2 text-right text-sm uppercase">Total</th>
                </tr>
             </thead>
             <tbody>
                <tr className="border-b">
                   <td className="py-4 text-sm">Spare Parts Replacement ({data.brand})</td>
                   <td className="py-4 text-right text-sm">₹{data.hardwareCost.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                   <td className="py-4 text-sm">Labor & Service Charges</td>
                   <td className="py-4 text-right text-sm">₹{data.laborCost.toFixed(2)}</td>
                </tr>
                {data.additionalCharges > 0 && (
                  <tr className="border-b">
                    <td className="py-4 text-sm">Misc / Additional Charges</td>
                    <td className="py-4 text-right text-sm">₹{data.additionalCharges.toFixed(2)}</td>
                  </tr>
                )}
             </tbody>
          </table>
       </div>
       <div className="flex justify-end pt-6 space-y-1">
          <div className="w-64">
             <div className="flex justify-between text-sm"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
             {data.taxEnabled && (
               <>
                 <div className="flex justify-between text-sm"><span>CGST 9%:</span><span>₹{cgst.toFixed(2)}</span></div>
                 <div className="flex justify-between text-sm"><span>SGST 9%:</span><span>₹{sgst.toFixed(2)}</span></div>
               </>
             )}
             <div className="flex justify-between font-bold border-t border-black pt-2 mt-2"><span>Grand Total:</span><span>₹{total.toFixed(2)}</span></div>
          </div>
       </div>
    </div>
  );
}

function ThermalTemplate({ data, total }: any) {
  return (
    <div className="p-4 font-mono w-[300px] mx-auto bg-white border border-dashed border-slate-300">
       <div className="text-center border-b border-dashed pb-2 mb-2">
          <h1 className="text-xl font-bold">GJ5 HOME SERVICE</h1>
          <p className="text-[8px]">ADAJAN, SURAT</p>
       </div>
       <div className="text-[10px] space-y-1 mb-4">
          <p>DATE: {new Date().toLocaleDateString()}</p>
          <p>JOB: {data.jobId}</p>
          <p>CUST: {data.customerName}</p>
       </div>
       <div className="border-y border-dashed py-2 mb-2">
          <div className="flex justify-between text-[10px]">
             <span>REPAIR COST</span>
             <span>{total.toFixed(2)}</span>
          </div>
       </div>
       <div className="text-center space-y-2">
          <p className="text-[12px] font-bold">TOTAL: ₹{total.toFixed(2)}</p>
          <div className="flex justify-center">
             <QrCode className="w-16 h-16" />
          </div>
          <p className="text-[8px]">Scan to Pay via UPI</p>
       </div>
       <div className="mt-4 text-center">
          <p className="text-[8px] italic">THANK YOU FOR VISITING!</p>
       </div>
    </div>
  );
}
