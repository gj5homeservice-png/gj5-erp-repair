import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getSingleRow, upsertSingleRow } from '@/lib/erp/singleRow';

const COLUMNS: Record<string, string> = {
  gstEnabled: 'gst_enabled',
  gstRate: 'gst_rate',
  whatsappNotifications: 'whatsapp_notifications',
  emailNotifications: 'email_notifications',
  customerNotifications: 'customer_notifications',
  repairNotifications: 'repair_notifications',
  salesNotifications: 'sales_notifications',
  invoiceNotifications: 'invoice_notifications',
  deliveryNotifications: 'delivery_notifications',
  warrantyNotifications: 'warranty_notifications',
  soundNotifications: 'sound_notifications',
  autoNotifications: 'auto_notifications',
  autoBackup: 'auto_backup',
  smsNotifications: 'sms_notifications',
  deletePassword: 'delete_password',
  invoicePrefix: 'invoice_prefix',
  customerIdPrefix: 'customer_id_prefix',
  defaultWarrantyDuration: 'default_warranty_duration',
  defaultPickupRequired: 'default_pickup_required',
  defaultMinStockLevel: 'default_min_stock_level',
  defaultPaymentMode: 'default_payment_mode',
  defaultDueDays: 'default_due_days',
  warrantyExpiringSoonDays: 'warranty_expiring_soon_days',
  standardCheckInTime: 'standard_check_in_time',
  lateThresholdMinutes: 'late_threshold_minutes',
  // Persistent cross-device account preferences (logo, theme, WhatsApp
  // dispatch templates) — reuse this same single-row-per-tenant table
  // rather than a new one; see migration 016.
  logoUrl: 'logo_url',
  adminTheme: 'admin_theme',
  transportationTemplates: 'transportation_templates',
};

const BOOLEAN_KEYS = new Set([
  'gstEnabled', 'whatsappNotifications', 'emailNotifications', 'customerNotifications',
  'repairNotifications', 'salesNotifications', 'invoiceNotifications', 'deliveryNotifications',
  'warrantyNotifications', 'soundNotifications', 'autoNotifications', 'autoBackup',
  'smsNotifications', 'defaultPickupRequired',
]);

// mysql2 already auto-parses JSON-typed columns on read (see singleRow.ts);
// only the write side needs to know which columns must be JSON.stringify'd.
const JSON_KEYS = ['transportationTemplates'];

function rowToSettings(row: any) {
  const settings: any = {};
  for (const [js, sql] of Object.entries(COLUMNS)) {
    let v = row[sql];
    if (BOOLEAN_KEYS.has(js)) v = !!v;
    settings[js] = v;
  }
  return settings;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const row = await getSingleRow('system_settings', auth.email);
    if (!row) {
      await upsertSingleRow('system_settings', auth.email, COLUMNS, JSON_KEYS, {});
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data: rowToSettings(row) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const patch = await request.json();
    await upsertSingleRow('system_settings', auth.email, COLUMNS, JSON_KEYS, patch);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
