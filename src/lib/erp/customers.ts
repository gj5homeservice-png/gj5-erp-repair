import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { grandTotal, totalPaid, balanceDue } from '../repair-utils';
import { listRepairJobsForCustomerMobile } from './repairJobs';
import { listOnlineBookingsForCustomerMobile } from './onlineBookings';
import { listSalesOrdersForMobile } from './sales';
import { listInvoicesForMobile } from './invoices';
import { isValidCustomerCategory, DEFAULT_CUSTOMER_CATEGORY } from '../customer-categories';
import { listAccountsWithBalances } from './accounts';
import { normalizeSaleStatus, isActiveSale } from '../sales-utils';
import { normalizeMobile } from '../customer-utils';

// The Customer Department module is a read-heavy VIEW layer over data that
// already lives in repair_jobs, online_bookings, sales_orders, customer_orders
// and invoices — it never duplicates those records. `customers` itself is the
// existing table repairJobs.ts already auto-populates (resolveCustomerId,
// matched by mobile) on every repair job creation; this file only adds the
// admin-side CRUD + cross-table aggregation + search on top of data that's
// already there.

export class CustomerError extends Error {
  status: number;
  duplicates?: any[];
  constructor(message: string, status = 400, duplicates?: any[]) {
    super(message);
    this.status = status;
    this.duplicates = duplicates;
  }
}

const CUSTOMER_COLUMNS: { js: string; sql: string }[] = [
  { js: 'name', sql: 'name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'alternateMobile', sql: 'alternate_mobile' },
  { js: 'whatsappNumber', sql: 'whatsapp_number' },
  { js: 'email', sql: 'email' },
  { js: 'facebookId', sql: 'facebook_id' },
  { js: 'instagramId', sql: 'instagram_id' },
  { js: 'gstin', sql: 'gstin' },
  { js: 'dateOfBirth', sql: 'date_of_birth' },
  { js: 'photo', sql: 'photo' },
  { js: 'address', sql: 'address' },
  { js: 'city', sql: 'city' },
  { js: 'state', sql: 'state' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'area', sql: 'area' },
  { js: 'status', sql: 'status' },
  { js: 'category', sql: 'category' },
];

function customerRowToObject(row: any) {
  const obj: any = {
    id: row.id, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined, mergedInto: row.merged_into ?? undefined,
  };
  for (const col of CUSTOMER_COLUMNS) obj[col.js] = row[col.sql];
  return obj;
}

// ----------------------------------------------------------------- audit log

export type CustomerAuditEvent =
  | 'customer_created' | 'customer_updated' | 'customer_deactivated' | 'customer_reactivated'
  | 'customer_deleted' | 'customer_merged' | 'customer_merged_away';

async function writeCustomerAudit(
  conn: PoolConnection, email: string, customerId: string, eventType: CustomerAuditEvent,
  performedBy: string, details?: string, recordId?: string,
) {
  const id = `CAUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await conn.execute(
    `INSERT INTO customer_audit_logs (id, user_email, customer_id, event_type, performed_by, timestamp, record_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, customerId, eventType, performedBy, new Date().toISOString(), recordId ?? null, details ?? null]
  );
}

export async function listCustomerAuditLog(email: string, customerId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM customer_audit_logs WHERE user_email = ? AND customer_id = ? ORDER BY timestamp DESC',
    [email, customerId]
  );
  return (rows as any[]).map(r => ({ id: r.id, eventType: r.event_type, performedBy: r.performed_by, timestamp: r.timestamp, recordId: r.record_id, details: r.details }));
}

// ------------------------------------------------------------- id allocation

// Never derived from MAX(existing id) — a hard-deleted customer's number must
// never be reissued (spec requirement). `customer_id_sequences` holds one
// monotonically-increasing counter per tenant; migration 021 seeds it from
// the highest number already in use. Runs inside the CALLER's transaction so
// the row lock (SELECT ... FOR UPDATE) actually serializes concurrent
// creates for the same tenant — two simultaneous "Add Customer" submits can
// never get the same id.
export async function allocateCustomerId(conn: PoolConnection, email: string): Promise<string> {
  const [settingsRows] = await conn.execute<any[]>('SELECT customer_id_start_number FROM system_settings WHERE user_email = ? LIMIT 1', [email]);
  const configuredStart = Number((settingsRows as any[])[0]?.customer_id_start_number);
  const startNumber = Number.isFinite(configuredStart) && configuredStart > 0 ? configuredStart : 1001;

  const [rows] = await conn.execute<any[]>('SELECT last_number FROM customer_id_sequences WHERE user_email = ? LIMIT 1 FOR UPDATE', [email]);
  const current = (rows as any[])[0]?.last_number;
  // The configured start is a FLOOR re-applied on every allocation (never
  // retroactive to ids already issued) — raising it in Settings takes effect
  // on the very next customer even if some already exist; it can never make
  // a number go backward or collide with one already issued.
  const next = Math.max((Number.isFinite(current) ? Number(current) : startNumber - 1) + 1, startNumber);

  if ((rows as any[]).length === 0) {
    await conn.execute('INSERT INTO customer_id_sequences (user_email, last_number) VALUES (?, ?)', [email, next]);
  } else {
    await conn.execute('UPDATE customer_id_sequences SET last_number = ? WHERE user_email = ?', [next, email]);
  }
  return `CUST-${next}`;
}

