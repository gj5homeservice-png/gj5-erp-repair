
"use client"

import { useState, useEffect } from 'react';
import { 
  RepairCall, 
  Inquiry, 
  Employee, 
  AttendanceRecord, 
  Expense, 
  TransportationLog, 
  Invoice,
  WalletTransaction,
  AuditLog,
  StockItem,
  VisibilitySettings 
} from '@/lib/types';

const DEFAULT_VISIBILITY: VisibilitySettings = {
  tabs: {
    Repairing: true,
    Billing: true,
    'Invoice History': true,
    Stock: true,
    Analytics: true,
    Employees: true,
    'E-Wallet': true,
    Transportation: true
  },
  kpis: {
    totalActive: true,
    pending: true,
    completed: true,
    repeat: true,
    rejected: true,
    exchange: true,
    warranty: true
  }
};

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'EMP101', name: 'Rajesh Sharma', role: 'Senior Technician', mobile: '9876543210', salary: 25000, dailyWage: 833 },
  { id: 'EMP102', name: 'Amit Patel', role: 'Runner', mobile: '9123456789', salary: 15000, dailyWage: 500 }
];

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transportationLogs, setTransportationLogs] = useState<TransportationLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(5000);
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);

  // Persistence Key Identifiers
  const KEYS = {
    CALLS: 'gj5_repair_calls_v2',
    INQUIRIES: 'gj5_inquiries_v2',
    TRANS_LOGS: 'gj5_transport_logs_v2',
    INVOICES: 'gj5_invoices_v2',
    EMPLOYEES: 'gj5_employees_v2',
    ATTENDANCE: 'gj5_attendance_v2',
    EXPENSES: 'gj5_expenses_v2',
    TXNS: 'gj5_wallet_transactions_v2',
    AUDIT: 'gj5_audit_logs_v2',
    STOCK: 'gj5_stock_v2',
    BALANCE: 'gj5_wallet_balance_v2',
    LOGO: 'gj5_shop_logo_v2',
    VISIBILITY: 'gj5_visibility_settings_v2'
  };

  useEffect(() => {
    // Initial Hydration from Browser/Electron Storage
    const safeGet = (key: string, setter: any, fallback?: any) => {
      try {
        const val = localStorage.getItem(key);
        if (val) setter(JSON.parse(val));
        else if (fallback !== undefined) setter(fallback);
      } catch (e) {
        console.error("Hydration Error", e);
      }
    };

    safeGet(KEYS.LOGO, setShopLogo);
    safeGet(KEYS.VISIBILITY, setVisibility, DEFAULT_VISIBILITY);
    safeGet(KEYS.CALLS, setCalls);
    safeGet(KEYS.INQUIRIES, setInquiries);
    safeGet(KEYS.TRANS_LOGS, setTransportationLogs);
    safeGet(KEYS.INVOICES, setInvoices);
    safeGet(KEYS.EMPLOYEES, setEmployees, DEFAULT_EMPLOYEES);
    safeGet(KEYS.ATTENDANCE, setAttendance);
    safeGet(KEYS.EXPENSES, setExpenses);
    safeGet(KEYS.TXNS, setTransactions);
    safeGet(KEYS.AUDIT, setAuditLogs);
    safeGet(KEYS.STOCK, setStock);
    
    const savedBalance = localStorage.getItem(KEYS.BALANCE);
    if (savedBalance) setWalletBalance(Number(savedBalance));
  }, []);

  // Universal Persisters - Runs on every state change
  useEffect(() => { localStorage.setItem(KEYS.CALLS, JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(inquiries)); }, [inquiries]);
  useEffect(() => { localStorage.setItem(KEYS.TRANS_LOGS, JSON.stringify(transportationLogs)); }, [transportationLogs]);
  useEffect(() => { localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(KEYS.TXNS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(KEYS.AUDIT, JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(KEYS.STOCK, JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem(KEYS.BALANCE, walletBalance.toString()); }, [walletBalance]);
  useEffect(() => { if (shopLogo) localStorage.setItem(KEYS.LOGO, shopLogo); }, [shopLogo]);

  const updateVisibility = (newSettings: VisibilitySettings) => {
    setVisibility(newSettings);
    localStorage.setItem(KEYS.VISIBILITY, JSON.stringify(newSettings));
  };

  const addCall = (call: RepairCall) => setCalls(prev => [call, ...prev]);
  const updateCall = (updatedCall: RepairCall) => setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
  const deleteCall = (id: string) => {
    setCalls(prev => prev.filter(c => c.id !== id));
    setAuditLogs(prev => [{ id: `AUD-${Date.now()}`, jobId: id, deletedBy: 'Admin', dateTime: new Date().toISOString(), action: 'DELETE' }, ...prev]);
  };
  
  const addInquiry = (inquiry: Inquiry) => setInquiries(prev => [inquiry, ...prev]);
  
  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    setWalletBalance(prev => prev - expense.amount);
    setTransactions(prev => [{
      id: `TXN-EXP-${Date.now()}`,
      amount: expense.amount,
      date: expense.date,
      time: new Date().toLocaleTimeString(),
      type: 'EXPENSE',
      status: 'SUCCESS',
      userId: 'admin',
      description: `Expense: ${expense.category}`,
      metadata: { expenseId: expense.id, category: expense.category, vendorName: expense.vendorName }
    }, ...prev]);
  };

  const addInvoice = (invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    setWalletBalance(prev => prev + invoice.total);
    
    setStock(prev => prev.map(item => {
      const usedItem = invoice.items.find(i => i.id === item.id);
      if (usedItem) {
        return { ...item, quantity: Math.max(0, item.quantity - usedItem.quantity) };
      }
      return item;
    }));

    setTransactions(prev => [{
      id: `TXN-INV-${Date.now()}`,
      amount: invoice.total,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: 'REVENUE',
      status: 'SUCCESS',
      userId: 'admin',
      description: `Invoice: ${invoice.invoiceNumber}`,
      metadata: { invoiceId: invoice.id }
    }, ...prev]);
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
    if (!oldInvoice) return;
    setWalletBalance(prev => prev - oldInvoice.total + updatedInvoice.total);
    setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
    setTransactions(prev => prev.map(t => {
      if (t.metadata?.invoiceId === updatedInvoice.id) {
        return { ...t, amount: updatedInvoice.total, description: `Invoice (Updated): ${updatedInvoice.invoiceNumber}` };
      }
      return t;
    }));
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    setWalletBalance(prev => prev - inv.total);
    setInvoices(prev => prev.filter(i => i.id !== id));
    setTransactions(prev => prev.filter(t => t.metadata?.invoiceId !== id));
    setAuditLogs(prev => [{ id: `AUD-INV-${Date.now()}`, jobId: inv.invoiceNumber, deletedBy: 'Admin', dateTime: new Date().toISOString(), action: 'DELETE' }, ...prev]);
  };

  const updateStockItem = (item: StockItem) => {
    setStock(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? item : i);
      return [item, ...prev];
    });
  };

  const deleteStockItem = (id: string) => setStock(prev => prev.filter(i => i.id !== id));

  const topUpWallet = (amount: number) => {
    setWalletBalance(prev => prev + amount);
    setTransactions(prev => [{
      id: `TXN-TOP-${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: 'TOPUP',
      status: 'SUCCESS',
      userId: 'admin',
      description: 'Wallet Top-Up'
    }, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    if (tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT' || tx.type === 'REVENUE') {
      setWalletBalance(prev => prev - tx.amount);
    } else {
      setWalletBalance(prev => prev + tx.amount);
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const manualAdjust = (amount: number, type: 'CREDIT' | 'DEBIT', description: string) => {
    const finalAmount = Math.abs(amount);
    if (type === 'CREDIT') setWalletBalance(prev => prev + finalAmount);
    else setWalletBalance(prev => prev - finalAmount);

    setTransactions(prev => [{
      id: `TXN-MAN-${Date.now()}`,
      amount: finalAmount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: type === 'CREDIT' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT',
      status: 'SUCCESS',
      userId: 'admin',
      description: description || `Manual ${type}`
    }, ...prev]);
  };

  const addTransportLog = (log: TransportationLog) => setTransportationLogs(prev => [log, ...prev]);
  const updateTransportLogStatus = (id: string, status: any) => {
    setTransportationLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const updateAttendance = (record: AttendanceRecord) => setAttendance(prev => {
    const existing = prev.findIndex(r => r.employeeId === record.employeeId && r.date === record.date);
    if (existing > -1) {
       const updated = [...prev];
       updated[existing] = { ...updated[existing], ...record };
       return updated;
    }
    return [record, ...prev];
  });

  const importAllData = (data: any) => {
    if (data.calls) setCalls(data.calls);
    if (data.inquiries) setInquiries(data.inquiries);
    if (data.expenses) setExpenses(data.expenses);
    if (data.transactions) setTransactions(data.transactions);
    if (data.transportationLogs) setTransportationLogs(data.transportationLogs);
    if (data.invoices) setInvoices(data.invoices);
    if (data.employees) setEmployees(data.employees);
    if (data.attendance) setAttendance(data.attendance);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    if (data.stock) setStock(data.stock);
    if (data.walletBalance !== undefined) setWalletBalance(Number(data.walletBalance));
    if (data.shopLogo) setShopLogo(data.shopLogo);
  };

  return {
    calls, addCall, updateCall, deleteCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transactions, topUpWallet, deleteTransaction, manualAdjust,
    transportationLogs, addTransportLog, updateTransportLogStatus,
    invoices, addInvoice, deleteInvoice, updateInvoice,
    stock, updateStockItem, deleteStockItem,
    auditLogs,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo,
    visibility, updateVisibility,
    importAllData
  };
}
