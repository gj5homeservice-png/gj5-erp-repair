import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';

const JOB_COLUMNS: { js: string; sql: string; type?: 'json' | 'number' }[] = [
  { js: 'customerName', sql: 'customer_name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'email', sql: 'email' },
  { js: 'address', sql: 'address' },
  { js: 'customerId', sql: 'customer_id' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'techTags', sql: 'tech_tags', type: 'json' },
  { js: 'photos', sql: 'photos', type: 'json' },
  { js: 'storeLocation', sql: 'store_location' },
  { js: 'warrantyDuration', sql: 'warranty_duration' },
  { js: 'warrantyExpiry', sql: 'warranty_expiry' },
  { js: 'productType', sql: 'product_type' },
  { js: 'brand', sql: 'brand' },
  { js: 'model', sql: 'model' },
  { js: 'serialNumber', sql: 'serial_number' },
  { js: 'productSize', sql: 'product_size' },
  { js: 'problemDescription', sql: 'problem_description' },
  { js: 'customerNotes', sql: 'customer_notes' },
  { js: 'technicianId', sql: 'technician_id' },
  { js: 'technicianName', sql: 'technician_name' },
  { js: 'receivedDate', sql: 'received_date' },
  { js: 'expectedDeliveryDate', sql: 'expected_delivery_date' },
  { js: 'estimatedCost', sql: 'estimated_cost', type: 'number' },
  { js: 'advancePayment', sql: 'advance_payment', type: 'number' },
  { js: 'status', sql: 'status' },
  { js: 'labourCharges', sql: 'labour_charges', type: 'number' },
  { js: 'otherCharges', sql: 'other_charges', type: 'number' },
  { js: 'discount', sql: 'discount', type: 'number' },
  { js: 'createdAt', sql: 'created_at' },
  { js: 'updatedAt', sql: 'updated_at' },
];

function jobValues(job: any) {
  return JOB_COLUMNS.map(c => {
    let v = job[c.js];
    if (v === undefined) v = null;
    if (c.type === 'json') v = v === null ? null : JSON.stringify(v);
    return v;
  });
}

function jobRowToObject(row: any, children: { parts: any[]; payments: any[]; notes: any[]; statusHistory: any[]; notifications: any[] }) {
  const obj: any = { id: row.id };
  for (const col of JOB_COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'json' && typeof v === 'string') { try { v = JSON.parse(v); } catch {} }
    obj[col.js] = v;
  }
  obj.parts = children.parts;
  obj.payments = children.payments;
  obj.notesLog = children.notes;
  obj.statusHistory = children.statusHistory;
  obj.notifications = children.notifications;
  return obj;
}

function partRow(r: any) { return { id: r.id, partName: r.part_name, partId: r.part_id, qty: r.qty, purchaseCost: r.purchase_cost, sellingPrice: r.selling_price, total: r.total, notes: r.notes }; }
function paymentRow(r: any) { return { id: r.id, date: r.date, amount: r.amount, method: r.method, notes: r.notes }; }
function noteRow(r: any) { return { id: r.id, date: r.date, text: r.text }; }
function statusRow(r: any) { return { id: r.id, status: r.status, changedAt: r.changed_at, note: r.note }; }
function notifRow(r: any) { return { id: r.id, trigger: r.trigger_type, message: r.message, sentAt: r.sent_at }; }

// Shared by every read path (full-list for the ERP, and the customer-scoped
// reads below) so the child-table join logic exists exactly once.
async function hydrateJobs(email: string, jobs: any[]) {
  if (jobs.length === 0) return [];
  const jobIds = jobs.map(j => j.id);
  const placeholders = jobIds.map(() => '?').join(',');

  const pool = getPool();
  const [parts] = await pool.execute<any[]>(`SELECT * FROM repair_job_parts WHERE repair_job_id IN (${placeholders})`, jobIds);
  const [payments] = await pool.execute<any[]>(`SELECT * FROM repair_job_payments WHERE repair_job_id IN (${placeholders})`, jobIds);
  const [notes] = await pool.execute<any[]>(`SELECT * FROM repair_job_notes WHERE repair_job_id IN (${placeholders})`, jobIds);
  const [statusHistory] = await pool.execute<any[]>(`SELECT * FROM repair_job_status_history WHERE repair_job_id IN (${placeholders})`, jobIds);
  const [notifications] = await pool.execute<any[]>(`SELECT * FROM repair_job_notifications WHERE repair_job_id IN (${placeholders})`, jobIds);

  const group = (rows: any[], mapper: (r: any) => any) => {
    const byJob = new Map<string, any[]>();
    for (const r of rows) {
      const list = byJob.get(r.repair_job_id) || [];
      list.push(mapper(r));
      byJob.set(r.repair_job_id, list);
    }
    return byJob;
  };
  const partsByJob = group(parts as any[], partRow);
  const paymentsByJob = group(payments as any[], paymentRow);
  const notesByJob = group(notes as any[], noteRow);
  const statusByJob = group(statusHistory as any[], statusRow);
  const notifByJob = group(notifications as any[], notifRow);

  return jobs.map(row => jobRowToObject(row, {
    parts: partsByJob.get(row.id) || [],
    payments: paymentsByJob.get(row.id) || [],
    notes: notesByJob.get(row.id) || [],
    statusHistory: statusByJob.get(row.id) || [],
    notifications: notifByJob.get(row.id) || [],
  }));
}

