import { getPool } from '../db';
import { listEntity } from './genericCrud';
import { ENTITIES } from './entities';
import { listStockItems } from './stock';
import { listRepairCalls } from './repairCalls';
import { listInvoices } from './invoices';
import { listRepairJobs } from './repairJobs';
import { listEmployees } from './employees';
import { listSalesOrders, listSalesInvoices, listSalesDeliveries } from './sales';
import { getWalletBalance, listWalletTransactions } from './wallet';
import { getSingleRow } from './singleRow';

function expenseRow(r: any) {
  return { id: r.id, amount: r.amount, category: r.category, vendorName: r.vendor_name, date: r.date, paymentMode: r.payment_mode, timestamp: r.timestamp };
}

// Full per-tenant snapshot, shared by GET /api/erp/bootstrap (seeds the
// client's SWR cache) and GET /api/erp/export (backs the Settings "Download
// Backup" feature) — same shape the import route accepts, so export -> import
// round-trips cleanly.
export async function getFullSnapshotData(email: string) {
  const pool = getPool();

  const [
    calls, inquiries, stock, invoices, employees, attendance, salaries, leaves,
    transportationLogs, salesOrders, salesInvoices, salesDeliveries, repairJobs,
    customersRows, expenseRows, walletBalance, transactions,
    settingsRow, visibilityRow, navOrderRow, backupMetaRow, attendanceLinkRows,
  ] = await Promise.all([
    listRepairCalls(email),
    listEntity(ENTITIES.inquiries, email),
    listStockItems(email),
    listInvoices(email),
    listEmployees(email),
    listEntity(ENTITIES.attendance, email),
    listEntity(ENTITIES.salaries, email),
    listEntity(ENTITIES.leaves, email),
    listEntity(ENTITIES['transportation-logs'], email),
    listSalesOrders(email),
    listSalesInvoices(email),
    listSalesDeliveries(email),
    listRepairJobs(email),
    pool.execute<any[]>('SELECT * FROM customers WHERE user_email = ?', [email]).then(([rows]) => rows as any[]),
    pool.execute<any[]>('SELECT * FROM expenses WHERE user_email = ?', [email]).then(([rows]) => rows as any[]),
    getWalletBalance(email),
    listWalletTransactions(email),
    getSingleRow('system_settings', email),
    getSingleRow('visibility_settings', email),
    getSingleRow('nav_order', email),
    getSingleRow('backup_meta', email),
    pool.execute<any[]>('SELECT * FROM attendance_links WHERE user_email = ?', [email]).then(([rows]) => rows as any[]),
  ]);

  const salesCustomers = customersRows.filter(c => c.source === 'sales').map(c => ({
    id: c.id, name: c.name, mobile: c.mobile, address: c.address, pincode: c.pincode, email: c.email, createdAt: c.created_at,
  }));

  const settings = settingsRow ? {
    gstEnabled: !!settingsRow.gst_enabled, gstRate: settingsRow.gst_rate,
    whatsappNotifications: !!settingsRow.whatsapp_notifications, emailNotifications: !!settingsRow.email_notifications,
    customerNotifications: !!settingsRow.customer_notifications, repairNotifications: !!settingsRow.repair_notifications,
    salesNotifications: !!settingsRow.sales_notifications, invoiceNotifications: !!settingsRow.invoice_notifications,
    deliveryNotifications: !!settingsRow.delivery_notifications, warrantyNotifications: !!settingsRow.warranty_notifications,
    soundNotifications: !!settingsRow.sound_notifications, autoNotifications: !!settingsRow.auto_notifications,
    autoBackup: !!settingsRow.auto_backup, smsNotifications: !!settingsRow.sms_notifications,
    deletePassword: settingsRow.delete_password, invoicePrefix: settingsRow.invoice_prefix,
    customerIdPrefix: settingsRow.customer_id_prefix, defaultWarrantyDuration: settingsRow.default_warranty_duration,
    defaultPickupRequired: !!settingsRow.default_pickup_required, defaultMinStockLevel: settingsRow.default_min_stock_level,
    defaultPaymentMode: settingsRow.default_payment_mode, defaultDueDays: settingsRow.default_due_days,
    warrantyExpiringSoonDays: settingsRow.warranty_expiring_soon_days, standardCheckInTime: settingsRow.standard_check_in_time,
    lateThresholdMinutes: settingsRow.late_threshold_minutes,
  } : null;

  return {
    calls, inquiries, stock, invoices, employees, attendance, salaries, leaves,
    transportationLogs, salesOrders, salesInvoices, salesDeliveries, repairJobs,
    salesCustomers, expenses: expenseRows.map(expenseRow), walletBalance, transactions,
    attendanceLinks: attendanceLinkRows.map(r => ({
      id: r.id, token: r.token, employeeId: r.employee_id, employeeName: r.employee_name,
      mobile: r.mobile, expiresAt: r.expires_at, used: !!r.used, createdAt: r.created_at,
    })),
    settings,
    visibility: visibilityRow ? { tabs: visibilityRow.tabs, kpis: visibilityRow.kpis } : null,
    navOrder: navOrderRow ? navOrderRow.order_json : null,
    backupMeta: backupMetaRow ? { lastBackupAt: backupMetaRow.last_backup_at, status: backupMetaRow.status, recordCounts: backupMetaRow.record_counts } : null,
  };
}
