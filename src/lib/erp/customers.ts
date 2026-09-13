import { getPool } from '../db';
import { grandTotal, totalPaid, balanceDue } from '../repair-utils';
import { listRepairJobsForCustomerMobile } from './repairJobs';
import { listOnlineBookingsForCustomerMobile } from './onlineBookings';
import { listSalesOrdersForMobile } from './sales';
import { listInvoicesForMobile } from './invoices';

// The Customer Department module is a read-heavy VIEW layer over data that
// already lives in repair_jobs, online_bookings, sales_orders and invoices —
// it never duplicates those records. `customers` itself is the existing
// table repairJobs.ts already auto-populates (resolveCustomerId, matched by
// mobile) on every repair job creation; this file only adds the admin-side
// CRUD + cross-table aggregation on top of data that's already there.

const CUSTOMER_COLUMNS: { js: string; sql: string }[] = [
  { js: 'name', sql: 'name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'alternateMobile', sql: 'alternate_mobile' },
  { js: 'email', sql: 'email' },
  { js: 'address', sql: 'address' },
  { js: 'city', sql: 'city' },
  { js: 'state', sql: 'state' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'status', sql: 'status' },
];

function customerRowToObject(row: any) {
  const obj: any = { id: row.id, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at };
  for (const col of CUSTOMER_COLUMNS) obj[col.js] = row[col.sql];
  return obj;
}

// Lightweight per-tenant list with aggregated stats, built from a handful of
// bulk GROUP BY queries (one pass each over repair_jobs+parts+payments,
// sales_orders, invoices) rather than a correlated subquery per customer row
// — the customer list itself stays small and cheap, and search/filter/sort/
// pagination all happen client-side over this one already-small payload,
// matching how Online Bookings' list already works. Full record detail
// (parts, payments, notes, timelines) is never fetched here — only when a
// single profile is opened via getCustomerProfile below.
export async function listCustomersWithStats(email: string) {
  const pool = getPool();

  const [customerRows] = await pool.execute<any[]>('SELECT * FROM customers WHERE user_email = ? ORDER BY created_at DESC', [email]);
  const customers = (customerRows as any[]).map(customerRowToObject);
  if (customers.length === 0) return [];

  const [jobRows] = await pool.execute<any[]>(
    'SELECT id, mobile, status, labour_charges, other_charges, discount, created_at, updated_at FROM repair_jobs WHERE user_email = ?',
    [email]
  );
  const jobIds = (jobRows as any[]).map(j => j.id);
  const partsTotalsByJob = new Map<string, number>();
  const paidTotalsByJob = new Map<string, number>();
  if (jobIds.length > 0) {
    const placeholders = jobIds.map(() => '?').join(',');
    const [partsRows] = await pool.execute<any[]>(
      `SELECT repair_job_id, SUM(total) AS total FROM repair_job_parts WHERE repair_job_id IN (${placeholders}) GROUP BY repair_job_id`,
      jobIds
    );
    for (const r of partsRows as any[]) partsTotalsByJob.set(r.repair_job_id, Number(r.total) || 0);
    const [paymentRows] = await pool.execute<any[]>(
      `SELECT repair_job_id, SUM(amount) AS total FROM repair_job_payments WHERE repair_job_id IN (${placeholders}) GROUP BY repair_job_id`,
      jobIds
    );
    for (const r of paymentRows as any[]) paidTotalsByJob.set(r.repair_job_id, Number(r.total) || 0);
  }

  const [saleRows] = await pool.execute<any[]>(
    'SELECT mobile, balance_due, created_at FROM sales_orders WHERE user_email = ?',
    [email]
  );
  const [invoiceRows] = await pool.execute<any[]>(
    'SELECT mobile, grand_total, payment_status, timestamp FROM invoices WHERE user_email = ?',
    [email]
  );

  type Agg = {
    totalRepairs: number; activeRepairs: number; completedRepairs: number;
    totalPurchases: number; pendingAmount: number; lastActivity: string | null;
  };
  const byMobile = new Map<string, Agg>();
  const ensure = (mobile: string): Agg => {
    let a = byMobile.get(mobile);
    if (!a) { a = { totalRepairs: 0, activeRepairs: 0, completedRepairs: 0, totalPurchases: 0, pendingAmount: 0, lastActivity: null }; byMobile.set(mobile, a); }
    return a;
  };
  const bumpActivity = (a: Agg, ts: string | null | undefined) => {
    if (ts && (!a.lastActivity || new Date(ts).getTime() > new Date(a.lastActivity).getTime())) a.lastActivity = ts;
  };

  for (const j of jobRows as any[]) {
    if (!j.mobile) continue;
    const a = ensure(j.mobile);
    a.totalRepairs += 1;
    if (j.status === 'Delivered') a.completedRepairs += 1;
    else if (j.status !== 'Cancelled') a.activeRepairs += 1;
    const jobTotal = (partsTotalsByJob.get(j.id) || 0) + Number(j.labour_charges || 0) + Number(j.other_charges || 0) - Number(j.discount || 0);
    const jobPaid = paidTotalsByJob.get(j.id) || 0;
    const due = jobTotal - jobPaid;
    if (due > 0) a.pendingAmount += due;
    bumpActivity(a, j.updated_at || j.created_at);
  }
  for (const s of saleRows as any[]) {
    if (!s.mobile) continue;
    const a = ensure(s.mobile);
    a.totalPurchases += 1;
    if (Number(s.balance_due) > 0) a.pendingAmount += Number(s.balance_due);
    bumpActivity(a, s.created_at);
  }
  for (const inv of invoiceRows as any[]) {
    if (!inv.mobile) continue;
    const a = ensure(inv.mobile);
    if (inv.payment_status && inv.payment_status !== 'Paid') a.pendingAmount += Number(inv.grand_total) || 0;
    bumpActivity(a, inv.timestamp);
  }

  return customers.map(c => {
    const a = (c.mobile && byMobile.get(c.mobile)) || { totalRepairs: 0, activeRepairs: 0, completedRepairs: 0, totalPurchases: 0, pendingAmount: 0, lastActivity: null };
    return {
      ...c,
      totalRepairs: a.totalRepairs,
      activeRepairs: a.activeRepairs,
      completedRepairs: a.completedRepairs,
      totalPurchases: a.totalPurchases,
      pendingAmount: Math.round(a.pendingAmount * 100) / 100,
      lastActivity: a.lastActivity || c.createdAt,
    };
  });
}

export async function getCustomerById(email: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM customers WHERE id = ? AND user_email = ? LIMIT 1', [id, email]);
  const row = (rows as any[])[0];
  return row ? customerRowToObject(row) : null;
}

function isDuplicateMobileError(existing: any, mobile: string, excludeId?: string) {
  return !!existing && existing.mobile === mobile && existing.id !== excludeId;
}

// Duplicate-mobile check is advisory (customers.mobile has no unique index —
// changing that now would risk rejecting legitimate historical rows created
// before this module existed), but the UI-facing create/update path always
// checks and blocks a NEW duplicate from being created here.
export async function findCustomerByMobile(email: string, mobile: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM customers WHERE user_email = ? AND mobile = ? LIMIT 1', [email, mobile]);
  const row = (rows as any[])[0];
  return row ? customerRowToObject(row) : null;
}

export async function createCustomer(email: string, data: any) {
  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Customer name is required.');
  }
  if (!data?.mobile || typeof data.mobile !== 'string' || !/^[0-9]{10}$/.test(data.mobile)) {
    throw new Error('A valid 10-digit mobile number is required.');
  }
  const existing = await findCustomerByMobile(email, data.mobile);
  if (isDuplicateMobileError(existing, data.mobile)) {
    throw new Error(`A customer with this mobile number already exists (${existing.name || existing.id}).`);
  }

  const pool = getPool();
  const now = new Date().toISOString();
  const id = `CUST${Date.now()}`;
  await pool.execute(
    `INSERT INTO customers (id, user_email, name, mobile, alternate_mobile, address, city, state, pincode, email, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)`,
    [
      id, email, data.name.trim(), data.mobile,
      data.alternateMobile || null, data.address || null, data.city || null, data.state || null,
      data.pincode || null, data.email || null, data.status || 'Active', now, now,
    ]
  );
  return getCustomerById(email, id);
}

