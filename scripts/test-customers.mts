// Integration test for the Customer Management + Global Customer Lookup
// feature, against a REAL MySQL.
//
//   DB_HOST=127.0.0.1 DB_PORT=3399 DB_USER=root DB_PASSWORD= DB_NAME=gj5test \
//     npx tsx scripts/test-customers.mts
//
// The database must already have sql/schema.sql (or the pre-021 schema plus
// sql/migrations/021_customer_management.sql) applied. It is WIPED of
// customers / repair / sales / orders / invoice / wallet rows first, so it
// refuses to run unless DB_NAME contains "test" — never point it at a real
// database.

import { getPool } from '../src/lib/db';
import {
  CustomerError, allocateCustomerId, previewNextCustomerId, searchCustomers, listCustomersPaged,
  listCustomersWithStats, getCustomerById, findPossibleDuplicates, createCustomer, updateCustomer,
  deactivateOrDeleteCustomer, mergeCustomers, addCustomerNote, editCustomerNote, deleteCustomerNote,
  listCustomerNotes, listCustomerAuditLog, getCustomerProfile, customersToCsv,
} from '../src/lib/erp/customers';
import { formatCustomerId, normalizeCustomerIdInput, buildTelLink, buildWhatsAppLink, formatCustomerLabel } from '../src/lib/customer-utils';

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
    const good = String(e?.message || '').toLowerCase().includes(contains.toLowerCase()) && (status === undefined || e?.status === status) && e instanceof CustomerError;
    if (good) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name}`, `got: ${e?.message} (${e?.status}, ${e?.constructor?.name})`); }
  }
}
const q = async (sql: string, p: any[] = []) => (await pool.query(sql, p))[0] as any[];
const rowCount = async (sql: string, p: any[] = []) => Number((await q(sql, p))[0]?.c);

async function reset(startNumber = 1001) {
  for (const t of [
    'customer_audit_logs', 'customer_notes', 'wallet_transactions', 'invoice_items', 'invoices',
    'customer_orders', 'sales_payments', 'sales_deliveries', 'sales_orders',
    'repair_job_payments', 'repair_job_parts', 'repair_jobs', 'online_bookings',
    'customer_id_sequences', 'customers', 'system_settings',
  ]) {
    await q(`DELETE FROM ${t}`);
  }
  await q(`INSERT INTO system_settings (user_email, gst_rate, invoice_prefix, customer_id_start_number) VALUES (?, 18, 'INV', ?)`, [EMAIL, startNumber]);
}

const cust = (o: any = {}) => ({
  name: 'Ravi Patel', mobile: '9876543210', address: 'Udhana, Surat', city: 'Surat', pincode: '395002', ...o,
});

async function main() {
  console.log('\nCUSTOMER ID — allocation, format, never reused');
  await reset(1001);
  ok(await previewNextCustomerId(EMAIL) === 'CUST-1001', 'preview shows CUST-1001 (configured start)');
  let c1: any = await createCustomer(EMAIL, cust(), actor);
  ok(c1.id === 'CUST-1001', 'first customer gets CUST-1001', c1.id);
  let c2: any = await createCustomer(EMAIL, cust({ name: 'Meena Shah', mobile: '9123456780' }), actor);
  ok(c2.id === 'CUST-1002', 'second customer gets CUST-1002 (sequential)', c2.id);
  ok(formatCustomerId(1003) === 'CUST-1003', 'formatCustomerId formats correctly');
  ok(normalizeCustomerIdInput('cust-1001') === 'CUST-1001' && normalizeCustomerIdInput('1001') === 'CUST-1001' && normalizeCustomerIdInput('CUST-1001') === 'CUST-1001', 'normalizeCustomerIdInput accepts bare/lowercase/dashed forms');

  await deactivateOrDeleteCustomer(EMAIL, 'CUST-1002', actor); // no linked records → hard delete
  ok(await getCustomerById(EMAIL, 'CUST-1002') === null, 'CUST-1002 (no linked records) was hard-deleted');
  let c3: any = await createCustomer(EMAIL, cust({ name: 'Third Customer', mobile: '9988776655' }), actor);
  ok(c3.id === 'CUST-1003', 'the next id is CUST-1003, NOT the deleted CUST-1002 — numbers are never reissued', c3.id);

  // concurrency: N simultaneous creates must all get distinct, sequential ids
  await reset(1001);
  const mobiles = Array.from({ length: 8 }, (_, i) => `90000000${i}${i}`.slice(0, 10));
  const many = await Promise.all(mobiles.map((m, i) => createCustomer(EMAIL, cust({ name: `Concurrent ${i}`, mobile: m }), actor)));
  const ids = many.map((x: any) => x.id);
  ok(new Set(ids).size === 8, 'eight simultaneous customer creates get eight DISTINCT ids', ids);
  ok(new Set(ids).size === new Set(ids.map(id => Number(id.replace('CUST-', '')))).size, 'no numeric collisions under concurrency');

  console.log('\nCUSTOMER ID — configurable start number respected, never retroactive');
  await reset(1001);
  await createCustomer(EMAIL, cust({ mobile: '9111111111' }), actor); // CUST-1001
  await q('UPDATE system_settings SET customer_id_start_number = 5000 WHERE user_email = ?', [EMAIL]);
  let c5: any = await createCustomer(EMAIL, cust({ name: 'After Raise', mobile: '9222222222' }), actor);
  ok(c5.id === 'CUST-5000', 'raising the start number to 5000 takes effect on the very next customer', c5.id);
  await q('UPDATE system_settings SET customer_id_start_number = 1001 WHERE user_email = ?', [EMAIL]);
  let c6: any = await createCustomer(EMAIL, cust({ name: 'Lowering start again', mobile: '9333333333' }), actor);
  ok(c6.id === 'CUST-5001', 'lowering the start number back down never goes backward past what was already issued', c6.id);

  console.log('\nCUSTOMER ID — existing (pre-migration / legacy format) customers are NEVER renamed');
  await reset(1001);
  await q(`INSERT INTO customers (id, user_email, name, mobile, address, pincode, status, source, created_at, updated_at) VALUES
    ('CUST0007', ?, 'Legacy Customer', '9800000007', 'Old Format St', '395002', 'Active', 'manual', '2025-01-01', '2025-01-01')`, [EMAIL]);
  const legacy = await getCustomerById(EMAIL, 'CUST0007');
  ok(!!legacy && legacy.id === 'CUST0007', 'legacy id preserved verbatim after being present at migration time');
  // migration 021's own seed logic (re-simulated here) must not clobber a lower manually-set start number
  const nextForNewTenant = await previewNextCustomerId(EMAIL);
  ok(nextForNewTenant === 'CUST-1001', 'new customers still get the new CUST-1001 format even with a legacy id present', nextForNewTenant);

  console.log('\nCUSTOMER CRUD — validation');
  await reset(1001);
  await rejects(() => createCustomer(EMAIL, cust({ name: '' }), actor), 'name', 'empty name rejected');
  await rejects(() => createCustomer(EMAIL, cust({ mobile: '12345' }), actor), 'mobile', 'short mobile rejected');
  await rejects(() => createCustomer(EMAIL, cust({ mobile: 'abcdefghij' }), actor), 'mobile', 'non-numeric mobile rejected');
  await rejects(() => createCustomer(EMAIL, cust({ whatsappNumber: '123' }), actor), 'WhatsApp', 'short WhatsApp number rejected');
  await rejects(() => createCustomer(EMAIL, cust({ category: 'NotARealCategory' }), actor), 'category', 'invalid category rejected');
  ok(await rowCount('SELECT COUNT(*) c FROM customers') === 0, 'rejected creates wrote nothing');

  console.log('\nDUPLICATE PROTECTION — mobile / whatsapp / email / gstin');
  await reset(1001);
  await createCustomer(EMAIL, cust({ mobile: '9876543210', whatsappNumber: '9876543210', email: 'ravi@x.com', gstin: '24AAAAA0000A1Z5' }), actor);
  await rejects(() => createCustomer(EMAIL, cust({ name: 'Different Name', mobile: '9876543210' }), actor), 'possible existing', 'duplicate mobile blocked', 409);
  await rejects(() => createCustomer(EMAIL, cust({ mobile: '9000000001', whatsappNumber: '9876543210' }), actor), 'possible existing', 'duplicate WhatsApp (different mobile) blocked', 409);
  await rejects(() => createCustomer(EMAIL, cust({ mobile: '9000000002', email: 'ravi@x.com' }), actor), 'possible existing', 'duplicate email blocked', 409);
  await rejects(() => createCustomer(EMAIL, cust({ mobile: '9000000003', gstin: '24AAAAA0000A1Z5' }), actor), 'possible existing', 'duplicate GSTIN blocked', 409);
  let dupErr: any = null;
  try { await createCustomer(EMAIL, cust({ mobile: '9876543210' }), actor); } catch (e) { dupErr = e; }
  ok(Array.isArray(dupErr?.duplicates) && dupErr.duplicates.length === 1 && dupErr.duplicates[0].id === 'CUST-1001', 'duplicate error carries the full candidate record(s)', dupErr?.duplicates);
  const forced: any = await createCustomer(EMAIL, cust({ name: 'Force Created', mobile: '9876543210' }), actor, { force: true });
  ok(forced.id === 'CUST-1002', 'force:true bypasses duplicate check and creates a NEW record anyway', forced.id);
  ok(await rowCount('SELECT COUNT(*) c FROM customers') === 2, 'exactly two customers exist after the forced create');

  console.log('\nGLOBAL SEARCH — by every field, partial match, fast/limited');
  await reset(1001);
  await createCustomer(EMAIL, cust({ name: 'Jay Patel', mobile: '9812345670', whatsappNumber: '9812345670', email: 'jay@gj5.com', gstin: '24JAYAB1234C1Z9', city: 'Surat' }), actor);
  await createCustomer(EMAIL, cust({ name: 'Priya Shah', mobile: '9898989898' }), actor);
  let s = await searchCustomers(EMAIL, 'CUST-1001');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'search by exact Customer ID resolves', s.map((x: any) => x.id));
  s = await searchCustomers(EMAIL, '1001');
  ok(s.some((x: any) => x.id === 'CUST-1001'), 'search by bare number (no CUST- prefix) still resolves', s.map((x: any) => x.id));
  s = await searchCustomers(EMAIL, 'Jay');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'search by partial name', s.map((x: any) => x.name));
  s = await searchCustomers(EMAIL, '981234');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'search by partial mobile (prefix)', s.map((x: any) => x.mobile));
  s = await searchCustomers(EMAIL, '9812345670');
  ok(s.some((x: any) => x.id === 'CUST-1001'), 'search by exact WhatsApp number');
  s = await searchCustomers(EMAIL, 'jay@gj5.com');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'search by email');
  s = await searchCustomers(EMAIL, '24JAYAB1234C1Z9');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'search by GSTIN');
  s = await searchCustomers(EMAIL, 'nonexistentxyz123');
  ok(s.length === 0, 'no matches returns empty array, not an error');
  s = await searchCustomers(EMAIL, 'a', 1);
  ok(s.length <= 1, 'limit parameter is respected');

  console.log('\nGLOBAL SEARCH — excludes merged-away customers');
  const mergedAway = await mergeCustomers(EMAIL, 'CUST-1001', 'CUST-1002', actor);
  s = await searchCustomers(EMAIL, 'Priya');
  ok(s.length === 0, 'a merged-away (losing) customer no longer appears in search results');
  s = await searchCustomers(EMAIL, 'Jay');
  ok(s.length === 1 && s[0].id === 'CUST-1001', 'the surviving primary is still searchable');
  await reset(1001);

  console.log('\nCUSTOMER LIST — server-side pagination + filters');
  for (let i = 0; i < 30; i++) {
    await createCustomer(EMAIL, cust({ name: `Bulk ${i}`, mobile: `98${String(10000000 + i).padStart(8, '0')}`, city: i % 2 === 0 ? 'Surat' : 'Vapi', status: i % 5 === 0 ? 'Inactive' : 'Active' }), actor);
  }
  let page1 = await listCustomersPaged(EMAIL, { page: 1, pageSize: 10 });
  ok(page1.total === 30 && page1.customers.length === 10 && page1.totalPages === 3, 'page 1 of 10 returns 10 rows, total=30, totalPages=3', [page1.total, page1.customers.length, page1.totalPages]);
  let page2 = await listCustomersPaged(EMAIL, { page: 2, pageSize: 10 });
  ok(page2.customers.length === 10 && page2.customers[0].id !== page1.customers[0].id, 'page 2 returns a different set of rows');
  let filteredCity = await listCustomersPaged(EMAIL, { city: 'Surat', pageSize: 100 });
  ok(filteredCity.total === 15, 'city filter narrows correctly (15 of 30 are Surat)', filteredCity.total);
  let filteredStatus = await listCustomersPaged(EMAIL, { status: 'Inactive', pageSize: 100 });
  ok(filteredStatus.total === 6, 'status filter narrows correctly (every 5th of 30 is Inactive)', filteredStatus.total);
  let filteredSearch = await listCustomersPaged(EMAIL, { search: 'Bulk 5', pageSize: 100 });
  ok(filteredSearch.total >= 1 && filteredSearch.customers.every((c: any) => c.name.includes('Bulk 5')), 'search filter narrows the paginated list too');
  await reset(1001);

  console.log('\nCROSS-MODULE — appears in Sales/Orders/Repairs, correct outstanding');
  const cA: any = await createCustomer(EMAIL, cust({ name: 'Cross Module Customer', mobile: '9700000001' }), actor);
  await q(`INSERT INTO repair_jobs (id, user_email, customer_id, mobile, customer_name, status, labour_charges, other_charges, discount, advance_payment, created_at, updated_at) VALUES
    ('RJ-1', ?, ?, ?, ?, 'In Progress', 1000, 0, 0, 200, '2026-01-01', '2026-01-01')`, [EMAIL, cA.id, cA.mobile, cA.name]);
  // attachCustomerStats reads "paid" from repair_job_payments (never advance_payment directly) —
  // this mirrors what addRepairJobPayment() would have inserted for that ₹200 advance.
  await q(`INSERT INTO repair_job_payments (id, repair_job_id, amount, method, date) VALUES ('RJP-1', 'RJ-1', 200, 'Cash', '2026-01-01')`);
  await q(`INSERT INTO sales_orders (id, user_email, customer_id, customer_name, mobile, quantity, unit_price, grand_total, amount_paid, balance_due, order_status, created_at, updated_at) VALUES
    ('SALE-X1', ?, ?, ?, ?, 1, 5000, 5000, 3000, 2000, 'Completed', '2026-01-02', '2026-01-02')`, [EMAIL, cA.id, cA.name, cA.mobile]);
  await q(`INSERT INTO customer_orders (id, user_email, customer_id, customer_name, mobile, quantity, unit_price, total_amount, amount_paid, balance_due, order_status, payment_status, created_at, updated_at) VALUES
    ('ORD-X1', ?, ?, ?, ?, 1, 8000, 8000, 0, 8000, 'NEW', 'Pending', '2026-01-03', '2026-01-03')`, [EMAIL, cA.id, cA.name, cA.mobile]);

  const withStats = (await listCustomersWithStats(EMAIL)).find((c: any) => c.id === cA.id);
  ok(withStats.totalRepairs === 1 && withStats.activeRepairs === 1, 'shows up in Repairs (1 active repair job)', [withStats.totalRepairs, withStats.activeRepairs]);
  ok(withStats.totalPurchases === 2, 'totalPurchases counts the 1 sale + 1 order (2 total)', withStats.totalPurchases);
  ok(withStats.pendingAmount === 800 + 2000 + 8000, 'pendingAmount sums repair balance (1000-200=800) + sale balance (2000) + order balance (8000)', withStats.pendingAmount);

  let paged = await listCustomersPaged(EMAIL, { has: 'repairs', pageSize: 100 });
  ok(paged.customers.some((c: any) => c.id === cA.id), '"Has Repairs" filter finds this customer');
  paged = await listCustomersPaged(EMAIL, { has: 'sales', pageSize: 100 });
  ok(paged.customers.some((c: any) => c.id === cA.id), '"Has Sales" filter finds this customer');
  paged = await listCustomersPaged(EMAIL, { has: 'orders', pageSize: 100 });
  ok(paged.customers.some((c: any) => c.id === cA.id), '"Has Orders" filter finds this customer');
  paged = await listCustomersPaged(EMAIL, { has: 'outstanding', pageSize: 100 });
  ok(paged.customers.some((c: any) => c.id === cA.id), '"Has Outstanding" filter finds this customer');

  console.log('\n360° PROFILE — timeline, summary, orders, products purchased');
  const profile: any = await getCustomerProfile(EMAIL, cA.id);
  ok(!!profile && profile.customer.id === cA.id, 'profile loads for the customer');
  ok(profile.summary.totalRepairs === 1 && profile.summary.totalOrders === 1, 'profile summary matches repair + order counts', profile.summary);
  ok(profile.orders.length === 1 && profile.orders[0].id === 'ORD-X1', 'profile includes Orders History');
  ok(profile.timeline.length > 0 && profile.timeline.some((t: any) => t.type === 'customer_created'), 'timeline includes customer_created event');
  ok(profile.timeline.some((t: any) => t.type === 'job_created'), 'timeline includes the repair job');
  ok(profile.timeline.some((t: any) => t.type === 'order_created'), 'timeline includes the order');
  ok(Array.isArray(profile.productsPurchased), 'productsPurchased roll-up is present');

  console.log('\nCALL / WHATSAPP LINKS — correct India format, never auto-send');
  ok(buildTelLink('9876543210') === 'tel:+919876543210', 'tel: link uses +91 prefix', buildTelLink('9876543210'));
  ok(buildTelLink('') === null || buildTelLink(undefined as any) == null, 'no tel: link for an empty/missing mobile');
  const wa = buildWhatsAppLink('9876543210', 'Hello');
  ok(!!wa && wa.startsWith('https://wa.me/919876543210') && wa.includes('text='), 'wa.me link uses +91 prefix and carries a prefilled (not auto-sent) message', wa);
  ok(formatCustomerLabel('CUST-1001', 'Jay Patel') === 'CUST-1001 / Jay Patel', 'display format matches spec exactly ("CUST-1001 / Jay Patel")');

  console.log('\nEDIT — never forks a second record, blocked once merged, duplicate-on-edit');
  await reset(1001);
  const eA: any = await createCustomer(EMAIL, cust({ mobile: '9600000001' }), actor);
  const eB: any = await createCustomer(EMAIL, cust({ name: 'Second Person', mobile: '9600000002' }), actor);
  const updated = await updateCustomer(EMAIL, eA.id, { ...eA, name: 'Ravi Patel Updated', mobile: eA.mobile }, actor);
  ok(updated!.id === eA.id && updated!.name === 'Ravi Patel Updated', 'edit updates the SAME record, id unchanged');
  ok(await rowCount('SELECT COUNT(*) c FROM customers') === 2, 'editing never creates an extra row');
  await rejects(() => updateCustomer(EMAIL, eA.id, { ...eA, mobile: eB.mobile }, actor), 'possible existing', 'changing mobile to another customer\'s mobile is blocked as a duplicate', 409);
  const forced2 = await updateCustomer(EMAIL, eA.id, { ...eA, mobile: eA.mobile, notes: 'no contact change' }, actor);
  ok(!!forced2, 'editing non-contact fields does not trigger a duplicate check');
  await mergeCustomers(EMAIL, eB.id, eA.id, actor); // eA merged away into eB
  await rejects(() => updateCustomer(EMAIL, eA.id, { ...eA, name: 'Should Fail' }, actor), 'merged', 'a merged-away customer can no longer be edited', 409);

  console.log('\nDELETE SAFETY — never physically delete a customer with any history');
  await reset(1001);
  const dA: any = await createCustomer(EMAIL, cust({ mobile: '9500000001' }), actor);
  await q(`INSERT INTO repair_jobs (id, user_email, customer_id, mobile, customer_name, status, created_at, updated_at) VALUES ('RJ-D1', ?, ?, ?, ?, 'Delivered', '2026-01-01', '2026-01-01')`, [EMAIL, dA.id, dA.mobile, dA.name]);
  const del1 = await deactivateOrDeleteCustomer(EMAIL, dA.id, actor);
  ok(del1.deactivated === true && del1.deleted === false, 'a customer with a repair job is DEACTIVATED, not deleted', del1);
  const stillThere = await getCustomerById(EMAIL, dA.id);
  ok(!!stillThere && stillThere.status === 'Inactive', 'the record still exists with status=Inactive (soft delete)');
  const jobStillThere = await rowCount('SELECT COUNT(*) c FROM repair_jobs WHERE id = ?', ['RJ-D1']);
  ok(jobStillThere === 1, 'the linked repair job history is fully intact after deactivation');
  const dB: any = await createCustomer(EMAIL, cust({ name: 'No History', mobile: '9500000002' }), actor);
  const del2 = await deactivateOrDeleteCustomer(EMAIL, dB.id, actor);
  ok(del2.deleted === true && del2.deactivated === false, 'a customer with ZERO linked records is genuinely (hard) deleted', del2);
  ok(await getCustomerById(EMAIL, dB.id) === null, 'the zero-history customer row is actually gone');
  await rejects(() => deactivateOrDeleteCustomer(EMAIL, 'CUST-NOPE', actor), 'not found', 'deleting an unknown customer is a 404', 404);

  console.log('\nMERGE — reassigns everything, preserves history, never deletes, audits both sides');
  await reset(1001);
  const pA: any = await createCustomer(EMAIL, cust({ name: 'Primary Person', mobile: '9400000001' }), actor);
  const pB: any = await createCustomer(EMAIL, cust({ name: 'Duplicate Person', mobile: '9400000002' }), actor);
  await q(`INSERT INTO repair_jobs (id, user_email, customer_id, mobile, customer_name, status, created_at, updated_at) VALUES ('RJ-M1', ?, ?, ?, ?, 'Delivered', '2026-01-01', '2026-01-01')`, [EMAIL, pB.id, pB.mobile, pB.name]);
  await q(`INSERT INTO sales_orders (id, user_email, customer_id, customer_name, mobile, grand_total, amount_paid, balance_due, order_status, created_at, updated_at) VALUES ('SALE-M1', ?, ?, ?, ?, 5000, 5000, 0, 'Completed', '2026-01-01', '2026-01-01')`, [EMAIL, pB.id, pB.name, pB.mobile]);
  await q(`INSERT INTO customer_orders (id, user_email, customer_id, customer_name, mobile, total_amount, amount_paid, balance_due, order_status, payment_status, created_at, updated_at) VALUES ('ORD-M1', ?, ?, ?, ?, 3000, 0, 3000, 'NEW', 'Pending', '2026-01-01', '2026-01-01')`, [EMAIL, pB.id, pB.name, pB.mobile]);
  await q(`INSERT INTO invoices (id, user_email, customer_id, customer_name, mobile, grand_total, payment_status, timestamp) VALUES ('INV-M1', ?, ?, ?, ?, 5000, 'Paid', '2026-01-01T00:00:00Z')`, [EMAIL, pB.id, pB.name, pB.mobile]);
  await q(`INSERT INTO wallet_transactions (id, user_email, amount, date, type, description, customer_id) VALUES ('TX-M1', ?, 100, '2026-01-01', 'TOPUP', 'test', ?)`, [EMAIL, pB.id]);
  await addCustomerNote(EMAIL, pB.id, 'A note on the duplicate', 'Owner');

  const merged: any = await mergeCustomers(EMAIL, pA.id, pB.id, actor);
  ok(merged.id === pA.id, 'merge returns the primary record');
  const dup = await getCustomerById(EMAIL, pB.id);
  ok(!!dup && dup.status === 'Merged' && dup.mergedInto === pA.id, 'the duplicate is marked Merged with mergedInto set — NEVER deleted', dup);
  ok(await rowCount('SELECT COUNT(*) c FROM repair_jobs WHERE customer_id = ?', [pA.id]) === 1, 'repair job reassigned to primary');
  ok(await rowCount('SELECT COUNT(*) c FROM sales_orders WHERE customer_id = ?', [pA.id]) === 1, 'sale reassigned to primary');
  ok(await rowCount('SELECT COUNT(*) c FROM customer_orders WHERE customer_id = ?', [pA.id]) === 1, 'order reassigned to primary');
  ok(await rowCount('SELECT COUNT(*) c FROM invoices WHERE customer_id = ?', [pA.id]) === 1, 'invoice reassigned to primary');
  ok(await rowCount('SELECT COUNT(*) c FROM wallet_transactions WHERE customer_id = ?', [pA.id]) === 1, 'wallet transaction reassigned to primary');
  ok((await listCustomerNotes(EMAIL, pA.id)).length === 1, 'note reassigned to primary');
  const auditPrimary = await listCustomerAuditLog(EMAIL, pA.id);
  const auditDup = await listCustomerAuditLog(EMAIL, pB.id);
  ok(auditPrimary.some((a: any) => a.eventType === 'customer_merged'), 'audit log on the primary records customer_merged');
  ok(auditDup.some((a: any) => a.eventType === 'customer_merged_away'), 'audit log on the duplicate records customer_merged_away');
  await rejects(() => mergeCustomers(EMAIL, pA.id, pA.id, actor), 'different', 'cannot merge a customer into itself');
  await rejects(() => mergeCustomers(EMAIL, pB.id, pA.id, actor), 'itself merged', 'a merged-away customer cannot be chosen as the primary of a new merge', 409);
  const pC: any = await createCustomer(EMAIL, cust({ name: 'Third Party', mobile: '9400000003' }), actor);
  await rejects(() => mergeCustomers(EMAIL, pC.id, pB.id, actor), 'already been merged', 'an already-merged-away customer cannot be re-merged as the duplicate either', 409);
  await rejects(() => mergeCustomers(EMAIL, 'CUST-NOPE', pA.id, actor), 'not found', 'merging with an unknown id is a 404', 404);

  console.log('\nNOTES — add/edit/delete with Created By/Date');
  await reset(1001);
  const nA: any = await createCustomer(EMAIL, cust({ mobile: '9300000001' }), actor);
  const note = await addCustomerNote(EMAIL, nA.id, 'First note', 'Owner');
  ok(!!note.id && note.note === 'First note' && note.createdBy === 'Owner' && !!note.createdAt, 'note created with text, createdBy and createdAt');
  await editCustomerNote(EMAIL, note.id, 'Edited note text');
  let notes = await listCustomerNotes(EMAIL, nA.id);
  ok(notes[0].note === 'Edited note text', 'note text can be edited');
  await deleteCustomerNote(EMAIL, note.id);
  notes = await listCustomerNotes(EMAIL, nA.id);
  ok(notes.length === 0, 'note can be deleted');
  await rejects(() => addCustomerNote(EMAIL, nA.id, ''), 'required', 'empty note text rejected');

  console.log('\nAUDIT LOG — created/updated/deactivated/deleted/merged events recorded');
  await reset(1001);
  const auA: any = await createCustomer(EMAIL, cust({ mobile: '9200000001' }), actor);
  await updateCustomer(EMAIL, auA.id, { ...auA, name: 'Renamed' }, actor);
  let audit = await listCustomerAuditLog(EMAIL, auA.id);
  ok(audit.some((a: any) => a.eventType === 'customer_created') && audit.some((a: any) => a.eventType === 'customer_updated'), 'created + updated events both logged', audit.map((a: any) => a.eventType));
  ok(audit.every((a: any) => a.performedBy === 'Owner' && !!a.timestamp), 'every audit row records performer and timestamp');

  console.log('\nCSV EXPORT');
  const csvRows = await listCustomersWithStats(EMAIL);
  const csv = customersToCsv(csvRows);
  ok(csv.startsWith('"Customer ID"') && csv.includes(auA.id), 'CSV export includes header and the customer id', csv.split('\r\n')[0]);

  console.log('\nDATABASE INTEGRITY — indexes and FK exist (migration 021)');
  const idxRows = await q(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'`);
  const idxNames = new Set((idxRows as any[]).map(r => r.INDEX_NAME));
  for (const idx of ['idx_customers_mobile', 'idx_customers_whatsapp', 'idx_customers_email', 'idx_customers_gstin', 'idx_customers_name']) {
    ok(idxNames.has(idx), `index ${idx} exists on customers`);
  }
  const fkRows = await q(`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_jobs' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_repair_jobs_customer'`);
  ok((fkRows as any[]).length === 1, 'fk_repair_jobs_customer FOREIGN KEY exists');
  const fkRows2 = await q(`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_sales_orders_customer'`);
  ok((fkRows2 as any[]).length === 1, 'fk_sales_orders_customer FOREIGN KEY exists');

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST CRASHED:', e); await pool.end().catch(() => {}); process.exit(1); });
