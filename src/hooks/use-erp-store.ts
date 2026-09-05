"use client"

import { useState, useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  RepairCall,
  Inquiry,
  Expense,
  TransportationLog,
  Invoice,
  WalletTransaction,
  StockItem,
  VisibilitySettings,
  LogisticsStatus,
  Employee,
  AttendanceRecord,
  SalaryRecord,
  LeaveRequest,
  AttendanceLink,
  Company,
  SystemSettings,
  SalesOrder,
  SalesInvoice,
  SalesDelivery,
  SalesDeliveryStatus,
  Customer,
  RepairJob,
  RepairJobPayment
} from '@/lib/types';
import { db, doc, setDoc, collection, query, where, onSnapshot } from '@/firebase';

const DEFAULT_NAV_ORDER = [
  'Dashboard',
  'Repairing',
  'CRM Leads',
  'Billing',
  'Invoice History',
  'Stock',
  'Employees',
  'Attendance',
  'Salary',
  'Analytics',
  'E-Wallet',
  'Logistics'
];

const DEFAULT_SETTINGS: SystemSettings = {
  gstEnabled: true,
  gstRate: 18,
  whatsappNotifications: true,
  emailNotifications: true,
  customerNotifications: true,
  repairNotifications: true,
  salesNotifications: true,
  invoiceNotifications: true,
  deliveryNotifications: true,
  warrantyNotifications: true,
  soundNotifications: true,
  autoNotifications: true,
  autoBackup: false,
  smsNotifications: true,
  deletePassword: '1234',
  invoicePrefix: 'INV',
  customerIdPrefix: 'GJ5',
  defaultWarrantyDuration: 'No Warranty',
  defaultPickupRequired: false,
  defaultMinStockLevel: 5,
  defaultPaymentMode: 'UPI',
  defaultDueDays: 0,
  warrantyExpiringSoonDays: 30,
  standardCheckInTime: '10:00',
  lateThresholdMinutes: 15
};

const DEFAULT_VISIBILITY: VisibilitySettings = {
  tabs: {
    'Dashboard': true, 'Repairing': true, 'CRM Leads': true, 'Billing': true,
    'Invoice History': true, 'Stock': true, 'Employees': true, 'Attendance': true,
    'Salary': true, 'Analytics': true, 'E-Wallet': true, 'Logistics': true
  },
  kpis: {
    totalActive: true, pending: true, completed: true, repeat: true,
    rejected: true, exchange: true, warranty: true
  }
};

interface Snapshot {
  calls: RepairCall[];
  inquiries: Inquiry[];
  stock: StockItem[];
  invoices: Invoice[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  leaves: LeaveRequest[];
  transportationLogs: TransportationLog[];
  salesOrders: SalesOrder[];
  salesInvoices: SalesInvoice[];
  salesDeliveries: SalesDelivery[];
  repairJobs: RepairJob[];
  salesCustomers: Customer[];
  expenses: Expense[];
  walletBalance: number;
  transactions: WalletTransaction[];
  attendanceLinks: AttendanceLink[];
  settings: SystemSettings | null;
  visibility: { tabs: Record<string, boolean>; kpis: Record<string, boolean> } | null;
  navOrder: string[] | null;
  backupMeta: { lastBackupAt: string; status: string; recordCounts: Record<string, number> } | null;
}

const EMPTY_SNAPSHOT: Snapshot = {
  calls: [], inquiries: [], stock: [], invoices: [], employees: [], attendance: [],
  salaries: [], leaves: [], transportationLogs: [], salesOrders: [], salesInvoices: [],
  salesDeliveries: [], repairJobs: [], salesCustomers: [], expenses: [], walletBalance: 50000,
  transactions: [], attendanceLinks: [], settings: null, visibility: null, navOrder: null, backupMeta: null,
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.error || `Request to ${path} failed`);
  }
  return json;
}

function bootstrapKey(email: string | null) {
  return email ? ['erp-bootstrap', email] as const : null;
}

async function fetchBootstrap(): Promise<Snapshot> {
  const json = await apiFetch('/api/erp/bootstrap');
  return { ...EMPTY_SNAPSHOT, ...json.data };
}

