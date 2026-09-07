import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getPool } from '@/lib/db';

// One-time, owner-only endpoint to bring the live employees table in line
// with sql/migrations/005_employee_profile_fields_and_roles.sql, which was
// written earlier but never actually applied to production — confirmed live
// by employee creation failing with "Unknown column 'date_of_birth' in
// 'INSERT INTO'". This sandbox has no network path to the live Hostinger
// MySQL (DB_HOST=localhost only resolves correctly from the server itself),
// so the ALTER statements can only run from inside a deployed API route.
//
// Every statement here is additive/widening only — ADD COLUMN IF NOT EXISTS
// with a NULL default, and widening role from VARCHAR(30) to VARCHAR(50).
// None of it drops, renames, or rewrites a single existing value; every
// pre-existing employee row keeps every field it already has, with the two
// new columns simply reading NULL until someone fills them in. Safe to call
// more than once (IF NOT EXISTS / MODIFY COLUMN are both idempotent).
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  if (auth.employeeId) {
    return NextResponse.json({ success: false, error: 'Owner/admin session required.' }, { status: 403 });
  }

  const pool = getPool();
  try {
    const [before]: any = await pool.query('SHOW COLUMNS FROM employees');
    const beforeCols = (before as any[]).map(c => c.Field);

    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(20) NULL");
    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL");
    await pool.query("ALTER TABLE employees MODIFY COLUMN role VARCHAR(50) NULL");

    const [after]: any = await pool.query('SHOW COLUMNS FROM employees');
    const afterCols = (after as any[]).map((c: any) => ({ field: c.Field, type: c.Type, nullable: c.Null }));

    const [countRows]: any = await pool.query('SELECT COUNT(*) as c FROM employees');
    const employeeCount = (countRows as any[])[0]?.c ?? null;

    return NextResponse.json({
      success: true,
      data: {
        columnsBefore: beforeCols,
        columnsAfter: afterCols,
        existingEmployeeRowsPreserved: employeeCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Migration failed' }, { status: 500 });
  }
}
