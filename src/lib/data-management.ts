'use client';

import * as XLSX from 'xlsx';
import { differenceInDays, parseISO, isValid } from 'date-fns';

// Maps a user-facing export/import category to the exact array already held
// in useErpStore — no parallel data structure, no fabricated records.
export const RECORD_CATEGORIES: { key: string; label: string }[] = [
  { key: 'calls', label: 'Repairs' },
  { key: 'inquiries', label: 'CRM Inquiries' },
  { key: 'stock', label: 'Products / Stock' },
  { key: 'invoices', label: 'Invoices / Sales' },
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'salaries', label: 'Salary Records' },
  { key: 'transportationLogs', label: 'Logistics' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'transactions', label: 'Payments / Wallet Transactions' },
  { key: 'leaves', label: 'Leave Requests' },
];

// Customers and Warranty records aren't stored as their own collection today —
// they're derived views over Repairs + Invoices. Labelled as such in the UI
// so this stays honest about what's actually persisted vs computed on the fly.
export function deriveCustomers(store: any) {
  const map = new Map<string, any>();
  (store.calls || []).forEach((c: any) => {
    if (!c.customerId) return;
    const existing = map.get(c.customerId) || {};
    map.set(c.customerId, {
      id: c.customerId,
      name: c.customerName || existing.name,
      mobile: c.mobile || existing.mobile,
      address: c.address || existing.address,
      pincode: c.pincode || existing.pincode,
      source: existing.source || 'Repair',
    });
  });
  (store.invoices || []).forEach((inv: any) => {
    if (!inv.customerId) return;
    const existing = map.get(inv.customerId) || {};
    map.set(inv.customerId, {
      id: inv.customerId,
      name: existing.name || inv.customerName,
      mobile: existing.mobile || inv.mobile,
      address: existing.address || inv.address,
      pincode: existing.pincode,
      source: existing.source || 'Invoice',
    });
  });
  return Array.from(map.values());
}

export function getWarrantyStatus(expiryIso?: string, expiringSoonDays = 30): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NONE' {
  if (!expiryIso) return 'NONE';
  const date = parseISO(expiryIso);
  if (!isValid(date)) return 'NONE';
  const days = differenceInDays(date, new Date());
  if (days < 0) return 'EXPIRED';
  if (days <= expiringSoonDays) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function deriveWarrantyRecords(store: any) {
  const threshold = store.settings?.warrantyExpiringSoonDays ?? 30;
  return (store.calls || [])
    .filter((c: any) => !!c.warrantyExpiry)
    .map((c: any) => ({
      id: c.id,
      customerId: c.customerId,
      customerName: c.customerName,
      product: `${c.brand || ''} ${c.model || ''}`.trim(),
      warrantyDuration: c.warrantyDuration,
      warrantyExpiry: c.warrantyExpiry,
      status: getWarrantyStatus(c.warrantyExpiry, threshold),
    }));
}

export function getFullSnapshot(store: any) {
  return {
    meta: { exportedAt: new Date().toISOString(), app: 'GJ5 PLUS ERP', version: 1 },
    calls: store.calls || [],
    inquiries: store.inquiries || [],
    stock: store.stock || [],
    invoices: store.invoices || [],
    employees: store.employees || [],
    attendance: store.attendance || [],
    salaries: store.salaries || [],
    leaves: store.leaves || [],
    attendanceLinks: store.attendanceLinks || [],
    transportationLogs: store.transportationLogs || [],
    expenses: store.expenses || [],
    transactions: store.transactions || [],
    walletBalance: store.walletBalance,
    companyProfile: store.companyProfile || null,
    settings: store.settings || null,
    // Derived, read-only views included for completeness of a full backup:
    customers: deriveCustomers(store),
    warranty: deriveWarrantyRecords(store),
  };
}

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadXLSX(snapshot: Record<string, any>, filename: string) {
  const wb = XLSX.utils.book_new();
  RECORD_CATEGORIES.forEach(({ key, label }) => {
    const rows = snapshot[key];
    if (Array.isArray(rows) && rows.length > 0) {
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, sheet, label.slice(0, 31));
    }
  });
  if (snapshot.customers?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.customers), 'Customers');
  }
  if (snapshot.warranty?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.warranty), 'Warranty');
  }
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ note: 'No records yet' }]), 'Empty');
  }
  XLSX.writeFile(wb, filename);
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  data?: Record<string, any>;
}

export function validateImportFile(raw: string): ImportValidationResult {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, error: 'This file is not valid JSON. Export a backup from this ERP and try again.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Unrecognized file structure — expected a GJ5 ERP backup object.' };
  }
  const hasKnownCollection = RECORD_CATEGORIES.some(c => Array.isArray(parsed[c.key]));
  if (!hasKnownCollection && !parsed.companyProfile && !parsed.settings) {
    return { valid: false, error: 'No recognizable ERP data found in this file.' };
  }
  return { valid: true, data: parsed };
}

export interface CategoryPreview {
  key: string;
  label: string;
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
}

export function computeImportPreview(store: any, incoming: Record<string, any>): CategoryPreview[] {
  const results: CategoryPreview[] = [];
  RECORD_CATEGORIES.forEach(({ key, label }) => {
    const rows = incoming[key];
    if (!Array.isArray(rows)) return;
    const existingIds = new Set((store[key] || []).map((r: any) => r.id));
    let valid = 0, duplicate = 0, invalid = 0;
    rows.forEach((r: any) => {
      if (!r || !r.id) { invalid++; return; }
      if (existingIds.has(r.id)) duplicate++; else valid++;
    });
    results.push({ key, label, total: rows.length, valid, duplicate, invalid });
  });
  return results;
}

// Customers and Warranty have no dedicated collection to merge into on import
// (see deriveCustomers/deriveWarrantyRecords above) — exportable for a complete
// backup, but intentionally excluded from computeImportPreview/import.
export const DERIVED_EXPORT_CATEGORIES: { key: 'customers' | 'warranty'; label: string }[] = [
  { key: 'customers', label: 'Customers (Derived)' },
  { key: 'warranty', label: 'Warranty (Derived)' },
];

// Runs at most once per calendar day when Settings > System Preferences > Auto Backup
// is enabled. Reuses the exact same snapshot/record-backup path as the manual
// "Create Backup" button — no separate backup mechanism.
export function createAutoBackupIfDue(store: any) {
  if (!store.settings?.autoBackup) return false;
  const last = store.backupMeta?.lastBackupAt;
  if (last) {
    const lastDate = new Date(last);
    const now = new Date();
    const sameDay = lastDate.getFullYear() === now.getFullYear() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getDate() === now.getDate();
    if (sameDay) return false;
  }
  const snapshot = getFullSnapshot(store);
  downloadJSON(snapshot, `GJ5_AutoBackup_${new Date().toISOString().split('T')[0]}.json`);
  const counts: Record<string, number> = {};
  RECORD_CATEGORIES.forEach(({ key }) => { counts[key] = Array.isArray((snapshot as any)[key]) ? (snapshot as any)[key].length : 0; });
  store.recordBackup('success', counts);
  return true;
}
