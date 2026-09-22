// Integration test for the Sales + Orders modules, against a REAL MySQL.
//
//   DB_HOST=127.0.0.1 DB_PORT=3399 DB_USER=root DB_PASSWORD= DB_NAME=gj5test \
//     npx tsx scripts/test-sales-orders.mts
//
// The database must already have sql/schema.sql (or the pre-020 schema plus
// sql/migrations/020_sales_and_orders.sql) applied. It is WIPED of sales /
// orders / invoices / stock / customers rows first, so it refuses to run
// unless DB_NAME contains "test" — never point it at a real database.

import { getPool } from '../src/lib/db';
import {
  createSale, updateSale, deleteSale, recordSalePayment, generateInvoiceForSale, setSaleStatus, getSale, listPayments, SalesError,
} from '../src/lib/erp/saleRecords';
import {
  createOrder, updateOrder, setOrderStatus, recordOrderPayment, deleteOrder, getCustomerOrder,
} from '../src/lib/erp/customerOrders';
import { listSalesOrders } from '../src/lib/erp/sales';
import { listCustomersWithStats } from '../src/lib/erp/customers';
import { listInvoices } from '../src/lib/erp/invoices';
import { computeReceivables } from '../src/lib/wallet-engine';

if (!/test/i.test(process.env.DB_NAME || '')) {
  console.error('Refusing to run: DB_NAME must contain "test" (this script wipes tables).');
  process.exit(2);
}

const EMAIL = 'owner@gj5.test';
const actor = { label: 'Owner' };
const pool = getPool();
let passed = 0, failed = 0;

