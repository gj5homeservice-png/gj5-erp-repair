import { getPool } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { createHash } from 'node:crypto';
import {
  computeTotals, derivePaymentStatus, remaining, round2, validateSaleInput, validatePayment,
  normalizeSaleStatus, isActiveSale, PAYMENT_METHODS, type SaleStatus,
} from '../sales-utils';

// Server side of the Sales module. `sales_orders` is the sale record (the
// table already existed — see migration 020's header); everything here runs in
// one transaction per action and recomputes every amount from the raw inputs,
// so a tampered/stale client can never save wrong totals, oversell stock, or
// take stock out twice.

// A message that is safe and useful to show the admin as-is.
export class SalesError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function salesErrorResponse(error: any): { status: number; body: { success: false; error: string; detail?: string } } {
  if (error instanceof SalesError) return { status: error.status, body: { success: false, error: error.message } };
  console.error('[sales/orders] failed:', error?.code || error?.message || error, error?.sqlMessage || '');
  // The migration for these modules not having been run yet is by far the most
  // likely real-world failure — say so plainly instead of a bare "try again".
  const missing = error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR';
  return {
    status: 500,
    body: {
      success: false,
      error: missing
        ? 'The Sales/Orders database tables are not set up yet. Run migration 020_sales_and_orders.sql in phpMyAdmin, then try again.'
        : 'Unable to complete this request. Please try again.',
      detail: error?.sqlMessage || error?.code || error?.message || undefined,
    },
  };
}

export const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Sequential, human-friendly ids (SALE-000001, ORD-000001). The number comes
// from the tenant's highest existing id inside the caller's transaction; `skip`
// lets a retry step past an id that is taken (ids are a global primary key).
export async function nextSequentialId(conn: PoolConnection, table: 'sales_orders' | 'customer_orders', email: string, prefix: string, skip = 0) {
  const [rows] = await conn.execute<any[]>(
    // prefix comes from a fixed literal at the call site, so inlining its length is safe.
    `SELECT id FROM ${table} WHERE user_email = ? AND id REGEXP ? ORDER BY CAST(SUBSTRING(id, ${prefix.length + 2}) AS UNSIGNED) DESC LIMIT 1`,
    [email, `^${prefix}-[0-9]{6}$`]
  );
  const last = (rows as any[])[0]?.id as string | undefined;
  const n = last ? parseInt(last.slice(prefix.length + 1), 10) : 0;
  return `${prefix}-${String((Number.isFinite(n) ? n : 0) + 1 + skip).padStart(6, '0')}`;
}

// Serializes id allocation per tenant + sequence. Without it, several people
// saving at the same instant all read the same "highest id" and race for the
// next one; the primary key stops a duplicate, but retries could run out under
// load. GET_LOCK is held on this connection for the whole allocate → insert →
// commit span, so the next creator always sees the previous id already
// committed. (Ids are still a global primary key, so a rare collision with
// another tenant's row is handled by the callers' retry + skip as before.)
export async function withSequenceLock<T>(conn: PoolConnection, seq: 'sale' | 'order', email: string, fn: () => Promise<T>): Promise<T> {
  const name = `gj5-${seq}-${createHash('md5').update(email).digest('hex')}`;
  const [rows] = await conn.query<any[]>('SELECT GET_LOCK(?, 15) AS got', [name]);
  if (Number((rows as any[])[0]?.got) !== 1) throw new SalesError('The system is busy saving another record. Please try again in a moment.', 503);
  try {
    return await fn();
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [name]).catch(() => {});
  }
}

export async function tenantTax(conn: PoolConnection, email: string) {
  const [rows] = await conn.execute<any[]>('SELECT gst_rate, invoice_prefix FROM system_settings WHERE user_email = ? LIMIT 1', [email]);
  const row = (rows as any[])[0];
  const rate = Number(row?.gst_rate);
  return { gstRate: Number.isFinite(rate) && rate > 0 ? rate : 18, invoicePrefix: (row?.invoice_prefix as string) || 'INV' };
}

