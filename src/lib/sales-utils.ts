// Pure (no DB, no React) rules shared by the Sales and Orders modules — the
// browser uses them for live totals and instant validation messages, the API
// routes use the very same functions to re-check and re-compute everything
// server-side (the client's totals are never trusted).

export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------- statuses

export type SaleStatus = 'Completed' | 'Pending' | 'Cancelled' | 'Refunded';
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export const SALE_STATUSES: SaleStatus[] = ['Completed', 'Pending', 'Cancelled', 'Refunded'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Partial', 'Pending'];
export const ORDER_STATUSES: OrderStatus[] = ['NEW', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'] as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Forward-only lifecycle plus Cancel from any not-yet-finished step. DELIVERED
// and CANCELLED are terminal (a delivered order becomes a Sale; a cancelled one
// is closed — create a new order instead of reopening it).
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Older code wrote 'New'/'Processing' (order status) and 'Unpaid' (payment
// status); read those as their modern equivalents rather than migrating data.
export function normalizeSaleStatus(raw: unknown): SaleStatus {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'completed') return 'Completed';
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
  if (v === 'refunded') return 'Refunded';
  return 'Pending'; // pending, new, processing, unknown
}

export function normalizePaymentStatus(raw: unknown): PaymentStatus {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'paid') return 'Paid';
  if (v === 'partial') return 'Partial';
  return 'Pending'; // pending, unpaid, unknown
}

export function normalizeOrderStatus(raw: unknown): OrderStatus {
  const v = String(raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (ORDER_STATUSES as string[]).includes(v) ? (v as OrderStatus) : 'NEW';
}

// A sale that still owns the goods it sold: stock is out of inventory and the
// customer still owes / has paid for it. Cancelled and Refunded sales are not.
export const isActiveSale = (status: SaleStatus) => status === 'Completed' || status === 'Pending';

// ------------------------------------------------------------------- money

export interface PricingInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
  gstEnabled?: boolean;
  gstRate?: number;
  deliveryCharge?: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  taxable: number;
  gstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
}

export function computeTotals(p: PricingInput): PricingResult {
  const quantity = Number(p.quantity) || 0;
  const unitPrice = Number(p.unitPrice) || 0;
  const subtotal = round2(quantity * unitPrice);
  const discount = round2(Math.min(Math.max(Number(p.discount) || 0, 0), subtotal));
  const taxable = round2(subtotal - discount);
  const gstAmount = p.gstEnabled ? round2(taxable * ((Number(p.gstRate) || 0) / 100)) : 0;
  const deliveryCharge = round2(Math.max(Number(p.deliveryCharge) || 0, 0));
  const grandTotal = round2(taxable + gstAmount + deliveryCharge);
  return { subtotal, discount, taxable, gstAmount, deliveryCharge, grandTotal };
}

// Payment status is always DERIVED from money actually recorded — never taken
// on trust from a dropdown — so Total / Paid / Remaining can't drift apart.
export function derivePaymentStatus(total: number, paid: number): PaymentStatus {
  const t = round2(total);
  const p = round2(paid);
  if (t > 0 && p >= t) return 'Paid';
  if (p > 0) return 'Partial';
  return 'Pending';
}

export const remaining = (total: number, paid: number) => Math.max(0, round2(total - paid));

// -------------------------------------------------------------- validation

const isDateString = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));

export interface LineInput {
  customerId?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  deliveryCharge?: number;
  amountPaid?: number;
  paymentStatus?: string;
}

