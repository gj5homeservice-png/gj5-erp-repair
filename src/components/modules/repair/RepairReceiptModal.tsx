"use client"

import React from 'react';
import { jsPDF } from 'jspdf';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RepairJob } from '@/lib/types';
import { partsTotal, grandTotal, totalPaid, balanceDue } from '@/lib/repair-utils';
import { addLogoToPdf } from '@/lib/branding';
import { CompanyLogo } from '@/components/CompanyLogo';

interface RepairReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RepairJob | null;
  store: any;
}

export function RepairReceiptModal({ isOpen, onClose, job, store }: RepairReceiptModalProps) {
  const { toast } = useToast();
  if (!job) return null;

  const profile = store.companyProfile || {};
  const partsAmount = partsTotal(job);
  const total = grandTotal(job);
  const paid = totalPaid(job);
  const due = balanceDue(job);

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const brandColor = [18, 60, 140];
    const accentColor = [229, 57, 53];

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    const hasLogo = addLogoToPdf(doc, profile.logoUrl, 15, 8, 24, 24);
    const headerTextX = hasLogo ? 44 : 15;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE', headerTextX, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('REPAIR SERVICE RECEIPT', headerTextX, 27);

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('REPAIR RECEIPT', 195, 25, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Repair ID: ${job.id}`, 150, 50);
    doc.text(`Date: ${format(new Date(job.receivedDate), 'dd/MM/yyyy')}`, 150, 56);
    doc.text(`Status: ${job.status}`, 150, 62);

    doc.setDrawColor(200);
    doc.line(15, 45, 195, 45);
    doc.setFontSize(11);
    doc.text('CUSTOMER:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(job.customerName, 15, 62);
    doc.text(job.mobile, 15, 68);
    doc.text(job.address || '-', 15, 74, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCT:', 110, 74 - 19);
    doc.setFont('helvetica', 'normal');
    doc.text(`${job.brand} ${job.model} (${job.productType})`, 110, 74 - 13, { maxWidth: 85 });
    doc.text(`Serial: ${job.serialNumber || '-'}`, 110, 74 - 7, { maxWidth: 85 });
    doc.text(`Complaint: ${job.problemDescription}`, 110, 74, { maxWidth: 85 });

    let y = 90;
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(15, y, 180, 10, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('PART / CHARGE', 20, y + 7);
    doc.text('QTY', 130, y + 7, { align: 'center' });
    doc.text('AMOUNT', 190, y + 7, { align: 'right' });

    y += 10;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    job.parts.forEach(p => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text(p.partName, 20, y + 7);
      doc.text(String(p.qty), 130, y + 7, { align: 'center' });
      doc.text(p.total.toLocaleString(), 190, y + 7, { align: 'right' });
      y += 10;
      doc.setDrawColor(240);
      doc.line(15, y, 195, y);
    });

    y += 10;
    const rightX = 195;
    const labelX = 150;
    const drawTotalRow = (label: string, value: string, isBold = false) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(label, labelX, y);
      doc.text(value, rightX, y, { align: 'right' });
      y += 7;
    };

    drawTotalRow('Parts Total:', partsAmount.toLocaleString());
    drawTotalRow('Labour Charges:', job.labourCharges.toLocaleString());
    drawTotalRow('Other Charges:', job.otherCharges.toLocaleString());
    drawTotalRow('Discount:', `-${job.discount.toLocaleString()}`);

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(labelX - 10, y - 5, 55, 12, 'F');
    doc.setTextColor(255);
    drawTotalRow('GRAND TOTAL:', `INR ${total.toLocaleString()}`, true);

    doc.setTextColor(0);
    drawTotalRow('Paid:', paid.toLocaleString());
    drawTotalRow('Balance Due:', due.toLocaleString(), true);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Technician: ${job.technicianName || 'Unassigned'}`, 15, y + 10);

    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('TERMS & CONDITIONS:', 15, 265);
    doc.text('1. Please retain this receipt to collect your product.', 15, 270);
    doc.text('2. Powered by GJ5 PLUS ERP Solutions.', 15, 275);

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATORY', 195, 285, { align: 'right' });
    doc.line(150, 280, 195, 280);

    doc.save(`${job.id}-receipt.pdf`);
    toast({ title: 'Receipt Generated', description: `${job.id}-receipt.pdf downloaded.` });
  };

  const handlePrint = () => window.print();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto print:max-w-full print:bg-white">
        <DialogHeader className="print:hidden">
          <DialogTitle>Repair Receipt — {job.id}</DialogTitle>
        </DialogHeader>

        <div id="repair-receipt-print" className="bg-white text-slate-950 rounded-2xl shadow-2xl overflow-hidden">
          <div className="aspect-[1/1.414] p-4 sm:p-8 flex flex-col gap-5 text-xs">
            <div className="flex justify-between items-start border-b-4 border-[#123C8C] pb-4">
              <div className="flex items-center gap-3">
                {profile.logoUrl && (
                  <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                    <CompanyLogo src={profile.logoUrl} className="w-full h-full" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-black text-[#123C8C]">{profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE'}</h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Repair Service Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-lg">{job.id}</p>
                <p className="text-slate-500">{job.receivedDate}</p>
                <p className="font-bold text-[#E53935] uppercase">{job.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">Customer</p>
                <p className="font-bold">{job.customerName}</p>
                <p>{job.mobile}</p>
                <p>{job.address}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">Product</p>
                <p className="font-bold">{job.brand} {job.model} ({job.productType})</p>
                <p>Serial: {job.serialNumber || '-'}</p>
                <p>Technician: {job.technicianName || 'Unassigned'}</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">Complaint</p>
              <p>{job.problemDescription}</p>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse mt-2 min-w-[280px]">
                <thead>
                  <tr className="bg-[#123C8C] text-white">
                    <th className="text-left p-2 font-bold">Part</th>
                    <th className="text-center p-2 font-bold">Qty</th>
                    <th className="text-right p-2 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {job.parts.length === 0 && (
                    <tr><td colSpan={3} className="p-2 text-center text-slate-400 italic">No parts used</td></tr>
                  )}
                  {job.parts.map(p => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="p-2">{p.partName}</td>
                      <td className="p-2 text-center">{p.qty}</td>
                      <td className="p-2 text-right">₹{p.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full sm:w-56 space-y-1 mt-2">
              <div className="flex justify-between"><span>Parts Total</span><span>₹{partsAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Labour Charges</span><span>₹{job.labourCharges.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Other Charges</span><span>₹{job.otherCharges.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-₹{job.discount.toLocaleString()}</span></div>
              <div className="flex justify-between font-black text-sm bg-[#E53935] text-white px-2 py-1 rounded"><span>Grand Total</span><span>₹{total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Paid</span><span>₹{paid.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold"><span>Balance Due</span><span>₹{due.toLocaleString()}</span></div>
            </div>

            <div className="mt-auto pt-6 text-[9px] text-slate-500 text-center border-t border-slate-200">
              Powered by GJ5 PLUS ERP Solutions
            </div>
          </div>
        </div>

        <div className="flex gap-2 print:hidden pt-2">
          <Button onClick={handleDownloadPDF} className="flex-1 bg-[#0066FF] hover:bg-blue-600 font-bold uppercase text-xs">
            <FileDown className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1 border-slate-800 font-bold uppercase text-xs">
            <Printer className="w-4 h-4 mr-2" /> Quick Print
          </Button>
          <Button onClick={onClose} variant="ghost" className="text-slate-400"><X className="w-4 h-4" /></Button>
        </div>

        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            #repair-receipt-print, #repair-receipt-print * { visibility: visible; }
            #repair-receipt-print {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page { size: A4; margin: 0; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
