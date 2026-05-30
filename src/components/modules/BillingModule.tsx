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
  Truck,
  ShieldCheck,
  Info,
  Palette,
  Check
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

const INVOICE_THEMES = [
  { id: 'classic-blue', name: 'Classic Blue', primary: '#0066FF', secondary: '#E6F0FF', text: 'text-[#0066FF]', bg: 'bg-[#0066FF]' },
  { id: 'modern-yellow', name: 'Modern Yellow', primary: '#F59E0B', secondary: '#FEF3C7', text: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]' },
  { id: 'corporate-red', name: 'Corporate Red', primary: '#EF4444', secondary: '#FEE2E2', text: 'text-[#EF4444]', bg: 'bg-[#EF4444]' },
  { id: 'premium-indigo', name: 'Premium Indigo', primary: '#4F46E5', secondary: '#E0E7FF', text: 'text-[#4F46E5]', bg: 'bg-[#4F46E5]' },
];

export function BillingModule({ store }: { store: any }) {
  const [activeThemeId, setActiveThemeId] = useState('classic-blue');
  const [billData, setBillData] = useState({
    jobId: '',
    customerId: '',
    customerName: '',
    mobile: '',
    address: '',
    brand: '',
    model: '',
    screenSize: '',
    category: 'TV Repair',
    hardwareCost: 0,
    laborCost: 0,
    deliveryCharge: 0,
    additionalCharges: 0,
    taxEnabled: true,
    notes: '',
    problem: '',
    warrantyStatus: 'No Warranty'
  });

  const activeTheme = useMemo(() => 
    INVOICE_THEMES.find(t => t.id === activeThemeId) || INVOICE_THEMES[0]
  , [activeThemeId]);

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
          screenSize: job.screenSize || '',
          problem: job.problemDescription || '',
          category: job.category || 'TV Repair',
          warrantyStatus: job.warrantyDuration || 'No Warranty'
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
    const doc = new jsPDF('p', 'mm', 'a4');
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    const filename = `${billData.jobId || 'INV'}_Invoice.pdf`;
    const themeColor = activeTheme.primary;
    const themeRGB = hexToRgb(themeColor);

    // Logo support
    if (store.shopLogo) {
      try {
        doc.addImage(store.shopLogo, 'PNG', 15, 15, 25, 25);
      } catch (e) {
        console.error("Could not add logo to PDF", e);
      }
    }

    // Company Branding
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
    doc.text('GJ5 HOME SERVICE', store.shopLogo ? 45 : 15, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text('Professional Service & Repair Hub', store.shopLogo ? 45 : 15, 31);
    doc.text('Customer Care: 8866983900', store.shopLogo ? 45 : 15, 36);

    // Invoice Header (Top Right)
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 195, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`#INV-${billData.jobId || 'XXXX'}`, 195, 32, { align: 'right' });
    doc.text(`Date: ${timestamp}`, 195, 38, { align: 'right' });

    doc.setDrawColor(230);
    doc.line(15, 45, 195, 45);

    // Grid Layout for Customer & Job
    let currentY = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER SECTION', 15, currentY);
    doc.text('JOB DETAILS SECTION', 110, currentY);

    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60);
    
    // Customer
    doc.text(`Name: ${billData.customerName || 'N/A'}`, 15, currentY);
    doc.text(`Mobile: ${billData.mobile || 'N/A'}`, 15, currentY + 6);
    doc.text(`Customer ID: ${billData.customerId || 'N/A'}`, 15, currentY + 12);
    doc.text(`Address: ${billData.address || 'N/A'}`, 15, currentY + 18, { maxWidth: 80 });

    // Job Details
    doc.text(`Job ID: ${billData.jobId || 'N/A'}`, 110, currentY);
    doc.text(`Device: ${billData.brand} ${billData.model} (${billData.screenSize}")`, 110, currentY + 6);
    doc.text(`Warranty: ${billData.warrantyStatus}`, 110, currentY + 12);
    doc.text(`Problem: ${billData.problem}`, 110, currentY + 18, { maxWidth: 80 });

    currentY += 35;
    
    // Table Header
    doc.setFillColor(themeRGB.r, themeRGB.g, themeRGB.b);
    doc.rect(15, currentY, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);
    doc.text('DESCRIPTION', 20, currentY + 6);
    doc.text('AMOUNT (INR)', 190, currentY + 6, { align: 'right' });

    currentY += 10;
    
    // Table Rows
    const charges = [
      { desc: 'Hardware Parts Replacement', amt: billData.hardwareCost },
      { desc: 'Labor / Technician Service', amt: billData.laborCost },
      { desc: 'Delivery Charges', amt: billData.deliveryCharge },
      { desc: 'Additional Charges', amt: billData.additionalCharges }
    ];

    charges.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(item.desc, 20, currentY + 8);
      doc.text(item.amt.toFixed(2), 190, currentY + 8, { align: 'right' });
      currentY += 10;
      doc.setDrawColor(245);
      doc.line(15, currentY, 195, currentY);
    });

    currentY += 5;
    
    // Calculation Section
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, currentY);
    doc.text(subtotal.toFixed(2), 190, currentY, { align: 'right' });
    currentY += 7;

    if (billData.taxEnabled) {
      doc.text('CGST (9%):', 140, currentY);
      doc.text(cgst.toFixed(2), 190, currentY, { align: 'right' });
      currentY += 7;
      doc.text('SGST (9%):', 140, currentY);
      doc.text(sgst.toFixed(2), 190, currentY, { align: 'right' });
      currentY += 7;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL:', 140, currentY + 5);
    doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
    doc.text(`INR ${total.toFixed(2)}`, 190, currentY + 5, { align: 'right' });

    // Terms & Conditions
    currentY += 25;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', 15, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const terms = [
      "1. Service charges and delivery charges are non-refundable.",
      "2. TV must be collected within 30 days after repair completion.",
      "3. After 30 days storage charges may apply.",
      "4. No warranty on software updates.",
      "5. Warranty applies only to replaced parts.",
      "6. No warranty on panel damage.",
      "7. No warranty on liquid damage.",
      "8. Warranty void if repaired by another technician.",
      "9. Customer should verify TV condition at delivery.",
      "10. Original invoice required for warranty claim."
    ];
    terms.forEach(term => {
      doc.text(term, 15, currentY);
      currentY += 5;
    });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
    doc.text('Thank You For Choosing GJ5 HOME SERVICE', 105, 275, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('All Electronics Repair Jobs Include Standard Service Warranty Unless Specified.', 105, 280, { align: 'center' });

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
      themeUsed: activeTheme.name,
      notes: billData.notes,
      timestamp: new Date().toISOString()
    });
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 102, b: 255 };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-4">
             <div className={cn("p-3 rounded-xl text-white transition-colors duration-300", activeTheme.bg)}>
                <Receipt className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-headline font-bold">Fast Billing Console</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">GJ5 HOME SERVICE EDITION</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Search className="w-3 h-3" /> Job ID Lookup
                </Label>
                <Input 
                  value={billData.jobId} 
                  onChange={e => setBillData({...billData, jobId: e.target.value})}
                  className={cn("bg-slate-950 border-slate-800 font-code font-bold h-10 transition-colors", activeTheme.text)} 
                  placeholder="TV1001"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Customer</Label>
                <Input 
                  value={billData.customerName} 
                  readOnly
                  placeholder="Auto-fetched..."
                  className="bg-slate-950/50 border-slate-800 h-10 text-slate-400" 
                />
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
             <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
               <Calculator className={cn("w-4 h-4", activeTheme.text)} />
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
                   <p className="text-[10px] text-slate-500">CGST (9%) + SGST (9%)</p>
                </div>
                <Switch 
                  checked={billData.taxEnabled}
                  onCheckedChange={v => setBillData({...billData, taxEnabled: v})}
                />
             </div>

             <div className={cn("p-4 rounded-2xl border transition-all space-y-2", activeTheme.bg + "/5", "border-" + activeTheme.id)}>
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
                   <span className={cn("font-code font-bold text-xl", activeTheme.text)}>₹{total.toFixed(2)}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex gap-4">
           <Button onClick={() => window.print()} variant="outline" className="flex-1 border-slate-700 h-11">
              <Printer className="w-4 h-4 mr-2" /> Direct Print
           </Button>
           <Button onClick={handleDownloadPDF} className={cn("flex-1 h-11 shadow-lg text-white font-bold", activeTheme.bg, activeTheme.bg + "/20")}>
              <FileDown className="w-4 h-4 mr-2" /> Download PDF
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-headline font-bold uppercase tracking-tight flex items-center gap-2">
             <Monitor className="w-5 h-5 text-slate-500" /> Invoice Preview
           </h3>
           <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {INVOICE_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  title={theme.name}
                  className={cn(
                    "w-8 h-8 rounded-md transition-all flex items-center justify-center border-2",
                    activeThemeId === theme.id ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100",
                    theme.bg
                  )}
                >
                  {activeThemeId === theme.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
           </div>
        </div>

        <div className="bg-white text-black min-h-[1123px] w-full max-w-[794px] mx-auto overflow-hidden rounded-sm shadow-2xl relative print:shadow-none print:m-0 print:p-0">
          <div className="p-0">
             <A4MultiThemeTemplate 
                data={billData} 
                total={total} 
                cgst={cgst} 
                sgst={sgst} 
                subtotal={subtotal} 
                logo={store.shopLogo} 
                theme={activeTheme}
             />
          </div>
        </div>
      </div>
    </div>
  );
}

