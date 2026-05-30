"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Calculator, 
  Receipt,
  Monitor,
  Layout,
  StretchVertical,
  QrCode,
  Search,
  FileDown,
  ImageIcon,
  Truck
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
    deliveryCharge: 0,
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
    return billData.hardwareCost + billData.laborCost + billData.deliveryCharge + billData.additionalCharges;
  }, [billData.hardwareCost, billData.laborCost, billData.deliveryCharge, billData.additionalCharges]);

  const cgst = billData.taxEnabled ? subtotal * 0.09 : 0;
  const sgst = billData.taxEnabled ? subtotal * 0.09 : 0;
  const total = subtotal + cgst + sgst;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    const filename = `${billData.jobId || 'INV'}_Invoice.pdf`;

    // Logo support
    if (store.shopLogo) {
      try {
        doc.addImage(store.shopLogo, 'PNG', 20, 10, 25, 25);
      } catch (e) {
        console.error("Could not add logo to PDF", e);
      }
    }

    // GJ5 HOME SERVICE Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('GJ5 HOME SERVICE', store.shopLogo ? 50 : 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Service & Repair Hub', store.shopLogo ? 50 : 20, 31);
    doc.text('Main Road, Adajan, Surat, Gujarat - 395009', store.shopLogo ? 50 : 20, 36);

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
      { desc: 'Delivery Charges', amt: billData.deliveryCharge },
      { desc: 'Additional / Misc Charges', amt: billData.additionalCharges }
    ].filter(i => i.amt > 0);

    items.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.text(item.desc, 25, y);
      doc.text(`INR ${item.amt.toFixed(2)}`, 185, y, { align: 'right' });
      y += 10;
    });

    if (y < 112) y = 112; // Min height
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
      deliveryCharge: billData.deliveryCharge,
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
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-[#0066FF] text-white">
                <Receipt className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-headline font-bold">Fast Billing Console</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">TV Repair Shop Edition</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Search className="w-3 h-3" /> Job ID
                </Label>
                <Input 
                  value={billData.jobId} 
                  onChange={e => setBillData({...billData, jobId: e.target.value})}
                  className="bg-slate-950 border-slate-800 font-code font-bold text-blue-400 h-10" 
                  placeholder="TV1001"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Customer</Label>
                <Input 
                  value={billData.customerName} 
                  readOnly
                  className="bg-slate-950/50 border-slate-800 h-10 text-slate-400" 
                />
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
             <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
               <Calculator className="w-4 h-4 text-[#0066FF]" />
               Simple Billing Mode
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Parts Cost</Label>
                   <Input 
                     type="number"
                     value={billData.hardwareCost}
                     onChange={e => setBillData({...billData, hardwareCost: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-10" 
                   />
                </div>
                <div className="space-y-1">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Labor Cost</Label>
                   <Input 
                     type="number"
                     value={billData.laborCost}
                     onChange={e => setBillData({...billData, laborCost: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-10" 
                   />
                </div>
                <div className="space-y-1">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                     <Truck className="w-3 h-3" /> Delivery Charge
                   </Label>
                   <Input 
                     type="number"
                     value={billData.deliveryCharge}
                     onChange={e => setBillData({...billData, deliveryCharge: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-10" 
                   />
                </div>
                <div className="space-y-1">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Additional</Label>
                   <Input 
                     type="number"
                     value={billData.additionalCharges}
                     onChange={e => setBillData({...billData, additionalCharges: Number(e.target.value)})}
                     className="bg-slate-950 border-slate-800 text-right font-code h-10" 
                   />
                </div>
             </div>

             <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                   <Label className="text-sm font-bold">Apply 18% GST</Label>
                   <p className="text-[10px] text-slate-500">CGST+SGST</p>
                </div>
                <Switch 
                  checked={billData.taxEnabled}
                  onCheckedChange={v => setBillData({...billData, taxEnabled: v})}
                />
             </div>

             <div className="p-4 bg-[#0066FF]/5 rounded-2xl border border-[#0066FF]/20 space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-slate-400 uppercase font-bold">Subtotal</span>
                   <span className="font-code font-bold">₹{subtotal.toFixed(2)}</span>
                </div>
                {billData.taxEnabled && (
                  <div className="flex justify-between text-xs">
                     <span className="text-slate-400 uppercase font-bold">Total GST (18%)</span>
                     <span className="font-code font-bold">₹{(cgst + sgst).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-800">
                   <span className="font-headline font-bold text-sm uppercase">Grand Total</span>
                   <span className="font-code font-bold text-xl text-[#0066FF]">₹{total.toFixed(2)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <Label className="text-[10px] font-bold text-slate-500 uppercase">Manual Notes</Label>
             <Input 
               value={billData.notes}
               onChange={e => setBillData({...billData, notes: e.target.value})}
               className="bg-slate-950 border-slate-800 h-10" 
               placeholder="Add special warranty details..."
             />
          </div>
        </div>

        <div className="flex gap-4">
           <Button onClick={() => window.print()} variant="outline" className="flex-1 border-slate-700 h-11">
              <Printer className="w-4 h-4 mr-2" /> Print
           </Button>
           <Button onClick={handleDownloadPDF} className="flex-1 bg-[#0066FF] hover:bg-blue-600 h-11 shadow-lg shadow-blue-500/20">
              <FileDown className="w-4 h-4 mr-2" /> Download PDF
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-headline font-bold uppercase tracking-tight">Invoice Preview</h3>
           <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="bg-slate-900 border border-slate-800 rounded-lg p-1">
              <TabsList className="bg-transparent border-0 h-8">
                 <TabsTrigger value="modern" className="text-[10px] px-3"><Monitor className="w-3 h-3 mr-1" /> Modern</TabsTrigger>
                 <TabsTrigger value="retail" className="text-[10px] px-3"><Layout className="w-3 h-3 mr-1" /> Retail</TabsTrigger>
                 <TabsTrigger value="thermal" className="text-[10px] px-3"><StretchVertical className="w-3 h-3 mr-1" /> Thermal</TabsTrigger>
              </TabsList>
           </Tabs>
        </div>

        <Card className="bg-white text-black min-h-[600px] overflow-hidden rounded-xl shadow-2xl relative">
          <CardContent className="p-0">
             {activeTemplate === 'modern' && <ModernTemplate data={billData} total={total} cgst={cgst} sgst={sgst} subtotal={subtotal} logo={store.shopLogo} />}
             {activeTemplate === 'retail' && <RetailTemplate data={billData} total={total} cgst={cgst} sgst={sgst} subtotal={subtotal} logo={store.shopLogo} />}
             {activeTemplate === 'thermal' && <ThermalTemplate data={billData} total={total} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ModernTemplate({ data, total, cgst, sgst, subtotal, logo }: any) {
  return (
    <div className="p-10 font-sans h-full flex flex-col">
       <div className="flex justify-between items-start border-b-4 border-black pb-8">
          <div className="flex items-center gap-4">
             {logo && (
               <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                  <img src={logo} className="w-full h-full object-cover" alt="Logo" />
               </div>
             )}
             <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">GJ5 HOME SERVICE</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Professional Repair Hub</p>
             </div>
          </div>
          <div className="text-right">
             <h2 className="text-2xl font-bold uppercase">Invoice</h2>
             <p className="font-mono text-sm">#INV-{data.jobId || 'XXXX'}</p>
             <p className="text-[10px] uppercase font-bold text-slate-400">{new Date().toLocaleDateString()}</p>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-10 py-10">
          <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Billed To</p>
             <h3 className="text-xl font-bold">{data.customerName || 'Customer Name'}</h3>
             <p className="text-sm text-slate-600 font-mono">ID: {data.customerId}</p>
             <p className="text-sm text-slate-600">Mob: {data.mobile}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Device Profile</p>
             <h3 className="text-xl font-bold">{data.brand} {data.model}</h3>
             <p className="text-sm text-slate-600 uppercase font-bold">{data.category}</p>
          </div>
       </div>

       <div className="flex-1">
          <table className="w-full text-left">
             <thead className="bg-slate-100 border-y border-slate-200">
                <tr>
                   <th className="py-2 px-4 text-[10px] font-bold uppercase">Description</th>
                   <th className="py-2 px-4 text-[10px] font-bold uppercase text-right">Amount</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {data.hardwareCost > 0 && (
                  <tr>
                     <td className="py-3 px-4 text-sm font-medium">Hardware Parts Replacement</td>
                     <td className="py-3 px-4 text-sm font-mono text-right">₹{data.hardwareCost.toFixed(2)}</td>
                  </tr>
                )}
                {data.laborCost > 0 && (
                  <tr>
                     <td className="py-3 px-4 text-sm font-medium">Technician Service & Labor</td>
                     <td className="py-3 px-4 text-sm font-mono text-right">₹{data.laborCost.toFixed(2)}</td>
                  </tr>
                )}
                {data.deliveryCharge > 0 && (
                  <tr>
                     <td className="py-3 px-4 text-sm font-medium">Delivery Charges</td>
                     <td className="py-3 px-4 text-sm font-mono text-right">₹{data.deliveryCharge.toFixed(2)}</td>
                  </tr>
                )}
                {data.additionalCharges > 0 && (
                  <tr>
                    <td className="py-3 px-4 text-sm font-medium">Additional / Misc Charges</td>
                    <td className="py-3 px-4 text-sm font-mono text-right">₹{data.additionalCharges.toFixed(2)}</td>
                  </tr>
                )}
             </tbody>
          </table>
       </div>

       <div className="mt-6 pt-6 border-t-2 border-slate-100 flex justify-end">
          <div className="w-64 space-y-2">
             <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
             </div>
             {data.taxEnabled && (
               <>
                 <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                    <span>CGST (9%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                    <span>SGST (9%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                 </div>
               </>
             )}
             <div className="flex justify-between items-center pt-3 border-t-4 border-black">
                <span className="font-black text-xl italic uppercase">Total</span>
                <span className="font-black text-2xl italic">₹{total.toFixed(2)}</span>
             </div>
          </div>
       </div>

       <div className="mt-8 bg-slate-50 p-4 rounded text-[9px] text-slate-500 leading-relaxed uppercase border border-slate-100">
          {data.notes || 'Note: Standard 30-day service warranty on repairs. Physical damage or burnout cases not covered. Delivery only against original job card.'}
       </div>
    </div>
  );
}

function RetailTemplate({ data, total, cgst, sgst, subtotal, logo }: any) {
  return (
    <div className="p-10 font-serif h-full flex flex-col">
       <div className="text-center border-b pb-6 flex flex-col items-center">
          {logo && <img src={logo} className="w-12 h-12 mb-2 object-contain" alt="Logo" />}
          <h1 className="text-3xl font-bold uppercase tracking-tighter">GJ5 HOME SERVICE</h1>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-600 mt-1">Main Road, Adajan, Surat, Gujarat - 395009</p>
          <p className="text-[10px] font-bold">Contact: +91 9988776655 | GSTIN: 24AAABC1234D1Z5</p>
       </div>
       <div className="py-6 border-b flex justify-between uppercase text-[10px] font-bold">
          <div>
             <p>Bill No: {data.jobId || 'XXXX'}</p>
             <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
             <p>Customer: {data.customerName}</p>
             <p>ID: {data.customerId}</p>
          </div>
       </div>
       <div className="flex-1 py-6">
          <table className="w-full border-collapse">
             <thead>
                <tr className="border-b-2 border-black">
                   <th className="py-2 text-left text-[10px] uppercase font-black">Item Description</th>
                   <th className="py-2 text-right text-[10px] uppercase font-black">Total</th>
                </tr>
             </thead>
             <tbody>
                {data.hardwareCost > 0 && (
                  <tr className="border-b">
                     <td className="py-3 text-xs">Spare Parts Replacement ({data.brand})</td>
                     <td className="py-3 text-right text-xs font-mono">₹{data.hardwareCost.toFixed(2)}</td>
                  </tr>
                )}
                {data.laborCost > 0 && (
                  <tr className="border-b">
                     <td className="py-3 text-xs">Labor & Service Charges</td>
                     <td className="py-3 text-right text-xs font-mono">₹{data.laborCost.toFixed(2)}</td>
                  </tr>
                )}
                {data.deliveryCharge > 0 && (
                  <tr className="border-b">
                     <td className="py-3 text-xs font-bold uppercase">Delivery Service Charge</td>
                     <td className="py-3 text-right text-xs font-mono">₹{data.deliveryCharge.toFixed(2)}</td>
                  </tr>
                )}
                {data.additionalCharges > 0 && (
                  <tr className="border-b">
                    <td className="py-3 text-xs">Misc / Additional Charges</td>
                    <td className="py-3 text-right text-xs font-mono">₹{data.additionalCharges.toFixed(2)}</td>
                  </tr>
                )}
             </tbody>
          </table>
       </div>
       <div className="flex justify-end pt-6 space-y-1">
          <div className="w-64 uppercase text-[10px] font-bold">
             <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
             {data.taxEnabled && (
               <>
                 <div className="flex justify-between"><span>CGST 9%:</span><span>₹{cgst.toFixed(2)}</span></div>
                 <div className="flex justify-between"><span>SGST 9%:</span><span>₹{sgst.toFixed(2)}</span></div>
               </>
             )}
             <div className="flex justify-between font-black border-t-2 border-black pt-2 mt-2 text-sm"><span>Grand Total:</span><span>₹{total.toFixed(2)}</span></div>
          </div>
       </div>
    </div>
  );
}

function ThermalTemplate({ data, total }: any) {
  return (
    <div className="p-4 font-mono w-[280px] mx-auto bg-white border border-dashed border-slate-300">
       <div className="text-center border-b border-dashed pb-2 mb-2">
          <h1 className="text-sm font-bold uppercase">GJ5 HOME SERVICE</h1>
          <p className="text-[7px] uppercase">Main Road, Adajan, Surat</p>
       </div>
       <div className="text-[9px] space-y-0.5 mb-3 uppercase font-bold">
          <p>DATE: {new Date().toLocaleDateString()}</p>
          <p>JOB: {data.jobId}</p>
          <p>CUST: {data.customerName}</p>
       </div>
       <div className="border-y border-dashed py-2 mb-2">
          <div className="flex justify-between text-[9px] font-bold uppercase">
             <span>Repair Total</span>
             <span>{total.toFixed(2)}</span>
          </div>
       </div>
       <div className="text-center space-y-2">
          <p className="text-[12px] font-black uppercase">Grand Total: ₹{total.toFixed(2)}</p>
          <div className="flex justify-center py-2">
             <QrCode className="w-12 h-12" />
          </div>
          <p className="text-[7px] uppercase font-bold">Scan to Pay via UPI</p>
       </div>
       <div className="mt-4 text-center">
          <p className="text-[7px] italic font-bold uppercase">Thank You for your visit!</p>
       </div>
    </div>
  );
}
