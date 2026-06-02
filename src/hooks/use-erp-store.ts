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

  useEffect(() => {
    const savedLogo = localStorage.getItem('gj5_shop_logo');
    if (savedLogo) setShopLogo(savedLogo);

    const savedVisibility = localStorage.getItem('gj5_visibility_settings');
    if (savedVisibility) {
      try {
        const parsed = JSON.parse(savedVisibility);
        setVisibility({
          tabs: { ...DEFAULT_VISIBILITY.tabs, ...parsed.tabs },
          kpis: { ...DEFAULT_VISIBILITY.kpis, ...parsed.kpis }
        });
      } catch (e) {
        setVisibility(DEFAULT_VISIBILITY);
      }
    }

    // Restore all other states from local storage
    const load = (key: string, setter: any) => {
      const val = localStorage.getItem(key);
      if (val) {
        try { setter(JSON.parse(val)); } catch (e) { console.error(`Error loading ${key}`, e); }
      }
    };

    load('gj5_repair_calls', setCalls);
    load('gj5_inquiries', setInquiries);
    load('gj5_transport_logs', setTransportationLogs);
    load('gj5_invoices', setInvoices);
    load('gj5_employees', setEmployees);
    load('gj5_attendance', setAttendance);
    load('gj5_expenses', setExpenses);
    load('gj5_wallet_transactions', setTransactions);
    load('gj5_audit_logs', setAuditLogs);
    load('gj5_stock', setStock);
    
    const savedBalance = localStorage.getItem('gj5_wallet_balance');
    if (savedBalance) setWalletBalance(Number(savedBalance));
  }, []);

  // Persisters
  useEffect(() => { localStorage.setItem('gj5_repair_calls', JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem('gj5_inquiries', JSON.stringify(inquiries)); }, [inquiries]);
  useEffect(() => { localStorage.setItem('gj5_transport_logs', JSON.stringify(transportationLogs)); }, [transportationLogs]);
  useEffect(() => { localStorage.setItem('gj5_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('gj5_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('gj5_attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('gj5_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('gj5_wallet_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('gj5_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('gj5_stock', JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem('gj5_wallet_balance', walletBalance.toString()); }, [walletBalance]);

  const updateVisibility = (newSettings: VisibilitySettings) => {
    setVisibility(newSettings);
    localStorage.setItem('gj5_visibility_settings', JSON.stringify(newSettings));
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
    
    // Auto-deplete stock
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

  const deleteInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    setWalletBalance(prev => prev - inv.total);
    setInvoices(prev => prev.filter(i => i.id !== id));
    setTransactions(prev => prev.filter(t => t.metadata?.invoiceId !== id));
    // Optional: add back to stock?
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
  };

  return {
    calls, addCall, updateCall, deleteCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transactions, topUpWallet, deleteTransaction, manualAdjust,
    transportationLogs, addTransportLog, updateTransportLogStatus,
    invoices, addInvoice, deleteInvoice,
    stock, updateStockItem, deleteStockItem,
    auditLogs,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo,
    visibility, updateVisibility,
    importAllData
  };
}
