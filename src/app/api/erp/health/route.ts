import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Public, unauthenticated diagnostic endpoint. Deliberately does NOT require
// a session token: if the database itself is unreachable, session validation
// would fail too, making an auth-gated healthcheck useless for diagnosing
// exactly that failure. Reveals only pass/fail + safe error codes/messages —
// never the password, never row contents, never the DB host/user values.
//
// This is the direct answer to "verify the production app can actually
// connect to Hostinger MySQL" and "verify the required tables exist" without
// needing shell/log access to the Hostinger server: hit this URL in a browser
// or curl and read the JSON.
const EXPECTED_TABLES = [
  'sessions', 'customers', 'repair_calls', 'repair_call_visit_history',
  'invoices', 'invoice_items', 'stock_items', 'stock_movements',
  'wallet_transactions', 'wallet_balance', 'employees', 'attendance_records',
  'attendance_links', 'salary_records', 'leave_requests', 'inquiries',
  'expenses', 'transportation_logs', 'sales_orders', 'sales_invoices',
  'sales_deliveries', 'repair_jobs', 'repair_job_parts', 'repair_job_payments',
  'repair_job_notes', 'repair_job_status_history', 'repair_job_notifications',
  'system_settings', 'backup_meta', 'visibility_settings', 'nav_order',
];

export async function GET() {
  const env = {
    dbHostSet: !!process.env.DB_HOST,
    dbPortSet: !!process.env.DB_PORT,
    dbUserSet: !!process.env.DB_USER,
    dbPasswordSet: !!process.env.DB_PASSWORD,
    dbNameSet: !!process.env.DB_NAME,
  };

  if (!env.dbHostSet || !env.dbUserSet || !env.dbNameSet) {
    return NextResponse.json({
      success: false,
      env,
      database: { connected: false, error: 'One or more required DB_* environment variables are not set on this deployment.' },
      tables: null,
    }, { status: 503 });
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1 AS ok');

    const [rows] = await pool.query<any[]>(
      'SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    const existing = new Set((rows as any[]).map(r => r.name));
    const missing = EXPECTED_TABLES.filter(t => !existing.has(t));

    return NextResponse.json({
      success: missing.length === 0,
      env,
      database: { connected: true },
      tables: {
        expectedCount: EXPECTED_TABLES.length,
        existingCount: existing.size,
        missing,
      },
    }, { status: missing.length === 0 ? 200 : 500 });
  } catch (err: any) {
    const detail = err?.code ? `${err.code}: ${err?.message || ''}`.trim() : (err?.message || 'Unknown database error');
    return NextResponse.json({
      success: false,
      env,
      database: { connected: false, error: detail },
      tables: null,
    }, { status: 503 });
  }
}
