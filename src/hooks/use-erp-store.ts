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
  AttendanceLink
} from '@/lib/types';

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
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [deletePassword, setDeletePassword] = useState<string>('1234');
  
  // Multi-workspace Company Metadata
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  useEffect(() => {
    const activeUser = localStorage.getItem('gj5_active_user');
    if (!activeUser) return;

    const prefix = `gj5_user_${activeUser}_`;
    const companyKey = `gj5_company_${activeUser}`;
    
    // Load Company Metadata
    const compData = localStorage.getItem(companyKey);
    if (compData) setCompanyProfile(JSON.parse(compData));

    const safeGet = (key: string, setter: any) => {
      const val = localStorage.getItem(prefix + key);
      if (val) {
        try {
          setter(JSON.parse(val));
        } catch (e) {
          console.error(`Error parsing ${key}:`, e);
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
    safeGet('wallet_balance', setWalletBalance);
  }, []);

  // Save with User Prefix for isolation
  useEffect(() => {
    const activeUser = localStorage.getItem('gj5_active_user');
    if (!activeUser) return;
    const prefix = `gj5_user_${activeUser}_`;
    
    const save = (key: string, data: any) => localStorage.setItem(prefix + key, JSON.stringify(data));
    
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
  }, [invoices, stock, calls, inquiries, expenses, transactions, transportationLogs, employees, attendance, salaries, leaves, attendanceLinks, walletBalance]);

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

  const addCall = (call: RepairCall) => setCalls(prev => [call, ...prev]);
  const updateCall = (call: RepairCall) => setCalls(prev => prev.map(c => c.id === call.id ? call : c));
  const deleteCall = (id: string) => setCalls(prev => prev.filter(c => c.id !== id));

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

  const importAllData = (data: any) => {
    if (data.calls) setCalls(data.calls);
    if (data.inquiries) setInquiries(data.inquiries);
    if (data.expenses) setExpenses(data.expenses);
    if (data.transactions) setTransactions(data.transactions);
    if (data.transportationLogs) setTransportationLogs(data.transportationLogs);
    if (data.invoices) setInvoices(data.invoices);
    if (data.stock) setStock(data.stock);
    if (data.employees) setEmployees(data.employees);
    if (data.attendance) setAttendance(data.attendance);
    if (data.salaries) setSalaries(data.salaries);
    if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance);
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
    companyProfile,
    deletePassword,
    transactions, deleteTransaction,
    expenses, addExpense,
    transportationLogs, addTransportLog, updateTransportLogStatus, deleteTransportLog,
    importAllData
  };
}
