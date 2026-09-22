import { getPool } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import {
  computeTotals, derivePaymentStatus, remaining, round2, validateOrderInput, validatePayment,
  normalizeOrderStatus, ORDER_TRANSITIONS, ORDER_STATUS_LABEL, PAYMENT_METHODS, type OrderStatus,
} from '../sales-utils';
import {
  SalesError, newId, nextSequentialId, tenantTax, loadCustomer, loadStockItem, adjustStock,
  insertSale, insertDelivery, withSequenceLock, type SaleActor,
} from './saleRecords';

// Server side of the Orders module: an order is a customer's request for a
// product, taken through NEW -> ... -> DELIVERED. Placing or progressing an
// order NEVER touches stock or invoices. Only when it is DELIVERED does it
// become a Sale (sales_orders row, one transaction) — that is the single
// moment stock is taken out, and it is re-checked then, so a cancelled order
// can never have reduced stock and nothing can be deducted twice.

const money = (v: any) => Number(v) || 0;

export function orderRowToObject(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id, customerName: row.customer_name, mobile: row.mobile,
    orderDate: row.order_date,
    productId: row.product_id ?? undefined, productName: row.product_name ?? undefined, brand: row.brand, model: row.model,
    quantity: row.quantity, unitPrice: money(row.unit_price), subtotal: money(row.subtotal), discount: money(row.discount),
    gstEnabled: !!row.gst_enabled, gstRate: money(row.gst_rate), gstAmount: money(row.gst_amount),
    deliveryCharge: money(row.delivery_charge), totalAmount: money(row.total_amount),
    amountPaid: money(row.amount_paid), balanceDue: money(row.balance_due),
    paymentStatus: row.payment_status, orderStatus: row.order_status,
    deliveryRequired: !!row.delivery_required, expectedDeliveryDate: row.expected_delivery_date ?? undefined,
    notes: row.notes ?? undefined, saleId: row.sale_id ?? undefined, createdBy: row.created_by ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listCustomerOrders(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM customer_orders WHERE user_email = ? ORDER BY created_at DESC', [email]);
  return (rows as any[]).map(orderRowToObject);
}

// For the bootstrap snapshot: a deploy that reaches production BEFORE
// migration 020 has been run must not take the whole ERP down — the missing
// table just reads as "no orders yet" until the migration is applied.
export async function listCustomerOrdersSafe(email: string) {
  try {
    return await listCustomerOrders(email);
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}

export async function getCustomerOrder(email: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM customer_orders WHERE id = ? AND user_email = ? LIMIT 1', [id, email]);
  const row = (rows as any[])[0];
  return row ? orderRowToObject(row) : null;
}

async function loadOrderForUpdate(conn: PoolConnection, email: string, id: string) {
  const [rows] = await conn.execute<any[]>('SELECT * FROM customer_orders WHERE id = ? AND user_email = ? LIMIT 1 FOR UPDATE', [id, email]);
  const row = (rows as any[])[0];
  if (!row) throw new SalesError('Order not found.', 404);
  return row;
}

const isClosed = (status: string) => status === 'DELIVERED' || status === 'CANCELLED';

// ------------------------------------------------------------------ create

export async function createOrder(email: string, body: any, actor: SaleActor) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const tax = await tenantTax(conn, email);
    const pricing = computeTotals({
      quantity: body.quantity, unitPrice: body.unitPrice, discount: body.discount,
      gstEnabled: !!body.gstEnabled, gstRate: tax.gstRate, deliveryCharge: body.deliveryCharge,
    });
    const problem = validateOrderInput({ ...body, amountPaid: body.amountPaid ?? 0 }, pricing.grandTotal);
    if (problem) throw new SalesError(problem);

    const maxAttempts = 5;
    return await withSequenceLock(conn, 'order', email, async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      try {
        const customer = await loadCustomer(conn, email, body.customerId);
        const stock = await loadStockItem(conn, email, body.productId); // existence only — no stock is reserved or taken
        const id = await nextSequentialId(conn, 'customer_orders', email, 'ORD', attempt - 1);
        const now = new Date().toISOString();
        const paid = round2(Number(body.amountPaid) || 0);
        const method = (PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod) ? body.paymentMethod : 'Cash';
        const orderDate = body.orderDate || now.slice(0, 10);

        await conn.execute(
          `INSERT INTO customer_orders (id, user_email, customer_id, customer_name, mobile, order_date, product_id, product_name, brand, model,
             quantity, unit_price, subtotal, discount, gst_enabled, gst_rate, gst_amount, delivery_charge, total_amount, amount_paid, balance_due,
             payment_status, order_status, delivery_required, expected_delivery_date, notes, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?)`,
          [
            id, email, customer.id, customer.name, customer.mobile, orderDate, stock.id, stock.name,
            String(body.brand || stock.brand || '').slice(0, 100), String(body.model || stock.model || stock.name || '').slice(0, 100),
            Number(body.quantity), Number(body.unitPrice), pricing.subtotal, pricing.discount, body.gstEnabled ? 1 : 0, body.gstEnabled ? tax.gstRate : 0,
            pricing.gstAmount, pricing.deliveryCharge, pricing.grandTotal, paid, remaining(pricing.grandTotal, paid),
            derivePaymentStatus(pricing.grandTotal, paid),
            body.deliveryRequired === false ? 0 : 1, body.expectedDeliveryDate || null, body.notes ? String(body.notes).slice(0, 2000) : null,
            actor.label, now, now,
          ]
        );
        if (paid > 0) {
          await conn.execute(
            `INSERT INTO sales_payments (id, user_email, ref_type, ref_id, amount, method, paid_on, note, created_by, created_at)
             VALUES (?, ?, 'ORDER', ?, ?, ?, ?, 'Advance payment', ?, ?)`,
            [newId('PAY'), email, id, paid, method, orderDate, actor.label, now]
          );
        }
        await conn.commit();
        return { id };
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new SalesError('Could not generate a unique Order ID — please try again.', 409);
    });
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ update

export async function updateOrder(email: string, id: string, body: any) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cur = await loadOrderForUpdate(conn, email, id);
    if (isClosed(cur.order_status)) throw new SalesError(`This order is ${ORDER_STATUS_LABEL[normalizeOrderStatus(cur.order_status)]} and can no longer be edited.`, 409);

    const tax = await tenantTax(conn, email);
    const paid = money(cur.amount_paid); // owned by sales_payments — edits never overwrite it
    const gstEnabled = body.gstEnabled !== undefined ? !!body.gstEnabled : !!cur.gst_enabled;
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
    const orderDate = body.orderDate ?? cur.order_date;
    const expected = body.expectedDeliveryDate !== undefined ? (body.expectedDeliveryDate || null) : (cur.expected_delivery_date ?? null);
    const problem = validateOrderInput({ ...merged, orderDate, expectedDeliveryDate: expected || undefined, amountPaid: paid }, pricing.grandTotal);
    if (problem) {
      if (round2(paid) > round2(pricing.grandTotal)) throw new SalesError(`The new total (₹${pricing.grandTotal}) cannot be lower than the ₹${paid} already paid.`);
      throw new SalesError(problem);
    }

    const customer = merged.customerId !== cur.customer_id ? await loadCustomer(conn, email, merged.customerId) : null;
    const stock = await loadStockItem(conn, email, merged.productId);
    const now = new Date().toISOString();
    await conn.execute(
      `UPDATE customer_orders SET customer_id = ?, customer_name = ?, mobile = ?, order_date = ?, product_id = ?, product_name = ?, brand = ?, model = ?,
         quantity = ?, unit_price = ?, subtotal = ?, discount = ?, gst_enabled = ?, gst_rate = ?, gst_amount = ?, delivery_charge = ?, total_amount = ?,
         balance_due = ?, payment_status = ?, delivery_required = ?, expected_delivery_date = ?, notes = ?, updated_at = ?
       WHERE id = ? AND user_email = ?`,
      [
        merged.customerId, customer?.name ?? cur.customer_name, customer?.mobile ?? cur.mobile, orderDate, stock.id, stock.name,
        String(body.brand ?? cur.brand ?? stock.brand ?? '').slice(0, 100), String(body.model ?? cur.model ?? stock.model ?? '').slice(0, 100),
        Number(merged.quantity), Number(merged.unitPrice), pricing.subtotal, pricing.discount, gstEnabled ? 1 : 0, gstRate, pricing.gstAmount, pricing.deliveryCharge, pricing.grandTotal,
        remaining(pricing.grandTotal, paid), derivePaymentStatus(pricing.grandTotal, paid),
        body.deliveryRequired !== undefined ? (body.deliveryRequired ? 1 : 0) : (cur.delivery_required ? 1 : 0), expected,
        body.notes !== undefined ? (body.notes ? String(body.notes).slice(0, 2000) : null) : (cur.notes ?? null), now, id, email,
      ]
    );
    await conn.commit();
    return getCustomerOrder(email, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------- payments

export async function recordOrderPayment(email: string, id: string, body: any, actor: SaleActor) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await loadOrderForUpdate(conn, email, id);
    if (order.order_status === 'CANCELLED') throw new SalesError('This order is cancelled — payments cannot be added to it.', 409);
    if (order.sale_id) throw new SalesError(`This order was delivered and became sale ${order.sale_id} — record further payments on that sale.`, 409);
    const balance = remaining(money(order.total_amount), money(order.amount_paid));
    const problem = validatePayment(body?.amount, balance);
    if (problem) throw new SalesError(problem);

    const amount = round2(Number(body.amount));
    const method = (PAYMENT_METHODS as readonly string[]).includes(body.method) ? body.method : 'Cash';
    const now = new Date().toISOString();
    const newPaid = round2(money(order.amount_paid) + amount);
    await conn.execute(
      `INSERT INTO sales_payments (id, user_email, ref_type, ref_id, amount, method, paid_on, note, created_by, created_at)
       VALUES (?, ?, 'ORDER', ?, ?, ?, ?, ?, ?, ?)`,
      [newId('PAY'), email, id, amount, method, body.paidOn || now.slice(0, 10), body.note ? String(body.note).slice(0, 500) : null, actor.label, now]
    );
    await conn.execute(
      'UPDATE customer_orders SET amount_paid = ?, balance_due = ?, payment_status = ?, updated_at = ? WHERE id = ? AND user_email = ?',
      [newPaid, remaining(money(order.total_amount), newPaid), derivePaymentStatus(money(order.total_amount), newPaid), now, id, email]
    );
    await conn.commit();
    return getCustomerOrder(email, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ status

// Turns a delivered order into a Sale inside the caller's transaction: takes
// the stock out (failing the whole status change if there isn't enough),
// writes the sale, hands the order's payments over to it, and links the two.
async function convertOrderToSale(conn: PoolConnection, email: string, order: any, actor: SaleActor, attempt: number) {
  const customer = await loadCustomer(conn, email, order.customer_id);
  const stock = await loadStockItem(conn, email, order.product_id);
  const saleId = await nextSequentialId(conn, 'sales_orders', email, 'SALE', attempt - 1);
  const now = new Date().toISOString();
  const brand = String(order.brand || stock.brand || '');
  const model = String(order.model || stock.model || stock.name || '');

  await adjustStock(conn, email, stock.id, -Number(order.quantity), {
    referenceId: saleId, customerName: customer.name, note: `Sale ${saleId} (from order ${order.id})`, by: actor.label,
  });

  const [payRows] = await conn.execute<any[]>(
    'SELECT method FROM sales_payments WHERE user_email = ? AND ref_type = ? AND ref_id = ? ORDER BY created_at DESC LIMIT 1',
    [email, 'ORDER', order.id]
  );
  const method = (payRows as any[])[0]?.method || 'Cash';
  const deliveryRequired = !!order.delivery_required;
  await insertSale(conn, email, {
    id: saleId, customerId: customer.id, customerName: customer.name, mobile: customer.mobile,
    email: customer.email, address: customer.address, pincode: customer.pincode,
    productId: stock.id, brand, model, screenSize: stock.screen_size,
    quantity: Number(order.quantity), unitPrice: money(order.unit_price), saleDate: now.slice(0, 10), salesperson: actor.label, storeLocation: 'SHOWROOM',
    paymentMethod: method, paymentStatus: derivePaymentStatus(money(order.total_amount), money(order.amount_paid)),
    deliveryRequired, deliveryStatus: deliveryRequired ? 'Delivered' : 'Not Required',
    subtotal: money(order.subtotal), discount: money(order.discount), gstEnabled: !!order.gst_enabled, gstRate: money(order.gst_rate),
    gstAmount: money(order.gst_amount), deliveryCharge: money(order.delivery_charge), grandTotal: money(order.total_amount),
    amountPaid: money(order.amount_paid), balanceDue: remaining(money(order.total_amount), money(order.amount_paid)),
    status: 'Completed', notes: order.notes ? `Order ${order.id}. ${order.notes}` : `Order ${order.id}`, sourceOrderId: order.id,
  });
  if (deliveryRequired) {
    await insertDelivery(conn, email, {
      saleId, customerName: customer.name, mobile: customer.mobile, address: customer.address,
      product: `${brand} ${model}`.trim(), status: 'Delivered', paymentStatus: derivePaymentStatus(money(order.total_amount), money(order.amount_paid)),
    });
  }
  // The money already received belongs to the sale from here on.
  await conn.execute("UPDATE sales_payments SET ref_type = 'SALE', ref_id = ? WHERE user_email = ? AND ref_type = 'ORDER' AND ref_id = ?", [saleId, email, order.id]);
  await conn.execute("UPDATE customer_orders SET sale_id = ?, order_status = 'DELIVERED', updated_at = ? WHERE id = ? AND user_email = ?", [saleId, now, order.id, email]);
  return saleId;
}

export async function setOrderStatus(email: string, id: string, requested: string, actor: SaleActor) {
  const next: OrderStatus = normalizeOrderStatus(requested);
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const maxAttempts = 5;
    const run = async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      try {
        const order = await loadOrderForUpdate(conn, email, id);
        const from = normalizeOrderStatus(order.order_status);
        if (!ORDER_TRANSITIONS[from].includes(next)) {
          throw new SalesError(
            from === next
              ? `The order is already ${ORDER_STATUS_LABEL[from]}.`
              : `An order that is ${ORDER_STATUS_LABEL[from]} cannot be moved to ${ORDER_STATUS_LABEL[next]}.`,
            409
          );
        }
        let saleId: string | null = null;
        if (next === 'DELIVERED') {
          saleId = await convertOrderToSale(conn, email, order, actor, attempt);
        } else {
          await conn.execute('UPDATE customer_orders SET order_status = ?, updated_at = ? WHERE id = ? AND user_email = ?', [next, new Date().toISOString(), id, email]);
        }
        await conn.commit();
        return { order: await getCustomerOrder(email, id), saleId };
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new SalesError('Could not create the sale for this delivery — please try again.', 409);
    };
    // Delivering allocates a Sale ID, so it takes the same per-tenant lock as New Sale.
    return next === 'DELIVERED' ? await withSequenceLock(conn, 'sale', email, run) : await run();
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ delete

export async function deleteOrder(email: string, id: string) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await loadOrderForUpdate(conn, email, id);
    if (order.sale_id) throw new SalesError(`This order became sale ${order.sale_id} and cannot be deleted.`, 409);
    if (money(order.amount_paid) > 0) {
      throw new SalesError('Money has been received on this order, so it cannot be deleted. Cancel it instead so the payment stays on record.', 409);
    }
    await conn.execute('DELETE FROM sales_payments WHERE user_email = ? AND ref_type = ? AND ref_id = ?', [email, 'ORDER', id]);
    await conn.execute('DELETE FROM customer_orders WHERE id = ? AND user_email = ?', [id, email]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
