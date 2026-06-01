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
import { useToast } from '@/hooks/use-toast';

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

  const { toast } = useToast();

  const activeTheme = useMemo(() => 
    INVOICE_THEMES.find(t => t.id === activeThemeId) || INVOICE_THEMES[0]
  , [activeThemeId]);

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
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const filename = `${billData.jobId || 'INV'}_Invoice.pdf`;
      const themeColor = activeTheme.primary;
      const themeRGB = hexToRgb(themeColor);

      if (store.shopLogo) {
        try {
          doc.addImage(store.shopLogo, 'PNG', 15, 15, 25, 25);
        } catch (e) { console.warn("Logo error", e); }
      }

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.text('GJ5 HOME SERVICE', store.shopLogo ? 45 : 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text('Professional Service & Repair Hub', store.shopLogo ? 45 : 15, 31);
      doc.text('Customer Care: 8866983900', store.shopLogo ? 45 : 15, 36);

      doc.setFontSize(24);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 195, 25, { align: 'right' });
      
      doc.setFontSize(10);
      doc.text(`#INV-${billData.jobId || 'XXXX'}`, 195, 32, { align: 'right' });
      doc.text(`Date: ${timestamp}`, 195, 38, { align: 'right' });

      doc.setDrawColor(230);
      doc.line(15, 45, 195, 45);

      let currentY = 55;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER SECTION', 15, currentY);
      doc.text('JOB DETAILS SECTION', 110, currentY);

      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60);
      
      doc.text(`Name: ${billData.customerName || 'N/A'}`, 15, currentY);
      doc.text(`Mobile: ${billData.mobile || 'N/A'}`, 15, currentY + 6);
      doc.text(`Customer ID: ${billData.customerId || 'N/A'}`, 15, currentY + 12);
      doc.text(`Address: ${billData.address || 'N/A'}`, 15, currentY + 18, { maxWidth: 80 });

      doc.text(`Job ID: ${billData.jobId || 'N/A'}`, 110, currentY);
      doc.text(`Device: ${billData.brand} ${billData.model} (${billData.screenSize}")`, 110, currentY + 6);
      doc.text(`Warranty: ${billData.warrantyStatus}`, 110, currentY + 12);
      doc.text(`Problem: ${billData.problem}`, 110, currentY + 18, { maxWidth: 80 });

      currentY += 35;
      
      doc.setFillColor(themeRGB.r, themeRGB.g, themeRGB.b);
      doc.rect(15, currentY, 180, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text('DESCRIPTION', 20, currentY + 6);
      doc.text('AMOUNT (INR)', 190, currentY + 6, { align: 'right' });

      currentY += 10;
      
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

      currentY += 25;
      doc.setFontSize(9);
      doc.setTextColor(0);
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
        "10. Original invoice required for warranty claim.",
        "11. Transportation & Repair Risk Disclaimer: The customer understands and agrees that all activities are performed at their own risk."
      ];
      terms.forEach(term => {
        const lines = doc.splitTextToSize(term, 180);
        doc.text(lines, 15, currentY);
        currentY += (lines.length * 4) + 1;
      });

      doc.save(filename);
    } catch (err) {
      toast({ variant: "destructive", title: "Download Failed", description: "Browser blocked the download." });
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 102, b: 255 };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-4">
             <div className={cn("p-2.5 md:p-3 rounded-xl text-white", activeTheme.bg)}>
                <Receipt className="w-5 h-5 md:w-6 h-6" />
             </div>
             <div>
                <h2 className="text-lg md:text-xl font-headline font-bold">Fast Billing Console</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">GJ5 HOME SERVICE EDITION</p>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
             <h3 className="text-xs md:text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
               <Calculator className={cn("w-4 h-4", activeTheme.text)} />
               Charges Registry
             </h3>
             <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                     <Truck className="w-3 h-3" /> Delivery
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
                <div className="flex flex-col">
                   <Label className="text-sm font-bold">Apply 18% GST</Label>
                   <p className="text-[10px] text-slate-500">CGST (9%) + SGST (9%)</p>
                </div>
                <Switch 
                  checked={billData.taxEnabled}
                  onCheckedChange={v => setBillData({...billData, taxEnabled: v})}
                />
             </div>

             <div className={cn("p-4 rounded-2xl border transition-all space-y-2", activeTheme.bg + "/5", "border-" + activeTheme.id)}>
                <div className="flex justify-between text-[10px] md:text-xs">
                   <span className="text-slate-400 uppercase font-bold">Subtotal</span>
                   <span className="font-code font-bold">₹{subtotal.toFixed(2)}</span>
                </div>
                {billData.taxEnabled && (
                  <div className="flex justify-between text-[10px] md:text-xs">
                     <span className="text-slate-400 uppercase font-bold">Total GST (18%)</span>
                     <span className="font-code font-bold">₹{(cgst + sgst).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-800">
                   <span className="font-headline font-bold text-sm uppercase">Grand Total</span>
                   <span className={cn("font-code font-bold text-lg md:text-xl", activeTheme.text)}>₹{total.toFixed(2)}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
           <Button onClick={() => window.print()} variant="outline" className="flex-1 border-slate-700 h-11">
              <Printer className="w-4 h-4 mr-2" /> Direct Print
           </Button>
           <Button onClick={handleDownloadPDF} className={cn("flex-1 h-11 shadow-lg text-white font-bold", activeTheme.bg)}>
              <FileDown className="w-4 h-4 mr-2" /> Download PDF
           </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-base md:text-lg font-headline font-bold uppercase tracking-tight flex items-center gap-2">
             <Monitor className="w-5 h-5 text-slate-500" /> Invoice Preview
           </h3>
           <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {INVOICE_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={cn(
                    "w-7 h-7 md:w-8 md:h-8 rounded-md transition-all flex items-center justify-center border-2",
                    activeThemeId === theme.id ? "border-white" : "border-transparent opacity-60",
                    theme.bg
                  )}
                >
                  {activeThemeId === theme.id && <Check className="w-3 h-3 md:w-4 h-4 text-white" />}
                </button>
              ))}
           </div>
        </div>

        {/* Invoice Preview Container with Scaling for Mobile */}
        <div className="w-full overflow-x-auto bg-slate-950 rounded-xl p-2 md:p-4 border border-slate-800">
           <div className="origin-top scale-[0.45] xs:scale-[0.55] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 min-w-[794px]">
              <div className="bg-white text-black min-h-[1123px] w-[794px] mx-auto shadow-2xl">
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
    </div>
  );
}

