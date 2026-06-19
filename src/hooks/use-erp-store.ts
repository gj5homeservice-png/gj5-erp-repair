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
  LogisticsStatus
} from '@/lib/types';
import { db, doc, setDoc, collection, updateDoc, deleteDoc } from '@/firebase';

const DEFAULT_NAV_ORDER = [
  'Dashboard',
  'Repairing',
  'CRM Leads',
  'Billing',
  'Invoice History',
  'Stock',
  'Analytics',
  'E-Wallet',
  'Transportation'
];

const DEFAULT_VISIBILITY = {
  tabs: {
    'Dashboard': true,
    'Repairing': true,
    'CRM Leads': true,
    'Billing': true,
    'Invoice History': true,
    'Stock': true,
    'Analytics': true,
    'E-Wallet': true,
    'Transportation': true
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transportationLogs, setTransportationLogs] = useState<TransportationLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(50000);
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [deletePassword, setDeletePassword] = useState<string>('1234');

  useEffect(() => {
    const safeGet = (key: string, setter: any) => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          if (val.startsWith('data:image/') || key === 'gj5_shop_logo') {
            setter(val);
          } else {
            setter(JSON.parse(val));
          }
        } catch (e) {
          if (key === 'gj5_shop_logo' || key === 'gj5_delete_password') {
            setter(val);
          } else {
            console.error(`Error parsing ${key}:`, e);
          }
        }
      }
    };
    safeGet('gj5_invoices', setInvoices);
    safeGet('gj5_stock', setStock);
    safeGet('gj5_calls', setCalls);
    safeGet('gj5_inquiries', setInquiries);
    safeGet('gj5_expenses', setExpenses);
    safeGet('gj5_transactions', setTransactions);
    safeGet('gj5_transport_logs', setTransportationLogs);
    safeGet('gj5_wallet_balance', setWalletBalance);
    safeGet('gj5_visibility', setVisibility);
    safeGet('gj5_nav_order', setNavOrder);
    safeGet('gj5_shop_logo', setShopLogo);
    safeGet('gj5_delete_password', setDeletePassword);
  }, []);

  useEffect(() => { localStorage.setItem('gj5_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('gj5_stock', JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem('gj5_calls', JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem('gj5_inquiries', JSON.stringify(inquiries)); }, [inquiries]);
  useEffect(() => { localStorage.setItem('gj5_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('gj5_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('gj5_transport_logs', JSON.stringify(transportationLogs)); }, [transportationLogs]);
  useEffect(() => { localStorage.setItem('gj5_wallet_balance', JSON.stringify(walletBalance)); }, [walletBalance]);
  useEffect(() => { localStorage.setItem('gj5_visibility', JSON.stringify(visibility)); }, [visibility]);
  useEffect(() => { localStorage.setItem('gj5_nav_order', JSON.stringify(navOrder)); }, [navOrder]);
  useEffect(() => { if (shopLogo) localStorage.setItem('gj5_shop_logo', shopLogo); }, [shopLogo]);
  useEffect(() => { localStorage.setItem('gj5_delete_password', deletePassword); }, [deletePassword]);

  const updateDeletePassword = async (newPassword: string) => {
    setDeletePassword(newPassword);
    try {
      const settingsRef = doc(db, "settings", "security");
      await setDoc(settingsRef, { deletePassword: newPassword, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error("Failed to sync security settings to cloud:", e);
    }
  };

  const addInvoice = (invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    invoice.items?.forEach(item => {
      const stockItem = stock.find(s => s.name === item.name || s.barcode === item.id);
      if (stockItem) {
        const updatedItem = {
          ...stockItem,
          quantity: Math.max(0, (stockItem.quantity || 0) - (item.quantity || 0)),
          lastUpdated: new Date().toISOString(),
          history: [{
            id: `MOV-${Date.now()}-${item.id}`,
            date: new Date().toISOString(),
            type: 'SALE',
            quantity: item.quantity,
            notes: `Sale for Invoice ${invoice.invoiceNumber}`,
            performedBy: 'Billing System',
            referenceId: invoice.invoiceNumber,
            customerName: invoice.customerName
          }, ...(stockItem.history || [])]
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
      description: `Sale: ${invoice.invoiceNumber} - ${invoice.customerName}`,
      metadata: { invoiceId: invoice.id }
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
  const updateInquiry = (inq: Inquiry) => setInquiries(prev => prev.map(i => i.id === inq.id ? inq : i));
  const deleteInquiry = (id: string) => setInquiries(prev => prev.filter(i => i.id !== id));

  const convertInquiryToJob = (inqId: string, jobId: string) => {
    const inq = inquiries.find(i => i.id === inqId);
    if (!inq) return;
    const newCall: RepairCall = {
      id: jobId,
      customerId: inq.id.replace('INQ', 'GJ5'),
      customerName: inq.customerName,
      mobile: inq.mobile,
      address: inq.address || '',
      pincode: inq.pincode || '',
      category: inq.productType,
      brand: inq.brand,
      model: inq.modelNumber || '',
      screenSize: '',
      techTags: [],
      intakeMode: 'Customer Visit',
      status: 'Pending',
      problemDescription: inq.problemDescription || inq.notes || '',
      visitHistory: [],
      repeatCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addCall(newCall);
    updateInquiry({ ...inq, status: 'Converted', convertedJobId: jobId, conversionDate: new Date().toISOString() });
  };

  const addExpense = (exp: Expense) => {
    setExpenses(prev => [exp, ...prev]);
    const tx: WalletTransaction = {
      id: `TX-EXP-${exp.id}`,
      amount: exp.amount,
      date: exp.date,
      time: new Date().toLocaleTimeString(),
      type: 'EXPENSE',
      description: `${exp.category}: ${exp.vendorName}`,
      metadata: { expenseId: exp.id, category: exp.category, vendorName: exp.vendorName }
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

  const updateTransaction = (tx: WalletTransaction) => setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));

  const addTransportLog = (log: TransportationLog) => setTransportationLogs(prev => [log, ...prev]);
  const updateTransportLog = (log: TransportationLog) => setTransportationLogs(prev => prev.map(l => l.id === log.id ? log : l));
  const updateTransportLogStatus = (id: string, status: LogisticsStatus) => setTransportationLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  const deleteTransportLog = (id: string) => setTransportationLogs(prev => prev.filter(l => l.id !== id));

  const resetNavOrder = () => setNavOrder(DEFAULT_NAV_ORDER);
  const updateVisibility = (v: VisibilitySettings) => setVisibility(v);

  const importAllData = (data: any) => {
    if (data.calls) setCalls(data.calls);
    if (data.inquiries) setInquiries(data.inquiries);
    if (data.expenses) setExpenses(data.expenses);
    if (data.transactions) setTransactions(data.transactions);
    if (data.transportationLogs) setTransportationLogs(data.transportationLogs);
    if (data.invoices) setInvoices(data.invoices);
    if (data.stock) setStock(data.stock);
    if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance);
    if (data.visibility) setVisibility(data.visibility);
    if (data.navOrder) setNavOrder(data.navOrder);
    if (data.shopLogo) setShopLogo(data.shopLogo);
    if (data.deletePassword) setDeletePassword(data.deletePassword);
  };

  return {
    invoices, addInvoice, deleteInvoice,
    stock, updateStockItem, deleteStockItem,
    calls, addCall, updateCall, deleteCall,
    inquiries, addInquiry, updateInquiry, deleteInquiry, convertInquiryToJob,
    walletBalance, setWalletBalance, topUpWallet, manualAdjust,
    visibility, setVisibility, updateVisibility,
    navOrder, setNavOrder, resetNavOrder,
    shopLogo, setShopLogo,
    deletePassword, setDeletePassword, setDeletePassword: updateDeletePassword,
    transactions, deleteTransaction, updateTransaction,
    expenses, addExpense,
    transportationLogs, addTransportLog, updateTransportLog, updateTransportLogStatus, deleteTransportLog,
    importAllData
  };
}
