import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { decrementStockByMatch } from './stock';

const ORDER_COLUMNS: { js: string; sql: string; type?: 'number' | 'boolean' }[] = [
  { js: 'customerId', sql: 'customer_id' },
  { js: 'customerName', sql: 'customer_name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'email', sql: 'email' },
  { js: 'address', sql: 'address' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'productId', sql: 'product_id' },
  { js: 'brand', sql: 'brand' },
  { js: 'model', sql: 'model' },
  { js: 'screenSize', sql: 'screen_size' },
  { js: 'serialNumber', sql: 'serial_number' },
  { js: 'quantity', sql: 'quantity', type: 'number' },
  { js: 'unitPrice', sql: 'unit_price', type: 'number' },
  { js: 'saleDate', sql: 'sale_date' },
  { js: 'salesperson', sql: 'salesperson' },
  { js: 'storeLocation', sql: 'store_location' },
  { js: 'paymentMethod', sql: 'payment_method' },
  { js: 'paymentStatus', sql: 'payment_status' },
  { js: 'deliveryRequired', sql: 'delivery_required', type: 'boolean' },
  { js: 'deliveryStatus', sql: 'delivery_status' },
  { js: 'subtotal', sql: 'subtotal', type: 'number' },
  { js: 'discount', sql: 'discount', type: 'number' },
  { js: 'gstEnabled', sql: 'gst_enabled', type: 'boolean' },
  { js: 'gstRate', sql: 'gst_rate', type: 'number' },
  { js: 'gstAmount', sql: 'gst_amount', type: 'number' },
  { js: 'deliveryCharge', sql: 'delivery_charge', type: 'number' },
  { js: 'grandTotal', sql: 'grand_total', type: 'number' },
  { js: 'amountPaid', sql: 'amount_paid', type: 'number' },
  { js: 'balanceDue', sql: 'balance_due', type: 'number' },
  { js: 'orderStatus', sql: 'order_status' },
  { js: 'invoiceId', sql: 'invoice_id' },
  { js: 'createdAt', sql: 'created_at' },
  { js: 'updatedAt', sql: 'updated_at' },
];

function orderRowToObject(row: any) {
  const obj: any = { id: row.id };
  for (const col of ORDER_COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'boolean') v = !!v;
    obj[col.js] = v;
  }
  return obj;
}

function orderValues(order: any) {
  return ORDER_COLUMNS.map(c => {
    let v = order[c.js];
    if (v === undefined) v = null;
    if (c.type === 'boolean') v = v ? 1 : 0;
    return v;
  });
}

export async function listSalesOrders(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM sales_orders WHERE user_email = ?', [email]);
  return (rows as any[]).map(orderRowToObject);
}

