
"use client"

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RepairCall } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Printer, X, Laptop, Monitor, Tablet, Wrench, Settings } from 'lucide-react';

interface StickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: RepairCall | null;
}

export function StickerModal({ isOpen, onClose, call }: StickerModalProps) {
  if (!call) return null;

  const handlePrint = () => {
    window.print();
  };

  // Metadata for Left QR
  const qrMetadata = JSON.stringify({
    cid: call.customerId,
    name: call.customerName,
    mob: call.mobile,
    addr: `${call.address}, ${call.pincode}`,
    jid: call.id,
    issue: call.visitHistory?.[call.visitHistory.length - 1]?.issue || 'N/A'
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Printer className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-headline font-bold">Sticker Print Preview Console</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="p-10 flex flex-col items-center gap-8">
          {/* Physical Sticker Simulation */}
          <div 
            id="thermal-sticker"
            className="w-[600px] h-[300px] bg-white text-black p-4 rounded-xl shadow-2xl relative flex flex-col overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0"
            style={{ 
              aspectRatio: '2/1',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Sticker Content */}
            <div className="flex-1 flex flex-col">
              {/* Header Branding */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4">
                <div className="flex items-center gap-3">
                   <div className="flex flex-col">
                      <h1 className="text-3xl font-black italic tracking-tighter leading-none">GJ5</h1>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Home Service</span>
                   </div>
                </div>
                <div className="text-right">
                   <h2 className="text-2xl font-black text-red-600 leading-none">MO- 88669 83900</h2>
                   <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-500 mt-1">Surat • Fast Service • Reliable Solution</p>
                </div>
              </div>

              {/* Dual Encoding Engine Body */}
              <div className="flex flex-1 gap-6 items-center">
                {/* Left Side: Profile QR */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="p-2 bg-white border-2 border-slate-900 rounded-lg">
                    <QRCodeSVG value={qrMetadata} size={110} level="H" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-black uppercase tracking-tight bg-slate-900 text-white px-2 py-0.5 rounded">
                      Customer ID - {call.customerId}
                    </span>
                  </div>
                </div>

                {/* Vertical Separator */}
                <div className="w-0.5 h-full bg-slate-200"></div>

                {/* Right Side: Job Barcode */}
                <div className="flex flex-col items-center justify-center gap-2 flex-[1.5]">
                  <div className="w-full flex justify-center">
                    <Barcode 
                      value={call.id} 
                      width={2.2} 
                      height={75} 
                      displayValue={false} 
                      background="transparent" 
                      margin={0}
                    />
                  </div>
                  <div className="text-center w-full mt-2">
                    <span className="text-lg font-black uppercase tracking-widest block leading-none">
                      Job ID - {call.id}
                    </span>
                    <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">
                      {call.brand} {call.model} • {call.screenSize}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Icons Overlay */}
              <div className="mt-4 pt-2 border-t-2 border-slate-900 flex justify-between items-center bg-slate-50 -mx-4 -mb-4 px-4 py-2">
                 <div className="flex gap-4 opacity-70">
                    <div className="flex items-center gap-1"><Monitor className="w-3 h-3" /><span className="text-[8px] font-bold">TV</span></div>
                    <div className="flex items-center gap-1"><Laptop className="w-3 h-3" /><span className="text-[8px] font-bold">LAPTOP</span></div>
                    <div className="flex items-center gap-1"><Tablet className="w-3 h-3" /><span className="text-[8px] font-bold">AC</span></div>
                    <div className="flex items-center gap-1"><Wrench className="w-3 h-3" /><span className="text-[8px] font-bold">REPAIR</span></div>
                 </div>
                 <div className="text-[9px] font-black italic tracking-widest text-slate-400">
                    GJ5 PLUS ERP SYSTEM
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 w-full max-w-lg space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4" /> Printing Instructions
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
              <li>Ensure your thermal printer is loaded with <span className="text-white font-bold">2x4 inch (100x50mm)</span> labels.</li>
              <li>In the print dialog, set "Scale" to <span className="text-white font-bold">Fit to Page</span> or <span className="text-white font-bold">100%</span>.</li>
              <li>Select <span className="text-white font-bold">Portrait/Landscape</span> as per your printer driver orientation.</li>
              <li>Disable "Headers and Footers" in the browser print settings.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button 
            onClick={handlePrint} 
            className="bg-[#0066FF] hover:bg-blue-600 px-10 h-12 rounded-xl font-bold flex gap-2 shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-5 h-5" />
            Print Sticker Label
          </Button>
        </DialogFooter>
      </DialogContent>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-sticker, #thermal-sticker * {
            visibility: visible;
          }
          #thermal-sticker {
            position: fixed;
            left: 0;
            top: 0;
            width: 4in !important;
            height: 2in !important;
            margin: 0 !important;
            padding: 0.25in !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
