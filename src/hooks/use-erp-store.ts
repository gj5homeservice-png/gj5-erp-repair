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

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

    setEmployees([
      { id: 'EMP101', name: 'Rajesh Sharma', role: 'Senior Technician', mobile: '9876543210', salary: 25000, dailyWage: 833 },
      { id: 'EMP102', name: 'Amit Patel', role: 'Runner', mobile: '9123456789', salary: 15000, dailyWage: 500 }
    ]);
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

  return {
    calls, addCall, updateCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transportationLogs, addTransportLog, updateTransportLogStatus,
    invoices, addInvoice,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo,
    visibility, updateVisibility
  };
}