// Never touches id/source/created_at — an edit can only ever update the same
// row, it can never fork into a second customer record.
export async function updateCustomer(email: string, id: string, data: any) {
  const current = await getCustomerById(email, id);
  if (!current) return null;

  if (data.mobile && data.mobile !== current.mobile) {
    if (!/^[0-9]{10}$/.test(data.mobile)) throw new Error('A valid 10-digit mobile number is required.');
    const existing = await findCustomerByMobile(email, data.mobile);
    if (isDuplicateMobileError(existing, data.mobile, id)) {
      throw new Error(`A customer with this mobile number already exists (${existing.name || existing.id}).`);
    }
  }

  const pool = getPool();
  const now = new Date().toISOString();
  const merged = { ...current, ...data };
  await pool.execute(
    `UPDATE customers SET name = ?, mobile = ?, alternate_mobile = ?, address = ?, city = ?, state = ?, pincode = ?, email = ?, status = ?, updated_at = ?
     WHERE id = ? AND user_email = ?`,
    [
      merged.name || null, merged.mobile || null, merged.alternateMobile || null, merged.address || null,
      merged.city || null, merged.state || null, merged.pincode || null, merged.email || null,
      merged.status || 'Active', now, id, email,
    ]
  );
  return getCustomerById(email, id);
}