function deliveryRowToObject(row: any) {
  return {
    id: row.id,
    orderId: row.order_id,
    runnerName: row.runner_name,
    customerName: row.customer_name,
    mobile: row.mobile,
    address: row.address,
    product: row.product,
    deliveryDate: row.delivery_date,
    deliveryStatus: row.delivery_status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSalesDeliveries(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM sales_deliveries WHERE user_email = ?', [email]);
  return (rows as any[]).map(deliveryRowToObject);
}

function invoiceRowToObject(row: any) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    orderId: row.order_id,
    invoiceDate: row.invoice_date,
    customerName: row.customer_name,
    mobile: row.mobile,
    amount: row.amount,
    gstAmount: row.gst_amount,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

export async function listSalesInvoices(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM sales_invoices WHERE user_email = ?', [email]);
  return (rows as any[]).map(invoiceRowToObject);
}

// Mirrors use-erp-store.ts's addSalesOrder: insert the order, decrement stock
// by product_id, and auto-create a sales_delivery row if delivery_required —
// one DB transaction.
export async function createSalesOrder(email: string, order: any) {
  if (!order?.id) throw new Error('id is required');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...ORDER_COLUMNS.map(c => c.sql)];
    await conn.execute(
      `INSERT INTO sales_orders (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      [order.id, email, ...orderValues(order)]
    );

    if (order.productId) {
      await decrementStockByMatch(conn, email, { id: order.productId }, order.quantity ?? 0);
    }

    if (order.deliveryRequired) {
      const deliveryId = `SDEL-${order.id}`;
      await conn.execute(
        `INSERT INTO sales_deliveries (id, user_email, order_id, customer_name, mobile, address, product, delivery_status, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Pickup', ?, ?, ?)`,
        [deliveryId, email, order.id, order.customerName ?? null, order.mobile ?? null, order.address ?? null, `${order.brand ?? ''} ${order.model ?? ''}`.trim(), order.paymentStatus ?? null, new Date().toISOString(), new Date().toISOString()]
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

// Idempotent, side-effect-free upsert used only by the bulk import route —
// no stock decrement, no auto-created delivery (sales_deliveries rows are
// imported separately, straight from the snapshot's own array).
export async function importUpsertSalesOrder(email: string, order: any) {
  if (!order?.id) return;
  const pool = getPool();
  const cols = ['id', 'user_email', ...ORDER_COLUMNS.map(c => c.sql)];
  const updateClause = ORDER_COLUMNS.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
  await pool.execute(
    `INSERT INTO sales_orders (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    [order.id, email, ...orderValues(order)]
  );
}

export async function importUpsertSalesInvoice(email: string, inv: any) {
  if (!inv?.id) return;
  const pool = getPool();
  await pool.execute(
    `INSERT INTO sales_invoices (id, user_email, invoice_number, order_id, invoice_date, customer_name, mobile, amount, gst_amount, payment_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE invoice_number=VALUES(invoice_number), order_id=VALUES(order_id), invoice_date=VALUES(invoice_date),
       customer_name=VALUES(customer_name), mobile=VALUES(mobile), amount=VALUES(amount), gst_amount=VALUES(gst_amount),
       payment_status=VALUES(payment_status), created_at=VALUES(created_at)`,
    [inv.id, email, inv.invoiceNumber ?? null, inv.orderId ?? null, inv.invoiceDate ?? null, inv.customerName ?? null, inv.mobile ?? null, inv.amount ?? 0, inv.gstAmount ?? 0, inv.paymentStatus ?? null, inv.createdAt ?? null]
  );
}

export async function importUpsertSalesDelivery(email: string, d: any) {
  if (!d?.id) return;
  const pool = getPool();
  await pool.execute(
    `INSERT INTO sales_deliveries (id, user_email, order_id, runner_name, customer_name, mobile, address, product, delivery_date, delivery_status, payment_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE order_id=VALUES(order_id), runner_name=VALUES(runner_name), customer_name=VALUES(customer_name),
       mobile=VALUES(mobile), address=VALUES(address), product=VALUES(product), delivery_date=VALUES(delivery_date),
       delivery_status=VALUES(delivery_status), payment_status=VALUES(payment_status), updated_at=VALUES(updated_at)`,
    [d.id, email, d.orderId ?? null, d.runnerName ?? null, d.customerName ?? null, d.mobile ?? null, d.address ?? null, d.product ?? null, d.deliveryDate ?? null, d.deliveryStatus ?? null, d.paymentStatus ?? null, d.createdAt ?? null, d.updatedAt ?? null]
  );
}

export async function updateSalesOrder(email: string, id: string, order: any) {
  const pool = getPool();
  const setClause = ORDER_COLUMNS.map(c => `${c.sql} = ?`).join(', ');
  const [result]: any = await pool.execute(
    `UPDATE sales_orders SET ${setClause} WHERE id = ? AND user_email = ?`,
    [...orderValues(order), id, email]
  );
  return result.affectedRows > 0;
}

// Matches deleteSalesOrder's cascade: also removes any linked sales_deliveries.
export async function deleteSalesOrder(email: string, id: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM sales_deliveries WHERE order_id = ? AND user_email = ?', [id, email]);
    const [result]: any = await conn.execute('DELETE FROM sales_orders WHERE id = ? AND user_email = ?', [id, email]);
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Mirrors generateSalesInvoice: creates the sales_invoices row and backfills
// sales_orders.invoice_id — one transaction.
export async function generateSalesInvoiceForOrder(email: string, orderId: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute<any[]>('SELECT * FROM sales_orders WHERE id = ? AND user_email = ?', [orderId, email]);
    const order = (orders as any[])[0];
    if (!order) {
      await conn.rollback();
      return null;
    }
    const [countRows] = await conn.execute<any[]>('SELECT COUNT(*) as cnt FROM sales_invoices WHERE user_email = ?', [email]);
    const seq = ((countRows as any[])[0]?.cnt ?? 0) + 1;
    const invoiceId = `SINV-${String(seq).padStart(6, '0')}`;
    const now = new Date().toISOString();
    await conn.execute(
      `INSERT INTO sales_invoices (id, user_email, invoice_number, order_id, invoice_date, customer_name, mobile, amount, gst_amount, payment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, email, invoiceId, orderId, now, order.customer_name, order.mobile, order.grand_total, order.gst_amount, order.payment_status, now]
    );
    await conn.execute('UPDATE sales_orders SET invoice_id = ? WHERE id = ? AND user_email = ?', [invoiceId, orderId, email]);
    await conn.commit();
    return invoiceId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Mirrors updateSalesDeliveryStatus: updates the delivery and propagates the
// new status onto the linked sales_orders row — one transaction.
export async function updateSalesDeliveryStatus(email: string, deliveryId: string, status: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result]: any = await conn.execute(
      'UPDATE sales_deliveries SET delivery_status = ?, updated_at = ? WHERE id = ? AND user_email = ?',
      [status, new Date().toISOString(), deliveryId, email]
    );
    if (result.affectedRows > 0) {
      const [rows] = await conn.execute<any[]>('SELECT order_id FROM sales_deliveries WHERE id = ? AND user_email = ?', [deliveryId, email]);
      const orderId = (rows as any[])[0]?.order_id;
      if (orderId) {
        await conn.execute('UPDATE sales_orders SET delivery_status = ? WHERE id = ? AND user_email = ?', [status, orderId, email]);
      }
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
