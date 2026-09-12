import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { createRepairJob } from './repairJobs';

const COLUMNS: { js: string; sql: string; type?: 'number' }[] = [
  { js: 'customerId', sql: 'customer_id' },
  { js: 'customerName', sql: 'customer_name' },
  { js: 'customerMobile', sql: 'customer_mobile' },
  { js: 'customerEmail', sql: 'customer_email' },
  { js: 'address', sql: 'address' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'deviceType', sql: 'device_type' },
  { js: 'brand', sql: 'brand' },
  { js: 'model', sql: 'model' },
  { js: 'problemDescription', sql: 'problem_description' },
  { js: 'preferredDate', sql: 'preferred_date' },
  { js: 'preferredTime', sql: 'preferred_time' },
  { js: 'notes', sql: 'notes' },
  { js: 'priority', sql: 'priority' },
  { js: 'estimatedAmount', sql: 'estimated_amount', type: 'number' },
  { js: 'paymentMethod', sql: 'payment_method' },
  { js: 'paymentStatus', sql: 'payment_status' },
  { js: 'paymentReference', sql: 'payment_reference' },
  { js: 'status', sql: 'status' },
  { js: 'technicianId', sql: 'technician_id' },
  { js: 'technicianName', sql: 'technician_name' },
  { js: 'repairJobId', sql: 'repair_job_id' },
  { js: 'source', sql: 'source' },
  { js: 'rejectionReason', sql: 'rejection_reason' },
  { js: 'cancellationReason', sql: 'cancellation_reason' },
  { js: 'createdAt', sql: 'created_at' },
  { js: 'updatedAt', sql: 'updated_at' },
];

function rowToBooking(row: any, history: any[]): any {
  const obj: any = { id: row.id, userEmail: row.user_email };
  for (const col of COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'number' && v !== null) v = Number(v);
    obj[col.js] = v;
  }
  obj.statusHistory = history;
  return obj;
}

function historyRow(r: any) {
  return { id: r.id, status: r.status, changedAt: r.changed_at, note: r.note || undefined };
}

async function hydrate(bookings: any[]): Promise<any[]> {
  if (bookings.length === 0) return [];
  const pool = getPool();
  const ids = bookings.map(b => b.id);
  const placeholders = ids.map(() => '?').join(',');
  const [historyRows] = await pool.execute<any[]>(
    `SELECT * FROM online_booking_status_history WHERE booking_id IN (${placeholders}) ORDER BY changed_at ASC`,
    ids
  );
  const byBooking = new Map<string, any[]>();
  for (const r of historyRows as any[]) {
    const list = byBooking.get(r.booking_id) || [];
    list.push(historyRow(r));
    byBooking.set(r.booking_id, list);
  }
  return bookings.map(b => rowToBooking(b, byBooking.get(b.id) || []));
}

export async function listOnlineBookings(email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM online_bookings WHERE user_email = ? ORDER BY created_at DESC', [email]);
  return hydrate(rows as any[]);
}

export async function getOnlineBooking(email: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM online_bookings WHERE id = ? AND user_email = ? LIMIT 1', [id, email]);
  const hydrated = await hydrate(rows as any[]);
  return hydrated[0] || null;
}

// Scoped by the customer's own mobile number, resolved server-side — never
// trusts a client-supplied identifier. Mirrors listRepairJobsForCustomerMobile.
export async function listOnlineBookingsForCustomerMobile(email: string, mobile: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM online_bookings WHERE user_email = ? AND customer_mobile = ? ORDER BY created_at DESC', [email, mobile]);
  return hydrate(rows as any[]);
}

export async function getOnlineBookingForCustomerMobile(email: string, id: string, mobile: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM online_bookings WHERE id = ? AND user_email = ? AND customer_mobile = ? LIMIT 1', [id, email, mobile]);
  const hydrated = await hydrate(rows as any[]);
  return hydrated[0] || null;
}

async function nextBookingId(conn: PoolConnection, email: string): Promise<string> {
  const [rows] = await conn.execute<any[]>(
    `SELECT id FROM online_bookings WHERE user_email = ? AND id REGEXP '^OB-[0-9]+$' ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE`,
    [email]
  );
  const last = (rows as any[])[0]?.id as string | undefined;
  const lastNum = last ? parseInt(last.slice(3), 10) : 0;
  const nextNum = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `OB-${String(nextNum).padStart(5, '0')}`;
}

