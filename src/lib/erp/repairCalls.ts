import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';

const CALL_COLUMNS: { js: string; sql: string; type?: 'json' | 'boolean' | 'number' }[] = [
  { js: 'customerId', sql: 'customer_id' },
  { js: 'customerName', sql: 'customer_name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'address', sql: 'address' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'category', sql: 'category' },
  { js: 'brand', sql: 'brand' },
  { js: 'model', sql: 'model' },
  { js: 'screenSize', sql: 'screen_size' },
  { js: 'techTags', sql: 'tech_tags', type: 'json' },
  { js: 'intakeMode', sql: 'intake_mode' },
  { js: 'createdAt', sql: 'created_at' },
  { js: 'updatedAt', sql: 'updated_at' },
  { js: 'status', sql: 'status' },
  { js: 'warrantyDuration', sql: 'warranty_duration' },
  { js: 'warrantyExpiry', sql: 'warranty_expiry' },
  { js: 'storeLocation', sql: 'store_location' },
  { js: 'problemDescription', sql: 'problem_description' },
  { js: 'repeatCount', sql: 'repeat_count', type: 'number' },
  { js: 'isOldEntry', sql: 'is_old_entry', type: 'boolean' },
  { js: 'entryDate', sql: 'entry_date' },
  { js: 'receivedDate', sql: 'received_date' },
  { js: 'photos', sql: 'photos', type: 'json' },
];

function callRowToObject(row: any, visitHistory: any[]) {
  const obj: any = { id: row.id };
  for (const col of CALL_COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'boolean') v = !!v;
    if (col.type === 'json' && typeof v === 'string') { try { v = JSON.parse(v); } catch {} }
    obj[col.js] = v;
  }
  obj.visitHistory = visitHistory;
  return obj;
}

function visitRowToObject(row: any) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    complaintDescription: row.complaint_description,
    technicianNotes: row.technician_notes,
    status: row.status,
  };
}

export async function listRepairCalls(email: string) {
  const pool = getPool();
  const [calls] = await pool.execute<any[]>('SELECT * FROM repair_calls WHERE user_email = ?', [email]);
  const [visits] = await pool.execute<any[]>(
    `SELECT v.* FROM repair_call_visit_history v INNER JOIN repair_calls c ON v.repair_call_id = c.id WHERE c.user_email = ?`,
    [email]
  );
  const byCall = new Map<string, any[]>();
  for (const v of visits as any[]) {
    const list = byCall.get(v.repair_call_id) || [];
    list.push(visitRowToObject(v));
    byCall.set(v.repair_call_id, list);
  }
  return (calls as any[]).map(row => callRowToObject(row, byCall.get(row.id) || []));
}

async function replaceVisitHistory(conn: PoolConnection, callId: string, visitHistory: any[]) {
  await conn.execute('DELETE FROM repair_call_visit_history WHERE repair_call_id = ?', [callId]);
  for (const v of Array.isArray(visitHistory) ? visitHistory : []) {
    await conn.execute(
      `INSERT INTO repair_call_visit_history (id, repair_call_id, date, time, complaint_description, technician_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [v.id, callId, v.date ?? null, v.time ?? null, v.complaintDescription ?? null, v.technicianNotes ?? null, v.status ?? null]
    );
  }
}

export async function createRepairCall(email: string, call: any) {
  if (!call?.id) throw new Error('id is required');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...CALL_COLUMNS.map(c => c.sql)];
    const values = [call.id, email, ...CALL_COLUMNS.map(c => {
      let v = call[c.js];
      if (v === undefined) v = null;
      if (c.type === 'json') v = v === null ? null : JSON.stringify(v);
      if (c.type === 'boolean') v = v ? 1 : 0;
      return v;
    })];
    await conn.execute(`INSERT INTO repair_calls (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
    await replaceVisitHistory(conn, call.id, call.visitHistory);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateRepairCall(email: string, id: string, call: any) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const setClause = CALL_COLUMNS.map(c => `${c.sql} = ?`).join(', ');
    const values = [...CALL_COLUMNS.map(c => {
      let v = call[c.js];
      if (v === undefined) v = null;
      if (c.type === 'json') v = v === null ? null : JSON.stringify(v);
      if (c.type === 'boolean') v = v ? 1 : 0;
      return v;
    }), id, email];
    const [result]: any = await conn.execute(
      `UPDATE repair_calls SET ${setClause} WHERE id = ? AND user_email = ?`,
      values
    );
    if (result.affectedRows > 0) {
      await replaceVisitHistory(conn, id, call.visitHistory);
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

// Idempotent upsert used only by the bulk import route — safe to re-run,
// unlike createRepairCall's plain INSERT.
export async function importUpsertRepairCall(email: string, call: any) {
  if (!call?.id) return;
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...CALL_COLUMNS.map(c => c.sql)];
    const values = [call.id, email, ...CALL_COLUMNS.map(c => {
      let v = call[c.js];
      if (v === undefined) v = null;
      if (c.type === 'json') v = v === null ? null : JSON.stringify(v);
      if (c.type === 'boolean') v = v ? 1 : 0;
      return v;
    })];
    const updateClause = CALL_COLUMNS.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
    await conn.execute(
      `INSERT INTO repair_calls (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${updateClause}`,
      values
    );
    await replaceVisitHistory(conn, call.id, call.visitHistory);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteRepairCall(email: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM repair_calls WHERE id = ? AND user_email = ?', [id, email]);
  return result.affectedRows > 0;
}
