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
import { Printer, Settings, ImageIcon } from 'lucide-react';

interface StickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: RepairCall | null;
  shopLogo?: string | null;
}

export function StickerModal({ isOpen, onClose, call, shopLogo }: StickerModalProps) {
  if (!call) return null;

  const handlePrint = () => {
    window.print();
  };

  // Full Customer Metadata for Left QR
  const qrMetadata = JSON.stringify({
    cid: call.customerId,
    name: call.customerName,
    mob: call.mobile,
    addr: `${call.address}, ${call.pincode}`,
    jid: call.id
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
          {/* Physical Sticker Simulation (100mm x 50mm / 4x2 inch) */}
          <div 
            id="thermal-sticker"
            className="w-[600px] h-[300px] bg-white text-black p-4 rounded-xl shadow-2xl relative flex flex-col overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0"
            style={{ 
              aspectRatio: '2/1',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {/* Header Branding */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-2">
              <div className="flex flex-col">
                <h1 className="text-2xl font-black italic tracking-tighter leading-none uppercase">GJ5 HOME SERVICE</h1>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-black text-red-600 leading-none">MO-88669 83900</h2>
              </div>
            </div>

            {/* Sticker Body */}
            <div className="flex flex-1 gap-6 items-center">
              {/* Left Side: Logo + QR */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                {/* Logo Placeholder Slot */}
                <div className="w-full h-12 flex items-center justify-center border border-dashed border-slate-300 rounded overflow-hidden">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center opacity-30">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[6px] font-bold uppercase">Shop Logo</span>
                    </div>
                  )}
                </div>

                <div className="p-1.5 bg-white border border-slate-900 rounded-lg">
                  <QRCodeSVG value={qrMetadata} size={90} level="H" />
                </div>
                
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-tighter bg-slate-900 text-white px-2 py-0.5 rounded leading-none">
                    CUSTOMER ID - {call.customerId}
                  </span>
                </div>
              </div>

              {/* Right Side: Barcode (RAW JOB ID ONLY) */}
              <div className="flex flex-col items-center justify-center gap-2 flex-[1.5]">
                <div className="w-full flex justify-center">
                  <Barcode 
                    value={call.id} 
                    width={2.2} 
                    height={65} 
                    displayValue={false} 
                    background="transparent" 
                    margin={0}
                  />
                </div>
                <div className="text-center w-full">
                  <span className="text-xl font-black uppercase tracking-widest block leading-none">
                    JOB ID - {call.id}
                  </span>
                  <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase leading-tight">
                    {call.brand} {call.model} - {call.screenSize}"
                  </p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">
                    Service & Maintenance Registry
                  </p>
                </div>
              </div>
            </div>

            {/* Print Orientation Line */}
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-100 print:hidden"></div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 w-full max-w-lg space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4" /> Thermal Print Calibration
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
              <li>Printer Target: <span className="text-white font-bold">100mm x 50mm (4x2 Inch)</span>.</li>
              <li>Orientation: <span className="text-white font-bold">Landscape / Fit to Page</span>.</li>
              <li>Left QR encodes <span className="text-emerald-400">Full Profile Metadata</span>.</li>
              <li>Right Barcode encodes <span className="text-blue-400">Raw Job ID</span> for rapid scanner lookup.</li>
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
          @page {
            size: 4in 2in;
            margin: 0;
          }
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
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
            padding: 0.2in !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