// Public entry point — anyone can submit a booking. `idempotencyKey` is a
// client-generated value (one per form-load): a double-click, a refresh
// after submit, or a browser retry all resend the SAME key, and this
// upserts on it rather than inserting a second row — the original booking
// is returned either way, so the client always shows one consistent result.
export async function createOnlineBooking(email: string, data: any, idempotencyKey?: string): Promise<{ id: string; alreadyExisted: boolean }> {
  const pool = getPool();

  if (idempotencyKey) {
    const [existing] = await pool.execute<any[]>('SELECT id FROM online_bookings WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
    const row = (existing as any[])[0];
    if (row) return { id: row.id, alreadyExisted: true };
  }

  const conn: PoolConnection = await pool.getConnection();
  try {
    const now = new Date().toISOString();
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await conn.beginTransaction();
      const id = await nextBookingId(conn, email);
      try {
        const cols = ['id', 'user_email', ...COLUMNS.map(c => c.sql), 'idempotency_key'];
        const values = [
          id, email,
          ...COLUMNS.map(c => (data[c.js] === undefined ? null : data[c.js])),
          idempotencyKey || null,
        ];
        await conn.execute(`INSERT INTO online_bookings (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
        await conn.execute(
          'INSERT INTO online_booking_status_history (id, booking_id, status, changed_at, note) VALUES (?, ?, ?, ?, ?)',
          [`OBSH-${id}-1`, id, data.status || 'New', now, 'Booking received from website']
        );
        await conn.commit();
        return { id, alreadyExisted: false };
      } catch (err: any) {
        await conn.rollback();
        // A concurrent request with the SAME idempotency key racing this one
        // will hit the unique index — treat that as "already existed" too,
        // rather than retrying into a duplicate.
        if (err?.code === 'ER_DUP_ENTRY' && err?.message?.includes('idempotency') && idempotencyKey) {
          const [race] = await pool.execute<any[]>('SELECT id FROM online_bookings WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
          const row = (race as any[])[0];
          if (row) return { id: row.id, alreadyExisted: true };
        }
        if (err?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new Error('Could not generate a unique booking id — please try again.');
  } finally {
    conn.release();
  }
}

async function appendHistory(conn: PoolConnection, bookingId: string, status: string, note: string | undefined, now: string) {
  const [countRows] = await conn.execute<any[]>('SELECT COUNT(*) as c FROM online_booking_status_history WHERE booking_id = ?', [bookingId]);
  const n = (countRows as any[])[0]?.c || 0;
  await conn.execute(
    'INSERT INTO online_booking_status_history (id, booking_id, status, changed_at, note) VALUES (?, ?, ?, ?, ?)',
    [`OBSH-${bookingId}-${n + 1}`, bookingId, status, now, note || null]
  );
}

// Generic field patch — only columns actually present in `patch` are
// written (a status-only or technician-only update never wipes other
// fields). Never touches repair_job_id — that's exclusively set by convert().
export async function updateOnlineBooking(email: string, id: string, patch: any): Promise<boolean> {
  const pool = getPool();
  const writable = COLUMNS.filter(c => c.js in patch && c.js !== 'repairJobId');
  if (writable.length === 0) return true;
  const now = new Date().toISOString();
  const setClause = [...writable.map(c => `${c.sql} = ?`), 'updated_at = ?'].join(', ');
  const values = [...writable.map(c => patch[c.js]), now, id, email];
  const [result]: any = await pool.execute(`UPDATE online_bookings SET ${setClause} WHERE id = ? AND user_email = ?`, values);
  return result.affectedRows > 0;
}

export async function changeBookingStatus(email: string, id: string, status: string, note?: string, reasonField?: 'rejectionReason' | 'cancellationReason', reason?: string): Promise<boolean> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date().toISOString();
    const reasonCol = reasonField === 'rejectionReason' ? 'rejection_reason' : reasonField === 'cancellationReason' ? 'cancellation_reason' : null;
    const sql = reasonCol
      ? `UPDATE online_bookings SET status = ?, ${reasonCol} = ?, updated_at = ? WHERE id = ? AND user_email = ?`
      : `UPDATE online_bookings SET status = ?, updated_at = ? WHERE id = ? AND user_email = ?`;
    const values = reasonCol ? [status, reason || null, now, id, email] : [status, now, id, email];
    const [result]: any = await conn.execute(sql, values);
    if (result.affectedRows > 0) {
      await appendHistory(conn, id, status, note, now);
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

export async function assignTechnician(email: string, id: string, technicianId: string, technicianName: string, note?: string): Promise<boolean> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date().toISOString();
    const [result]: any = await conn.execute(
      `UPDATE online_bookings SET technician_id = ?, technician_name = ?, status = CASE WHEN status IN ('New','Pending Review','Confirmed') THEN 'Assigned' ELSE status END, updated_at = ? WHERE id = ? AND user_email = ?`,
      [technicianId, technicianName, now, id, email]
    );
    if (result.affectedRows > 0) {
      await appendHistory(conn, id, 'Assigned', note || `Assigned to ${technicianName}`, now);
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

export async function deleteOnlineBooking(email: string, id: string): Promise<boolean> {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM online_bookings WHERE id = ? AND user_email = ?', [id, email]);
  await pool.execute('DELETE FROM online_booking_status_history WHERE booking_id = ?', [id]);
  return result.affectedRows > 0;
}

// The one truly important write path in this file: creates a REAL repair_jobs
// row via the exact same createRepairJob() every other repair-job creation
// path uses (admin's own "New Repair" form included), links it back onto the
// booking, and marks the booking Converted. Refuses to run twice.
//
// Race safety: SELECT ... FOR UPDATE takes a row lock on this booking for
// the lifetime of the transaction, so a second, near-simultaneous convert
// call on the SAME booking blocks on that same SELECT until the first one
// commits — by which point repair_job_id is already set and the second call
// correctly reports "already converted" instead of creating a second job.
// createRepairJob() itself runs on a separate connection/transaction (it
// always has, for every caller), which is fine here specifically because
// the row lock above already serializes any concurrent attempt on this
// booking before either one gets that far.
export async function convertBookingToRepairJob(email: string, id: string): Promise<{ repairJobId: string; alreadyConverted: boolean }> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<any[]>('SELECT * FROM online_bookings WHERE id = ? AND user_email = ? FOR UPDATE', [id, email]);
    const row = (rows as any[])[0];
    if (!row) { await conn.rollback(); throw new Error('Booking not found.'); }
    if (row.repair_job_id) {
      await conn.commit();
      return { repairJobId: row.repair_job_id, alreadyConverted: true };
    }

    const now = new Date().toISOString();
    const job = {
      customerName: row.customer_name,
      mobile: row.customer_mobile,
      email: row.customer_email || undefined,
      address: row.address || undefined,
      pincode: row.pincode || undefined,
      productType: row.device_type,
      brand: row.brand,
      model: row.model || '',
      problemDescription: row.problem_description,
      customerNotes: row.notes || undefined,
      technicianId: row.technician_id || undefined,
      technicianName: row.technician_name || undefined,
      receivedDate: now.slice(0, 10),
      expectedDeliveryDate: undefined,
      estimatedCost: row.estimated_amount ? Number(row.estimated_amount) : 0,
      advancePayment: 0,
      status: 'Received',
      parts: [],
      labourCharges: 0,
      otherCharges: 0,
      discount: 0,
      payments: [],
      notesLog: [],
      statusHistory: [{ id: `SH-conv-${id}`, status: 'Received', changedAt: now, note: `Converted from online booking ${id}` }],
      notifications: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await createRepairJob(email, job);

    await conn.execute(
      `UPDATE online_bookings SET repair_job_id = ?, status = 'Converted', updated_at = ? WHERE id = ? AND user_email = ?`,
      [result.id, now, id, email]
    );
    await appendHistory(conn, id, 'Converted', `Repair Job ${result.id} created`, now);
    await conn.commit();
    return { repairJobId: result.id, alreadyConverted: false };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
