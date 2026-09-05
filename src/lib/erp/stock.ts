import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';

const STOCK_COLUMNS: { js: string; sql: string; type?: 'number' | 'json' }[] = [
  { js: 'name', sql: 'name' },
  { js: 'brand', sql: 'brand' },
  { js: 'category', sql: 'category' },
  { js: 'purchasePrice', sql: 'purchase_price', type: 'number' },
  { js: 'sellingPrice', sql: 'selling_price', type: 'number' },
  { js: 'quantity', sql: 'quantity', type: 'number' },
  { js: 'minStockLevel', sql: 'min_stock_level', type: 'number' },
  { js: 'barcode', sql: 'barcode' },
  { js: 'images', sql: 'images', type: 'json' },
  { js: 'lastUpdated', sql: 'last_updated' },
  { js: 'supplierName', sql: 'supplier_name' },
  { js: 'supplierMobile', sql: 'supplier_mobile' },
  { js: 'purchaseDate', sql: 'purchase_date' },
  { js: 'warrantyPeriod', sql: 'warranty_period' },
  { js: 'description', sql: 'description' },
  { js: 'addedBy', sql: 'added_by' },
  { js: 'editedBy', sql: 'edited_by' },
  { js: 'model', sql: 'model' },
  { js: 'screenSize', sql: 'screen_size' },
  { js: 'serialNumber', sql: 'serial_number' },
  { js: 'storeLocation', sql: 'store_location' },
];

const MOVEMENT_COLUMNS = ['date', 'type', 'quantity', 'notes', 'performedBy', 'referenceId', 'customerName'] as const;

function stockRowToObject(row: any, movements: any[]) {
  const obj: any = { id: row.id };
  for (const col of STOCK_COLUMNS) {
    let v = row[col.sql];
    if (col.type === 'json' && typeof v === 'string') { try { v = JSON.parse(v); } catch {} }
    obj[col.js] = v;
  }
  obj.history = movements;
  return obj;
}

function movementRowToObject(row: any) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    quantity: row.quantity,
    notes: row.notes,
    performedBy: row.performed_by,
    referenceId: row.reference_id,
    customerName: row.customer_name,
  };
}

export async function listStockItems(email: string) {
  const pool = getPool();
  const [items] = await pool.execute<any[]>('SELECT * FROM stock_items WHERE user_email = ?', [email]);
  const [movements] = await pool.execute<any[]>(
    `SELECT sm.* FROM stock_movements sm INNER JOIN stock_items si ON sm.stock_item_id = si.id WHERE si.user_email = ?`,
    [email]
  );
  const byItem = new Map<string, any[]>();
  for (const m of movements as any[]) {
    const list = byItem.get(m.stock_item_id) || [];
    list.push(movementRowToObject(m));
    byItem.set(m.stock_item_id, list);
  }
  return (items as any[]).map(row => stockRowToObject(row, byItem.get(row.id) || []));
}

// Upsert semantics matching the app's updateStockItem: create if the id doesn't
// exist, otherwise update — and always replace the movement/history rows with
// whatever array the client sent, since the UI always appends locally and
// resends the whole item.
export async function upsertStockItem(email: string, item: any) {
  if (!item?.id) throw new Error('id is required');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const cols = ['id', 'user_email', ...STOCK_COLUMNS.map(c => c.sql)];
    const values = [item.id, email, ...STOCK_COLUMNS.map(c => {
      let v = item[c.js];
      if (v === undefined) v = null;
      if (c.type === 'json') v = v === null ? null : JSON.stringify(v);
      return v;
    })];
    const updateClause = STOCK_COLUMNS.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
    await conn.execute(
      `INSERT INTO stock_items (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${updateClause}`,
      values
    );

    await conn.execute('DELETE FROM stock_movements WHERE stock_item_id = ?', [item.id]);
    const history = Array.isArray(item.history) ? item.history : [];
    for (const mv of history) {
      await conn.execute(
        `INSERT INTO stock_movements (id, stock_item_id, date, type, quantity, notes, performed_by, reference_id, customer_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mv.id, item.id, mv.date ?? null, mv.type, mv.quantity ?? 0, mv.notes ?? null, mv.performedBy ?? null, mv.referenceId ?? null, mv.customerName ?? null]
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

export async function deleteStockItem(email: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM stock_items WHERE id = ? AND user_email = ?', [id, email]);
  return result.affectedRows > 0;
}

// Used by the invoices/sales-orders transactional routes to decrement
// matching stock quantity within their own transaction/connection.
export async function decrementStockByMatch(conn: PoolConnection, email: string, match: { name?: string; barcode?: string; id?: string }, qty: number) {
  let row: any = null;
  if (match.id) {
    const [rows] = await conn.execute<any[]>('SELECT id, quantity FROM stock_items WHERE id = ? AND user_email = ?', [match.id, email]);
    row = (rows as any[])[0];
  }
  if (!row && (match.name || match.barcode)) {
    const [rows] = await conn.execute<any[]>(
      'SELECT id, quantity FROM stock_items WHERE user_email = ? AND (name = ? OR barcode = ?) LIMIT 1',
      [email, match.name ?? '', match.barcode ?? '']
    );
    row = (rows as any[])[0];
  }
  if (!row) return;
  const newQty = Math.max(0, (row.quantity || 0) - (qty || 0));
  await conn.execute('UPDATE stock_items SET quantity = ?, last_updated = ? WHERE id = ?', [newQty, new Date().toISOString(), row.id]);
}