export async function listRepairJobs(email: string) {
  const pool = getPool();
  const [jobs] = await pool.execute<any[]>('SELECT * FROM repair_jobs WHERE user_email = ?', [email]);
  return hydrateJobs(email, jobs as any[]);
}

// Customer-portal read: scoped by BOTH tenant email and the customer's own
// mobile number — a customer only ever sees jobs matching their own mobile,
// resolved server-side from their session/account, never from anything the
// client could supply.
export async function listRepairJobsForCustomerMobile(email: string, mobile: string) {
  const pool = getPool();
  const [jobs] = await pool.execute<any[]>('SELECT * FROM repair_jobs WHERE user_email = ? AND mobile = ?', [email, mobile]);
  return hydrateJobs(email, jobs as any[]);
}

// Single-job customer read — returns null (never the row) if the job
// exists but belongs to a different mobile number, so a customer can never
// probe for another customer's repair by guessing/incrementing an id.
export async function getRepairJobForCustomerMobile(email: string, id: string, mobile: string) {
  const pool = getPool();
  const [jobs] = await pool.execute<any[]>('SELECT * FROM repair_jobs WHERE id = ? AND user_email = ? AND mobile = ?', [id, email, mobile]);
  const rows = jobs as any[];
  if (rows.length === 0) return null;
  const hydrated = await hydrateJobs(email, rows);
  return hydrated[0] || null;
}

async function replaceChildren(conn: PoolConnection, jobId: string, job: any) {
  await conn.execute('DELETE FROM repair_job_parts WHERE repair_job_id = ?', [jobId]);
  for (const p of Array.isArray(job.parts) ? job.parts : []) {
    await conn.execute(
      `INSERT INTO repair_job_parts (id, repair_job_id, part_name, part_id, qty, purchase_cost, selling_price, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, jobId, p.partName ?? null, p.partId ?? null, p.qty ?? 0, p.purchaseCost ?? 0, p.sellingPrice ?? 0, p.total ?? 0, p.notes ?? null]
    );
  }
  await conn.execute('DELETE FROM repair_job_payments WHERE repair_job_id = ?', [jobId]);
  for (const p of Array.isArray(job.payments) ? job.payments : []) {
    await conn.execute(
      `INSERT INTO repair_job_payments (id, repair_job_id, date, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, jobId, p.date ?? null, p.amount ?? 0, p.method ?? null, p.notes ?? null]
    );
  }
  await conn.execute('DELETE FROM repair_job_notes WHERE repair_job_id = ?', [jobId]);
  for (const n of Array.isArray(job.notesLog) ? job.notesLog : []) {
    await conn.execute(`INSERT INTO repair_job_notes (id, repair_job_id, date, text) VALUES (?, ?, ?, ?)`, [n.id, jobId, n.date ?? null, n.text ?? null]);
  }
  await conn.execute('DELETE FROM repair_job_status_history WHERE repair_job_id = ?', [jobId]);
  for (const s of Array.isArray(job.statusHistory) ? job.statusHistory : []) {
    await conn.execute(`INSERT INTO repair_job_status_history (id, repair_job_id, status, changed_at, note) VALUES (?, ?, ?, ?, ?)`, [s.id, jobId, s.status ?? null, s.changedAt ?? null, s.note ?? null]);
  }
  await conn.execute('DELETE FROM repair_job_notifications WHERE repair_job_id = ?', [jobId]);
  for (const n of Array.isArray(job.notifications) ? job.notifications : []) {
    await conn.execute(`INSERT INTO repair_job_notifications (id, repair_job_id, trigger_type, message, sent_at) VALUES (?, ?, ?, ?, ?)`, [n.id, jobId, n.trigger ?? null, n.message ?? null, n.sentAt ?? null]);
  }
}