// Revalidates the shared cache after a write. Every useErpStore() call site
// (dashboard, both attendance portals, the two delete-modals) resolves to the
// same SWR key for a given signed-in email, so this refreshes all of them —
// no Context/Provider wiring needed.
function refresh(email: string | null) {
  const key = bootstrapKey(email);
  if (key) globalMutate(key);
}

function optimisticUpdate(email: string | null, updater: (snap: Snapshot) => Snapshot) {
  const key = bootstrapKey(email);
  if (!key) return;
  globalMutate(key, (current: Snapshot | undefined) => updater(current || EMPTY_SNAPSHOT), { revalidate: false });
}

export function useErpStore() {
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setActiveUser(localStorage.getItem('gj5_active_user'));
  }, []);

  const { data } = useSWR(bootstrapKey(activeUser), fetchBootstrap, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
  const snap = data || EMPTY_SNAPSHOT;

  // Company profile stays exactly as it was: Firestore real-time sync with a
  // localStorage fallback cache. Out of scope for the MySQL migration — this
  // is SaaS/subscription metadata, not ERP business data.
  useEffect(() => {
    if (typeof window === 'undefined' || !activeUser) return;
    const companyKey = `gj5_company_${activeUser}`;
    let unsubscribe: (() => void) | undefined;

    if (db) {
      try {
        const q = query(collection(db, "companies"), where("ownerEmail", "==", activeUser));
        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Company;
            setCompanyProfile({ ...data, id: snapshot.docs[0].id });
          } else {
            const compData = localStorage.getItem(companyKey);
            if (compData) {
              try { setCompanyProfile(JSON.parse(compData)); } catch (e) { console.error("Local Cache Corruption:", e); }
            }
          }
        }, (error) => {
          console.error("Firestore Snapshot Failure:", error);
        });
      } catch (err) {
        console.error("Firestore Initialization Error:", err);
      }
    } else {
      const compData = localStorage.getItem(companyKey);
      if (compData) {
        try { setCompanyProfile(JSON.parse(compData)); } catch (e) { console.error("Local Cache Corruption:", e); }
      }
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeUser]);

  const settings: SystemSettings = { ...DEFAULT_SETTINGS, ...(snap.settings || {}) };
  const visibility: VisibilitySettings = (snap.visibility as VisibilitySettings) || DEFAULT_VISIBILITY;
  const navOrder: string[] = snap.navOrder || DEFAULT_NAV_ORDER;

  const updateSettings = (patch: Partial<SystemSettings>) => {
    optimisticUpdate(activeUser, s => ({ ...s, settings: { ...settings, ...patch } }));
    apiFetch('/api/erp/settings', { method: 'PUT', body: JSON.stringify(patch) })
      .catch(err => console.error('Settings sync failed:', err))
      .finally(() => refresh(activeUser));
  };

  const setVisibility = (v: VisibilitySettings) => {
    optimisticUpdate(activeUser, s => ({ ...s, visibility: v }));
    apiFetch('/api/erp/visibility', { method: 'PUT', body: JSON.stringify(v) })
      .catch(err => console.error('Visibility sync failed:', err))
      .finally(() => refresh(activeUser));
  };

  const setNavOrder = (order: string[]) => {
    optimisticUpdate(activeUser, s => ({ ...s, navOrder: order }));
    apiFetch('/api/erp/nav-order', { method: 'PUT', body: JSON.stringify(order) })
      .catch(err => console.error('Nav order sync failed:', err))
      .finally(() => refresh(activeUser));
  };

  const updateCompanyProfile = async (patch: Partial<Company>) => {
    let merged: Company | null = null;
    setCompanyProfile(prev => {
      merged = { ...(prev || {}), ...patch } as Company;
      return merged;
    });
    if (activeUser && typeof window !== 'undefined' && merged) {
      localStorage.setItem(`gj5_company_${activeUser}`, JSON.stringify(merged));
    }
    if (db && merged && (merged as Company).id) {
      try {
        await setDoc(doc(db, 'companies', (merged as Company).id), patch, { merge: true });
      } catch (e) {
        console.error('Company Profile Cloud Sync Failure:', e);
      }
    }
  };

  const recordBackup = (status: 'success' | 'failed', recordCounts: Record<string, number>) => {
    const meta = { lastBackupAt: new Date().toISOString(), status, recordCounts };
    optimisticUpdate(activeUser, s => ({ ...s, backupMeta: meta }));
    apiFetch('/api/erp/backup-meta', { method: 'PUT', body: JSON.stringify(meta) })
      .catch(err => console.error('Backup meta sync failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- HRMS ----
  const addEmployee = (emp: Employee) => {
    optimisticUpdate(activeUser, s => ({ ...s, employees: [emp, ...s.employees] }));
    apiFetch('/api/erp/employees', { method: 'POST', body: JSON.stringify(emp) })
      .catch(err => console.error('addEmployee failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateEmployee = (emp: Employee) => {
    optimisticUpdate(activeUser, s => ({ ...s, employees: s.employees.map(e => e.id === emp.id ? emp : e) }));
    apiFetch(`/api/erp/employees/${emp.id}`, { method: 'PUT', body: JSON.stringify(emp) })
      .catch(err => console.error('updateEmployee failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteEmployee = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, employees: s.employees.filter(e => e.id !== id) }));
    apiFetch(`/api/erp/employees/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteEmployee failed:', err))
      .finally(() => refresh(activeUser));
  };

  const addAttendance = (record: AttendanceRecord) => {
    optimisticUpdate(activeUser, s => ({ ...s, attendance: [record, ...s.attendance] }));
    apiFetch('/api/erp/attendance', { method: 'POST', body: JSON.stringify(record) })
      .catch(err => console.error('addAttendance failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateAttendance = (record: AttendanceRecord) => {
    optimisticUpdate(activeUser, s => ({ ...s, attendance: s.attendance.map(a => a.id === record.id ? record : a) }));
    apiFetch(`/api/erp/attendance/${record.id}`, { method: 'PUT', body: JSON.stringify(record) })
      .catch(err => console.error('updateAttendance failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteAttendance = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, attendance: s.attendance.filter(a => a.id !== id) }));
    apiFetch(`/api/erp/attendance/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteAttendance failed:', err))
      .finally(() => refresh(activeUser));
  };

  const addSalary = (record: SalaryRecord) => {
    optimisticUpdate(activeUser, s => ({ ...s, salaries: [record, ...s.salaries] }));
    apiFetch('/api/erp/salaries', { method: 'POST', body: JSON.stringify(record) })
      .catch(err => console.error('addSalary failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateSalary = (record: SalaryRecord) => {
    optimisticUpdate(activeUser, s => ({ ...s, salaries: s.salaries.map(sr => sr.id === record.id ? record : sr) }));
    apiFetch(`/api/erp/salaries/${record.id}`, { method: 'PUT', body: JSON.stringify(record) })
      .catch(err => console.error('updateSalary failed:', err))
      .finally(() => refresh(activeUser));
  };

  // Now mints a real server-side token (stored in MySQL, checked from any
  // device) instead of a client-generated one — the token returned here MUST
  // be the exact one the server stored, or the resulting share link would
  // never match any record. Async now (was sync); the one caller
  // (AttendanceModule's WhatsApp-link button) awaits it.
  const generateAttendanceLink = async (emp: Employee): Promise<string> => {
    const result = await apiFetch('/api/erp/attendance-links', {
      method: 'POST',
      body: JSON.stringify({ employeeId: emp.employeeId, name: emp.name, mobile: emp.mobile }),
    });
    refresh(activeUser);
    return result.token as string;
  };

  const useAttendanceLink = (token: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, attendanceLinks: s.attendanceLinks.map(l => l.token === token ? { ...l, used: true } : l) }));
  };

  // ---- Billing ----
  const addInvoice = (invoice: Invoice) => {
    apiFetch('/api/erp/invoices', { method: 'POST', body: JSON.stringify(invoice) })
      .catch(err => console.error('addInvoice failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteInvoice = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, invoices: s.invoices.filter(i => i.id !== id) }));
    apiFetch(`/api/erp/invoices/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteInvoice failed:', err))
      .finally(() => refresh(activeUser));
  };

  const updateStockItem = (item: StockItem) => {
    optimisticUpdate(activeUser, s => {
      const exists = s.stock.find(i => i.id === item.id);
      return { ...s, stock: exists ? s.stock.map(i => i.id === item.id ? item : i) : [item, ...s.stock] };
    });
    apiFetch('/api/erp/stock-items', { method: 'POST', body: JSON.stringify(item) })
      .catch(err => console.error('updateStockItem failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteStockItem = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, stock: s.stock.filter(i => i.id !== id) }));
    apiFetch(`/api/erp/stock-items/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteStockItem failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- Sales module ----
  const findOrCreateSalesCustomerId = (mobile: string, existingId?: string): string => {
    if (existingId) return existingId;
    const fromCalls = snap.calls.find(c => c.mobile === mobile);
    if (fromCalls?.customerId) return fromCalls.customerId;
    const fromSales = snap.salesOrders.find(o => o.mobile === mobile);
    if (fromSales?.customerId) return fromSales.customerId;
    const prefix = settings.customerIdPrefix || 'GJ5';
    const used = new Set<string>([
      ...snap.calls.map((c: any) => c.customerId),
      ...snap.salesOrders.map(o => o.customerId),
      ...snap.salesCustomers.map(c => c.id)
    ]);
    let n = 1001;
    while (used.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  };

  const addSalesOrder = (order: SalesOrder) => {
    apiFetch('/api/erp/sales-orders', { method: 'POST', body: JSON.stringify(order) })
      .catch(err => console.error('addSalesOrder failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateSalesOrder = (order: SalesOrder) => {
    const updated = { ...order, updatedAt: new Date().toISOString() };
    optimisticUpdate(activeUser, s => ({ ...s, salesOrders: s.salesOrders.map(o => o.id === order.id ? updated : o) }));
    apiFetch(`/api/erp/sales-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(updated) })
      .catch(err => console.error('updateSalesOrder failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteSalesOrder = (id: string) => {
    optimisticUpdate(activeUser, s => ({
      ...s,
      salesOrders: s.salesOrders.filter(o => o.id !== id),
      salesDeliveries: s.salesDeliveries.filter(d => d.orderId !== id),
    }));
    apiFetch(`/api/erp/sales-orders/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteSalesOrder failed:', err))
      .finally(() => refresh(activeUser));
  };

  const generateSalesInvoice = (order: SalesOrder): SalesInvoice => {
    const invoiceNumber = `SINV-${String(snap.salesInvoices.length + 1).padStart(6, '0')}`;
    const invoice: SalesInvoice = {
      id: invoiceNumber,
      invoiceNumber,
      orderId: order.id,
      invoiceDate: new Date().toISOString(),
      customerName: order.customerName,
      mobile: order.mobile,
      amount: order.grandTotal,
      gstAmount: order.gstAmount,
      paymentStatus: order.paymentStatus,
      createdAt: new Date().toISOString()
    };
    // Optimistic placeholder — the server computes the authoritative invoice
    // number from its own count, so this is superseded on the refresh below.
    optimisticUpdate(activeUser, s => ({
      ...s,
      salesInvoices: [invoice, ...s.salesInvoices],
      salesOrders: s.salesOrders.map(o => o.id === order.id ? { ...o, invoiceId: invoiceNumber } : o),
    }));
    apiFetch(`/api/erp/sales-orders/${order.id}/invoice`, { method: 'POST' })
      .catch(err => console.error('generateSalesInvoice failed:', err))
      .finally(() => refresh(activeUser));
    return invoice;
  };

  const updateSalesDelivery = (delivery: SalesDelivery) => {
    const updated = { ...delivery, updatedAt: new Date().toISOString() };
    optimisticUpdate(activeUser, s => ({ ...s, salesDeliveries: s.salesDeliveries.map(d => d.id === delivery.id ? updated : d) }));
    refresh(activeUser);
  };

  const updateSalesDeliveryStatus = (id: string, status: SalesDeliveryStatus) => {
    const delivery = snap.salesDeliveries.find(d => d.id === id);
    optimisticUpdate(activeUser, s => ({
      ...s,
      salesDeliveries: s.salesDeliveries.map(d => d.id === id ? { ...d, deliveryStatus: status, updatedAt: new Date().toISOString() } : d),
      salesOrders: delivery ? s.salesOrders.map(o => o.id === delivery.orderId ? { ...o, deliveryStatus: status } : o) : s.salesOrders,
    }));
    apiFetch(`/api/erp/sales-deliveries/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
      .catch(err => console.error('updateSalesDeliveryStatus failed:', err))
      .finally(() => refresh(activeUser));
  };

  const addSalesCustomer = (customer: Customer) => {
    optimisticUpdate(activeUser, s => ({ ...s, salesCustomers: [customer, ...s.salesCustomers] }));
    apiFetch('/api/erp/customers', { method: 'POST', body: JSON.stringify({ ...customer, source: 'sales' }) })
      .catch(err => console.error('addSalesCustomer failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateSalesCustomer = (customer: Customer) => {
    optimisticUpdate(activeUser, s => ({ ...s, salesCustomers: s.salesCustomers.map(c => c.id === customer.id ? customer : c) }));
    apiFetch(`/api/erp/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify({ ...customer, source: 'sales' }) })
      .catch(err => console.error('updateSalesCustomer failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteSalesCustomer = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, salesCustomers: s.salesCustomers.filter(c => c.id !== id) }));
    apiFetch(`/api/erp/customers/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteSalesCustomer failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- Repairing (legacy calls) ----
  const addCall = (call: RepairCall) => {
    optimisticUpdate(activeUser, s => ({ ...s, calls: [call, ...s.calls] }));
    apiFetch('/api/erp/repair-calls', { method: 'POST', body: JSON.stringify(call) })
      .catch(err => console.error('addCall failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateCall = (call: RepairCall) => {
    optimisticUpdate(activeUser, s => ({ ...s, calls: s.calls.map(c => c.id === call.id ? call : c) }));
    apiFetch(`/api/erp/repair-calls/${call.id}`, { method: 'PUT', body: JSON.stringify(call) })
      .catch(err => console.error('updateCall failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteCall = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, calls: s.calls.filter(c => c.id !== id) }));
    apiFetch(`/api/erp/repair-calls/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteCall failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- Repair Jobs module ----
  const addRepairJob = (job: RepairJob) => {
    optimisticUpdate(activeUser, s => ({ ...s, repairJobs: [job, ...s.repairJobs] }));
    apiFetch('/api/erp/repair-jobs', { method: 'POST', body: JSON.stringify(job) })
      .catch(err => console.error('addRepairJob failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateRepairJob = (job: RepairJob) => {
    const updated = { ...job, updatedAt: new Date().toISOString() };
    optimisticUpdate(activeUser, s => ({ ...s, repairJobs: s.repairJobs.map(j => j.id === job.id ? updated : j) }));
    apiFetch(`/api/erp/repair-jobs/${job.id}`, { method: 'PUT', body: JSON.stringify(updated) })
      .catch(err => console.error('updateRepairJob failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteRepairJob = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, repairJobs: s.repairJobs.filter(j => j.id !== id) }));
    apiFetch(`/api/erp/repair-jobs/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteRepairJob failed:', err))
      .finally(() => refresh(activeUser));
  };
  const addRepairJobPayment = (jobId: string, payment: RepairJobPayment) => {
    optimisticUpdate(activeUser, s => ({
      ...s,
      repairJobs: s.repairJobs.map(j => j.id === jobId ? { ...j, payments: [...j.payments, payment], updatedAt: new Date().toISOString() } : j),
    }));
    apiFetch(`/api/erp/repair-jobs/${jobId}/payments`, { method: 'POST', body: JSON.stringify(payment) })
      .catch(err => console.error('addRepairJobPayment failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- CRM ----
  const addInquiry = (inq: Inquiry) => {
    optimisticUpdate(activeUser, s => ({ ...s, inquiries: [inq, ...s.inquiries] }));
    apiFetch('/api/erp/inquiries', { method: 'POST', body: JSON.stringify(inq) })
      .catch(err => console.error('addInquiry failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateInquiry = (inq: Inquiry) => {
    optimisticUpdate(activeUser, s => ({ ...s, inquiries: s.inquiries.map(i => i.id === inq.id ? inq : i) }));
    apiFetch(`/api/erp/inquiries/${inq.id}`, { method: 'PUT', body: JSON.stringify(inq) })
      .catch(err => console.error('updateInquiry failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteInquiry = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, inquiries: s.inquiries.filter(i => i.id !== id) }));
    apiFetch(`/api/erp/inquiries/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteInquiry failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- Wallet / Expenses ----
  const addExpense = (exp: Expense) => {
    apiFetch('/api/erp/expenses', { method: 'POST', body: JSON.stringify(exp) })
      .catch(err => console.error('addExpense failed:', err))
      .finally(() => refresh(activeUser));
  };

  const topUpWallet = (amount: number) => {
    apiFetch('/api/erp/wallet/topup', { method: 'POST', body: JSON.stringify({ amount }) })
      .catch(err => console.error('topUpWallet failed:', err))
      .finally(() => refresh(activeUser));
  };

  const manualAdjust = (amount: number, type: 'CREDIT' | 'DEBIT', desc: string) => {
    apiFetch('/api/erp/wallet/adjust', {
      method: 'POST',
      body: JSON.stringify({ amount, type: type === 'CREDIT' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT', description: desc }),
    })
      .catch(err => console.error('manualAdjust failed:', err))
      .finally(() => refresh(activeUser));
  };

  const deleteTransaction = (id: string) => {
    apiFetch(`/api/erp/wallet/transactions/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteTransaction failed:', err))
      .finally(() => refresh(activeUser));
  };

  // ---- Logistics ----
  const addTransportLog = (log: TransportationLog) => {
    optimisticUpdate(activeUser, s => ({ ...s, transportationLogs: [log, ...s.transportationLogs] }));
    apiFetch('/api/erp/transportation-logs', { method: 'POST', body: JSON.stringify(log) })
      .catch(err => console.error('addTransportLog failed:', err))
      .finally(() => refresh(activeUser));
  };
  const updateTransportLogStatus = (id: string, status: LogisticsStatus) => {
    optimisticUpdate(activeUser, s => ({ ...s, transportationLogs: s.transportationLogs.map(l => l.id === id ? { ...l, status } : l) }));
    apiFetch(`/api/erp/transportation-logs/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      .catch(err => console.error('updateTransportLogStatus failed:', err))
      .finally(() => refresh(activeUser));
  };
  const deleteTransportLog = (id: string) => {
    optimisticUpdate(activeUser, s => ({ ...s, transportationLogs: s.transportationLogs.filter(l => l.id !== id) }));
    apiFetch(`/api/erp/transportation-logs/${id}`, { method: 'DELETE' })
      .catch(err => console.error('deleteTransportLog failed:', err))
      .finally(() => refresh(activeUser));
  };

  // Bulk restore (Settings "Restore Backup") and the one-time localStorage ->
  // cloud migration action both funnel through this same server-side,
  // id-keyed upsert — safe to call more than once.
  const importAllData = async (data: any) => {
    const result = await apiFetch('/api/erp/import', { method: 'POST', body: JSON.stringify(data) });
    if (data.companyProfile) await updateCompanyProfile(data.companyProfile);
    refresh(activeUser);
    return result.counts as Record<string, number>;
  };

  return {
    invoices: snap.invoices, addInvoice, deleteInvoice,
    stock: snap.stock, updateStockItem, deleteStockItem,
    calls: snap.calls, addCall, updateCall, deleteCall,
    inquiries: snap.inquiries, addInquiry, updateInquiry, deleteInquiry,
    employees: snap.employees, addEmployee, updateEmployee, deleteEmployee,
    attendance: snap.attendance, addAttendance, updateAttendance, deleteAttendance,
    salaries: snap.salaries, addSalary, updateSalary,
    attendanceLinks: snap.attendanceLinks, generateAttendanceLink, useAttendanceLink,
    walletBalance: snap.walletBalance, topUpWallet, manualAdjust,
    visibility, setVisibility,
    navOrder, setNavOrder,
    companyProfile, setCompanyProfile, updateCompanyProfile,
    deletePassword: settings.deletePassword,
    settings, updateSettings,
    backupMeta: snap.backupMeta, recordBackup,
    transactions: snap.transactions, deleteTransaction,
    expenses: snap.expenses, addExpense,
    leaves: snap.leaves,
    transportationLogs: snap.transportationLogs, addTransportLog, updateTransportLogStatus, deleteTransportLog,
    salesOrders: snap.salesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder, findOrCreateSalesCustomerId,
    salesInvoices: snap.salesInvoices, generateSalesInvoice,
    salesDeliveries: snap.salesDeliveries, updateSalesDelivery, updateSalesDeliveryStatus,
    salesCustomers: snap.salesCustomers, addSalesCustomer, updateSalesCustomer, deleteSalesCustomer,
    repairJobs: snap.repairJobs, addRepairJob, updateRepairJob, deleteRepairJob, addRepairJobPayment,
    importAllData
  };
}