// Never cascade-deletes real business history. A customer with any repair
// job, online booking, sales order or invoice under their mobile number is
// deactivated (status = 'Inactive') instead of removed — every one of those
// records stays exactly as it was. Only a customer with zero related
// records anywhere is actually deleted from the table.
export async function deactivateOrDeleteCustomer(email: string, id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
  const customer = await getCustomerById(email, id);
  if (!customer) throw new Error('Customer not found.');

  const pool = getPool();
  let relatedCount = 0;
  if (customer.mobile) {
    const checks = [
      'SELECT COUNT(*) AS c FROM repair_jobs WHERE user_email = ? AND mobile = ?',
      'SELECT COUNT(*) AS c FROM online_bookings WHERE user_email = ? AND customer_mobile = ?',
      'SELECT COUNT(*) AS c FROM sales_orders WHERE user_email = ? AND mobile = ?',
      'SELECT COUNT(*) AS c FROM invoices WHERE user_email = ? AND mobile = ?',
    ];
    for (const sql of checks) {
      const [rows] = await pool.execute<any[]>(sql, [email, customer.mobile]);
      relatedCount += Number((rows as any[])[0]?.c || 0);
    }
  }

  if (relatedCount > 0) {
    await pool.execute('UPDATE customers SET status = ?, updated_at = ? WHERE id = ? AND user_email = ?', ['Inactive', new Date().toISOString(), id, email]);
    return { deleted: false, deactivated: true };
  }

  await pool.execute('DELETE FROM customers WHERE id = ? AND user_email = ?', [id, email]);
  return { deleted: true, deactivated: false };
}

export async function listCustomerNotes(email: string, customerId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM customer_notes WHERE user_email = ? AND customer_id = ? ORDER BY created_at DESC',
    [email, customerId]
  );
  return (rows as any[]).map(r => ({ id: r.id, note: r.note, createdBy: r.created_by, createdAt: r.created_at }));
}

export async function addCustomerNote(email: string, customerId: string, note: string, createdBy?: string) {
  if (!note || !note.trim()) throw new Error('Note text is required.');
  const pool = getPool();
  const id = `CNOTE${Date.now()}`;
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO customer_notes (id, customer_id, user_email, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, customerId, email, note.trim(), createdBy || null, now]
  );
  return { id, note: note.trim(), createdBy: createdBy || null, createdAt: now };
}

