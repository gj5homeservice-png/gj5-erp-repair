"use client"

import { useState, useEffect } from 'react';
import { RepairCall, Inquiry, Employee, AttendanceRecord, Expense, Invoice } from '@/lib/types';

export interface VisibilitySettings {
  tabs: {
    Repairing: boolean;
    Billing: boolean;
    Employees: boolean;
    'E-Wallet': boolean;
  };
  kpis: {
    totalActive: boolean;
    pending: boolean;
    completed: boolean;
    rejected: boolean;
    repeat: boolean;
    exchange: boolean;
  };
}

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(5000);
  const [whatsappGateway, setWhatsappGateway] = useState<string>('https://web.whatsapp.com/');
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const [visibility, setVisibility] = useState<VisibilitySettings>({
    tabs: {
      Repairing: true,
      Billing: true,
      Employees: true,
      'E-Wallet': true
    },
    kpis: {
      totalActive: true,
      pending: true,
      completed: true,
      rejected: true,
      repeat: true,
      exchange: true
    }
  });

  useEffect(() => {
    // Load logo and visibility from local storage if exists
    const savedLogo = localStorage.getItem('gj5_shop_logo');
    if (savedLogo) setShopLogo(savedLogo);

    const savedVisibility = localStorage.getItem('gj5_visibility_settings');
    if (savedVisibility) {
      try {
        setVisibility(JSON.parse(savedVisibility));
      } catch (e) {
        console.error("Failed to parse visibility settings", e);
      }
    }

    setEmployees([
      { id: 'EMP101', name: 'Rajesh Sharma', role: 'Senior Technician', mobile: '9876543210', salary: 25000, dailyWage: 833 },
      { id: 'EMP102', name: 'Amit Patel', role: 'Runner', mobile: '9123456789', salary: 15000, dailyWage: 500 }
    ]);

    const initialTimestamp = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    setCalls([
      {
        id: 'TV1001',
        customerId: 'GJ51001',
        customerName: 'Suresh Kumar',
        mobile: '9988776655',
        address: 'Adajan, Surat',
        pincode: '395009',
        category: 'TV',
        brand: 'Sony',
        model: 'KD-55X7500H',
        screenSize: '55',
        technician: 'Rajesh Sharma',
        pickupRequired: true,
        pickupBy: 'Amaro Boy',
        runnerName: 'Amit Patel',
        createdAt: initialTimestamp,
        updatedAt: initialTimestamp,
        status: 'Pending',
        visitHistory: [
          {
            visitNumber: 1,
            timestamp: initialTimestamp,
            issue: 'Sound OK - No Video',
            technician: 'Rajesh Sharma',
            notes: 'Initial check, backlight suspected',
            statusAtTime: 'Pending'
          }
        ]
      }
    ]);
  }, []);

  const handleSetShopLogo = (logo: string | null) => {
    setShopLogo(logo);
    if (logo) {
      localStorage.setItem('gj5_shop_logo', logo);
    } else {
      localStorage.removeItem('gj5_shop_logo');
    }
  };

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

  const addAttendance = (record: AttendanceRecord) => setAttendance(prev => [record, ...prev]);
  const updateAttendance = (record: AttendanceRecord) => setAttendance(prev => {
    const existing = prev.findIndex(r => r.employeeId === record.employeeId && r.date === record.date);
    if (existing > -1) {
       const updated = [...prev];
       updated[existing] = { ...updated[existing], ...record };
       return updated;
    }
    return [record, ...prev];
  });

  const addInvoice = (invoice: Invoice) => setInvoices(prev => [invoice, ...prev]);

  return {
    calls, setCalls, addCall, updateCall,
    inquiries, addInquiry,
    employees,
    attendance, addAttendance, updateAttendance,
    expenses, addExpense,
    invoices, addInvoice,
    walletBalance, setWalletBalance,
    whatsappGateway, setWhatsappGateway,
    shopLogo, setShopLogo: handleSetShopLogo,
    visibility, updateVisibility
  };
}