function A4MultiThemeTemplate({ data, total, cgst, sgst, subtotal, logo, theme }: any) {
  return (
    <div id="invoice-to-print" className="p-10 font-sans h-full flex flex-col bg-white">
       <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
          <div className="flex items-center gap-4">
             {logo && (
               <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 p-2">
                  <img src={logo} className="w-full h-full object-contain" alt="Logo" />
               </div>
             )}
             <div>
                <h1 className={cn("text-3xl font-black italic tracking-tighter uppercase leading-none", theme.text)}>GJ5 HOME SERVICE</h1>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">Professional Service & Repair Hub</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Care: 8866983900</p>
             </div>
          </div>
          <div className="text-right">
             <h2 className="text-4xl font-black uppercase text-slate-800">INVOICE</h2>
             <p className="font-mono text-sm text-slate-600">#INV-{data.jobId || 'XXXX'}</p>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-10 py-10 border-b border-slate-50">
          <div className="space-y-4">
             <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Customer Details</div>
             <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">{data.customerName || 'N/A'}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase">Mobile: {data.mobile || 'N/A'}</p>
                <p className="text-xs text-slate-600 leading-relaxed max-w-[200px]">{data.address || 'N/A'}</p>
             </div>
          </div>
          <div className="space-y-4">
             <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Job Context</div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Job ID</p>
                   <p className={cn("text-xs font-black", theme.text)}>{data.jobId || 'XXXX'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Warranty</p>
                   <p className="text-xs font-bold text-slate-800">{data.warrantyStatus}</p>
                </div>
                <div className="space-y-1 col-span-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Device</p>
                   <p className="text-xs font-bold text-slate-900">{data.brand} {data.model} ({data.screenSize}")</p>
                </div>
             </div>
          </div>
       </div>

       <div className="mt-8 flex-1">
          <table className="w-full text-left">
             <thead className={cn("transition-colors duration-300", theme.bg)}>
                <tr>
                   <th className="py-3 px-4 text-[11px] font-black uppercase text-white">Description</th>
                   <th className="py-3 px-4 text-[11px] font-black uppercase text-white text-right">Amount (INR)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {[
                  { d: 'Hardware Parts Replacement', a: data.hardwareCost },
                  { d: 'Labor / Technician Service', a: data.laborCost },
                  { d: 'Delivery Charges', a: data.deliveryCharge },
                  { d: 'Additional Charges', a: data.additionalCharges }
                ].map((item, i) => (
                  <tr key={i}>
                    <td className="py-4 px-4 text-sm font-bold text-slate-700">{item.d}</td>
                    <td className="py-4 px-4 text-sm font-mono text-right text-slate-900">₹{item.a.toFixed(2)}</td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>

       <div className="mt-8 pt-8 border-t-2 border-slate-50 flex justify-end">
          <div className="w-64 space-y-2">
             <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
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
             <div className="flex justify-between items-center pt-4 border-t-4 border-slate-900 mt-4">
                <span className="font-black text-xl uppercase">Total</span>
                <span className={cn("font-black text-2xl italic", theme.text)}>₹{total.toFixed(2)}</span>
             </div>
          </div>
       </div>

       <div className="mt-10 bg-slate-50 p-6 rounded-xl">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Terms & Conditions</h4>
          <div className="grid grid-cols-1 gap-y-1.5">
             {[
               "1. Service charges and delivery charges are non-refundable.",
               "2. TV must be collected within 30 days after repair completion.",
               "11. Transportation & Repair Risk Disclaimer applies as per company policy."
             ].map((term, i) => (
               <p key={i} className="text-[8.5px] text-slate-500 leading-tight">{term}</p>
             ))}
          </div>
       </div>

       <div className="mt-10 text-center space-y-1">
          <p className={cn("text-sm font-black uppercase italic", theme.text)}>Thank You For Choosing GJ5 HOME SERVICE</p>
          <p className="text-[9px] text-slate-400">Professional Electronics Service & Repair Management</p>
       </div>
    </div>
  );
}