// The client never supplies an authoritative id here — any `job.id` sent by
// the caller is ignored. Client-side "RJ1001 + array length" style counters
// (see generateRepairJobId in repair-utils.ts) go stale the moment the
// browser's local snapshot lags the database even slightly — a second tab, a
// second device, or simply creating two jobs before the first optimistic
// update has settled all reproduce the exact same next id and crash the
// insert on the primary key. The id is instead computed here from the
// table's own current max, inside the same transaction as the insert, with a
// bounded retry on a duplicate-key race (two genuinely concurrent creates
// both reading the same max before either commits) — so two devices creating
// a job at the same moment still each get a unique id instead of one of them
// failing outright.
async function nextRepairJobId(conn: PoolConnection, email: string): Promise<string> {
  const [rows] = await conn.execute<any[]>(
    `SELECT id FROM repair_jobs WHERE user_email = ? AND id REGEXP '^RJ[0-9]+$' ORDER BY CAST(SUBSTRING(id, 3) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE`,
    [email]
  );
  const last = (rows as any[])[0]?.id as string | undefined;
  const lastNum = last ? parseInt(last.slice(2), 10) : 1000;
  const nextNum = (Number.isFinite(lastNum) ? lastNum : 1000) + 1;
  return `RJ${nextNum}`;
}

// Looks up an existing customer by mobile number (the natural, already-
// indexed dedup key — customers.mobile has no unique constraint, so this is
// a lookup-then-insert rather than a DB-enforced upsert, which is fine at
// this app's scale) and reuses its id; only inserts a new customers row when
// no match exists. Runs in its own short transaction on the same connection
// the job insert will use, so a customer row never gets created without the
// job that triggered it (or vice versa) actually completing.
async function resolveCustomerId(conn: PoolConnection, email: string, job: any): Promise<string | undefined> {
  if (!job.mobile) return job.customerId || undefined;
  await conn.beginTransaction();
  try {
    const [rows] = await conn.execute<any[]>(
      'SELECT id FROM customers WHERE user_email = ? AND mobile = ? LIMIT 1',
      [email, job.mobile]
    );
    const existing = (rows as any[])[0];
    if (existing) {
      await conn.commit();
      return existing.id;
    }
    const newId = `CUST${Date.now()}`;
    await conn.execute(
      'INSERT INTO customers (id, user_email, name, mobile, address, pincode, email, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newId, email, job.customerName || null, job.mobile, job.address || null, job.pincode || null, job.email || null, 'repair', new Date().toISOString()]
    );
    await conn.commit();
    return newId;
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}

export async function createRepairJob(email: string, job: any): Promise<{ id: string; customerId?: string }> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    job.customerId = await resolveCustomerId(conn, email, job);

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      const id = await nextRepairJobId(conn, email);
      try {
        const cols = ['id', 'user_email', ...JOB_COLUMNS.map(c => c.sql)];
        await conn.execute(`INSERT INTO repair_jobs (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, [id, email, ...jobValues(job)]);
        await replaceChildren(conn, id, job);
        await conn.commit();
        return { id, customerId: job.customerId };
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new Error('Could not generate a unique repair job id — please try again.');
  } finally {
    conn.release();
  }
}

export async function updateRepairJob(email: string, id: string, job: any) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const setClause = JOB_COLUMNS.map(c => `${c.sql} = ?`).join(', ');
    const [result]: any = await conn.execute(
      `UPDATE repair_jobs SET ${setClause} WHERE id = ? AND user_email = ?`,
      [...jobValues(job), id, email]
    );
    if (result.affectedRows > 0) {
      await replaceChildren(conn, id, job);
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

// Idempotent upsert used only by the bulk import route.
export async function importUpsertRepairJob(email: string, job: any) {
  if (!job?.id) return;
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...JOB_COLUMNS.map(c => c.sql)];
    const updateClause = JOB_COLUMNS.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
    await conn.execute(
      `INSERT INTO repair_jobs (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${updateClause}`,
      [job.id, email, ...jobValues(job)]
    );
    await replaceChildren(conn, job.id, job);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteRepairJob(email: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM repair_jobs WHERE id = ? AND user_email = ?', [id, email]);
  return result.affectedRows > 0;
}

// Mirrors addRepairJobPayment: inserts the payment row and a matching wallet
// transaction (TX-RJ-<paymentId>) — one transaction.
export async function addRepairJobPayment(email: string, jobId: string, payment: any) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [jobs] = await conn.execute<any[]>('SELECT customer_name FROM repair_jobs WHERE id = ? AND user_email = ?', [jobId, email]);
    const job = (jobs as any[])[0];
    if (!job) {
      await conn.rollback();
      return false;
    }
    await conn.execute(
      `INSERT INTO repair_job_payments (id, repair_job_id, date, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [payment.id, jobId, payment.date ?? null, payment.amount ?? 0, payment.method ?? null, payment.notes ?? null]
    );
    const { applyWalletDelta } = await import('./wallet');
    await conn.execute(
      `INSERT INTO wallet_transactions (id, user_email, amount, date, time, type, description)
       VALUES (?, ?, ?, ?, ?, 'REPAIR_JOB_PAYMENT', ?)`,
      [`TX-RJ-${payment.id}`, email, payment.amount ?? 0, new Date().toISOString().split('T')[0], new Date().toLocaleTimeString(), `Repair payment: ${jobId} - ${job.customer_name}`]
    );
    await applyWalletDelta(conn, email, payment.amount ?? 0);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
