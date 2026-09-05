import { getPool } from '../db';

// Helper for the small set of tables that hold exactly one row per tenant
// (system_settings, visibility_settings, nav_order, backup_meta, wallet_balance).
// `columns` maps JS field name -> SQL column name; `jsonColumns` lists which
// of those need JSON.stringify on write (mysql2 already auto-parses JSON-typed
// columns on read).

export async function getSingleRow(table: string, email: string): Promise<any | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(`SELECT * FROM ${table} WHERE user_email = ? LIMIT 1`, [email]);
  const row = (rows as any[])[0];
  return row || null;
}

export async function upsertSingleRow(
  table: string,
  email: string,
  columns: Record<string, string>,
  jsonColumns: string[],
  patch: Record<string, any>
): Promise<void> {
  const pool = getPool();
  const jsKeys = Object.keys(columns).filter(k => k in patch);
  if (jsKeys.length === 0) {
    // Ensure a row exists even if called with an empty patch (first-time init).
    await pool.execute(`INSERT IGNORE INTO ${table} (user_email) VALUES (?)`, [email]);
    return;
  }
  const sqlCols = jsKeys.map(k => columns[k]);
  const values = jsKeys.map(k => {
    let v = patch[k];
    if (jsonColumns.includes(k) && v !== null && v !== undefined) v = JSON.stringify(v);
    if (typeof v === 'boolean') v = v ? 1 : 0;
    return v;
  });
  const insertCols = ['user_email', ...sqlCols];
  const insertPlaceholders = insertCols.map(() => '?').join(', ');
  const updateClause = sqlCols.map(c => `${c} = VALUES(${c})`).join(', ');
  await pool.execute(
    `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    [email, ...values]
  );
}
