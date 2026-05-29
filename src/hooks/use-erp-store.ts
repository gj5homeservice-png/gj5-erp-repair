"use client"

import { useState, useEffect } from 'react';
import { RepairCall, Inquiry, Employee, AttendanceRecord, Expense, TransportationLog, Vehicle, TransportEntry } from '@/lib/types';

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
    exchange: true
  }
};

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transportation, setTransportation] = useState<TransportationLog[]>([]);
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
        console.error("Failed to parse visibility settings", e);
      }
    }

    const savedCalls = localStorage.getItem('gj5_repair_calls');
    if (savedCalls) {
      try { setCalls(JSON.parse(savedCalls)); } catch (e) {}
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

    const savedEntries = localStorage.getItem('gj5_transport_entries');
    if (savedEntries) try { setTransportEntries(JSON.parse(savedEntries)); } catch (e) {}

    const savedInquiries = localStorage.getItem('gj5_inquiries');
    if (savedInquiries) try { setInquiries(JSON.parse(savedInquiries)); } catch (e) {}

    const savedVehicles = localStorage.getItem('gj5_vehicles');
    if (savedVehicles) try { setVehicles(JSON.parse(savedVehicles)); } catch (e) {}

    setEmployees([
      { id: 'EMP101', name: 'Rajesh Sharma', role: 'Senior Technician', mobile: '9876543210', salary: 25000, dailyWage: 833 },
      { id: 'EMP102', name: 'Amit Patel', role: 'Runner', mobile: '9123456789', salary: 15000, dailyWage: 500 }
    ]);
  }, []);

  useEffect(() => {
    localStorage.setItem('gj5_repair_calls', JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    localStorage.setItem('gj5_transport_entries', JSON.stringify(transportEntries));
  }, [transportEntries]);

  useEffect(() => {
    localStorage.setItem('gj5_inquiries', JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem('gj5_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

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

  const addTransportEntry = (entry: TransportEntry) => setTransportEntries(prev => [entry, ...prev]);
  const updateTransportEntry = (updated: TransportEntry) => setTransportEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteTransportEntry = (id: string) => setTransportEntries(prev => prev.filter(e => e.id !== id));

  const addVehicle = (vehicle: Vehicle) => setVehicles(prev => [vehicle, ...prev]);
  const updateVehicle = (updatedVehicle: Vehicle) => setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  const deleteVehicle = (id: string) => setVehicles(prev => prev.filter(v => v.id !== id));

  return {
    calls, addCall, updateCall,
    inquiries, addInquiry,
    employees,
    attendance, updateAttendance,
    expenses, addExpense,
    transportEntries, addTransportEntry, updateTransportEntry, deleteTransportEntry,
    vehicles, addVehicle, updateVehicle, deleteVehicle,
    walletBalance, setWalletBalance,
    shopLogo, setShopLogo: handleSetShopLogo,
    visibility, updateVisibility
  };
}
