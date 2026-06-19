
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
  StockItem,
  VisibilitySettings
} from '@/lib/types';

const DEFAULT_NAV_ORDER = [
  'Repairing',
  'CRM Leads',
  'Billing',
  'Invoice History',
  'Stock',
  'Analytics',
  'Employees',
  'E-Wallet',
  'Transportation'
];

export function useErpStore() {
  const [calls, setCalls] = useState<RepairCall[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transportationLogs, setTransportationLogs] = useState<TransportationLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(50000);
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<VisibilitySettings>({ tabs: {}, kpis: {} });
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);

  useEffect(() => {
    const safeGet = (key: string, setter: any) => {
      const val = localStorage.getItem(key);
      if (val) setter(JSON.parse(val));
    };
    safeGet('gj5_invoices', setInvoices);
    safeGet('gj5_stock', setStock);
    safeGet('gj5_calls', setCalls);
    safeGet('gj5_inquiries', setInquiries);
    safeGet('gj5_wallet_balance', setWalletBalance);
    safeGet('gj5_visibility', setVisibility);
    safeGet('gj5_nav_order', setNavOrder);
  }, []);

  useEffect(() => { localStorage.setItem('gj5_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('gj5_stock', JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem('gj5_wallet_balance', JSON.stringify(walletBalance)); }, [walletBalance]);

  const addInvoice = (invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    setWalletBalance(prev => prev + invoice.grandTotal);
    
    // Auto-Stock Reduction
    setStock(prevStock => prevStock.map(s => {
      const used = invoice.items.find(i => i.id === s.id || i.name === s.name);
      if (used) {
        return { 
          ...s, 
          quantity: Math.max(0, s.quantity - used.quantity),
          lastUpdated: new Date().toISOString()
        };
      }
      return s;
    }));

    // Record Transaction
    setTransactions(prev => [{
      id: `TXN-${Date.now()}`,
      amount: invoice.grandTotal,
      date: invoice.date,
      time: format(new Date(), 'hh:mm a'),
      type: 'REVENUE',
      status: 'SUCCESS',
      userId: 'Admin',
      description: `Invoice: ${invoice.invoiceNumber}`
    }, ...prev]);
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    if (target) setWalletBalance(prev => prev - target.grandTotal);
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const updateStockItem = (item: StockItem) => {
    setStock(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? item : i);
      return [item, ...prev];
    });
  };

  return {
    invoices, addInvoice, deleteInvoice,
    stock, updateStockItem,
    calls, setCalls,
    inquiries, setInquiries,
    walletBalance, setWalletBalance,
    visibility, setVisibility,
    navOrder, setNavOrder,
    shopLogo, setShopLogo,
    transactions,
    employees, setEmployees,
    attendance, setAttendance,
    expenses, setExpenses,
    transportationLogs, setTransportationLogs
  };
}