export async function deleteCustomerNote(email: string, noteId: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM customer_notes WHERE id = ? AND user_email = ?', [noteId, email]);
  return result.affectedRows > 0;
}

type TimelineEntry = { type: string; label: string; at: string; note?: string };

// Every profile fetch that follows is only ever triggered by opening one
// customer's profile — never part of the list load above.
export async function getCustomerProfile(email: string, id: string) {
  const customer = await getCustomerById(email, id);
  if (!customer) return null;

  const mobile = customer.mobile || '';
  const [repairJobs, onlineBookings, salesOrders, invoices, notes] = await Promise.all([
    mobile ? listRepairJobsForCustomerMobile(email, mobile) : Promise.resolve([]),
    mobile ? listOnlineBookingsForCustomerMobile(email, mobile) : Promise.resolve([]),
    mobile ? listSalesOrdersForMobile(email, mobile) : Promise.resolve([]),
    mobile ? listInvoicesForMobile(email, mobile) : Promise.resolve([]),
    listCustomerNotes(email, id),
  ]);

  const jobsWithTotals = (repairJobs as any[]).map(j => ({
    ...j,
    grandTotal: grandTotal(j),
    totalPaid: totalPaid(j),
    balanceDue: balanceDue(j),
  }));

  const totalSales = (salesOrders as any[]).reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
  const totalBilling = (invoices as any[]).reduce((s, i) => s + (Number(i.grandTotal) || 0), 0)
    + jobsWithTotals.reduce((s, j) => s + j.grandTotal, 0);
  const totalPaidAll = jobsWithTotals.reduce((s, j) => s + j.totalPaid, 0)
    + (salesOrders as any[]).reduce((s, o) => s + (Number(o.amountPaid) || 0), 0)
    + (invoices as any[]).reduce((s, i) => s + (i.paymentStatus === 'Paid' ? (Number(i.grandTotal) || 0) : 0), 0);
  const totalDue = Math.max(0, totalBilling - totalPaidAll);

  const summary = {
    totalRepairs: jobsWithTotals.length,
    activeRepairs: jobsWithTotals.filter(j => j.status !== 'Delivered' && j.status !== 'Cancelled').length,
    completedRepairs: jobsWithTotals.filter(j => j.status === 'Delivered').length,
    totalSales,
    totalPaid: Math.round(totalPaidAll * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
  };

  // Built only from records that actually exist — never a fabricated event.
  const timeline: TimelineEntry[] = [];
  if (customer.createdAt) timeline.push({ type: 'customer_created', label: 'Customer Created', at: customer.createdAt });
  for (const b of onlineBookings as any[]) {
    timeline.push({ type: 'booking_submitted', label: `Online Booking ${b.id} Submitted`, at: b.createdAt });
    for (const h of b.statusHistory || []) {
      timeline.push({ type: 'booking_status', label: `Booking ${b.id}: ${h.status}`, at: h.changedAt, note: h.note });
    }
  }
  for (const j of jobsWithTotals) {
    timeline.push({ type: 'job_created', label: `Repair Job ${j.id} Created`, at: j.createdAt });
    if (j.technicianName) timeline.push({ type: 'technician_assigned', label: `${j.technicianName} Assigned to ${j.id}`, at: j.updatedAt });
    for (const h of j.statusHistory || []) {
      timeline.push({ type: 'job_status', label: `${j.id}: ${h.status}`, at: h.changedAt, note: h.note });
    }
    for (const p of j.payments || []) {
      timeline.push({ type: 'payment_received', label: `Payment Received for ${j.id}`, at: p.date, note: `₹${p.amount}` });
    }
  }
  for (const inv of invoices as any[]) {
    timeline.push({ type: 'invoice_generated', label: `Invoice ${inv.invoiceNumber || inv.id} Generated`, at: inv.timestamp || inv.date });
  }
  timeline.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());

  return {
    customer,
    summary,
    repairJobs: jobsWithTotals,
    onlineBookings,
    salesOrders,
    invoices,
    notes,
    timeline,
  };
}