// Advisory-only preview (no lock held) for the Add Customer form's "Customer
// ID: CUST-1042" display before saving — the authoritative id is always
// allocated again, correctly, inside createCustomer()'s own transaction.
export async function previewNextCustomerId(email: string): Promise<string> {
  const pool = getPool();
  const [settingsRows] = await pool.execute<any[]>('SELECT customer_id_start_number FROM system_settings WHERE user_email = ? LIMIT 1', [email]);
  const configuredStart = Number((settingsRows as any[])[0]?.customer_id_start_number);
  const startNumber = Number.isFinite(configuredStart) && configuredStart > 0 ? configuredStart : 1001;
  const [rows] = await pool.execute<any[]>('SELECT last_number FROM customer_id_sequences WHERE user_email = ? LIMIT 1', [email]);
  const current = (rows as any[])[0]?.last_number;
  const next = Math.max((Number.isFinite(current) ? Number(current) : startNumber - 1) + 1, startNumber);
  return `CUST-${next}`;
}

// Kept for backward compatibility with any existing caller expecting the old
// name/shape (the Add Customer modal's preview call).
export const getNextCustomerId = previewNextCustomerId;

// ------------------------------------------------------------- search / list

function likeParam(q: string) { return `%${q.replace(/[%_]/g, '\\$&')}%`; }

// The ONE fast path every picker/quick-lookup/Ctrl+K search goes through —
// an indexed, LIMIT-bound query that never pulls the whole customers table
// into the app. Matches Customer ID (exact or prefix), name, mobile,
// alternate mobile, WhatsApp number, email or GSTIN, all with a single
// query. Excludes merged-away (losing) records so a stale duplicate never
// shows up as a selectable result.
export async function searchCustomers(email: string, query: string, limit = 10) {
  const pool = getPool();
  const q = query.trim();
  if (!q) return [];
  const digits = normalizeMobile(q);
  const like = likeParam(q);
  const conditions = [
    'c.id LIKE ?', 'c.name LIKE ?', 'c.email LIKE ?', 'c.gstin LIKE ?',
  ];
  const params: any[] = [like, like, like, like];
  if (digits) {
    conditions.push('c.mobile LIKE ?', 'c.alternate_mobile LIKE ?', 'c.whatsapp_number LIKE ?');
    params.push(`${digits}%`, `${digits}%`, `${digits}%`);
  }
  const [rows] = await pool.execute<any[]>(
    `SELECT c.* FROM customers c
     WHERE c.user_email = ? AND c.merged_into IS NULL AND (${conditions.join(' OR ')})
     ORDER BY (c.id = ?) DESC, c.updated_at DESC
     LIMIT ${Math.max(1, Math.min(50, Math.trunc(limit)))}`,
    [email, ...params, q.toUpperCase()]
  );
  return (rows as any[]).map(customerRowToObject);
}

export interface CustomerListFilters {
  search?: string;
  status?: 'Active' | 'Inactive' | 'All';
  category?: string;
  city?: string;
  createdFrom?: string;
  createdTo?: string;
  has?: 'outstanding' | 'repairs' | 'orders' | 'sales';
  sortBy?: 'Recent Activity' | 'Name' | 'Total Repairs' | 'Pending Amount';
  page?: number;
  pageSize?: number;
}