export async function loadCustomer(conn: PoolConnection, email: string, id: string) {
  const [rows] = await conn.execute<any[]>(
    'SELECT id, name, mobile, email, address, pincode, status FROM customers WHERE id = ? AND user_email = ? LIMIT 1',
    [id, email]
  );
  const c = (rows as any[])[0];
  if (!c) throw new SalesError('The selected customer no longer exists. Please pick or add the customer again.', 404);
  return c;
}

export async function loadStockItem(conn: PoolConnection, email: string, id: string) {
  const [rows] = await conn.execute<any[]>(
    'SELECT id, name, brand, model, screen_size, quantity FROM stock_items WHERE id = ? AND user_email = ? LIMIT 1 FOR UPDATE',
    [id, email]
  );
  const s = (rows as any[])[0];
  if (!s) throw new SalesError('The selected product is not in stock records any more. Please pick the product again.', 404);
  return s;
}

// The one place stock quantity changes for Sales/Orders. delta < 0 takes stock
// out (guarded so it can never go below zero), delta > 0 puts it back. Writes
// a movement row so Stock's history shows why the number changed.
export async function adjustStock(
  conn: PoolConnection,
  email: string,
  stockId: string,
  delta: number,
  ctx: { referenceId: string; customerName?: string | null; note: string; by?: string | null },
) {
  const now = new Date().toISOString();
  const [result]: any = await conn.execute(
    'UPDATE stock_items SET quantity = quantity + ?, last_updated = ? WHERE id = ? AND user_email = ? AND quantity + ? >= 0',
    [delta, now, stockId, email, delta]
  );
  if (result.affectedRows === 0) {
    const [rows] = await conn.execute<any[]>('SELECT name, quantity FROM stock_items WHERE id = ? AND user_email = ?', [stockId, email]);
    const s = (rows as any[])[0];
    if (!s) throw new SalesError('The product is not in stock records any more.', 404);
    throw new SalesError(`Not enough stock for ${s.name}: only ${s.quantity} unit(s) available.`, 409);
  }
  await conn.execute(
    `INSERT INTO stock_movements (id, stock_item_id, date, type, quantity, notes, performed_by, reference_id, customer_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId('MOV'), stockId, now, delta < 0 ? 'SALE' : 'RETURN', Math.abs(delta), ctx.note, ctx.by ?? null, ctx.referenceId, ctx.customerName ?? null]
  );
}

const money = (v: any) => Number(v) || 0;

export function saleRowToObject(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id, customerName: row.customer_name, mobile: row.mobile, email: row.email,
    address: row.address, pincode: row.pincode,
    productId: row.product_id, brand: row.brand, model: row.model, screenSize: row.screen_size, serialNumber: row.serial_number,
    quantity: row.quantity, unitPrice: money(row.unit_price), saleDate: row.sale_date,
    salesperson: row.salesperson, storeLocation: row.store_location,
    paymentMethod: row.payment_method, paymentStatus: row.payment_status,
    deliveryRequired: !!row.delivery_required, deliveryStatus: row.delivery_status,
    subtotal: money(row.subtotal), discount: money(row.discount),
    gstEnabled: !!row.gst_enabled, gstRate: money(row.gst_rate), gstAmount: money(row.gst_amount),
    deliveryCharge: money(row.delivery_charge), grandTotal: money(row.grand_total),
    amountPaid: money(row.amount_paid), balanceDue: money(row.balance_due),
    orderStatus: row.order_status, invoiceId: row.invoice_id,
    notes: row.notes ?? undefined, stockDeducted: !!row.stock_deducted,
    sourceOrderId: row.source_order_id ?? undefined, billingInvoiceId: row.billing_invoice_id ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function loadSaleForUpdate(conn: PoolConnection, email: string, id: string) {
  const [rows] = await conn.execute<any[]>('SELECT * FROM sales_orders WHERE id = ? AND user_email = ? LIMIT 1 FOR UPDATE', [id, email]);
  const row = (rows as any[])[0];
  if (!row) throw new SalesError('Sale not found.', 404);
  return row;
}

export async function getSale(email: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM sales_orders WHERE id = ? AND user_email = ? LIMIT 1', [id, email]);
  const row = (rows as any[])[0];
  return row ? saleRowToObject(row) : null;
}

async function invoiceStillExists(conn: PoolConnection, email: string, invoiceId: string | null | undefined) {
  if (!invoiceId) return false;
  const [rows] = await conn.execute<any[]>('SELECT id FROM invoices WHERE id = ? AND user_email = ? LIMIT 1', [invoiceId, email]);
  return (rows as any[]).length > 0;
}

// ----------------------------------------------------------------- invoices

// Creates the sale's invoice in the MAIN Billing engine (`invoices` +
// `invoice_items`, so it shows up in Invoice History and prints with the
// existing PDF). Deliberately does NOT touch stock (the sale already took its
// stock out) and does NOT credit the legacy wallet balance (Billing's own
// side-effects belong to invoices typed into Billing; E-Wallet's ledger reads
// this invoice's payment status like any other invoice's).
export async function createInvoiceForSale(conn: PoolConnection, email: string, sale: any): Promise<string> {
  const tax = await tenantTax(conn, email);
  const [countRows] = await conn.execute<any[]>('SELECT COUNT(*) AS c FROM invoices WHERE user_email = ?', [email]);
  let seq = Number((countRows as any[])[0]?.c || 0) + 1;
  let invoiceNumber = `${tax.invoicePrefix}-${String(seq).padStart(6, '0')}`;
  for (;;) {
    const [dup] = await conn.execute<any[]>('SELECT id FROM invoices WHERE user_email = ? AND invoice_number = ? LIMIT 1', [email, invoiceNumber]);
    if ((dup as any[]).length === 0) break;
    seq += 1;
    invoiceNumber = `${tax.invoicePrefix}-${String(seq).padStart(6, '0')}`;
  }

  const invoiceId = `INV${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
  const now = new Date().toISOString();
  const gstAmount = money(sale.gst_amount);
  const half = round2(gstAmount / 2);
  const itemsSubtotal = round2(money(sale.quantity) * money(sale.unit_price));
  const deliveryCharge = money(sale.delivery_charge);
  const status = derivePaymentStatus(money(sale.grand_total), money(sale.amount_paid));
  const paymentStatus = status === 'Pending' ? 'Unpaid' : status; // Billing's own spelling
  const itemName = `${sale.brand || ''} ${sale.model || ''}`.trim() || 'Product';

  await conn.execute(
    `INSERT INTO invoices (id, user_email, invoice_number, date, due_date, customer_id, customer_name, mobile, address,
       subtotal, total_discount, cgst, sgst, grand_total, payment_status, payment_mode, timestamp, brand, model,
       tax_enabled, gst, source_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceId, email, invoiceNumber, sale.sale_date || now.slice(0, 10), sale.sale_date || now.slice(0, 10),
      sale.customer_id, sale.customer_name, sale.mobile, sale.address ?? null,
      round2(itemsSubtotal + deliveryCharge), money(sale.discount), half, round2(gstAmount - half), money(sale.grand_total),
      paymentStatus, sale.payment_method || 'Cash', now, sale.brand ?? null, sale.model ?? null,
      sale.gst_enabled ? 1 : 0, sale.gst_enabled ? money(sale.gst_rate) : 0, `sale:${sale.id}`,
    ]
  );
  await conn.execute(
    `INSERT INTO invoice_items (id, invoice_id, name, brand, size, quantity, rate, gst_percent, discount, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [`ITEM-${invoiceId}-1`, invoiceId, itemName, sale.brand ?? null, sale.screen_size ?? '', money(sale.quantity), money(sale.unit_price),
      sale.gst_enabled ? money(sale.gst_rate) : 0, money(sale.discount), itemsSubtotal]
  );
  if (deliveryCharge > 0) {
    await conn.execute(
      `INSERT INTO invoice_items (id, invoice_id, name, brand, size, quantity, rate, gst_percent, discount, amount)
       VALUES (?, ?, 'Delivery Charge', '', '', 1, ?, 0, 0, ?)`,
      [`ITEM-${invoiceId}-2`, invoiceId, deliveryCharge, deliveryCharge]
    );
  }
  await conn.execute('UPDATE sales_orders SET billing_invoice_id = ?, updated_at = ? WHERE id = ? AND user_email = ?', [invoiceId, now, sale.id, email]);
  return invoiceId;
}

async function syncInvoicePayment(conn: PoolConnection, email: string, invoiceId: string | null | undefined, total: number, paid: number) {
  if (!invoiceId) return;
  const s = derivePaymentStatus(total, paid);
  await conn.execute('UPDATE invoices SET payment_status = ? WHERE id = ? AND user_email = ?', [s === 'Pending' ? 'Unpaid' : s, invoiceId, email]);
}

// ------------------------------------------------------------ shared inserts

export interface SaleInsert {
  id: string; customerId: string; customerName: string; mobile: string; email?: string | null; address?: string | null; pincode?: string | null;
  productId: string; brand: string; model: string; screenSize?: string | null; serialNumber?: string | null;
  quantity: number; unitPrice: number; saleDate: string; salesperson: string; storeLocation: string;
  paymentMethod: string; paymentStatus: string; deliveryRequired: boolean; deliveryStatus: string;
  subtotal: number; discount: number; gstEnabled: boolean; gstRate: number; gstAmount: number; deliveryCharge: number;
  grandTotal: number; amountPaid: number; balanceDue: number; status: SaleStatus;
  notes?: string | null; sourceOrderId?: string | null;
}

// The single INSERT into sales_orders — used by New Sale and by an Order's
// conversion into a Sale, so both always write exactly the same shape.
// stock_deducted is always 1 here: callers take the stock out in the same
// transaction (adjustStock) before inserting.
export async function insertSale(conn: PoolConnection, email: string, v: SaleInsert) {
  const now = new Date().toISOString();
  await conn.execute(
    `INSERT INTO sales_orders (id, user_email, customer_id, customer_name, mobile, email, address, pincode,
       product_id, brand, model, screen_size, serial_number, quantity, unit_price, sale_date, salesperson, store_location,
       payment_method, payment_status, delivery_required, delivery_status, subtotal, discount, gst_enabled, gst_rate,
       gst_amount, delivery_charge, grand_total, amount_paid, balance_due, order_status, created_at, updated_at,
       notes, stock_deducted, source_order_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      v.id, email, v.customerId, v.customerName, v.mobile, v.email ?? null, v.address ?? null, v.pincode ?? null,
      v.productId, v.brand, v.model, v.screenSize ?? null, v.serialNumber ?? null, v.quantity, v.unitPrice,
      v.saleDate, v.salesperson, v.storeLocation, v.paymentMethod, v.paymentStatus, v.deliveryRequired ? 1 : 0, v.deliveryStatus,
      v.subtotal, v.discount, v.gstEnabled ? 1 : 0, v.gstRate, v.gstAmount, v.deliveryCharge, v.grandTotal, v.amountPaid, v.balanceDue,
      v.status, now, now, v.notes ?? null, v.sourceOrderId ?? null,
    ]
  );
}

export async function insertDelivery(
  conn: PoolConnection, email: string,
  d: { saleId: string; customerName: string; mobile: string; address?: string | null; product: string; status: string; paymentStatus: string },
) {
  const now = new Date().toISOString();
  await conn.execute(
    `INSERT INTO sales_deliveries (id, user_email, order_id, customer_name, mobile, address, product, delivery_status, payment_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [`SDEL-${d.saleId}`, email, d.saleId, d.customerName, d.mobile, d.address ?? null, d.product, d.status, d.paymentStatus, now, now]
  );
}

// ------------------------------------------------------------------ create

export interface SaleActor { label: string }

// Who performed the action, for the audit columns (owner/admin sessions have no employee id).
export function actorFrom(auth: { employeeId: string | null }): SaleActor {
  return { label: auth.employeeId ? `Employee ${auth.employeeId}` : 'Owner' };
}

export async function createSale(email: string, body: any, actor: SaleActor, opts: { generateInvoice?: boolean } = {}) {
  const status = body?.orderStatus ? normalizeSaleStatus(body.orderStatus) : 'Completed';
  if (status !== 'Completed' && status !== 'Pending') throw new SalesError('A new sale must be Completed or Pending.');

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const tax = await tenantTax(conn, email);
    const pricing = computeTotals({
      quantity: body.quantity, unitPrice: body.unitPrice, discount: body.discount,
      gstEnabled: !!body.gstEnabled, gstRate: tax.gstRate, deliveryCharge: body.deliveryCharge,
    });
    const problem = validateSaleInput({ ...body, amountPaid: body.amountPaid ?? 0 }, pricing.grandTotal);
    if (problem) throw new SalesError(problem);

    const maxAttempts = 5;
    return await withSequenceLock(conn, 'sale', email, async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      try {
        const customer = await loadCustomer(conn, email, body.customerId);
        const stock = await loadStockItem(conn, email, body.productId);
        const id = await nextSequentialId(conn, 'sales_orders', email, 'SALE', attempt - 1);
        const now = new Date().toISOString();
        const paid = round2(Number(body.amountPaid) || 0);
        const method = (PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod) ? body.paymentMethod : 'Cash';
        const deliveryRequired = !!body.deliveryRequired;
        const brand = String(body.brand || stock.brand || '').slice(0, 100);
        const model = String(body.model || stock.model || stock.name || '').slice(0, 100);

        await adjustStock(conn, email, stock.id, -Number(body.quantity), {
          referenceId: id, customerName: customer.name, note: `Sale ${id}`, by: actor.label,
        });

        await insertSale(conn, email, {
          id, customerId: customer.id, customerName: customer.name, mobile: customer.mobile,
          email: customer.email, address: customer.address, pincode: customer.pincode,
          productId: stock.id, brand, model, screenSize: stock.screen_size, serialNumber: body.serialNumber,
          quantity: Number(body.quantity), unitPrice: Number(body.unitPrice),
          saleDate: body.saleDate || now.slice(0, 10), salesperson: body.salesperson || actor.label, storeLocation: body.storeLocation || 'SHOWROOM',
          paymentMethod: method, paymentStatus: derivePaymentStatus(pricing.grandTotal, paid),
          deliveryRequired, deliveryStatus: deliveryRequired ? 'Pending Pickup' : 'Not Required',
          subtotal: pricing.subtotal, discount: pricing.discount, gstEnabled: !!body.gstEnabled, gstRate: body.gstEnabled ? tax.gstRate : 0,
          gstAmount: pricing.gstAmount, deliveryCharge: pricing.deliveryCharge, grandTotal: pricing.grandTotal,
          amountPaid: paid, balanceDue: remaining(pricing.grandTotal, paid), status,
          notes: body.notes ? String(body.notes).slice(0, 2000) : null,
        });

        if (paid > 0) {
          await conn.execute(
            `INSERT INTO sales_payments (id, user_email, ref_type, ref_id, amount, method, paid_on, note, created_by, created_at)
             VALUES (?, ?, 'SALE', ?, ?, ?, ?, 'Payment at time of sale', ?, ?)`,
            [newId('PAY'), email, id, paid, method, body.saleDate || now.slice(0, 10), actor.label, now]
          );
        }

        if (deliveryRequired) {
          await insertDelivery(conn, email, {
            saleId: id, customerName: customer.name, mobile: customer.mobile, address: customer.address,
            product: `${brand} ${model}`.trim(), status: 'Pending Pickup', paymentStatus: derivePaymentStatus(pricing.grandTotal, paid),
          });
        }

        let invoiceId: string | null = null;
        if (opts.generateInvoice) {
          const [saleRows] = await conn.execute<any[]>('SELECT * FROM sales_orders WHERE id = ? AND user_email = ?', [id, email]);
          invoiceId = await createInvoiceForSale(conn, email, (saleRows as any[])[0]);
        }

        await conn.commit();
        return { id, invoiceId };
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new SalesError('Could not generate a unique Sale ID — please try again.', 409);
    });
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ update

export async function updateSale(email: string, id: string, body: any, actor: SaleActor) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cur = await loadSaleForUpdate(conn, email, id);
    const tax = await tenantTax(conn, email);

    const curStatus = normalizeSaleStatus(cur.order_status);
    const nextStatus: SaleStatus = body.orderStatus !== undefined ? normalizeSaleStatus(body.orderStatus) : curStatus;
    const paid = money(cur.amount_paid); // owned by sales_payments — edits never overwrite it
    const gstEnabled = body.gstEnabled !== undefined ? !!body.gstEnabled : !!cur.gst_enabled;
    // Keep the rate the sale was made at unless GST is being switched on now.
    const gstRate = gstEnabled ? (cur.gst_enabled ? money(cur.gst_rate) : tax.gstRate) : 0;

    const merged = {
      customerId: body.customerId ?? cur.customer_id,
      productId: body.productId ?? cur.product_id,
      quantity: body.quantity ?? cur.quantity,
      unitPrice: body.unitPrice ?? cur.unit_price,
      discount: body.discount ?? cur.discount,
      deliveryCharge: body.deliveryCharge ?? cur.delivery_charge,
    };
    const pricing = computeTotals({ ...merged, gstEnabled, gstRate });
    const problem = validateSaleInput({ ...merged, saleDate: body.saleDate ?? cur.sale_date, amountPaid: paid }, pricing.grandTotal);
    if (problem) {
      if (round2(paid) > round2(pricing.grandTotal)) throw new SalesError(`The new total (₹${pricing.grandTotal}) cannot be lower than the ₹${paid} already paid.`);
      throw new SalesError(problem);
    }

    const hasInvoice = await invoiceStillExists(conn, email, cur.billing_invoice_id);
    const moneyChanged =
      merged.customerId !== cur.customer_id || merged.productId !== cur.product_id ||
      Number(merged.quantity) !== Number(cur.quantity) || round2(merged.unitPrice) !== round2(money(cur.unit_price)) ||
      pricing.discount !== round2(money(cur.discount)) || pricing.deliveryCharge !== round2(money(cur.delivery_charge)) ||
      gstEnabled !== !!cur.gst_enabled;
    if (hasInvoice && moneyChanged) {
      throw new SalesError('This sale already has an invoice, so its customer, product and amounts are locked. Delete the invoice in Invoice History first if they must change.', 409);
    }
    if (hasInvoice && !isActiveSale(nextStatus) && isActiveSale(curStatus)) {
      throw new SalesError('This sale has an invoice, so it cannot be Cancelled or Refunded from here. Delete the invoice in Invoice History first, then change the sale status.', 409);
    }

    const customer = merged.customerId !== cur.customer_id ? await loadCustomer(conn, email, merged.customerId) : null;
    const wasDeducted = !!cur.stock_deducted;
    const wantDeducted = isActiveSale(nextStatus);
    // The product only has to still exist if this sale needs stock taken out or
    // is being pointed at a different product — cancelling/refunding a sale
    // whose product was later deleted from Stock must still work.
    let stock: any = null;
    try {
      stock = await loadStockItem(conn, email, merged.productId);
    } catch (e) {
      if (wantDeducted || merged.productId !== cur.product_id || !(e instanceof SalesError)) throw e;
    }

    // Stock: put back whatever THIS sale took out, then take out what it needs
    // now — skipped entirely when nothing about the stock effect changed.
    const sameEffect = wasDeducted && wantDeducted && merged.productId === cur.product_id && Number(merged.quantity) === Number(cur.quantity);
    if (!sameEffect) {
      const ctx = { referenceId: id, customerName: customer?.name ?? cur.customer_name, by: actor.label };
      if (wasDeducted && cur.product_id && stock) await adjustStock(conn, email, cur.product_id, Number(cur.quantity), { ...ctx, note: `Sale ${id} changed/cancelled — stock returned` });
      if (wantDeducted && stock) await adjustStock(conn, email, stock.id, -Number(merged.quantity), { ...ctx, note: `Sale ${id}` });
    }

    const now = new Date().toISOString();
    const deliveryRequired = body.deliveryRequired !== undefined ? !!body.deliveryRequired : !!cur.delivery_required;
    const balance = isActiveSale(nextStatus) ? remaining(pricing.grandTotal, paid) : 0;
    const method = (PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod) ? body.paymentMethod : cur.payment_method;
    const brand = String(body.brand ?? cur.brand ?? stock?.brand ?? '').slice(0, 100);
    const model = String(body.model ?? cur.model ?? stock?.model ?? '').slice(0, 100);

    await conn.execute(
      `UPDATE sales_orders SET customer_id = ?, customer_name = ?, mobile = ?, email = ?, address = ?, pincode = ?,
         product_id = ?, brand = ?, model = ?, screen_size = ?, serial_number = ?, quantity = ?, unit_price = ?, sale_date = ?,
         salesperson = ?, store_location = ?, payment_method = ?, payment_status = ?, delivery_required = ?,
         subtotal = ?, discount = ?, gst_enabled = ?, gst_rate = ?, gst_amount = ?, delivery_charge = ?, grand_total = ?,
         balance_due = ?, order_status = ?, notes = ?, stock_deducted = ?, updated_at = ?
       WHERE id = ? AND user_email = ?`,
      [
        merged.customerId, customer?.name ?? cur.customer_name, customer?.mobile ?? cur.mobile, customer ? (customer.email ?? null) : cur.email,
        customer ? (customer.address ?? null) : cur.address, customer ? (customer.pincode ?? null) : cur.pincode,
        merged.productId, brand, model, stock?.screen_size ?? cur.screen_size ?? null, body.serialNumber ?? cur.serial_number ?? null,
        Number(merged.quantity), Number(merged.unitPrice), body.saleDate ?? cur.sale_date,
        body.salesperson ?? cur.salesperson ?? null, body.storeLocation ?? cur.store_location ?? null, method, derivePaymentStatus(pricing.grandTotal, paid),
        deliveryRequired ? 1 : 0,
        pricing.subtotal, pricing.discount, gstEnabled ? 1 : 0, gstRate, pricing.gstAmount, pricing.deliveryCharge, pricing.grandTotal,
        balance, nextStatus, body.notes !== undefined ? (body.notes ? String(body.notes).slice(0, 2000) : null) : (cur.notes ?? null),
        wantDeducted ? 1 : 0, now, id, email,
      ]
    );

    // Delivery record follows the flag (never invents one for a cancelled sale).
    const [delRows] = await conn.execute<any[]>('SELECT id, delivery_status FROM sales_deliveries WHERE order_id = ? AND user_email = ?', [id, email]);
    if (isActiveSale(nextStatus) && deliveryRequired && (delRows as any[]).length === 0) {
      await insertDelivery(conn, email, {
        saleId: id, customerName: customer?.name ?? cur.customer_name, mobile: customer?.mobile ?? cur.mobile,
        address: customer ? customer.address : cur.address, product: `${brand} ${model}`.trim(),
        status: 'Pending Pickup', paymentStatus: derivePaymentStatus(pricing.grandTotal, paid),
      });
      await conn.execute('UPDATE sales_orders SET delivery_status = ? WHERE id = ? AND user_email = ?', ['Pending Pickup', id, email]);
    } else if (!deliveryRequired) {
      await conn.execute("DELETE FROM sales_deliveries WHERE order_id = ? AND user_email = ? AND delivery_status = 'Pending Pickup'", [id, email]);
      await conn.execute("UPDATE sales_orders SET delivery_status = 'Not Required' WHERE id = ? AND user_email = ? AND delivery_status = 'Pending Pickup'", [id, email]);
    }

    await syncInvoicePayment(conn, email, hasInvoice ? cur.billing_invoice_id : null, pricing.grandTotal, paid);
    await conn.commit();
    return getSale(email, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function setSaleStatus(email: string, id: string, status: string, actor: SaleActor) {
  return updateSale(email, id, { orderStatus: normalizeSaleStatus(status) }, actor);
}

// ---------------------------------------------------------------- payments

export async function listPayments(email: string, refType: 'SALE' | 'ORDER', refId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM sales_payments WHERE user_email = ? AND ref_type = ? AND ref_id = ? ORDER BY created_at ASC',
    [email, refType, refId]
  );
  return (rows as any[]).map(r => ({
    id: r.id, refType: r.ref_type, refId: r.ref_id, amount: money(r.amount), method: r.method, paidOn: r.paid_on,
    note: r.note, createdBy: r.created_by, createdAt: r.created_at,
  }));
}

export async function recordSalePayment(email: string, id: string, body: any, actor: SaleActor) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await loadSaleForUpdate(conn, email, id);
    if (!isActiveSale(normalizeSaleStatus(sale.order_status))) throw new SalesError('Payments can only be recorded on a Completed or Pending sale.', 409);
    const balance = remaining(money(sale.grand_total), money(sale.amount_paid));
    const problem = validatePayment(body?.amount, balance);
    if (problem) throw new SalesError(problem);

    const amount = round2(Number(body.amount));
    const method = (PAYMENT_METHODS as readonly string[]).includes(body.method) ? body.method : 'Cash';
    const now = new Date().toISOString();
    const newPaid = round2(money(sale.amount_paid) + amount);
    await conn.execute(
      `INSERT INTO sales_payments (id, user_email, ref_type, ref_id, amount, method, paid_on, note, created_by, created_at)
       VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?, ?, ?)`,
      [newId('PAY'), email, id, amount, method, body.paidOn || now.slice(0, 10), body.note ? String(body.note).slice(0, 500) : null, actor.label, now]
    );
    const newStatus = derivePaymentStatus(money(sale.grand_total), newPaid);
    await conn.execute(
      'UPDATE sales_orders SET amount_paid = ?, balance_due = ?, payment_status = ?, payment_method = ?, updated_at = ? WHERE id = ? AND user_email = ?',
      [newPaid, remaining(money(sale.grand_total), newPaid), newStatus, method, now, id, email]
    );
    await conn.execute('UPDATE sales_deliveries SET payment_status = ?, updated_at = ? WHERE order_id = ? AND user_email = ?', [newStatus, now, id, email]);
    if (await invoiceStillExists(conn, email, sale.billing_invoice_id)) {
      await syncInvoicePayment(conn, email, sale.billing_invoice_id, money(sale.grand_total), newPaid);
    }
    await conn.commit();
    return getSale(email, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ----------------------------------------------------------------- invoice

export async function generateInvoiceForSale(email: string, id: string) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await loadSaleForUpdate(conn, email, id);
    if (!isActiveSale(normalizeSaleStatus(sale.order_status))) throw new SalesError('Invoices can only be generated for a Completed or Pending sale.', 409);
    if (await invoiceStillExists(conn, email, sale.billing_invoice_id)) {
      await conn.commit();
      return { invoiceId: sale.billing_invoice_id as string, created: false };
    }
    const invoiceId = await createInvoiceForSale(conn, email, sale);
    await conn.commit();
    return { invoiceId, created: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ delete

export async function deleteSale(email: string, id: string, actor: SaleActor) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await loadSaleForUpdate(conn, email, id);
    if (await invoiceStillExists(conn, email, sale.billing_invoice_id)) {
      throw new SalesError('This sale has an invoice, so it cannot be deleted here. Delete the invoice in Invoice History first (or mark the sale Cancelled after that).', 409);
    }
    if (sale.source_order_id) {
      throw new SalesError(`This sale was created from order ${sale.source_order_id}, so it cannot be deleted. Mark it Cancelled or Refunded instead.`, 409);
    }
    if (sale.stock_deducted && sale.product_id) {
      await adjustStock(conn, email, sale.product_id, Number(sale.quantity), {
        referenceId: id, customerName: sale.customer_name, note: `Sale ${id} deleted — stock returned`, by: actor.label,
      });
    }
    await conn.execute('DELETE FROM sales_payments WHERE user_email = ? AND ref_type = ? AND ref_id = ?', [email, 'SALE', id]);
    await conn.execute('DELETE FROM sales_deliveries WHERE order_id = ? AND user_email = ?', [id, email]);
    await conn.execute('DELETE FROM sales_orders WHERE id = ? AND user_email = ?', [id, email]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