// Returns the first problem as a user-facing sentence, or null when valid.
// Shared by Sales and Orders (the field names are identical on purpose).
export function validateLine(input: LineInput): string | null {
  if (!input.customerId || !String(input.customerId).trim()) return 'Please select a customer (or add a new one).';
  if (!input.productId || !String(input.productId).trim()) return 'Please select a product from stock.';
  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty <= 0) return 'Quantity must be a whole number greater than 0.';
  const price = Number(input.unitPrice);
  if (!Number.isFinite(price) || price <= 0) return 'Unit price must be greater than 0.';
  const discount = Number(input.discount ?? 0);
  if (!Number.isFinite(discount) || discount < 0) return 'Discount cannot be negative.';
  if (discount > qty * price) return 'Discount cannot be more than the item total.';
  const delivery = Number(input.deliveryCharge ?? 0);
  if (!Number.isFinite(delivery) || delivery < 0) return 'Delivery charge cannot be negative.';
  return null;
}

export function validateSaleInput(input: LineInput & { saleDate?: string }, grandTotal: number): string | null {
  const line = validateLine(input);
  if (line) return line;
  if (input.saleDate && !isDateString(input.saleDate)) return 'Sale date is not a valid date.';
  const paid = Number(input.amountPaid ?? 0);
  if (!Number.isFinite(paid) || paid < 0) return 'Amount paid cannot be negative.';
  if (round2(paid) > round2(grandTotal)) return `Amount paid (₹${round2(paid)}) cannot be more than the total (₹${round2(grandTotal)}).`;
  const wanted = input.paymentStatus ? normalizePaymentStatus(input.paymentStatus) : null;
  if (wanted) {
    const actual = derivePaymentStatus(grandTotal, paid);
    if (wanted !== actual) {
      if (wanted === 'Partial') return 'A PARTIAL payment needs an amount paid that is more than 0 and less than the total.';
      if (wanted === 'Paid') return 'A PAID sale must have the full total received.';
      return 'A PENDING sale cannot have an amount paid — choose PARTIAL or PAID instead.';
    }
  }
  return null;
}

export function validateOrderInput(
  input: LineInput & { orderDate?: string; expectedDeliveryDate?: string },
  totalAmount: number,
): string | null {
  const line = validateLine(input);
  if (line) return line;
  if (input.orderDate && !isDateString(input.orderDate)) return 'Order date is not a valid date.';
  if (input.expectedDeliveryDate) {
    if (!isDateString(input.expectedDeliveryDate)) return 'Expected delivery date is not a valid date.';
    if (input.orderDate && isDateString(input.orderDate) && input.expectedDeliveryDate < input.orderDate.slice(0, 10)) {
      return 'Expected delivery date cannot be before the order date.';
    }
  }
  const advance = Number(input.amountPaid ?? 0);
  if (!Number.isFinite(advance) || advance < 0) return 'Advance payment cannot be negative.';
  if (round2(advance) > round2(totalAmount)) return `Advance payment (₹${round2(advance)}) cannot be more than the order total (₹${round2(totalAmount)}).`;
  return null;
}

export function validatePayment(amount: unknown, balance: number): string | null {
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return 'Payment amount must be greater than 0.';
  if (round2(a) > round2(balance)) return `Payment (₹${round2(a)}) cannot be more than the remaining balance (₹${round2(balance)}).`;
  return null;
}

// -------------------------------------------------------------- appearance

// Same tinted-badge palette the rest of the ERP uses (text-*-400 pairs are
// remapped to readable darker tones in light mode by globals.css).
export const SALE_STATUS_BADGE: Record<SaleStatus, string> = {
  Completed: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Pending: 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Cancelled: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
  Refunded: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  Paid: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Partial: 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Pending: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  NEW: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  CONFIRMED: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
  PROCESSING: 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  READY: 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20',
  OUT_FOR_DELIVERY: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
  DELIVERED: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  CANCELLED: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
};

export const deliveryLabelForOrder = (status: OrderStatus, deliveryRequired: boolean): string => {
  if (status === 'CANCELLED') return '—';
  if (!deliveryRequired) return status === 'DELIVERED' ? 'Collected' : 'Pickup';
  if (status === 'READY') return 'Ready';
  if (status === 'OUT_FOR_DELIVERY') return 'Out for Delivery';
  if (status === 'DELIVERED') return 'Delivered';
  return 'Not Dispatched';
};