function ok(cond: any, name: string, extra?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
}
async function rejects(fn: () => Promise<any>, contains: string, name: string, status?: number) {
  try { await fn(); failed++; console.log(`  ✗ ${name} (did not throw)`); }
  catch (e: any) {
    const good = String(e?.message || '').toLowerCase().includes(contains.toLowerCase()) && (status === undefined || e?.status === status) && e instanceof SalesError;
    if (good) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name}`, `got: ${e?.message} (${e?.status}, ${e?.constructor?.name})`); }
  }
}
const q = async (sql: string, p: any[] = []) => (await pool.query(sql, p))[0] as any[];
const stockQty = async (id = 'STK-1') => Number((await q('SELECT quantity FROM stock_items WHERE id = ?', [id]))[0]?.quantity);
const rowCount = async (sql: string, p: any[] = []) => Number((await q(sql, p))[0]?.c);

async function reset(qty = 5) {
  for (const t of ['sales_orders', 'sales_deliveries', 'sales_payments', 'customer_orders', 'invoice_items', 'invoices', 'stock_movements', 'stock_items', 'customers', 'system_settings']) {
    await q(`DELETE FROM ${t}`);
  }
  await q(`INSERT INTO system_settings (user_email, gst_rate, invoice_prefix) VALUES (?, 18, 'INV')`, [EMAIL]);
  await q(`INSERT INTO customers (id, user_email, name, mobile, address, pincode, status, source, created_at) VALUES
    ('CUST0001', ?, 'Ravi Patel', '9876543210', 'Udhana, Surat', '395002', 'Active', 'manual', '2026-01-01'),
    ('CUST0002', ?, 'Meena Shah', '9123456780', 'Adajan', '395009', 'Active', 'manual', '2026-01-01')`, [EMAIL, EMAIL]);
  await q(`INSERT INTO stock_items (id, user_email, name, brand, model, quantity, selling_price, min_stock_level) VALUES ('STK-1', ?, 'Sony Bravia 43', 'Sony', 'KD-43', ?, 32000, 2)`, [EMAIL, qty]);
}

const sale = (o: any = {}) => ({
  customerId: 'CUST0001', productId: 'STK-1', quantity: 1, unitPrice: 10000, discount: 0, gstEnabled: false, deliveryCharge: 0,
  saleDate: '2026-09-20', paymentMethod: 'UPI', paymentStatus: 'Paid', amountPaid: 10000, orderStatus: 'Completed', ...o,
});
const order = (o: any = {}) => ({
  customerId: 'CUST0001', productId: 'STK-1', quantity: 1, unitPrice: 10000, discount: 0, gstEnabled: false, deliveryCharge: 500,
  orderDate: '2026-09-20', expectedDeliveryDate: '2026-09-30', amountPaid: 2000, paymentMethod: 'Cash', ...o,
});

async function main() {
  console.log('\nSALES — create + validation');
  await reset(5);
  let r = await createSale(EMAIL, sale({ quantity: 2, unitPrice: 10000, discount: 1000, gstEnabled: true, deliveryCharge: 500, paymentStatus: 'Partial', amountPaid: 5000, deliveryRequired: true }), actor);
  ok(r.id === 'SALE-000001', 'first sale gets SALE-000001', r.id);
  let s: any = await getSale(EMAIL, r.id);
  // subtotal 20000 - 1000 discount = 19000; +18% = 3420; + 500 delivery = 22920
  ok(s.subtotal === 20000 && s.gstAmount === 3420 && s.grandTotal === 22920, 'totals recomputed server-side (GST on discounted amount, delivery untaxed)', [s.subtotal, s.gstAmount, s.grandTotal]);
  ok(s.amountPaid === 5000 && s.balanceDue === 17920 && s.paymentStatus === 'Partial', 'partial: paid 5000, remaining 17920', [s.amountPaid, s.balanceDue, s.paymentStatus]);
  ok(s.customerName === 'Ravi Patel' && s.mobile === '9876543210' && s.customerId === 'CUST0001', 'customer snapshot comes from the Customer Department row');
  ok(await stockQty() === 3, 'stock 5 → 3 after selling 2', await stockQty());
  ok(await rowCount("SELECT COUNT(*) c FROM stock_movements WHERE reference_id = ? AND type = 'SALE' AND quantity = 2", [r.id]) === 1, 'stock movement recorded');
  ok(await rowCount("SELECT COUNT(*) c FROM sales_payments WHERE ref_type='SALE' AND ref_id = ? AND amount = 5000", [r.id]) === 1, 'initial payment stored in payment history');
  ok(await rowCount('SELECT COUNT(*) c FROM sales_deliveries WHERE order_id = ?', [r.id]) === 1, 'delivery record created when delivery required');
  ok(s.stockDeducted === true, 'sale flagged stock_deducted');

  await rejects(() => createSale(EMAIL, sale({ quantity: 0 }), actor), 'quantity', 'quantity 0 rejected', 400);
  await rejects(() => createSale(EMAIL, sale({ quantity: 1.5 }), actor), 'whole number', 'fractional quantity rejected');
  await rejects(() => createSale(EMAIL, sale({ unitPrice: 0 }), actor), 'unit price', 'zero price rejected');
  await rejects(() => createSale(EMAIL, sale({ unitPrice: -5 }), actor), 'unit price', 'negative price rejected');
  await rejects(() => createSale(EMAIL, sale({ customerId: '' }), actor), 'customer', 'missing customer rejected');
  await rejects(() => createSale(EMAIL, sale({ customerId: 'CUST9999' }), actor), 'no longer exists', 'unknown customer rejected', 404);
  await rejects(() => createSale(EMAIL, sale({ productId: '' }), actor), 'product', 'missing product rejected');
  await rejects(() => createSale(EMAIL, sale({ productId: 'NOPE' }), actor), 'not in stock records', 'unknown product rejected', 404);
  await rejects(() => createSale(EMAIL, sale({ discount: 99999 }), actor), 'discount', 'discount above item total rejected');
  await rejects(() => createSale(EMAIL, sale({ amountPaid: 10001 }), actor), 'cannot be more than the total', 'payment above total rejected');
  await rejects(() => createSale(EMAIL, sale({ paymentStatus: 'Partial', amountPaid: 10000 }), actor), 'PARTIAL', 'PARTIAL with full amount rejected');
  await rejects(() => createSale(EMAIL, sale({ paymentStatus: 'Partial', amountPaid: 0 }), actor), 'PARTIAL', 'PARTIAL with zero amount rejected');
  await rejects(() => createSale(EMAIL, sale({ paymentStatus: 'Paid', amountPaid: 5000 }), actor), 'PAID', 'PAID with less than total rejected');
  await rejects(() => createSale(EMAIL, sale({ paymentStatus: 'Pending', amountPaid: 100 }), actor), 'PENDING', 'PENDING with an amount rejected');
  await rejects(() => createSale(EMAIL, sale({ orderStatus: 'Cancelled' }), actor), 'Completed or Pending', 'cannot create a Cancelled sale');
  await rejects(() => createSale(EMAIL, sale({ saleDate: 'not-a-date' }), actor), 'date', 'invalid date rejected');
  ok(await stockQty() === 3, 'rejected sales left stock untouched', await stockQty());
  ok(await rowCount('SELECT COUNT(*) c FROM sales_orders') === 1, 'rejected sales wrote nothing');

  console.log('\nSALES — stock rules');
  await rejects(() => createSale(EMAIL, sale({ quantity: 4, unitPrice: 10, amountPaid: 40 }), actor), 'not enough stock', 'selling more than available is refused', 409);
  ok(await stockQty() === 3 && await rowCount('SELECT COUNT(*) c FROM sales_orders') === 1, 'oversell attempt rolled back completely');
  await reset(1);
  const results = await Promise.allSettled([createSale(EMAIL, sale(), actor), createSale(EMAIL, sale({ customerId: 'CUST0002' }), actor)]);
  ok(results.filter(x => x.status === 'fulfilled').length === 1 && results.filter(x => x.status === 'rejected').length === 1, 'two simultaneous sales of the LAST unit: exactly one succeeds', results.map(x => x.status));
  ok(await stockQty() === 0, 'stock ends at 0, never negative');
  await reset(20);
  const many = await Promise.all(Array.from({ length: 6 }, () => createSale(EMAIL, sale({ paymentStatus: 'Pending', amountPaid: 0 }), actor)));
  ok(new Set(many.map(x => x.id)).size === 6, 'six simultaneous sales get six distinct Sale IDs', many.map(x => x.id));
  ok(await stockQty() === 14, 'stock 20 → 14 after six single-unit sales', await stockQty());

  console.log('\nSALES — payments');
  await reset(5);
  r = await createSale(EMAIL, sale({ quantity: 1, unitPrice: 10000, paymentStatus: 'Partial', amountPaid: 3000 }), actor);
  await rejects(() => recordSalePayment(EMAIL, r.id, { amount: 0 }, actor), 'greater than 0', 'payment of 0 rejected');
  await rejects(() => recordSalePayment(EMAIL, r.id, { amount: -1 }, actor), 'greater than 0', 'negative payment rejected');
  await rejects(() => recordSalePayment(EMAIL, r.id, { amount: 7000.01 }, actor), 'remaining balance', 'payment above remaining balance rejected');
  s = await recordSalePayment(EMAIL, r.id, { amount: 2000, method: 'Cash', paidOn: '2026-09-21' }, actor);
  ok(s.amountPaid === 5000 && s.balanceDue === 5000 && s.paymentStatus === 'Partial', 'second payment: paid 5000 / remaining 5000', [s.amountPaid, s.balanceDue]);
  s = await recordSalePayment(EMAIL, r.id, { amount: 5000, method: 'UPI' }, actor);
  ok(s.amountPaid === 10000 && s.balanceDue === 0 && s.paymentStatus === 'Paid', 'final payment marks the sale PAID');
  await rejects(() => recordSalePayment(EMAIL, r.id, { amount: 1 }, actor), 'remaining balance', 'no payment accepted on a fully paid sale');
  const pays = await listPayments(EMAIL, 'SALE', r.id);
  ok(pays.length === 3 && pays.reduce((a: number, p: any) => a + p.amount, 0) === 10000, 'payment history sums to the total', pays.map((p: any) => p.amount));
  ok(await stockQty() === 4, 'payments never touch stock', await stockQty());

  console.log('\nSALES — invoice (main Billing engine)');
  await reset(5);
  r = await createSale(EMAIL, sale({ quantity: 2, unitPrice: 10000, gstEnabled: true, deliveryCharge: 300, paymentStatus: 'Partial', amountPaid: 10000 }), actor, { generateInvoice: true });
  ok(!!r.invoiceId, 'Save & Generate Invoice returns the invoice id');
  s = await getSale(EMAIL, r.id);
  const inv = (await listInvoices(EMAIL)).find((i: any) => i.id === r.invoiceId);
  ok(!!inv && s.billingInvoiceId === r.invoiceId, 'sale is linked to an invoice in the main invoices table');
  ok(inv.invoiceNumber === 'INV-000001', 'invoice number uses the tenant invoice prefix', inv?.invoiceNumber);
  ok(inv.sourceRef === `sale:${r.id}`, 'invoice is marked as generated from the sale', inv?.sourceRef);
  ok(inv.grandTotal === s.grandTotal && inv.paymentStatus === 'Partial', 'invoice total and payment status match the sale', [inv.grandTotal, inv.paymentStatus]);
  ok(inv.items.length === 2 && inv.items.some((i: any) => i.name === 'Delivery Charge'), 'invoice carries the product line and the delivery charge line', inv.items.map((i: any) => i.name));
  ok(Math.abs(inv.subtotal - inv.totalDiscount + inv.cgst + inv.sgst - inv.grandTotal) < 0.01, 'invoice math reconciles (subtotal − discount + GST = total)', [inv.subtotal, inv.totalDiscount, inv.cgst, inv.sgst, inv.grandTotal]);
  ok(await stockQty() === 3, 'generating the invoice did NOT deduct stock a second time (5 → 3, not 1)', await stockQty());
  let again = await generateInvoiceForSale(EMAIL, r.id);
  ok(again.created === false && again.invoiceId === r.invoiceId && await rowCount('SELECT COUNT(*) c FROM invoices') === 1, 'generating twice returns the same invoice');
  await recordSalePayment(EMAIL, r.id, { amount: s.balanceDue, method: 'Cash' }, actor);
  ok((await listInvoices(EMAIL))[0].paymentStatus === 'Paid', 'paying the sale off flips the invoice to Paid');
  await rejects(() => updateSale(EMAIL, r.id, { quantity: 5 }, actor), 'locked', 'invoiced sale cannot change quantity', 409);
  await rejects(() => setSaleStatus(EMAIL, r.id, 'Cancelled', actor), 'invoice', 'invoiced sale cannot be cancelled', 409);
  await rejects(() => deleteSale(EMAIL, r.id, actor), 'invoice', 'invoiced sale cannot be deleted', 409);
  ok(await stockQty() === 3, 'blocked actions left stock unchanged');
  s = await updateSale(EMAIL, r.id, { notes: 'delivered to 2nd floor' }, actor);
  ok(s.notes === 'delivered to 2nd floor', 'notes stay editable on an invoiced sale');

  console.log('\nSALES — edit, cancel, refund, delete');
  await reset(5);
  r = await createSale(EMAIL, sale({ quantity: 1, unitPrice: 10000, paymentStatus: 'Partial', amountPaid: 4000 }), actor);
  s = await updateSale(EMAIL, r.id, { quantity: 3, unitPrice: 9000, discount: 500 }, actor);
  ok(s.grandTotal === 26500 && s.balanceDue === 22500 && s.amountPaid === 4000, 'edit recomputes totals and keeps money received', [s.grandTotal, s.balanceDue, s.amountPaid]);
  ok(await stockQty() === 2, 'editing quantity 1 → 3 takes 2 more units (5 → 4 → 2)', await stockQty());
  s = await updateSale(EMAIL, r.id, { quantity: 2, unitPrice: 9000, discount: 0 }, actor);
  ok(await stockQty() === 3 && s.grandTotal === 18000, 'editing quantity back down returns the difference', [await stockQty(), s.grandTotal]);
  await rejects(() => updateSale(EMAIL, r.id, { quantity: 1, unitPrice: 3000 }, actor), 'already paid', 'total cannot drop below money already received');
  await rejects(() => updateSale(EMAIL, r.id, { quantity: 9 }, actor), 'not enough stock', 'edit cannot oversell', 409);
  ok(await stockQty() === 3, 'failed edit rolled back (stock unchanged)');
  s = await setSaleStatus(EMAIL, r.id, 'Cancelled', actor);
  ok(s.orderStatus === 'Cancelled' && s.balanceDue === 0, 'cancelled sale owes nothing');
  ok(await stockQty() === 5 && s.stockDeducted === false, 'cancelling returns ALL stock (3 → 5)', await stockQty());
  s = await setSaleStatus(EMAIL, r.id, 'Cancelled', actor);
  ok(await stockQty() === 5, 'cancelling twice does not restock twice', await stockQty());
  s = await setSaleStatus(EMAIL, r.id, 'Completed', actor);
  ok(await stockQty() === 3 && s.stockDeducted === true && s.balanceDue === 14000, 're-opening a cancelled sale takes stock out again', [await stockQty(), s.balanceDue]);
  s = await setSaleStatus(EMAIL, r.id, 'Refunded', actor);
  ok(await stockQty() === 5 && s.orderStatus === 'Refunded' && s.balanceDue === 0, 'refunded sale returns stock and owes nothing');
  await rejects(() => recordSalePayment(EMAIL, r.id, { amount: 1 }, actor), 'Completed or Pending', 'no payments on a refunded sale', 409);
  s = await setSaleStatus(EMAIL, r.id, 'Pending', actor);
  ok(s.orderStatus === 'Pending' && await stockQty() === 3, 'Pending sale holds stock');
  await deleteSale(EMAIL, r.id, actor);
  ok(await stockQty() === 5 && await rowCount('SELECT COUNT(*) c FROM sales_orders') === 0, 'deleting a sale returns stock and removes it');
  ok(await rowCount('SELECT COUNT(*) c FROM sales_payments') === 0 && await rowCount('SELECT COUNT(*) c FROM sales_deliveries') === 0, 'deleting removes its payments and delivery record');
  await rejects(() => deleteSale(EMAIL, 'SALE-999999', actor), 'not found', 'deleting an unknown sale is a 404', 404);
  const cancelledFirst = await createSale(EMAIL, sale({ paymentStatus: 'Pending', amountPaid: 0 }), actor);
  await q('DELETE FROM stock_items WHERE id = ?', ['STK-1']);
  s = await setSaleStatus(EMAIL, cancelledFirst.id, 'Cancelled', actor);
  ok(s.orderStatus === 'Cancelled', 'a sale can still be cancelled after its product was removed from Stock');
  await reset(5);

  console.log('\nORDERS — create, edit, payments');
  let o = await createOrder(EMAIL, order(), actor);
  ok(o.id === 'ORD-000001', 'first order gets ORD-000001', o.id);
  let ord: any = await getCustomerOrder(EMAIL, o.id);
  ok(ord.totalAmount === 10500 && ord.amountPaid === 2000 && ord.balanceDue === 8500 && ord.paymentStatus === 'Partial' && ord.orderStatus === 'NEW', 'order totals, advance and status', [ord.totalAmount, ord.amountPaid, ord.orderStatus]);
  ok(await stockQty() === 5, 'placing an order does NOT touch stock');
  await rejects(() => createOrder(EMAIL, order({ amountPaid: 99999 }), actor), 'advance payment', 'advance above the total rejected');
  await rejects(() => createOrder(EMAIL, order({ expectedDeliveryDate: '2026-09-01' }), actor), 'before the order date', 'expected date before order date rejected');
  await rejects(() => createOrder(EMAIL, order({ quantity: 0 }), actor), 'quantity', 'quantity 0 rejected');
  await rejects(() => createOrder(EMAIL, order({ customerId: '' }), actor), 'customer', 'order without a customer rejected');
  ord = await updateOrder(EMAIL, o.id, { quantity: 2, deliveryCharge: 0, notes: 'call before delivery' });
  ok(ord.totalAmount === 20000 && ord.balanceDue === 18000 && ord.notes === 'call before delivery', 'edit recomputes the order total');
  await rejects(() => updateOrder(EMAIL, o.id, { quantity: 1, unitPrice: 1000 }), 'already paid', 'order total cannot drop below the advance');
  await rejects(() => recordOrderPayment(EMAIL, o.id, { amount: 18000.5 }, actor), 'remaining balance', 'order payment above balance rejected');
  ord = await recordOrderPayment(EMAIL, o.id, { amount: 3000, method: 'UPI' }, actor);
  ok(ord.amountPaid === 5000 && ord.balanceDue === 15000, 'order payment recorded', [ord.amountPaid, ord.balanceDue]);

  console.log('\nORDERS — lifecycle');
  await rejects(() => setOrderStatus(EMAIL, o.id, 'DELIVERED', actor), 'cannot be moved', 'NEW cannot jump straight to DELIVERED', 409);
  await rejects(() => setOrderStatus(EMAIL, o.id, 'NEW', actor), 'already New', 'same status refused', 409);
  for (const st of ['CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY']) {
    const res = await setOrderStatus(EMAIL, o.id, st, actor);
    ok(res.order.orderStatus === st && res.saleId === null, `→ ${st}`);
  }
  ok(await stockQty() === 5 && await rowCount('SELECT COUNT(*) c FROM sales_orders') === 0, 'no stock movement and no sale before delivery');
  const delivered = await setOrderStatus(EMAIL, o.id, 'DELIVERED', actor);
  ok(delivered.order.orderStatus === 'DELIVERED' && !!delivered.saleId && delivered.order.saleId === delivered.saleId, 'DELIVERED creates the sale and links it', delivered.saleId);
  ok(await stockQty() === 3, 'delivery took the 2 units out of stock, once (5 → 3)', await stockQty());
  s = await getSale(EMAIL, delivered.saleId!);
  ok(s.orderStatus === 'Completed' && s.sourceOrderId === o.id && s.grandTotal === 20000 && s.amountPaid === 5000 && s.balanceDue === 15000 && s.paymentStatus === 'Partial', 'the sale carries the order amounts and money received', [s.orderStatus, s.grandTotal, s.amountPaid]);
  ok(await rowCount("SELECT COUNT(*) c FROM sales_payments WHERE ref_type='SALE' AND ref_id = ?", [s.id]) === 2 && await rowCount("SELECT COUNT(*) c FROM sales_payments WHERE ref_type='ORDER' AND ref_id = ?", [o.id]) === 0, 'the order payments moved onto the sale');
  await rejects(() => setOrderStatus(EMAIL, o.id, 'DELIVERED', actor), 'already Delivered', 'delivering twice is refused (no double stock deduction)', 409);
  await rejects(() => setOrderStatus(EMAIL, o.id, 'CANCELLED', actor), 'cannot be moved', 'a delivered order cannot be cancelled', 409);
  await rejects(() => updateOrder(EMAIL, o.id, { notes: 'x' }), 'no longer be edited', 'a delivered order cannot be edited', 409);
  await rejects(() => recordOrderPayment(EMAIL, o.id, { amount: 1 }, actor), 'became sale', 'payments go to the sale after delivery', 409);
  await rejects(() => deleteOrder(EMAIL, o.id), 'became sale', 'a delivered order cannot be deleted', 409);
  await rejects(() => deleteSale(EMAIL, s.id, actor), 'created from order', 'an order-derived sale cannot be deleted', 409);
  ok(await stockQty() === 3, 'all the refused actions left stock unchanged');
  s = await recordSalePayment(EMAIL, s.id, { amount: 15000, method: 'Cash' }, actor);
  ok(s.paymentStatus === 'Paid', 'the balance is collected on the sale');

  console.log('\nORDERS — cancel / insufficient stock / delete');
  await reset(1);
  o = await createOrder(EMAIL, order({ quantity: 1, amountPaid: 0 }), actor);
  let c = await setOrderStatus(EMAIL, o.id, 'CANCELLED', actor);
  ok(c.order.orderStatus === 'CANCELLED' && await stockQty() === 1 && await rowCount('SELECT COUNT(*) c FROM sales_orders') === 0, 'cancelled order never touches stock and creates no sale');
  await rejects(() => setOrderStatus(EMAIL, o.id, 'CONFIRMED', actor), 'cannot be moved', 'a cancelled order stays cancelled', 409);
  await rejects(() => recordOrderPayment(EMAIL, o.id, { amount: 1 }, actor), 'cancelled', 'no payments on a cancelled order', 409);
  await deleteOrder(EMAIL, o.id);
  ok(await rowCount('SELECT COUNT(*) c FROM customer_orders') === 0, 'an order with no money received can be deleted');
  o = await createOrder(EMAIL, order({ quantity: 3, unitPrice: 100, deliveryCharge: 0, amountPaid: 50 }), actor);
  for (const st of ['CONFIRMED', 'PROCESSING', 'READY']) await setOrderStatus(EMAIL, o.id, st, actor);
  await rejects(() => setOrderStatus(EMAIL, o.id, 'DELIVERED', actor), 'not enough stock', 'delivering more than is in stock is refused', 409);
  ord = await getCustomerOrder(EMAIL, o.id);
  ok(ord!.orderStatus === 'READY' && !ord!.saleId && await stockQty() === 1 && await rowCount('SELECT COUNT(*) c FROM sales_orders') === 0, 'failed delivery rolled back atomically (still READY, no sale, stock intact)');
  await rejects(() => deleteOrder(EMAIL, o.id), 'money has been received', 'an order that received money cannot be deleted', 409);

  console.log('\nCROSS-MODULE — no double counting');
  await reset(10);
  r = await createSale(EMAIL, sale({ quantity: 1, unitPrice: 8000, paymentStatus: 'Pending', amountPaid: 0 }), actor, { generateInvoice: true });
  const stats = (await listCustomersWithStats(EMAIL)).find((c: any) => c.id === 'CUST0001');
  ok(stats.pendingAmount === 8000 && stats.totalPurchases === 1, 'Customer Department counts an invoiced pending sale ONCE (₹8000, not ₹16000)', [stats.pendingAmount, stats.totalPurchases]);
  const receivables = computeReceivables({ repairJobs: [], invoices: await listInvoices(EMAIL), salesOrders: await listSalesOrders(EMAIL) } as any);
  ok(receivables.length === 1 && receivables[0].pending === 8000, 'E-Wallet receivables list it ONCE', receivables.map(x => x.pending));
  await setSaleStatus(EMAIL, r.id, 'Completed', actor);
  await q('DELETE FROM invoices'); await q('DELETE FROM invoice_items'); // remove the invoice the way Invoice History would
  s = await setSaleStatus(EMAIL, r.id, 'Cancelled', actor);
  const stats2 = (await listCustomersWithStats(EMAIL)).find((c: any) => c.id === 'CUST0001');
  ok(stats2.pendingAmount === 0 && stats2.totalPurchases === 0, 'a cancelled sale is neither pending nor a purchase', [stats2.pendingAmount, stats2.totalPurchases]);

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST CRASHED:', e); await pool.end().catch(() => {}); process.exit(1); });
