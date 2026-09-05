import { getPool } from '../db';
import { EntityConfig, ColumnDef } from './entities';

function toSqlValue(col: ColumnDef, body: any) {
  let v = body[col.js];
  if (v === undefined) v = null;
  if (col.type === 'boolean') v = v === null ? null : (v ? 1 : 0);
  if (col.type === 'json') v = v === null ? null : JSON.stringify(v);
  return v;
}

function rowToObject(config: EntityConfig, row: any) {
  const obj: any = { id: row.id };
  for (const col of config.columns) {
    let v = row[col.sql];
    if (col.type === 'boolean') v = v === null || v === undefined ? v : !!v;
    if (col.type === 'json' && typeof v === 'string') {
      try { v = JSON.parse(v); } catch { /* leave as-is */ }
    }
    obj[col.js] = v;
  }
  return obj;
}

export async function listEntity(config: EntityConfig, email: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(`SELECT * FROM ${config.table} WHERE user_email = ?`, [email]);
  return (rows as any[]).map(r => rowToObject(config, r));
}

export async function createEntity(config: EntityConfig, email: string, body: any) {
  if (!body?.id) throw new Error('id is required');
  const pool = getPool();
  const cols = ['id', 'user_email', ...config.columns.map(c => c.sql)];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [body.id, email, ...config.columns.map(c => toSqlValue(c, body))];
  await pool.execute(
    `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${placeholders})`,
    values
  );
  return { id: body.id, ...body };
}

// Partial patch: only columns actually present in `body` are written. This
// matters for callers that intentionally send a subset of fields (e.g. a
// status-only update) — treating every unlisted column as `null` would
// silently wipe the rest of the row.
export async function updateEntity(config: EntityConfig, email: string, id: string, body: any) {
  const pool = getPool();
  const presentCols = config.columns.filter(c => c.js in body);
  if (presentCols.length === 0) return true;
  const setClause = presentCols.map(c => `${c.sql} = ?`).join(', ');
  const values = [...presentCols.map(c => toSqlValue(c, body)), id, email];
  const [result]: any = await pool.execute(
    `UPDATE ${config.table} SET ${setClause} WHERE id = ? AND user_email = ?`,
    values
  );
  return result.affectedRows > 0;
}

// Side-effect-free upsert used only by the bulk import route: writes a row
// exactly as given (no stock decrement, no wallet balance change, no
// auto-created child records) — restoring a historical snapshot must not
// re-trigger business logic that already ran once when the data was created.
export async function rawUpsertEntity(config: EntityConfig, email: string, body: any) {
  if (!body?.id) return;
  const pool = getPool();
  const cols = ['id', 'user_email', ...config.columns.map(c => c.sql)];
  const values = [body.id, email, ...config.columns.map(c => toSqlValue(c, body))];
  const updateClause = config.columns.map(c => `${c.sql} = VALUES(${c.sql})`).join(', ');
  await pool.execute(
    `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    values
  );
}

export async function deleteEntity(config: EntityConfig, email: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute(
    `DELETE FROM ${config.table} WHERE id = ? AND user_email = ?`,
    [id, email]
  );
  return result.affectedRows > 0;
}
