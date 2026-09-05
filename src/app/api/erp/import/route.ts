import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getPool } from '@/lib/db';
import { rawUpsertEntity } from '@/lib/erp/genericCrud';
import { ENTITIES } from '@/lib/erp/entities';
import { upsertStockItem } from '@/lib/erp/stock';
import { importUpsertRepairCall } from '@/lib/erp/repairCalls';
import { importUpsertInvoice } from '@/lib/erp/invoices';
import { importUpsertRepairJob } from '@/lib/erp/repairJobs';
import { importUpsertSalesOrder, importUpsertSalesInvoice, importUpsertSalesDelivery } from '@/lib/erp/sales';
import { upsertSingleRow } from '@/lib/erp/singleRow';

// Bulk, idempotent upsert of a full client-side snapshot (the exact shape
// read out of gj5_user_<email>_* localStorage keys) into MySQL. Used by both
// the one-time "Migrate to Cloud Database" action and the existing Settings
// "Restore Backup" feature. Safe to call more than once — every write below
// is INSERT ... ON DUPLICATE KEY UPDATE keyed by the record's own id, so a
// retry after a partial failure never creates duplicates. Deliberately does
// NOT re-run any business-logic side effects (stock decrements, wallet
// balance changes) — a restored snapshot's numbers are already final.
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  const email = auth.email;
  try {
    const snapshot = await request.json();
    const pool = getPool();
    const counts: Record<string, number> = {};

    const importArray = async (key: string, fn: (item: any) => Promise<void>) => {
      const arr = Array.isArray(snapshot[key]) ? snapshot[key] : [];
      for (const item of arr) await fn(item);
      counts[key] = arr.length;
    };

    await importArray('calls', (c) => importUpsertRepairCall(email, c));
    await importArray('inquiries', (i) => rawUpsertEntity(ENTITIES.inquiries, email, i));
    await importArray('stock', (s) => upsertStockItem(email, s));
    await importArray('invoices', (i) => importUpsertInvoice(email, i));
    await importArray('employees', (e) => rawUpsertEntity(ENTITIES.employees, email, e));
    await importArray('attendance', (a) => rawUpsertEntity(ENTITIES.attendance, email, a));
    await importArray('salaries', (s) => rawUpsertEntity(ENTITIES.salaries, email, s));
    await importArray('leaves', (l) => rawUpsertEntity(ENTITIES.leaves, email, l));
    await importArray('transportationLogs', (t) => rawUpsertEntity(ENTITIES['transportation-logs'], email, t));
    await importArray('repairJobs', (j) => importUpsertRepairJob(email, j));
    await importArray('salesOrders', (o) => importUpsertSalesOrder(email, o));
    await importArray('salesInvoices', (i) => importUpsertSalesInvoice(email, i));
    await importArray('salesDeliveries', (d) => importUpsertSalesDelivery(email, d));

    await importArray('salesCustomers', async (c: any) => {
      await pool.execute(
        `INSERT INTO customers (id, user_email, name, mobile, address, pincode, email, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sales', ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), mobile=VALUES(mobile), address=VALUES(address), pincode=VALUES(pincode), email=VALUES(email), created_at=VALUES(created_at)`,
        [c.id, email, c.name ?? null, c.mobile ?? null, c.address ?? null, c.pincode ?? null, c.email ?? null, c.createdAt ?? null]
      );
    });

    await importArray('expenses', async (e: any) => {
      await pool.execute(
        `INSERT INTO expenses (id, user_email, amount, category, vendor_name, date, payment_mode, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount), category=VALUES(category), vendor_name=VALUES(vendor_name), date=VALUES(date), payment_mode=VALUES(payment_mode), timestamp=VALUES(timestamp)`,
        [e.id, email, e.amount ?? 0, e.category ?? null, e.vendorName ?? null, e.date ?? null, e.paymentMode ?? null, e.timestamp ?? null]
      );
    });

    await importArray('transactions', async (t: any) => {
      await pool.execute(
        `INSERT INTO wallet_transactions (id, user_email, amount, date, time, type, description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount), date=VALUES(date), time=VALUES(time), type=VALUES(type), description=VALUES(description), metadata=VALUES(metadata)`,
        [t.id, email, t.amount ?? 0, t.date ?? null, t.time ?? null, t.type ?? null, t.description ?? null, t.metadata ? JSON.stringify(t.metadata) : null]
      );
    });

    await importArray('attendanceLinks', async (l: any) => {
      await pool.execute(
        `INSERT INTO attendance_links (id, user_email, token, employee_id, employee_name, mobile, expires_at, used, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE employee_id=VALUES(employee_id), employee_name=VALUES(employee_name), mobile=VALUES(mobile), expires_at=VALUES(expires_at), used=VALUES(used), created_at=VALUES(created_at)`,
        [l.id, email, l.token, l.employeeId ?? null, l.employeeName ?? null, l.mobile ?? null, l.expiresAt, l.used ? 1 : 0, l.createdAt ?? null]
      );
    });

    // Wallet balance is set directly to the snapshot's value (not additive —
    // this is a restore, not a series of transactions to replay).
    if (typeof snapshot.walletBalance === 'number') {
      await pool.execute(
        `INSERT INTO wallet_balance (user_email, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = VALUES(balance)`,
        [email, snapshot.walletBalance]
      );
    }

    if (snapshot.settings) {
      const s = snapshot.settings;
      await upsertSingleRow('system_settings', email, {
        gstEnabled: 'gst_enabled', gstRate: 'gst_rate', whatsappNotifications: 'whatsapp_notifications',
        emailNotifications: 'email_notifications', customerNotifications: 'customer_notifications',
        repairNotifications: 'repair_notifications', salesNotifications: 'sales_notifications',
        invoiceNotifications: 'invoice_notifications', deliveryNotifications: 'delivery_notifications',
        warrantyNotifications: 'warranty_notifications', soundNotifications: 'sound_notifications',
        autoNotifications: 'auto_notifications', autoBackup: 'auto_backup', smsNotifications: 'sms_notifications',
        deletePassword: 'delete_password', invoicePrefix: 'invoice_prefix', customerIdPrefix: 'customer_id_prefix',
        defaultWarrantyDuration: 'default_warranty_duration', defaultPickupRequired: 'default_pickup_required',
        defaultMinStockLevel: 'default_min_stock_level', defaultPaymentMode: 'default_payment_mode',
        defaultDueDays: 'default_due_days', warrantyExpiringSoonDays: 'warranty_expiring_soon_days',
        standardCheckInTime: 'standard_check_in_time', lateThresholdMinutes: 'late_threshold_minutes',
      }, [], s);
    }

    if (snapshot.backupMeta) {
      await upsertSingleRow('backup_meta', email, { lastBackupAt: 'last_backup_at', status: 'status', recordCounts: 'record_counts' }, ['recordCounts'], snapshot.backupMeta);
    }

    return NextResponse.json({ success: true, counts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
