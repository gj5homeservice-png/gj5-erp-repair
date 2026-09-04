"use client"

import { useState, useEffect } from 'react';
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
import { db, doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot } from '@/firebase';

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

const DEFAULT_VISIBILITY = {
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

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transportationLogs, setTransportationLogs] = useState<TransportationLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendanceLinks, setAttendanceLinks] = useState<AttendanceLink[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(50000);
  // SALES MODULE — separate collections, never shared with Repairing/Billing state above.
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [salesDeliveries, setSalesDeliveries] = useState<SalesDelivery[]>([]);
  const [salesCustomers, setSalesCustomers] = useState<Customer[]>([]);
  // REPAIR MODULE — separate collection, new module distinct from Repairing (calls) above.
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [settings, setSettingsState] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [backupMeta, setBackupMeta] = useState<{ lastBackupAt: string; status: string; recordCounts: Record<string, number> } | null>(null);

  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const activeUser = localStorage.getItem('gj5_active_user');
    if (!activeUser) {
      console.log("Auth Node: No active session detected.");
      return;
    }

    console.log("ERP Store: Initializing Cloud Sync for", activeUser);

    const prefix = `gj5_user_${activeUser}_`;
    const companyKey = `gj5_company_${activeUser}`;
    
    let unsubscribe: (() => void) | undefined;

    // 1. Sync / Load Company Profile from Firestore (Real-time)
    if (db) {
      console.log("Firestore Node: Connected. Synchronizing Database...");
      try {
        const q = query(collection(db, "companies"), where("ownerEmail", "==", activeUser));
        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            console.log("Company Registry: Loaded from cloud.");
            const data = snapshot.docs[0].data() as Company;
            setCompanyProfile({ ...data, id: snapshot.docs[0].id });
          } else {
            console.warn("Company Registry: Node empty. Checking local fallback...");
            const compData = localStorage.getItem(companyKey);
            if (compData) {
              try {
                const localProfile = JSON.parse(compData);
                setCompanyProfile(localProfile);
              } catch (e) { console.error("Local Cache Corruption:", e); }
            }
          }
        }, (error) => {
          console.error("Firestore Snapshot Failure:", error);
        });
      } catch (err) {
        console.error("Firestore Initialization Error:", err);
      }
    } else {
      console.warn("Firestore Node: Disconnected. Reverting to Offline Mode.");
      const compData = localStorage.getItem(companyKey);
      if (compData) {
        try {
          setCompanyProfile(JSON.parse(compData));
        } catch (e) { console.error("Local Cache Corruption:", e); }
      }
    }

    // Load other data from localStorage
    const safeGet = (key: string, setter: any) => {
      const val = localStorage.getItem(prefix + key);
      if (val) {
        try {
          setter(JSON.parse(val));
        } catch (e) {
          console.error(`Local Registry Failure [${key}]:`, e);
          setter([]);
        }
      }
    };

    safeGet('invoices', setInvoices);
    safeGet('stock', setStock);
    safeGet('calls', setCalls);
    safeGet('inquiries', setInquiries);
    safeGet('expenses', setExpenses);
    safeGet('transactions', setTransactions);
    safeGet('transport_logs', setTransportationLogs);
    safeGet('employees', setEmployees);
    safeGet('attendance', setAttendance);
    safeGet('salaries', setSalaries);
    safeGet('leaves', setLeaves);
    safeGet('attendance_links', setAttendanceLinks);
    safeGet('wallet_balance', (v: any) => setWalletBalance(Number(v)));
    safeGet('settings', (v: any) => setSettingsState({ ...DEFAULT_SETTINGS, ...v }));
    safeGet('backup_meta', setBackupMeta);
    safeGet('sales_orders', setSalesOrders);
    safeGet('sales_invoices', setSalesInvoices);
    safeGet('sales_deliveries', setSalesDeliveries);
    safeGet('sales_customers', setSalesCustomers);
    safeGet('repair_jobs', setRepairJobs);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Save with User Prefix for isolation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeUser = localStorage.getItem('gj5_active_user');
    if (!activeUser) return;
    const prefix = `gj5_user_${activeUser}_`;
    
    const save = (key: string, data: any) => {
       try {
         localStorage.setItem(prefix + key, JSON.stringify(data));
       } catch (e) { console.error(`Storage Sync Failure [${key}]:`, e); }
    };
    
    save('invoices', invoices);
    save('stock', stock);
    save('calls', calls);
    save('inquiries', inquiries);
    save('expenses', expenses);
    save('transactions', transactions);
    save('transport_logs', transportationLogs);
    save('employees', employees);
    save('attendance', attendance);
    save('salaries', salaries);
    save('leaves', leaves);
    save('attendance_links', attendanceLinks);
    save('wallet_balance', walletBalance);
    save('settings', settings);
    if (backupMeta) save('backup_meta', backupMeta);
    save('sales_orders', salesOrders);
    save('sales_invoices', salesInvoices);
    save('sales_deliveries', salesDeliveries);
    save('sales_customers', salesCustomers);
    save('repair_jobs', repairJobs);
  }, [invoices, stock, calls, inquiries, expenses, transactions, transportationLogs, employees, attendance, salaries, leaves, attendanceLinks, walletBalance, settings, backupMeta, salesOrders, salesInvoices, salesDeliveries, salesCustomers, repairJobs]);

  const updateSettings = (patch: Partial<SystemSettings>) => {
    setSettingsState(prev => ({ ...prev, ...patch }));
  };

  const updateCompanyProfile = async (patch: Partial<Company>) => {
    const activeUser = typeof window !== 'undefined' ? localStorage.getItem('gj5_active_user') : null;
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
    setBackupMeta({ lastBackupAt: new Date().toISOString(), status, recordCounts });
  };

  // HRMS ACTIONS
  const addEmployee = (emp: Employee) => setEmployees(prev => [emp, ...prev]);
  const updateEmployee = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  const deleteEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const addAttendance = (record: AttendanceRecord) => setAttendance(prev => [record, ...prev]);
  const updateAttendance = (record: AttendanceRecord) => setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
  const deleteAttendance = (id: string) => setAttendance(prev => prev.filter(a => a.id !== id));

  const addSalary = (record: SalaryRecord) => setSalaries(prev => [record, ...prev]);
  const updateSalary = (record: SalaryRecord) => setSalaries(prev => prev.map(s => s.id === record.id ? record : s));

  const generateAttendanceLink = (emp: Employee): string => {
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 120000).toISOString();
    const newLink: AttendanceLink = {
      id: `LINK-${Date.now()}`,
      token,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      mobile: emp.mobile,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    };
    setAttendanceLinks(prev => [newLink, ...prev]);
    return token;
  };

  const useAttendanceLink = (token: string) => {
    setAttendanceLinks(prev => prev.map(l => l.token === token ? { ...l, used: true } : l));
  };

  // CORE ACTIONS
  const addInvoice = (invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    invoice.items?.forEach(item => {
      const stockItem = stock.find(s => s.name === item.name || s.barcode === item.id);
      if (stockItem) {
        const updatedItem = {
          ...stockItem,
          quantity: Math.max(0, (stockItem.quantity || 0) - (item.quantity || 0)),
          lastUpdated: new Date().toISOString()
        } as StockItem;
        updateStockItem(updatedItem);
      }
    });
    const tx: WalletTransaction = {
      id: `TX-${Date.now()}`,
      amount: invoice.grandTotal,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: 'INVOICE_SALE',
      description: `Sale: ${invoice.invoiceNumber} - ${invoice.customerName}`
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(i => i.id !== id));

  const updateStockItem = (item: StockItem) => {
    setStock(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? item : i);
      return [item, ...prev];
    });
  };

  const deleteStockItem = (id: string) => setStock(prev => prev.filter(s => s.id !== id));

  // SALES MODULE ACTIONS — a separate module from Repairing/Billing. Reuses the
  // same `stock` collection/updateStockItem (one real inventory, not two), and
  // reuses customer identity by mobile across Repairs + Sales, but never writes
  // to `calls`/`invoices`/`transportationLogs` — those stay exactly as they are.
  const findOrCreateSalesCustomerId = (mobile: string, existingId?: string): string => {
    if (existingId) return existingId;
    const fromCalls = calls.find(c => c.mobile === mobile);
    if (fromCalls?.customerId) return fromCalls.customerId;
    const fromSales = salesOrders.find(o => o.mobile === mobile);
    if (fromSales?.customerId) return fromSales.customerId;
    const prefix = settings.customerIdPrefix || 'GJ5';
    // Repair's own ID scheme (CallModal) is independent of this one and isn't
    // aware of Sales-minted IDs, so scan for a genuinely free suffix here
    // rather than a single arithmetic guess that could collide with it.
    const used = new Set<string>([
      ...calls.map((c: any) => c.customerId),
      ...salesOrders.map(o => o.customerId),
      ...salesCustomers.map(c => c.id)
    ]);
    let n = 1001;
    while (used.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  };

  const addSalesOrder = (order: SalesOrder) => {
    if (order.productId) {
      const stockItem = stock.find(s => s.id === order.productId);
      if (stockItem) {
        updateStockItem({
          ...stockItem,
          quantity: Math.max(0, (stockItem.quantity || 0) - (order.quantity || 0)),
          lastUpdated: new Date().toISOString()
        });
      }
    }
    setSalesOrders(prev => [order, ...prev]);
    if (order.deliveryRequired) {
      const delivery: SalesDelivery = {
        id: `SDEL-${String(salesDeliveries.length + 1).padStart(6, '0')}`,
        orderId: order.id,
        customerName: order.customerName,
        mobile: order.mobile,
        address: order.address,
        product: `${order.brand} ${order.model}`.trim(),
        deliveryStatus: 'Pending Pickup',
        paymentStatus: order.paymentStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSalesDeliveries(prev => [delivery, ...prev]);
    }
  };

  const updateSalesOrder = (order: SalesOrder) => {
    setSalesOrders(prev => prev.map(o => o.id === order.id ? { ...order, updatedAt: new Date().toISOString() } : o));
  };

  const deleteSalesOrder = (id: string) => {
    setSalesOrders(prev => prev.filter(o => o.id !== id));
    setSalesDeliveries(prev => prev.filter(d => d.orderId !== id));
  };

  const generateSalesInvoice = (order: SalesOrder): SalesInvoice => {
    const invoiceNumber = `SINV-${String(salesInvoices.length + 1).padStart(6, '0')}`;
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
    setSalesInvoices(prev => [invoice, ...prev]);
    setSalesOrders(prev => prev.map(o => o.id === order.id ? { ...o, invoiceId: invoiceNumber } : o));
    return invoice;
  };

  const updateSalesDelivery = (delivery: SalesDelivery) => {
    setSalesDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...delivery, updatedAt: new Date().toISOString() } : d));
  };

  const updateSalesDeliveryStatus = (id: string, status: SalesDeliveryStatus) => {
    const delivery = salesDeliveries.find(d => d.id === id);
    setSalesDeliveries(prev => prev.map(d => d.id === id ? { ...d, deliveryStatus: status, updatedAt: new Date().toISOString() } : d));
    if (delivery) {
      setSalesOrders(prev => prev.map(o => o.id === delivery.orderId ? { ...o, deliveryStatus: status } : o));
    }
  };

  const addSalesCustomer = (customer: Customer) => setSalesCustomers(prev => [customer, ...prev]);
  const updateSalesCustomer = (customer: Customer) => setSalesCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  const deleteSalesCustomer = (id: string) => setSalesCustomers(prev => prev.filter(c => c.id !== id));

  const addCall = (call: RepairCall) => setCalls(prev => [call, ...prev]);
  const updateCall = (call: RepairCall) => setCalls(prev => prev.map(c => c.id === call.id ? call : c));
  const deleteCall = (id: string) => setCalls(prev => prev.filter(c => c.id !== id));

  const addRepairJob = (job: RepairJob) => setRepairJobs(prev => [job, ...prev]);
  const updateRepairJob = (job: RepairJob) =>
    setRepairJobs(prev => prev.map(j => j.id === job.id ? { ...job, updatedAt: new Date().toISOString() } : j));
  const deleteRepairJob = (id: string) => setRepairJobs(prev => prev.filter(j => j.id !== id));
  const addRepairJobPayment = (jobId: string, payment: RepairJobPayment) => {
    setRepairJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, payments: [...j.payments, payment], updatedAt: new Date().toISOString() }
      : j));
    const job = repairJobs.find(j => j.id === jobId);
    const tx: WalletTransaction = {
      id: `TX-RJ-${payment.id}`,
      amount: payment.amount,
      date: payment.date,
      time: new Date().toLocaleTimeString(),
      type: 'REPAIR_JOB_PAYMENT',
      description: `Repair Payment: ${jobId}${job ? ' - ' + job.customerName : ''} (${payment.method})`
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const addInquiry = (inq: Inquiry) => setInquiries(prev => [inq, ...prev]);
  const updateInquiry = (inq: Inquiry) => setInquiries(prev => prev.map(i => i.id === inq.id ? i : inq));
  const deleteInquiry = (id: string) => setInquiries(prev => prev.filter(i => i.id !== id));

  const addExpense = (exp: Expense) => {
    setExpenses(prev => [exp, ...prev]);
    const tx: WalletTransaction = {
      id: `TX-EXP-${exp.id}`,
      amount: exp.amount,
      date: exp.date,
      time: new Date().toLocaleTimeString(),
      type: 'EXPENSE',
      description: `${exp.category}: ${exp.vendorName}`
    };
    setTransactions(prev => [tx, ...prev]);
    setWalletBalance(curr => curr - exp.amount);
  };

  const topUpWallet = (amount: number) => {
    setWalletBalance(curr => curr + amount);
    const tx: WalletTransaction = {
      id: `TX-TOP-${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: 'TOPUP',
      description: 'Wallet Credit Top-Up'
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const manualAdjust = (amount: number, type: 'CREDIT' | 'DEBIT', desc: string) => {
    setWalletBalance(curr => type === 'CREDIT' ? curr + amount : curr - amount);
    const tx: WalletTransaction = {
      id: `TX-ADJ-${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: type === 'CREDIT' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT',
      description: desc || `Manual ${type}`
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const isCredit = tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT' || tx.type === 'INVOICE_SALE';
    setWalletBalance(curr => isCredit ? curr - tx.amount : curr + tx.amount);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addTransportLog = (log: TransportationLog) => setTransportationLogs(prev => [log, ...prev]);
  const updateTransportLogStatus = (id: string, status: LogisticsStatus) => setTransportationLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  const deleteTransportLog = (id: string) => setTransportationLogs(prev => prev.filter(l => l.id !== id));

  // Merges incoming records by permanent `id`: existing records are never dropped,
  // a matching id is updated in place, and only unmatched ids are appended —
  // so importing the same file twice never creates duplicates.
  const mergeById = (existing: any[], incoming: any[]) => {
    const map = new Map((existing || []).map((r: any) => [r.id, r]));
    let added = 0, updated = 0, skipped = 0;
    (incoming || []).forEach((rec: any) => {
      if (!rec || !rec.id) { skipped++; return; }
      if (map.has(rec.id)) {
        map.set(rec.id, { ...map.get(rec.id), ...rec, id: rec.id });
        updated++;
      } else {
        map.set(rec.id, rec);
        added++;
      }
    });
    return { merged: Array.from(map.values()), added, updated, skipped };
  };

  const importAllData = (data: any) => {
    const stats: Record<string, { added: number; updated: number; skipped: number }> = {};

    const mergeInto = (key: string, current: any[], setter: (v: any[]) => void) => {
      if (!Array.isArray(data[key])) return;
      const { merged, added, updated, skipped } = mergeById(current, data[key]);
      setter(merged);
      stats[key] = { added, updated, skipped };
    };

    mergeInto('calls', calls, setCalls);
    mergeInto('inquiries', inquiries, setInquiries);
    mergeInto('expenses', expenses, setExpenses);
    mergeInto('transactions', transactions, setTransactions);
    mergeInto('transportationLogs', transportationLogs, setTransportationLogs);
    mergeInto('invoices', invoices, setInvoices);
    mergeInto('stock', stock, setStock);
    mergeInto('employees', employees, setEmployees);
    mergeInto('attendance', attendance, setAttendance);
    mergeInto('salaries', salaries, setSalaries);
    mergeInto('leaves', leaves, setLeaves);
    mergeInto('attendanceLinks', attendanceLinks, setAttendanceLinks);
    mergeInto('salesOrders', salesOrders, setSalesOrders);
    mergeInto('salesInvoices', salesInvoices, setSalesInvoices);
    mergeInto('salesDeliveries', salesDeliveries, setSalesDeliveries);
    mergeInto('salesCustomers', salesCustomers, setSalesCustomers);

    // walletBalance is a single running total, not an ID-keyed record — it is
    // intentionally never overwritten by an import so a backup can't silently
    // corrupt today's live balance. It is still included in exports for reference.
    if (data.companyProfile) updateCompanyProfile(data.companyProfile);
    if (data.settings) updateSettings(data.settings);

    return stats;
  };

  return {
    invoices, addInvoice, deleteInvoice,
    stock, updateStockItem, deleteStockItem,
    calls, addCall, updateCall, deleteCall,
    inquiries, addInquiry, updateInquiry, deleteInquiry,
    employees, addEmployee, updateEmployee, deleteEmployee,
    attendance, addAttendance, updateAttendance, deleteAttendance,
    salaries, addSalary, updateSalary,
    attendanceLinks, generateAttendanceLink, useAttendanceLink,
    walletBalance, topUpWallet, manualAdjust,
    visibility, setVisibility,
    navOrder, setNavOrder,
    companyProfile, setCompanyProfile, updateCompanyProfile,
    deletePassword: settings.deletePassword,
    settings, updateSettings,
    backupMeta, recordBackup,
    transactions, deleteTransaction,
    expenses, addExpense,
    leaves,
    transportationLogs, addTransportLog, updateTransportLogStatus, deleteTransportLog,
    salesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder, findOrCreateSalesCustomerId,
    salesInvoices, generateSalesInvoice,
    salesDeliveries, updateSalesDelivery, updateSalesDeliveryStatus,
    salesCustomers, addSalesCustomer, updateSalesCustomer, deleteSalesCustomer,
    repairJobs, addRepairJob, updateRepairJob, deleteRepairJob, addRepairJobPayment,
    importAllData
  };
}
