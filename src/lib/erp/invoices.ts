import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { decrementStockByMatch } from './stock';
import { applyWalletDelta } from './wallet';

const INVOICE_COLUMNS: { js: string; sql: string; type?: 'number' | 'boolean' }[] = [
  { js: 'invoiceNumber', sql: 'invoice_number' },
  { js: 'date', sql: 'date' },
  { js: 'dueDate', sql: 'due_date' },
  { js: 'customerId', sql: 'customer_id' },
  { js: 'customerName', sql: 'customer_name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'address', sql: 'address' },
  { js: 'customerGSTIN', sql: 'customer_gstin' },
  { js: 'subtotal', sql: 'subtotal', type: 'number' },
  { js: 'totalDiscount', sql: 'total_discount', type: 'number' },
  { js: 'cgst', sql: 'cgst', type: 'number' },
  { js: 'sgst', sql: 'sgst', type: 'number' },
  { js: 'grandTotal', sql: 'grand_total', type: 'number' },
  { js: 'paymentStatus', sql: 'payment_status' },
  { js: 'paymentMode', sql: 'payment_mode' },
  { js: 'timestamp', sql: 'timestamp' },
  { js: 'jobId', sql: 'job_id' },
  { js: 'model', sql: 'model' },
  { js: 'brand', sql: 'brand' },
  { js: 'labourCharges', sql: 'labour_charges', type: 'number' },
  { js: 'total', sql: 'total', type: 'number' },
  { js: 'taxEnabled', sql: 'tax_enabled', type: 'boolean' },
  { js: 'gst', sql: 'gst', type: 'number' },
];

function invoiceRowToObject(row: any, items: any[]) {
  const obj: any = { id: row.id };
  for (const col of INVOICE_COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'boolean') v = v === null ? null : !!v;
    obj[col.js] = v;
  }
  obj.items = items;
  return obj;
}

function itemRowToObject(row: any) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    size: row.size,
    quantity: row.quantity,
    rate: row.rate,
    gstPercent: row.gst_percent,
    discount: row.discount,
    amount: row.amount,
  };
}

export async function listInvoices(email: string) {
  const pool = getPool();
  const [invoices] = await pool.execute<any[]>('SELECT * FROM invoices WHERE user_email = ?', [email]);
  const [items] = await pool.execute<any[]>(
    `SELECT ii.* FROM invoice_items ii INNER JOIN invoices i ON ii.invoice_id = i.id WHERE i.user_email = ?`,
    [email]
  );
  const byInvoice = new Map<string, any[]>();
  for (const it of items as any[]) {
    const list = byInvoice.get(it.invoice_id) || [];
    list.push(itemRowToObject(it));
    byInvoice.set(it.invoice_id, list);
  }
  return (invoices as any[]).map(row => invoiceRowToObject(row, byInvoice.get(row.id) || []));
}

// Mirrors use-erp-store.ts's addInvoice: insert the invoice + its line items,
// decrement matching stock quantities, and record a wallet transaction — all
// in one DB transaction so it's atomic the same way the in-memory version was.
export async function createInvoiceWithSideEffects(email: string, invoice: any) {
  if (!invoice?.id) throw new Error('id is required');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const cols = ['id', 'user_email', ...INVOICE_COLUMNS.map(c => c.sql)];
    const values = [invoice.id, email, ...INVOICE_COLUMNS.map(c => {
      let v = invoice[c.js];
      if (v === undefined) v = null;
      if (c.type === 'boolean') v = v === null ? null : (v ? 1 : 0);
      return v;
    })];
    await conn.execute(`INSERT INTO invoices (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);

    const items = Array.isArray(invoice.items) ? invoice.items : [];
    for (const item of items) {
      await conn.execute(
        `INSERT INTO invoice_items (id, invoice_id, name, brand, size, quantity, rate, gst_percent, discount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, invoice.id, item.name ?? null, item.brand ?? null, item.size ?? null, item.quantity ?? 0, item.rate ?? 0, item.gstPercent ?? 0, item.discount ?? 0, item.amount ?? 0]
      );
      await decrementStockByMatch(conn, email, { name: item.name, barcode: item.id }, item.quantity ?? 0);
    }

    const txId = `TX-${Date.now()}`;
    await conn.execute(
      `INSERT INTO wallet_transactions (id, user_email, amount, date, time, type, description)
       VALUES (?, ?, ?, ?, ?, 'INVOICE_SALE', ?)`,
      [
        txId, email, invoice.grandTotal ?? 0,
        new Date().toISOString().split('T')[0], new Date().toLocaleTimeString(),
        `Sale: ${invoice.invoiceNumber} - ${invoice.customerName}`,
      ]
    );
    await applyWalletDelta(conn, email, invoice.grandTotal ?? 0);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Idempotent, side-effect-free upsert used only by the bulk import route —
// restoring historical data must NOT re-decrement stock or re-credit the
// wallet, since those effects already happened when the invoice was
// originally created.
export async function importUpsertInvoice(email: string, invoice: any) {
  if (!invoice?.id) return;
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...INVOICE_COLUMNS.map(c => c.sql)];
    const values = [invoice.id, email, ...INVOICE_COLUMNS.map(c => {
      let v = invoice[c.js];
      if (v === undefined) v = null;
      if (c.type === 'boolean') v = v === null ? null : (v ? 1 : 0);
      return v;
    })];
    const updateClause = INVOICE_COLUMNS.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
    await conn.execute(
      `INSERT INTO invoices (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${updateClause}`,
      values
    );
    await conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
    for (const item of Array.isArray(invoice.items) ? invoice.items : []) {
      await conn.execute(
        `INSERT INTO invoice_items (id, invoice_id, name, brand, size, quantity, rate, gst_percent, discount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, invoice.id, item.name ?? null, item.brand ?? null, item.size ?? null, item.quantity ?? 0, item.rate ?? 0, item.gstPercent ?? 0, item.discount ?? 0, item.amount ?? 0]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Matches the app's deleteInvoice exactly: delete only, no restock.
export async function deleteInvoice(email: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM invoices WHERE id = ? AND user_email = ?', [id, email]);
  return result.affectedRows > 0;
}