function A4MultiThemeTemplate({ data, total, cgst, sgst, subtotal, logo, theme }: any) {
  return (
    <div id="invoice-to-print" className="p-10 font-sans h-full flex flex-col bg-white">
       {/* Header */}
       <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
          <div className="flex items-center gap-4">
             {logo ? (
               <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 p-2">
                  <img src={logo} className="w-full h-full object-contain" alt="Logo" />
               </div>
             ) : (
               <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 border-dashed">
                  <Receipt className="w-8 h-8 text-slate-300" />
               </div>
             )}
             <div>
                <h1 className={cn("text-3xl font-black italic tracking-tighter uppercase leading-none transition-colors duration-300", theme.text)}>GJ5 HOME SERVICE</h1>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">Professional Service & Repair Hub</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Customer Care: 8866983900</p>
             </div>
          </div>
          <div className="text-right">
             <h2 className="text-4xl font-black uppercase text-slate-800">INVOICE</h2>
             <p className="font-mono text-sm text-slate-600 mt-1">#INV-{data.jobId || 'XXXX'}</p>
             <p className="text-[11px] uppercase font-bold text-slate-400 mt-1">Date: {new Date().toLocaleDateString()}</p>
          </div>
       </div>

       {/* Customer & Job Info */}
       <div className="grid grid-cols-2 gap-10 py-10 border-b border-slate-50">
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                <Receipt className="w-3 h-3" /> Customer Details
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">{data.customerName || 'N/A'}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Mobile: {data.mobile || 'N/A'}</p>
                <p className="text-xs text-slate-400 font-mono">Customer ID: {data.customerId || 'N/A'}</p>
                <div className="pt-2 text-xs text-slate-600 leading-relaxed">
                   <p className="font-bold uppercase text-[10px] text-slate-400 mb-1">Address</p>
                   {data.address || 'N/A'}
                </div>
             </div>
          </div>
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                <Info className="w-3 h-3" /> Job Details Section
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Job ID</p>
                   <p className={cn("text-xs font-black transition-colors duration-300", theme.text)}>{data.jobId || 'XXXX'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Warranty Status</p>
                   <p className="text-xs font-bold text-slate-800">{data.warrantyStatus}</p>
                </div>
                <div className="space-y-1 col-span-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Device Profile</p>
                   <p className="text-xs font-bold text-slate-900">{data.brand} {data.model} ({data.screenSize}")</p>
                </div>
                <div className="space-y-1 col-span-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Problem Statement</p>
                   <p className="text-xs text-slate-600 leading-relaxed">{data.problem || 'N/A'}</p>
                </div>
             </div>
          </div>
       </div>

       {/* Charges Table */}
       <div className="mt-8 flex-1">
          <table className="w-full text-left">
             <thead className={cn("border-y border-slate-100 transition-colors duration-300", theme.bg)}>
                <tr>
                   <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-white">Description</th>
                   <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-white text-right">Amount (INR)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                <tr>
                   <td className="py-4 px-4 text-sm font-bold text-slate-700">Hardware Parts Replacement</td>
                   <td className="py-4 px-4 text-sm font-mono text-right text-slate-900">₹{data.hardwareCost.toFixed(2)}</td>
                </tr>
                <tr>
                   <td className="py-4 px-4 text-sm font-bold text-slate-700">Labor / Technician Service</td>
                   <td className="py-4 px-4 text-sm font-mono text-right text-slate-900">₹{data.laborCost.toFixed(2)}</td>
                </tr>
                <tr>
                   <td className="py-4 px-4 text-sm font-bold text-slate-700">Delivery Charges</td>
                   <td className="py-4 px-4 text-sm font-mono text-right text-slate-900">₹{data.deliveryCharge.toFixed(2)}</td>
                </tr>
                <tr>
                   <td className="py-4 px-4 text-sm font-bold text-slate-700">Additional Charges</td>
                   <td className="py-4 px-4 text-sm font-mono text-right text-slate-900">₹{data.additionalCharges.toFixed(2)}</td>
                </tr>
             </tbody>
          </table>
       </div>

       {/* Totals */}
       <div className="mt-8 pt-8 border-t-2 border-slate-50 flex justify-end">
          <div className="w-72 space-y-2">
             <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
             </div>
             {data.taxEnabled && (
               <>
                 <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
                    <span>CGST (9%)</span>
                    <span className="font-mono">₹{cgst.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
                    <span>SGST (9%)</span>
                    <span className="font-mono">₹{sgst.toFixed(2)}</span>
                 </div>
               </>
             )}
             <div className="flex justify-between items-center pt-4 border-t-4 border-slate-900 mt-4">
                <span className="font-black text-2xl italic uppercase text-slate-900">Total</span>
                <span className={cn("font-black text-3xl italic transition-colors duration-300", theme.text)}>₹{total.toFixed(2)}</span>
             </div>
          </div>
       </div>

       {/* Terms & Conditions */}
       <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
             <ShieldCheck className={cn("w-4 h-4 transition-colors duration-300", theme.text)} /> Terms & Conditions
          </h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
             {[
               "1. Service charges and delivery charges are non-refundable.",
               "2. TV must be collected within 30 days after repair completion.",
               "3. After 30 days storage charges may apply.",
               "4. No warranty on software updates.",
               "5. Warranty applies only to replaced parts.",
               "6. No warranty on panel damage.",
               "7. No warranty on liquid damage.",
               "8. Warranty void if repaired by another technician.",
               "9. Customer should verify TV condition at delivery.",
               "10. Original invoice required for warranty claim."
             ].map((term, i) => (
               <p key={`term-${i}`} className="text-[9px] text-slate-500 leading-tight">{term}</p>
             ))}
          </div>
       </div>

       {/* Footer */}
       <div className="mt-12 text-center space-y-2">
          <p className={cn("text-sm font-black uppercase italic transition-colors duration-300", theme.text)}>Thank You For Choosing GJ5 HOME SERVICE</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">We value your trust and support.</p>
          <p className="text-[9px] text-slate-300 italic pt-2">All Electronics Repair Jobs Include Standard Service Warranty Unless Specified.</p>
       </div>

       <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
          }
          #invoice-to-print, #invoice-to-print * {
            visibility: visible;
          }
          #invoice-to-print {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
