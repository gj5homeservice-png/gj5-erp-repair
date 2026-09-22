import { format, parseISO } from 'date-fns';
import { remaining, normalizePaymentStatus } from '@/lib/sales-utils';

// Print/receipt output for the Sales and Orders modules: builds a self-
// contained HTML page (company header, customer, item, totals, payments) and
// opens the browser's print dialog for it. The company header comes from the
// same store.companyProfile every other printout uses, so the business name,
// logo, address and GSTIN always match Billing/Invoice History.

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const inr = (n: unknown) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  try { return format(parseISO(s), 'dd MMM yyyy'); } catch { return String(s); }
};

export interface PrintRecord {
  id: string;
  date?: string;
  customerId?: string;
  customerName?: string;
  mobile?: string;
  address?: string;
  brand?: string;
  model?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
  discount?: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstAmount?: number;
  deliveryCharge?: number;
  total: number;
  amountPaid: number;
  paymentStatus?: string;
  statusLabel?: string;
  notes?: string;
  invoiceNumber?: string;
  expectedDeliveryDate?: string;
}

export interface PrintPayment { amount: number; method?: string; paidOn?: string; note?: string }

export function buildRecordHtml(opts: {
  title: string;               // e.g. "Sale Summary", "Order Receipt"
  idLabel: string;             // "Sale ID" | "Order ID"
  profile: any;
  record: PrintRecord;
  payments?: PrintPayment[];
  receipt?: boolean;           // payment-receipt layout (shows money received) instead of the item summary
}): string {
  const { profile = {}, record: r } = opts;
  const logo = typeof profile.logoUrl === 'string' && profile.logoUrl.startsWith('data:image') ? `<img class="logo" src="${esc(profile.logoUrl)}" />` : '';
  const addr = [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ');
  const balance = remaining(r.total, r.amountPaid);
  const product = [r.brand, r.model].filter(Boolean).join(' ') || r.productName || '—';

  const items = opts.receipt ? '' : `
    <table class="items">
      <thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead>
      <tbody><tr><td>${esc(product)}</td><td class="n">${esc(r.quantity ?? 1)}</td><td class="n">${inr(r.unitPrice)}</td><td class="n">${inr(r.subtotal)}</td></tr></tbody>
    </table>`;

  const totalsRows = opts.receipt ? '' : `
      <tr><td>Subtotal</td><td class="n">${inr(r.subtotal)}</td></tr>
      ${r.discount ? `<tr><td>Discount</td><td class="n">- ${inr(r.discount)}</td></tr>` : ''}
      ${r.gstEnabled ? `<tr><td>GST (${esc(r.gstRate)}%)</td><td class="n">${inr(r.gstAmount)}</td></tr>` : ''}
      ${r.deliveryCharge ? `<tr><td>Delivery Charge</td><td class="n">${inr(r.deliveryCharge)}</td></tr>` : ''}`;

  const pays = (opts.payments || []);
  const payTable = pays.length ? `
    <h3>Payments Received</h3>
    <table class="items">
      <thead><tr><th>Date</th><th>Method</th><th>Note</th><th class="n">Amount</th></tr></thead>
      <tbody>${pays.map(p => `<tr><td>${esc(fmtDate(p.paidOn))}</td><td>${esc(p.method || '—')}</td><td>${esc(p.note || '')}</td><td class="n">${inr(p.amount)}</td></tr>`).join('')}</tbody>
    </table>` : '';

  return `
  <div class="page">
    <div class="head">
      ${logo}
      <div>
        <div class="co">${esc(profile.companyName || 'GJ5 HOME SERVICE')}</div>
        ${addr ? `<div class="muted">${esc(addr)}</div>` : ''}
        <div class="muted">${[profile.ownerMobile && `Mobile: ${esc(profile.ownerMobile)}`, profile.gstNumber && `GSTIN: ${esc(profile.gstNumber)}`].filter(Boolean).join(' &nbsp;•&nbsp; ')}</div>
      </div>
      <div class="doc"><div class="doc-title">${esc(opts.title)}</div><div class="muted">${esc(opts.idLabel)}: <b>${esc(r.id)}</b></div>
        <div class="muted">Date: ${esc(fmtDate(r.date))}</div>${r.invoiceNumber ? `<div class="muted">Invoice: <b>${esc(r.invoiceNumber)}</b></div>` : ''}
        ${r.statusLabel ? `<div class="muted">Status: <b>${esc(r.statusLabel)}</b></div>` : ''}</div>
    </div>
    <div class="cols">
      <div><h3>Customer</h3><div><b>${esc(r.customerName || '—')}</b></div>
        <div class="muted">${esc(r.customerId || '')}</div><div class="muted">Mobile: ${esc(r.mobile || '—')}</div>${r.address ? `<div class="muted">${esc(r.address)}</div>` : ''}</div>
      ${r.expectedDeliveryDate ? `<div><h3>Delivery</h3><div>Expected: <b>${esc(fmtDate(r.expectedDeliveryDate))}</b></div></div>` : ''}
    </div>
    ${items}
    <table class="totals">
      ${totalsRows}
      <tr class="grand"><td>Total</td><td class="n">${inr(r.total)}</td></tr>
      <tr><td>Paid</td><td class="n">${inr(r.amountPaid)}</td></tr>
      <tr class="bal"><td>Remaining</td><td class="n">${inr(balance)}</td></tr>
      <tr><td>Payment Status</td><td class="n"><b>${esc(normalizePaymentStatus(r.paymentStatus).toUpperCase())}</b></td></tr>
    </table>
    ${payTable}
    ${r.notes ? `<h3>Notes</h3><div class="muted">${esc(r.notes)}</div>` : ''}
    <div class="foot">Thank you for choosing ${esc(profile.companyName || 'GJ5 HOME SERVICE')}.</div>
  </div>`;
}

const PRINT_CSS = `
  *{box-sizing:border-box} body{margin:0;font-family:Inter,Arial,sans-serif;color:#0f172a;font-size:13px}
  .page{max-width:780px;margin:0 auto;padding:28px}
  .head{display:flex;gap:16px;align-items:flex-start;border-bottom:2px solid #0066ff;padding-bottom:14px;margin-bottom:16px}
  .logo{width:56px;height:56px;object-fit:contain}
  .co{font-size:20px;font-weight:800;color:#123c8c;text-transform:uppercase}
  .doc{margin-left:auto;text-align:right}.doc-title{font-size:16px;font-weight:800;text-transform:uppercase;color:#0066ff;margin-bottom:4px}
  .muted{color:#475569}.cols{display:flex;gap:40px;margin-bottom:14px}
  h3{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:14px 0 6px}
  table{width:100%;border-collapse:collapse}.items th{background:#0066ff;color:#fff;text-align:left;padding:8px;font-size:11px;text-transform:uppercase}
  .items td{padding:8px;border-bottom:1px solid #e2e8f0}.n{text-align:right}
  .totals{width:60%;margin:14px 0 0 auto}.totals td{padding:5px 8px}.grand td{font-weight:800;font-size:15px;border-top:2px solid #0f172a}
  .bal td{font-weight:800;color:#b91c1c}.foot{margin-top:28px;text-align:center;color:#64748b;font-size:12px}
  @media print{.page{padding:0}}
`;

export function printHtmlDocument(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=860,height=900');
  if (!w) throw new Error('The print window was blocked. Please allow pop-ups for this site and try again.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 300);
}