// Server-side filtered/paginated list — the per-request cost stays
// proportional to `pageSize`, not the total number of customers, so this
// stays fast at 10,000/50,000/100,000+ rows (the "has outstanding/repairs/
// orders/sales" filters are EXISTS subqueries against the already-indexed
// mobile/customer_id columns of the source tables, never a full aggregate
// over the whole customer base). Per-row stats (totalRepairs, pendingAmount,
// ...) are then computed only for the one page of rows actually returned.
export async function listCustomersPaged(email: string, filters: CustomerListFilters = {}) {
  const pool = getPool();
  const page = Math.max(1, Math.trunc(filters.page || 1));
  const pageSize = Math.max(1, Math.min(200, Math.trunc(filters.pageSize || 25)));

  const where: string[] = ['c.user_email = ?', 'c.merged_into IS NULL'];
  const params: any[] = [email];

  const search = (filters.search || '').trim();
  if (search) {
    const digits = normalizeMobile(search);
    const like = likeParam(search);
    const parts = ['c.id LIKE ?', 'c.name LIKE ?', 'c.email LIKE ?', 'c.gstin LIKE ?'];
    const p2 = [like, like, like, like];
    if (digits) { parts.push('c.mobile LIKE ?', 'c.whatsapp_number LIKE ?'); p2.push(`${digits}%`, `${digits}%`); }
    where.push(`(${parts.join(' OR ')})`);
    params.push(...p2);
  }
  if (filters.status && filters.status !== 'All') { where.push('c.status = ?'); params.push(filters.status); }
  if (filters.category && filters.category !== 'All Categories') { where.push('c.category = ?'); params.push(filters.category); }
  if (filters.city) { where.push('c.city = ?'); params.push(filters.city); }
  if (filters.createdFrom) { where.push('c.created_at >= ?'); params.push(filters.createdFrom); }
  if (filters.createdTo) { where.push('c.created_at <= ?'); params.push(filters.createdTo + '￿'); }
  if (filters.has === 'repairs') where.push('EXISTS (SELECT 1 FROM repair_jobs rj WHERE rj.user_email = c.user_email AND rj.mobile = c.mobile)');
  if (filters.has === 'orders') where.push('EXISTS (SELECT 1 FROM customer_orders co WHERE co.user_email = c.user_email AND co.customer_id = c.id)');
  if (filters.has === 'sales') where.push("EXISTS (SELECT 1 FROM sales_orders so WHERE so.user_email = c.user_email AND so.customer_id = c.id AND so.order_status IN ('Completed','Pending'))");
  if (filters.has === 'outstanding') {
    where.push(`(
      EXISTS (SELECT 1 FROM repair_jobs rj WHERE rj.user_email = c.user_email AND rj.mobile = c.mobile AND rj.status NOT IN ('Delivered','Cancelled'))
      OR EXISTS (SELECT 1 FROM sales_orders so WHERE so.user_email = c.user_email AND so.customer_id = c.id AND so.balance_due > 0)
      OR EXISTS (SELECT 1 FROM customer_orders co WHERE co.user_email = c.user_email AND co.customer_id = c.id AND co.balance_due > 0)
      OR EXISTS (SELECT 1 FROM invoices inv WHERE inv.user_email = c.user_email AND inv.customer_id = c.id AND inv.payment_status <> 'Paid')
    )`);
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.execute<any[]>(`SELECT COUNT(*) AS c FROM customers c WHERE ${whereSql}`, params);
  const total = Number((countRows as any[])[0]?.c || 0);

  // Sorting by name/id is a real ORDER BY; the other two ("Recent Activity",
  // "Pending Amount") depend on cross-table aggregates that only exist AFTER
  // this page is fetched, so those two sort client-side over just this one
  // page (max `pageSize` rows) below — never over the whole customer base.
  const orderSql = filters.sortBy === 'Name' ? 'c.name ASC' : 'c.created_at DESC';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const [rows] = await pool.execute<any[]>(
    `SELECT c.* FROM customers c WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${(safePage - 1) * pageSize}`,
    params
  );
  const customers = (rows as any[]).map(customerRowToObject);
  const withStats = await attachCustomerStats(email, customers);

  if (filters.sortBy === 'Total Repairs') withStats.sort((a, b) => b.totalRepairs - a.totalRepairs);
  else if (filters.sortBy === 'Pending Amount') withStats.sort((a, b) => b.pendingAmount - a.pendingAmount);

  return { customers: withStats, total, page: safePage, pageSize, totalPages };
}

// Per-row aggregate stats (repairs/sales/orders/invoices), computed only for
// the given (already small — one list page, or a handful of search results)
// set of customers, keyed by BOTH mobile (legacy modules still key by
// mobile) and customer_id (Sales/Orders always set it) so nothing already
// counted elsewhere is missed.
async function attachCustomerStats(email: string, customers: any[]) {
  if (customers.length === 0) return customers as any[];
  const pool = getPool();
  const mobiles = customers.map(c => c.mobile).filter(Boolean);
  const ids = customers.map(c => c.id);
  const mobilePh = mobiles.length ? mobiles.map(() => '?').join(',') : "''";
  const idPh = ids.map(() => '?').join(',');

  const [jobRows] = await pool.execute<any[]>(
    `SELECT id, mobile, status, labour_charges, other_charges, discount, created_at, updated_at FROM repair_jobs WHERE user_email = ? AND mobile IN (${mobilePh})`,
    [email, ...mobiles]
  );
  const jobIds = (jobRows as any[]).map(j => j.id);
  const partsTotalsByJob = new Map<string, number>();
  const paidTotalsByJob = new Map<string, number>();
  if (jobIds.length > 0) {
    const jobPh = jobIds.map(() => '?').join(',');
    const [partsRows] = await pool.execute<any[]>(`SELECT repair_job_id, SUM(total) AS total FROM repair_job_parts WHERE repair_job_id IN (${jobPh}) GROUP BY repair_job_id`, jobIds);
    for (const r of partsRows as any[]) partsTotalsByJob.set(r.repair_job_id, Number(r.total) || 0);
    const [paymentRows] = await pool.execute<any[]>(`SELECT repair_job_id, SUM(amount) AS total FROM repair_job_payments WHERE repair_job_id IN (${jobPh}) GROUP BY repair_job_id`, jobIds);
    for (const r of paymentRows as any[]) paidTotalsByJob.set(r.repair_job_id, Number(r.total) || 0);
  }
  const [saleRows] = await pool.execute<any[]>(
    `SELECT customer_id, mobile, grand_total, amount_paid, balance_due, created_at, order_status FROM sales_orders WHERE user_email = ? AND (customer_id IN (${idPh}) OR mobile IN (${mobilePh}))`,
    [email, ...ids, ...mobiles]
  );
  const [orderRows] = await pool.execute<any[]>(
    `SELECT customer_id, total_amount, balance_due, created_at FROM customer_orders WHERE user_email = ? AND customer_id IN (${idPh})`,
    [email, ...ids]
  );
  // SELECT * (not a column list): source_ref only exists once migration 020
  // has run, and naming it would break this whole screen before that.
  const [invoiceRows] = await pool.execute<any[]>(`SELECT * FROM invoices WHERE user_email = ? AND (customer_id IN (${idPh}) OR mobile IN (${mobilePh}))`, [email, ...ids, ...mobiles]);

  type Agg = { totalRepairs: number; activeRepairs: number; completedRepairs: number; totalPurchases: number; totalOrders: number; pendingAmount: number; lastActivity: string | null };
  const byKey = new Map<string, Agg>();
  const ensure = (key: string): Agg => {
    let a = byKey.get(key);
    if (!a) { a = { totalRepairs: 0, activeRepairs: 0, completedRepairs: 0, totalPurchases: 0, totalOrders: 0, pendingAmount: 0, lastActivity: null }; byKey.set(key, a); }
    return a;
  };
  const bump = (a: Agg, ts: string | null | undefined) => { if (ts && (!a.lastActivity || new Date(ts).getTime() > new Date(a.lastActivity).getTime())) a.lastActivity = ts; };
  const keysFor = (c: any) => [c.id, c.mobile].filter(Boolean) as string[];
  const byId = new Map(customers.map(c => [c.id, c]));
  const byMobile = new Map(customers.filter(c => c.mobile).map(c => [c.mobile, c]));

  for (const j of jobRows as any[]) {
    const c = byMobile.get(j.mobile); if (!c) continue;
    for (const key of keysFor(c)) {
      const a = ensure(key);
      a.totalRepairs += 1;
      if (j.status === 'Delivered') a.completedRepairs += 1; else if (j.status !== 'Cancelled') a.activeRepairs += 1;
      const total = (partsTotalsByJob.get(j.id) || 0) + Number(j.labour_charges || 0) + Number(j.other_charges || 0) - Number(j.discount || 0);
      const paid = paidTotalsByJob.get(j.id) || 0;
      if (total - paid > 0) a.pendingAmount += total - paid;
      bump(a, j.updated_at || j.created_at);
    }
  }
  for (const s of saleRows as any[]) {
    if (!isActiveSale(normalizeSaleStatus(s.order_status))) continue;
    const c = (s.customer_id && byId.get(s.customer_id)) || byMobile.get(s.mobile); if (!c) continue;
    for (const key of keysFor(c)) {
      const a = ensure(key);
      a.totalPurchases += 1;
      if (Number(s.balance_due) > 0) a.pendingAmount += Number(s.balance_due);
      bump(a, s.created_at);
    }
  }
  for (const o of orderRows as any[]) {
    const c = byId.get(o.customer_id); if (!c) continue;
    for (const key of keysFor(c)) {
      const a = ensure(key);
      a.totalOrders += 1;
      if (Number(o.balance_due) > 0) a.pendingAmount += Number(o.balance_due);
      bump(a, o.created_at);
    }
  }
  for (const inv of invoiceRows as any[]) {
    if (typeof inv.source_ref === 'string' && inv.source_ref.startsWith('sale:')) continue;
    const c = (inv.customer_id && byId.get(inv.customer_id)) || byMobile.get(inv.mobile); if (!c) continue;
    for (const key of keysFor(c)) {
      const a = ensure(key);
      if (inv.payment_status && inv.payment_status !== 'Paid') a.pendingAmount += Number(inv.grand_total) || 0;
      bump(a, inv.timestamp);
    }
  }

  return customers.map(c => {
    // `keysFor(c)` above always includes c.id, so every matched event already
    // bumped the id-keyed Agg directly — it alone already holds this
    // customer's full totals, with no separate mobile-keyed merge needed.
    const a = ensure(c.id);
    return {
      ...c,
      totalRepairs: a.totalRepairs, activeRepairs: a.activeRepairs, completedRepairs: a.completedRepairs,
      totalPurchases: a.totalPurchases + a.totalOrders,
      pendingAmount: Math.round(a.pendingAmount * 100) / 100,
      lastActivity: a.lastActivity || c.createdAt,
    };
  });
}

// Full, unpaginated list — kept for CSV export and any caller that
// genuinely needs every row (never used for interactive search/browsing).
export async function listCustomersWithStats(email: string) {
  const pool = getPool();
  const [customerRows] = await pool.execute<any[]>('SELECT * FROM customers WHERE user_email = ? AND merged_into IS NULL ORDER BY created_at DESC', [email]);
  const customers = (customerRows as any[]).map(customerRowToObject);
  if (customers.length === 0) return [];
  return attachCustomerStats(email, customers);
}

export async function getCustomerById(email: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM customers WHERE id = ? AND user_email = ? LIMIT 1', [id, email]);
  const row = (rows as any[])[0];
  return row ? customerRowToObject(row) : null;
}

// ------------------------------------------------------------ duplicate check

// Checked against mobile, alternate mobile, WhatsApp number, email and
// GSTIN — any one match is surfaced as a "possible existing customer," never
// silently blocking or silently creating a duplicate (spec: show the
// candidate, let the admin choose).
export async function findPossibleDuplicates(email: string, data: { mobile?: string; whatsappNumber?: string; email?: string; gstin?: string }, excludeId?: string) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  if (data.mobile) { conditions.push('mobile = ? OR alternate_mobile = ? OR whatsapp_number = ?'); params.push(data.mobile, data.mobile, data.mobile); }
  if (data.whatsappNumber) { conditions.push('whatsapp_number = ? OR mobile = ?'); params.push(data.whatsappNumber, data.whatsappNumber); }
  if (data.email) { conditions.push('email = ?'); params.push(data.email); }
  if (data.gstin) { conditions.push('gstin = ?'); params.push(data.gstin); }
  if (conditions.length === 0) return [];

  const [rows] = await pool.execute<any[]>(
    `SELECT * FROM customers WHERE user_email = ? AND merged_into IS NULL AND (${conditions.join(' OR ')})`,
    [email, ...params]
  );
  return (rows as any[]).filter(r => r.id !== excludeId).map(customerRowToObject);
}

