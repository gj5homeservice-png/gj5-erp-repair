
"use client"

import { useState, useEffect } from 'react';
import { RepairCall, Inquiry, Employee, AttendanceRecord, Expense, TransportationLog } from '@/lib/types';

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
    rejected: boolean;
    exchange: boolean;
  };
}

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transportation, setTransportation] = useState<TransportationLog[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(5000);
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const [visibility, setVisibility] = useState<VisibilitySettings>({
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
      rejected: true,
      exchange: true
    }
  });

  useEffect(() => {
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

    const savedCalls = localStorage.getItem('gj5_repair_calls');
    if (savedCalls) {
      try {
        setCalls(JSON.parse(savedCalls));
      } catch (e) {}
    } else {
      const initialTimestamp = new Date().toISOString();
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
          pickupRequired: false,
          intakeMode: 'Customer Walk-In',
          createdAt: initialTimestamp,
          updatedAt: initialTimestamp,
          status: 'Pending',
          visitHistory: [
            {
              visitNumber: 1,
              timestamp: initialTimestamp,
              issue: 'Sound OK - No Video',
              notes: 'Initial check',
              statusAtTime: 'Pending'
            }
          ]
        }
      ]);
    }

    const savedInquiries = localStorage.getItem('gj5_inquiries');
    if (savedInquiries) try { setInquiries(JSON.parse(savedInquiries)); } catch (e) {}

    const savedTrans = localStorage.getItem('gj5_transportation');
    if (savedTrans) try { setTransportation(JSON.parse(savedTrans)); } catch (e) {}

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
    localStorage.setItem('gj5_transportation', JSON.stringify(transportation));
  }, [transportation]);

  const handleSetShopLogo = (logo: string | null) => {
    setShopLogo(logo);
    if (logo) localStorage.setItem('gj5_shop_logo', logo);
    else localStorage.removeItem('gj5_shop_logo');
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

  const updateAttendance = (record: AttendanceRecord) => setAttendance(prev => {
    const existing = prev.findIndex(r => r.employeeId === record.employeeId && r.date === record.date);
    if (existing > -1) {
       const updated = [...prev];
       updated[existing] = { ...updated[existing], ...record };
       return updated;
    }
    return [record, ...prev];
  });

  const addTransportationLog = (log: TransportationLog) => setTransportation(prev => [log, ...prev]);
  const updateTransportationLog = (id: string, status: TransportationLog['status']) => 
    setTransportation(prev => prev.map(l => l.id === id ? { ...l, status } : l));

  return {
    calls, addCall, updateCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transportation, addTransportationLog, updateTransportationLog,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo: handleSetShopLogo,
    visibility, updateVisibility
  };
}
