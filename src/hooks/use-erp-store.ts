
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
  VisibilitySettings as IVisibilitySettings 
} from '@/lib/types';

export interface VisibilitySettings {
  tabs: {
    Repairing: boolean;
    Billing: boolean;
    Employees: boolean;
    'E-Wallet': boolean;
    Transportation: boolean;
  };
  kpis: {
    totalActive: boolean;
    pending: boolean;
    completed: boolean;
    repeat: boolean;
    rejected: boolean;
    exchange: boolean;
    warranty: boolean;
  };
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  tabs: {
    Repairing: true,
    Billing: true,
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

    const savedCalls = localStorage.getItem('gj5_repair_calls');
    if (savedCalls) {
      try { setCalls(JSON.parse(savedCalls)); } catch (e) {}
    }

    const savedInquiries = localStorage.getItem('gj5_inquiries');
    if (savedInquiries) {
      try { setInquiries(JSON.parse(savedInquiries)); } catch (e) {}
    }

    const savedLogs = localStorage.getItem('gj5_transport_logs');
    if (savedLogs) {
      try { setTransportationLogs(JSON.parse(savedLogs)); } catch (e) {}
    }

    const savedInvoices = localStorage.getItem('gj5_invoices');
    if (savedInvoices) {
      try { setInvoices(JSON.parse(savedInvoices)); } catch (e) {}
    }

    const savedEmployees = localStorage.getItem('gj5_employees');
    if (savedEmployees) {
      try { setEmployees(JSON.parse(savedEmployees)); } catch (e) {}
    }

    const savedAttendance = localStorage.getItem('gj5_attendance');
    if (savedAttendance) {
      try { setAttendance(JSON.parse(savedAttendance)); } catch (e) {}
    }

    const savedExpenses = localStorage.getItem('gj5_expenses');
    if (savedExpenses) {
      try { setExpenses(JSON.parse(savedExpenses)); } catch (e) {}
    }

    const savedTransactions = localStorage.getItem('gj5_wallet_transactions');
    if (savedTransactions) {
      try { setTransactions(JSON.parse(savedTransactions)); } catch (e) {}
    }

    const savedBalance = localStorage.getItem('gj5_wallet_balance');
    if (savedBalance) {
      try { setWalletBalance(Number(savedBalance)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gj5_repair_calls', JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    localStorage.setItem('gj5_inquiries', JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem('gj5_transport_logs', JSON.stringify(transportationLogs));
  }, [transportationLogs]);

  useEffect(() => {
    localStorage.setItem('gj5_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('gj5_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('gj5_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('gj5_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('gj5_wallet_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('gj5_wallet_balance', walletBalance.toString());
  }, [walletBalance]);

  const updateVisibility = (newSettings: VisibilitySettings) => {
    setVisibility(newSettings);
    localStorage.setItem('gj5_visibility_settings', JSON.stringify(newSettings));
  };

  const addCall = (call: RepairCall) => setCalls(prev => [call, ...prev]);
  const updateCall = (updatedCall: RepairCall) => setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
  
  const addInquiry = (inquiry: Inquiry) => setInquiries(prev => [inquiry, ...prev]);
  
  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    setWalletBalance(prev => prev - expense.amount);
    
    // Log as transaction
    const trans: WalletTransaction = {
      id: `TXN-EXP-${Date.now()}`,
      amount: expense.amount,
      date: expense.date,
      time: new Date().toLocaleTimeString(),
      type: 'EXPENSE',
      status: 'SUCCESS',
      userId: 'admin',
      description: `Expense: ${expense.category}`
    };
    setTransactions(prev => [trans, ...prev]);
  };

  const topUpWallet = (amount: number) => {
    setWalletBalance(prev => prev + amount);
    const trans: WalletTransaction = {
      id: `TXN-TOP-${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      type: 'TOPUP',
      status: 'SUCCESS',
      userId: 'admin',
      description: 'Wallet Top-Up'
    };
    setTransactions(prev => [trans, ...prev]);
  };

  const addInvoice = (invoice: Invoice) => setInvoices(prev => [invoice, ...prev]);

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
    if (data.walletBalance !== undefined) setWalletBalance(Number(data.walletBalance));
  };

  return {
    calls, addCall, updateCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transactions, topUpWallet,
    transportationLogs, addTransportLog, updateTransportLogStatus,
    invoices, addInvoice,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo,
    visibility, updateVisibility,
    importAllData
  };
}
