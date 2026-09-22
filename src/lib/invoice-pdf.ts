import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { addLogoToPdf } from '@/lib/branding';
import type { Invoice } from '@/lib/types';

// The one invoice PDF layout for the whole ERP. Invoice History's "Print
// Invoice" and the Sales module's "Print Invoice" both call this, so an
// invoice looks identical no matter where it is printed from. (Moved here
// unchanged from InvoiceHistoryModule; throws on failure so each caller can
// show its own error toast.)
export function downloadInvoicePdf(inv: Invoice, profile: any = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const hasLogo = addLogoToPdf(doc, profile.logoUrl, 15, 8, 16, 16);
  const headerTextX = hasLogo ? 35 : 15;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 255);
  doc.text(profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE', headerTextX, 25);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Invoice Number: ' + String(inv.invoiceNumber || "N/A"), 15, 32);

  const formattedDate = inv.timestamp ? format(parseISO(inv.timestamp), 'dd/MM/yyyy HH:mm') : "N/A";
  doc.text('Date: ' + formattedDate, 15, 37);

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', 15, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: ' + String(inv.customerName || "N/A"), 15, 56);
  doc.text('Cust ID: ' + String(inv.customerId || "N/A"), 15, 62);
  doc.text('Mobile: ' + String(inv.mobile || "N/A"), 15, 68);

  doc.setFont('helvetica', 'bold');
  doc.text('DEVICE DETAILS', 110, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Device: ' + String(inv.brand || "") + ' ' + String(inv.model || ""), 110, 56);
  doc.text('Job ID: ' + String(inv.jobId || "N/A"), 110, 62);

  let y = 85;
  doc.setFillColor(0, 102, 255);
  doc.rect(15, y, 180, 10, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', 20, y + 7);
  doc.text('QTY', 150, y + 7, { align: 'center' });
  doc.text('AMT (INR)', 190, y + 7, { align: 'right' });

  y += 10;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  if (!inv.items || inv.items.length === 0) {
    doc.text('No Parts Used', 20, y + 7);
    y += 10;
  } else {
    inv.items.forEach(item => {
      doc.text(String(item.name || "Part"), 20, y + 7);
      doc.text(String(item.quantity || 1), 150, y + 7, { align: 'center' });
      doc.text('INR ' + (item.amount || 0).toFixed(2), 190, y + 7, { align: 'right' });
      y += 10;
    });
  }

  // Repair invoices carry a labour line; a product sale (no labour) shouldn't
  // print an empty "Labour & Service Charges 0.00" row.
  if ((inv.labourCharges || 0) > 0 || !inv.items || inv.items.length === 0) {
    doc.text('Labour & Service Charges', 20, y + 7);
    doc.text('1', 150, y + 7, { align: 'center' });
    doc.text('INR ' + (inv.labourCharges || 0).toFixed(2), 190, y + 7, { align: 'right' });
    y += 10;
  }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 140, y);
  doc.text('INR ' + (inv.subtotal || 0).toFixed(2), 190, y, { align: 'right' });

  if (inv.taxEnabled) {
    y += 7;
    // `gst` holds the RATE on Billing-created invoices (not an amount), so the
    // amount is the CGST + SGST that were actually stored.
    const gstAmount = (inv.cgst || 0) + (inv.sgst || 0);
    doc.text(inv.gst ? `GST (${inv.gst}%):` : 'GST:', 140, y);
    doc.text('INR ' + gstAmount.toFixed(2), 190, y, { align: 'right' });
  }

  y += 10;
  doc.setFontSize(14);
  doc.text('Total Amount:', 140, y);
  doc.text('INR ' + (inv.grandTotal || 0).toFixed(2), 190, y, { align: 'right' });

  doc.save(`${inv.invoiceNumber || 'Invoice'}.pdf`);
}