// ------------------------------------------------------------------- create

export interface CustomerActor { label: string }

export async function createCustomer(email: string, data: any, actor: CustomerActor, opts: { force?: boolean } = {}) {
  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new CustomerError('Customer name is required.');
  }
  if (!data?.mobile || typeof data.mobile !== 'string' || !/^[0-9]{10}$/.test(data.mobile)) {
    throw new CustomerError('A valid 10-digit mobile number is required.');
  }
  if (data.whatsappNumber && !/^[0-9]{10}$/.test(data.whatsappNumber)) {
    throw new CustomerError('WhatsApp number must be a valid 10-digit number.');
  }
  if (data.category && !isValidCustomerCategory(data.category)) {
    throw new CustomerError('Please select a valid category.');
  }
  const category = isValidCustomerCategory(data.category) ? data.category : DEFAULT_CUSTOMER_CATEGORY;

  if (!opts.force) {
    const duplicates = await findPossibleDuplicates(email, { mobile: data.mobile, whatsappNumber: data.whatsappNumber, email: data.email, gstin: data.gstin });
    if (duplicates.length > 0) {
      throw new CustomerError('Possible existing customer found.', 409, duplicates);
    }
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      try {
        const id = await allocateCustomerId(conn, email);
        const now = new Date().toISOString();
        await conn.execute(
          `INSERT INTO customers (id, user_email, name, mobile, alternate_mobile, whatsapp_number, address, city, state, pincode, area,
             email, facebook_id, instagram_id, gstin, date_of_birth, photo, source, status, category, created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?)`,
          [
            id, email, data.name.trim(), data.mobile, data.alternateMobile || null, data.whatsappNumber || null,
            data.address || null, data.city || null, data.state || null, data.pincode || null, data.area || null,
            data.email || null, data.facebookId || null, data.instagramId || null, data.gstin || null, data.dateOfBirth || null, data.photo || null,
            data.status || 'Active', category, actor.label, actor.label, now, now,
          ]
        );
        await writeCustomerAudit(conn, email, id, 'customer_created', actor.label, `${data.name.trim()} (${data.mobile})`);
        await conn.commit();
        return getCustomerById(email, id);
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new CustomerError('Could not generate a unique customer id — please try again.', 409);
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------- update

// Never touches id/source/created_at/created_by — an edit can only ever
// update the same row, it can never fork into a second customer record.
export async function updateCustomer(email: string, id: string, data: any, actor: CustomerActor, opts: { force?: boolean } = {}) {
  const current = await getCustomerById(email, id);
  if (!current) return null;
  if (current.mergedInto) throw new CustomerError('This customer was merged into another record and can no longer be edited.', 409);

  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new CustomerError('Customer name is required.');
  }
  if (!data?.mobile || typeof data.mobile !== 'string' || !/^[0-9]{10}$/.test(data.mobile)) {
    throw new CustomerError('A valid 10-digit mobile number is required.');
  }
  if (data.whatsappNumber && !/^[0-9]{10}$/.test(data.whatsappNumber)) {
    throw new CustomerError('WhatsApp number must be a valid 10-digit number.');
  }
  if (data.category && !isValidCustomerCategory(data.category)) {
    throw new CustomerError('Please select a valid category.');
  }

  const contactChanged = data.mobile !== current.mobile || data.whatsappNumber !== current.whatsappNumber
    || (data.email || '') !== (current.email || '') || (data.gstin || '') !== (current.gstin || '');
  if (contactChanged && !opts.force) {
    const duplicates = await findPossibleDuplicates(email, { mobile: data.mobile, whatsappNumber: data.whatsappNumber, email: data.email, gstin: data.gstin }, id);
    if (duplicates.length > 0) throw new CustomerError('Possible existing customer found.', 409, duplicates);
  }

  const pool = getPool();
  const now = new Date().toISOString();
  const merged = { ...current, ...data };
  await pool.execute(
    `UPDATE customers SET name = ?, mobile = ?, alternate_mobile = ?, whatsapp_number = ?, address = ?, city = ?, state = ?, pincode = ?, area = ?,
       email = ?, facebook_id = ?, instagram_id = ?, gstin = ?, date_of_birth = ?, photo = ?, status = ?, category = ?, updated_by = ?, updated_at = ?
     WHERE id = ? AND user_email = ?`,
    [
      merged.name || null, merged.mobile || null, merged.alternateMobile || null, merged.whatsappNumber || null,
      merged.address || null, merged.city || null, merged.state || null, merged.pincode || null, merged.area || null,
      merged.email || null, merged.facebookId || null, merged.instagramId || null, merged.gstin || null, merged.dateOfBirth || null, merged.photo || null,
      merged.status || 'Active', isValidCustomerCategory(merged.category) ? merged.category : DEFAULT_CUSTOMER_CATEGORY, actor.label, now, id, email,
    ]
  );
  const pool2 = getPool();
  const conn = await pool2.getConnection();
  try {
    await writeCustomerAudit(conn, email, id, 'customer_updated', actor.label, `${merged.name} (${merged.mobile})`);
  } finally {
    conn.release();
  }
  return getCustomerById(email, id);
}

// ------------------------------------------------------------------- delete

// Never cascade-deletes real business history. A customer with any repair
// job, online booking, sales order, order, invoice or wallet transaction
// under their mobile/customer id is deactivated (status = 'Inactive')
// instead of removed — every one of those records stays exactly as it was.
// Only a customer with zero related records anywhere is actually deleted.
export async function deactivateOrDeleteCustomer(email: string, id: string, actor: CustomerActor): Promise<{ deleted: boolean; deactivated: boolean }> {
  const customer = await getCustomerById(email, id);
  if (!customer) throw new CustomerError('Customer not found.', 404);
  if (customer.mergedInto) throw new CustomerError('This customer was already merged into another record.', 409);

  const pool = getPool();
  let relatedCount = 0;
  const checks: [string, any[]][] = [];
  if (customer.mobile) {
    checks.push(
      ['SELECT COUNT(*) AS c FROM repair_jobs WHERE user_email = ? AND mobile = ?', [email, customer.mobile]],
      ['SELECT COUNT(*) AS c FROM online_bookings WHERE user_email = ? AND customer_mobile = ?', [email, customer.mobile]],
    );
  }
  checks.push(
    ['SELECT COUNT(*) AS c FROM sales_orders WHERE user_email = ? AND (customer_id = ? OR mobile = ?)', [email, id, customer.mobile || '']],
    ['SELECT COUNT(*) AS c FROM invoices WHERE user_email = ? AND (customer_id = ? OR mobile = ?)', [email, id, customer.mobile || '']],
    ['SELECT COUNT(*) AS c FROM wallet_transactions WHERE user_email = ? AND customer_id = ?', [email, id]],
  );
  for (const [sql, params] of checks) {
    const [rows] = await pool.execute<any[]>(sql, params);
    relatedCount += Number((rows as any[])[0]?.c || 0);
  }
  // Orders (migration 020) — tolerates the table not existing yet on an
  // un-migrated database.
  try {
    const [rows] = await pool.execute<any[]>('SELECT COUNT(*) AS c FROM customer_orders WHERE user_email = ? AND customer_id = ?', [email, id]);
    relatedCount += Number((rows as any[])[0]?.c || 0);
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  const conn = await pool.getConnection();
  try {
    if (relatedCount > 0) {
      await pool.execute('UPDATE customers SET status = ?, updated_by = ?, updated_at = ? WHERE id = ? AND user_email = ?', ['Inactive', actor.label, new Date().toISOString(), id, email]);
      await writeCustomerAudit(conn, email, id, 'customer_deactivated', actor.label, `${relatedCount} linked record(s) preserved`);
      return { deleted: false, deactivated: true };
    }
    await writeCustomerAudit(conn, email, id, 'customer_deleted', actor.label, `${customer.name} (${customer.mobile})`);
    await pool.execute('DELETE FROM customers WHERE id = ? AND user_email = ?', [id, email]);
    return { deleted: true, deactivated: false };
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------------- merge

// Moves every Sales/Orders/Repair Jobs/Invoices/Wallet/Online Booking/Notes
// row that points at the duplicate over to the primary, marks the duplicate
// `Merged` + `merged_into`, and writes an audit entry on BOTH records — never
// a destructive delete of any transaction history. One transaction: either
// every table is repointed or none of them are.
export async function mergeCustomers(email: string, primaryId: string, duplicateId: string, actor: CustomerActor) {
  if (primaryId === duplicateId) throw new CustomerError('Choose two different customers to merge.');
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<any[]>(
      'SELECT * FROM customers WHERE user_email = ? AND id IN (?, ?) FOR UPDATE',
      [email, primaryId, duplicateId]
    );
    const primary = (rows as any[]).find(r => r.id === primaryId);
    const duplicate = (rows as any[]).find(r => r.id === duplicateId);
    if (!primary) throw new CustomerError('Primary customer not found.', 404);
    if (!duplicate) throw new CustomerError('Duplicate customer not found.', 404);
    if (primary.merged_into) throw new CustomerError('The chosen primary customer was itself merged into another record — pick that one instead.', 409);
    if (duplicate.merged_into) throw new CustomerError('This customer has already been merged.', 409);

    const reassign = async (sql: string) => { await conn.execute(sql, [primaryId, email, duplicateId]); };
    await reassign('UPDATE sales_orders SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE customer_orders SET customer_id = ? WHERE user_email = ? AND customer_id = ?').catch((e: any) => { if (e?.code !== 'ER_NO_SUCH_TABLE') throw e; });
    await reassign('UPDATE invoices SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE wallet_transactions SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE repair_jobs SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE online_bookings SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE customer_notes SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    await reassign('UPDATE customer_audit_logs SET customer_id = ? WHERE user_email = ? AND customer_id = ?');
    // Mobile-keyed legacy links (repair_jobs/online_bookings rows created
    // before customer_id existed) follow the primary's mobile only when the
    // duplicate's own mobile isn't also the primary's — never touched if
    // they already share one, and never overwrites a row that already has
    // its own distinct, intentionally-different mobile on file.
    if (duplicate.mobile && primary.mobile && duplicate.mobile !== primary.mobile) {
      await conn.execute('UPDATE repair_jobs SET mobile = ? WHERE user_email = ? AND mobile = ?', [primary.mobile, email, duplicate.mobile]);
      await conn.execute('UPDATE online_bookings SET customer_mobile = ? WHERE user_email = ? AND customer_mobile = ?', [primary.mobile, email, duplicate.mobile]);
      await conn.execute('UPDATE sales_orders SET mobile = ? WHERE user_email = ? AND mobile = ? AND customer_id = ?', [primary.mobile, email, duplicate.mobile, primaryId]);
      await conn.execute('UPDATE invoices SET mobile = ? WHERE user_email = ? AND mobile = ? AND customer_id = ?', [primary.mobile, email, duplicate.mobile, primaryId]);
    }

    const now = new Date().toISOString();
    await conn.execute('UPDATE customers SET status = ?, merged_into = ?, updated_by = ?, updated_at = ? WHERE id = ? AND user_email = ?', ['Merged', primaryId, actor.label, now, duplicateId, email]);
    await writeCustomerAudit(conn, email, primaryId, 'customer_merged', actor.label, `Merged ${duplicateId} (${duplicate.name}) into this record`, duplicateId);
    await writeCustomerAudit(conn, email, duplicateId, 'customer_merged_away', actor.label, `Merged into ${primaryId} (${primary.name})`, primaryId);

    await conn.commit();
    return getCustomerById(email, primaryId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------- notes

export async function listCustomerNotes(email: string, customerId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM customer_notes WHERE user_email = ? AND customer_id = ? ORDER BY created_at DESC',
    [email, customerId]
  );
  return (rows as any[]).map(r => ({ id: r.id, note: r.note, createdBy: r.created_by, createdAt: r.created_at }));
}

export async function addCustomerNote(email: string, customerId: string, note: string, createdBy?: string) {
  if (!note || !note.trim()) throw new CustomerError('Note text is required.');
  const pool = getPool();
  const id = `CNOTE${Date.now()}`;
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO customer_notes (id, customer_id, user_email, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, customerId, email, note.trim(), createdBy || null, now]
  );
  return { id, note: note.trim(), createdBy: createdBy || null, createdAt: now };
}

// Permission-checked editing/deleting: `createdBy` is compared against the
// requester so a note can always be edited/deleted by the person who wrote
// it, and by anyone with Customer Department delete access (checked by the
// caller — this function itself just performs the write).
export async function editCustomerNote(email: string, noteId: string, note: string) {
  if (!note || !note.trim()) throw new CustomerError('Note text is required.');
  const pool = getPool();
  const [result]: any = await pool.execute('UPDATE customer_notes SET note = ? WHERE id = ? AND user_email = ?', [note.trim(), noteId, email]);
  return result.affectedRows > 0;
}

export async function deleteCustomerNote(email: string, noteId: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM customer_notes WHERE id = ? AND user_email = ?', [noteId, email]);
  return result.affectedRows > 0;
}

// ---------------------------------------------------------------- 360 profile

type TimelineEntry = { type: string; label: string; at: string; note?: string };

// Every profile fetch that follows is only ever triggered by opening one
// customer's profile — never part of the list load above.
export async function getCustomerProfile(email: string, id: string) {
  const customer = await getCustomerById(email, id);
  if (!customer) return null;

  const pool = getPool();
  const mobile = customer.mobile || '';
  const [repairJobs, onlineBookings, salesOrders, invoices, notes, accounts, auditLog, orderRows] = await Promise.all([
    mobile ? listRepairJobsForCustomerMobile(email, mobile) : Promise.resolve([]),
    mobile ? listOnlineBookingsForCustomerMobile(email, mobile) : Promise.resolve([]),
    listSalesOrdersForCustomer(email, id, mobile),
    listInvoicesForCustomer(email, id, mobile),
    listCustomerNotes(email, id),
    listAccountsWithBalances(email),
    listCustomerAuditLog(email, id),
    listCustomerOrdersSafeFor(email, id),
  ]);

  const accountNameById = new Map((accounts as any[]).map(a => [a.id, a.name]));
  const jobsWithTotals = (repairJobs as any[]).map(j => ({
    ...j,
    grandTotal: grandTotal(j),
    totalPaid: totalPaid(j),
    balanceDue: balanceDue(j),
    payments: (j.payments || []).map((p: any) => ({ ...p, accountName: p.accountId ? accountNameById.get(p.accountId) || null : null })),
  }));

  const totalAdvance = jobsWithTotals.reduce((s, j) => s + (Number(j.advancePayment) || 0), 0);

  const activeSales = (salesOrders as any[]).filter(o => isActiveSale(normalizeSaleStatus(o.orderStatus)));
  const standaloneInvoices = (invoices as any[]).filter(i => !(typeof i.sourceRef === 'string' && i.sourceRef.startsWith('sale:')));
  const totalSales = activeSales.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
  const totalOrdersAmount = (orderRows as any[]).reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const totalBilling = standaloneInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0)
    + jobsWithTotals.reduce((s, j) => s + j.grandTotal, 0) + totalSales + totalOrdersAmount;
  const totalPaidAll = jobsWithTotals.reduce((s, j) => s + j.totalPaid, 0)
    + activeSales.reduce((s, o) => s + (Number(o.amountPaid) || 0), 0)
    + (orderRows as any[]).reduce((s, o) => s + (Number(o.amountPaid) || 0), 0)
    + standaloneInvoices.reduce((s, i) => s + (i.paymentStatus === 'Paid' ? (Number(i.grandTotal) || 0) : 0), 0);
  const totalDue = Math.max(0, totalBilling - totalPaidAll);

  // Products Purchased — distinct product/model lines across Sales, Orders
  // and repair-job parts, each with the total quantity/spend under this
  // customer. Purely a read-side rollup of data already loaded above.
  const productMap = new Map<string, { product: string; quantity: number; amount: number }>();
  const bumpProduct = (name: string, qty: number, amount: number) => {
    if (!name) return;
    const cur = productMap.get(name) || { product: name, quantity: 0, amount: 0 };
    cur.quantity += qty; cur.amount += amount;
    productMap.set(name, cur);
  };
  for (const o of activeSales) bumpProduct(`${o.brand || ''} ${o.model || ''}`.trim() || o.productId || 'Product', Number(o.quantity) || 1, Number(o.grandTotal) || 0);
  for (const o of orderRows as any[]) bumpProduct(`${o.brand || ''} ${o.model || ''}`.trim() || o.productName || 'Product', Number(o.quantity) || 1, Number(o.totalAmount) || 0);
  for (const j of jobsWithTotals) for (const p of j.parts || []) bumpProduct(p.partName, Number(p.qty) || 1, Number(p.total) || 0);
  const productsPurchased = Array.from(productMap.values()).sort((a, b) => b.amount - a.amount);

  const summary = {
    totalRepairs: jobsWithTotals.length,
    activeRepairs: jobsWithTotals.filter(j => j.status !== 'Delivered' && j.status !== 'Cancelled').length,
    completedRepairs: jobsWithTotals.filter(j => j.status === 'Delivered').length,
    totalOrders: (orderRows as any[]).length,
    totalSales: totalSales + totalOrdersAmount,
    totalPaid: Math.round(totalPaidAll * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    outstandingBalance: Math.round(totalDue * 100) / 100,
    totalAdvance: Math.round(totalAdvance * 100) / 100,
  };

  const timeline: TimelineEntry[] = [];
  if (customer.createdAt) timeline.push({ type: 'customer_created', label: 'Customer Created', at: customer.createdAt });
  for (const b of onlineBookings as any[]) {
    timeline.push({ type: 'booking_submitted', label: `Online Booking ${b.id} Submitted`, at: b.createdAt });
    for (const h of b.statusHistory || []) timeline.push({ type: 'booking_status', label: `Booking ${b.id}: ${h.status}`, at: h.changedAt, note: h.note });
  }
  for (const j of jobsWithTotals) {
    timeline.push({ type: 'job_created', label: `Repair Job ${j.id} Created`, at: j.createdAt });
    if (j.technicianName) timeline.push({ type: 'technician_assigned', label: `${j.technicianName} Assigned to ${j.id}`, at: j.updatedAt });
    for (const h of j.statusHistory || []) timeline.push({ type: 'job_status', label: `${j.id}: ${h.status}`, at: h.changedAt, note: h.note });
    for (const p of j.payments || []) timeline.push({ type: 'payment_received', label: `Payment Received for ${j.id}`, at: p.date, note: `₹${p.amount}` });
  }
  for (const o of activeSales) timeline.push({ type: 'sale_created', label: `Sale ${o.id} Created`, at: o.createdAt, note: `₹${o.grandTotal}` });
  for (const o of orderRows as any[]) {
    timeline.push({ type: 'order_created', label: `Order ${o.id} Created`, at: o.createdAt, note: `₹${o.totalAmount}` });
    if (o.orderStatus === 'DELIVERED') timeline.push({ type: 'order_delivered', label: `Order ${o.id} Delivered`, at: o.updatedAt });
  }
  for (const inv of invoices as any[]) timeline.push({ type: 'invoice_generated', label: `Invoice ${inv.invoiceNumber || inv.id} Generated`, at: inv.timestamp || inv.date });
  timeline.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());

  return {
    customer, summary,
    repairJobs: jobsWithTotals, onlineBookings, salesOrders, orders: orderRows, invoices, notes, timeline, auditLog, productsPurchased,
  };
}

// Sales/Orders/Invoices for a profile are matched by customer_id first
// (authoritative once Sales/Orders/Billing set it) and fall back to mobile
// for older rows that predate customer_id being populated — so a profile's
// history is never missing a record just because of when it was created.
async function listSalesOrdersForCustomer(email: string, customerId: string, mobile: string) {
  const byMobile = mobile ? await listSalesOrdersForMobile(email, mobile) : [];
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT id FROM sales_orders WHERE user_email = ? AND customer_id = ?', [email, customerId]);
  const idsByCustomer = new Set((rows as any[]).map(r => r.id));
  const missing = Array.from(idsByCustomer).filter(id => !byMobile.some((o: any) => o.id === id));
  if (missing.length === 0) return byMobile;
  const { getSale } = await import('./saleRecords');
  const extra = (await Promise.all(missing.map(id => getSale(email, id)))).filter(Boolean);
  return [...byMobile, ...extra];
}

async function listInvoicesForCustomer(email: string, customerId: string, mobile: string) {
  const byMobile = mobile ? await listInvoicesForMobile(email, mobile) : [];
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT id FROM invoices WHERE user_email = ? AND customer_id = ? AND id NOT IN (SELECT id FROM invoices WHERE mobile = ?)', [email, customerId, mobile || '']);
  if ((rows as any[]).length === 0) return byMobile;
  const { listInvoices } = await import('./invoices');
  const all = await listInvoices(email);
  const extraIds = new Set((rows as any[]).map(r => r.id));
  return [...byMobile, ...all.filter((i: any) => extraIds.has(i.id))];
}

async function listCustomerOrdersSafeFor(email: string, customerId: string) {
  try {
    const { listCustomerOrders } = await import('./customerOrders');
    const all = await listCustomerOrders(email);
    return (all as any[]).filter(o => o.customerId === customerId);
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}

// -------------------------------------------------------------------- export

export function customersToCsv(customers: any[]): string {
  const headers = ['Customer ID', 'Name', 'Mobile', 'WhatsApp', 'Email', 'Address', 'GSTIN', 'Total Sales', 'Outstanding', 'Status', 'Created Date'];
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(',')];
  for (const c of customers) {
    lines.push([
      c.id, c.name, c.mobile, c.whatsappNumber || c.mobile, c.email, c.address, c.gstin,
      c.totalPurchases ?? '', c.pendingAmount ?? '', c.status, c.createdAt,
    ].map(esc).join(','));
  }
  return lines.join('\r\n');
}
