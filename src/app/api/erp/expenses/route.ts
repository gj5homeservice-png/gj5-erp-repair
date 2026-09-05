import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getPool } from '@/lib/db';
import { applyWalletDelta } from '@/lib/erp/wallet';

function rowToObject(row: any) {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    vendorName: row.vendor_name,
    date: row.date,
    paymentMode: row.payment_mode,
    timestamp: row.timestamp,
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const pool = getPool();
    const [rows] = await pool.execute<any[]>('SELECT * FROM expenses WHERE user_email = ?', [auth.email]);
    return NextResponse.json({ success: true, data: (rows as any[]).map(rowToObject) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Mirrors use-erp-store.ts's addExpense: insert the expense, create a matching
// wallet transaction (TX-EXP-<id>), and decrement the wallet balance — one
// DB transaction.
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const exp = await request.json();
    if (!exp?.id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO expenses (id, user_email, amount, category, vendor_name, date, payment_mode, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [exp.id, auth.email, exp.amount ?? 0, exp.category ?? null, exp.vendorName ?? null, exp.date ?? null, exp.paymentMode ?? null, exp.timestamp ?? null]
      );
      await conn.execute(
        `INSERT INTO wallet_transactions (id, user_email, amount, date, time, type, description)
         VALUES (?, ?, ?, ?, ?, 'EXPENSE', ?)`,
        [`TX-EXP-${exp.id}`, auth.email, exp.amount ?? 0, new Date().toISOString().split('T')[0], new Date().toLocaleTimeString(), `Expense: ${exp.category} - ${exp.vendorName}`]
      );
      await applyWalletDelta(conn, auth.email, -(exp.amount ?? 0));
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
