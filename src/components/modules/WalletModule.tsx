
"use client"

import React, { useMemo, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  MinusCircle,
  Sparkles,
  Search,
  History,
  Trash2,
  Filter,
  AlertTriangle,
  Users,
  Package,
  Wrench,
  Download,
  Printer,
  Landmark,
  Smartphone,
  CreditCard,
  Banknote,
  HelpCircle,
  Building2,
  ArrowLeftRight,
  HandCoins,
  Undo2,
  Receipt,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, isToday, isYesterday, isSameMonth, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { TopUpModal } from './wallet/TopUpModal';
import { OtherIncomeModal } from './wallet/OtherIncomeModal';
import { TransactionDetailModal } from './wallet/TransactionDetailModal';
import { AccountFormModal } from './wallet/AccountFormModal';
import { AccountMoveModal, type MoveMode } from './wallet/AccountMoveModal';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';
import {
  computeFinancials,
  buildLedger,
  withRunningBalance,
  computeReceivables,
  computePayables,
  computeRepairFinancials,
  computeStockFinancials,
  computeCustomerAdvances,
  computeAccountRollups,
  type LedgerEntry,
} from '@/lib/wallet-engine';

const EXPENSE_CATEGORIES = ['Stock', 'Repair Parts', 'Salary', 'Rent', 'Electricity', 'Transport', 'Marketing', 'Office', 'Maintenance', 'Other'];
const PAYMENT_METHODS_LIST = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];
const METHOD_ICON: Record<string, any> = { Cash: Banknote, UPI: Smartphone, 'Bank Transfer': Landmark, Card: CreditCard, Other: HelpCircle };

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

function inDatePreset(dateStr: string, preset: DatePreset, customFrom: string, customTo: string): boolean {
  if (preset === 'ALL') return true;
  const d = parseISO(dateStr);
  if (!isValid(d)) return false;
  const now = new Date();
  switch (preset) {
    case 'TODAY': return isToday(d);
    case 'YESTERDAY': return isYesterday(d);
    case 'THIS_WEEK': return isWithinInterval(d, { start: startOfWeek(now), end: endOfWeek(now) });
    case 'THIS_MONTH': return isSameMonth(d, now);
    case 'LAST_MONTH': return isSameMonth(d, subMonths(now, 1));
    case 'CUSTOM': {
      if (!customFrom || !customTo) return true;
      const from = parseISO(customFrom);
      const to = parseISO(customTo);
      if (!isValid(from) || !isValid(to)) return true;
      return isWithinInterval(d, { start: from, end: to });
    }
    default: return true;
  }
}

function fmtMoney(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(dateStr: string) {
  const d = parseISO(dateStr || '');
  return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
}

function toCSV(rows: (LedgerEntry & { balance: number })[]): string {
  const header = ['Date', 'Transaction ID', 'Direction', 'Category', 'Source', 'Description', 'Customer/Vendor', 'Reference', 'Payment Method', 'Amount', 'Balance', 'Status'];
  const lines = rows.map((r) => [
    r.date, r.id, r.direction, r.category, r.sourceModule, r.description, r.customerOrVendor || '', r.reference || '', r.paymentMethod || '', r.amount, r.balance, r.status,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header.join(','), ...lines].join('\n');
}

function downloadCSV(filename: string, rows: (LedgerEntry & { balance: number })[]) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function WalletModule({ store, onNavigate }: { store: any; onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  // ---- Single computation pass over real ERP data — see src/lib/wallet-engine.ts
  // for the full anti-duplication design (each source read from exactly one place). ----
  const engineInput = useMemo(() => ({
    repairJobs: store.repairJobs || [],
    invoices: store.invoices || [],
    expenses: store.expenses || [],
    stock: store.stock || [],
    salaries: store.salaries || [],
    transactions: store.transactions || [],
    salesOrders: store.salesOrders || [],
    accounts: store.accounts || [],
  }), [store.repairJobs, store.invoices, store.expenses, store.stock, store.salaries, store.transactions, store.salesOrders, store.accounts]);

  const financials = useMemo(() => computeFinancials(engineInput), [engineInput]);
  const ledger = useMemo(() => withRunningBalance(buildLedger(engineInput)), [engineInput]);
  const receivables = useMemo(() => computeReceivables(engineInput), [engineInput]);
  const payables = useMemo(() => computePayables(engineInput), [engineInput]);
  const repairFinancials = useMemo(() => computeRepairFinancials(engineInput.repairJobs), [engineInput.repairJobs]);
  const stockFinancials = useMemo(() => computeStockFinancials(engineInput.stock), [engineInput.stock]);
  // ---- Master Money Control: accounts, customer advances ----
  const accounts = store.accounts || [];
  const customerAdvances = useMemo(() => computeCustomerAdvances(engineInput.repairJobs), [engineInput.repairJobs]);
  const accountRollups = useMemo(() => computeAccountRollups(accounts, engineInput.transactions), [accounts, engineInput.transactions]);
  const employeeOptions = useMemo(() => (store.employees || []).map((e: any) => ({ id: e.id, name: e.name })), [store.employees]);

  // ---- Modal / dialog state ----
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isOtherIncomeOpen, setIsOtherIncomeOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustment, setAdjustment] = useState({ amount: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT', description: '' });
  const [detailEntry, setDetailEntry] = useState<(LedgerEntry & { balance: number }) | null>(null);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [moveModalMode, setMoveModalMode] = useState<MoveMode | null>(null);

  const [expense, setExpense] = useState({
    amount: '', category: EXPENSE_CATEGORIES[0], description: '', vendorName: '',
    date: format(new Date(), 'yyyy-MM-dd'), paymentMode: 'Cash', reference: '', accountId: '',
  });

  // ---- Ledger filters (section 9) ----
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredLedger = useMemo(() => {
    return ledger
      .filter((e) => inDatePreset(e.date, datePreset, customFrom, customTo))
      .filter((e) => directionFilter === 'ALL' || e.direction === directionFilter)
      .filter((e) => sourceFilter === 'ALL' || e.sourceModule === sourceFilter)
      .filter((e) => methodFilter === 'ALL' || e.paymentMethod === methodFilter)
      .filter((e) => statusFilter === 'ALL' || e.status === statusFilter)
      .filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          (e.customerOrVendor || '').toLowerCase().includes(q) ||
          (e.reference || '').toLowerCase().includes(q) ||
          e.sourceRecordId.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (parseISO(b.date).getTime() || 0) - (parseISO(a.date).getTime() || 0));
  }, [ledger, search, datePreset, customFrom, customTo, directionFilter, sourceFilter, methodFilter, statusFilter]);

  // ---- Daily (last 14 days) / Monthly (last 6 months) report data ----
  const dailySeries = useMemo(() => {
    const days: { label: string; income: number; expense: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = format(d, 'dd MMM');
      const income = ledger.filter((e) => e.direction === 'INCOME' && parseISO(e.date).toDateString() === d.toDateString()).reduce((s, e) => s + e.amount, 0);
      const expense = ledger.filter((e) => e.direction === 'EXPENSE' && parseISO(e.date).toDateString() === d.toDateString()).reduce((s, e) => s + e.amount, 0);
      days.push({ label: dayLabel, income, expense });
    }
    return days;
  }, [ledger]);

  const monthlySeries = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d), end = endOfMonth(d);
      const income = ledger.filter((e) => e.direction === 'INCOME' && isWithinInterval(parseISO(e.date), { start, end })).reduce((s, e) => s + e.amount, 0);
      const expense = ledger.filter((e) => e.direction === 'EXPENSE' && isWithinInterval(parseISO(e.date), { start, end })).reduce((s, e) => s + e.amount, 0);
      months.push({ label: format(d, 'MMM yyyy'), income, expense });
    }
    return months;
  }, [ledger]);

  // ---- Handlers ----
  const handleManualAdjust = () => {
    const amt = Number(adjustment.amount);
    if (!amt || isNaN(amt)) return;
    store.manualAdjust(amt, adjustment.type, adjustment.description);
    setAdjustment({ amount: '', type: 'CREDIT', description: '' });
    setIsAdjustmentOpen(false);
  };

  const handleOtherIncome = (data: { amount: number; category: string; description: string; date: string; paymentMethod: string; reference: string; notes: string }) => {
    store.manualAdjust(data.amount, 'CREDIT', data.description || data.category, {
      category: data.category,
      description: data.description || data.category,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes,
      date: data.date,
    });
  };

  const handleAddExpense = () => {
    const amt = Number(expense.amount);
    if (!amt || amt <= 0) return;
    store.addExpense({
      id: `EXP${Date.now()}`,
      amount: amt,
      category: expense.category,
      description: expense.description,
      vendorName: expense.vendorName,
      date: expense.date,
      paymentMode: expense.paymentMode,
      reference: expense.reference,
      accountId: expense.accountId || undefined,
      timestamp: new Date().toISOString(),
    });
    setExpense({ amount: '', category: EXPENSE_CATEGORIES[0], description: '', vendorName: '', date: format(new Date(), 'yyyy-MM-dd'), paymentMode: 'Cash', reference: '', accountId: '' });
  };

  // Only wallet-native transactions (Top-Up / Manual Adjustment / Transfer /
  // Advance / Settlement / Refund) can be reversed from here — anything
  // sourced from another module must be corrected at its source (see
  // wallet-engine.ts's sourceModule design). Never deletes: the server
  // inserts an equal-and-opposite reversal entry instead (see
  // src/lib/erp/accounts.ts's reverseLedgerEntry) — the original row stays
  // forever, so the full history including "this was reversed" is visible.
  const handleReverseWalletTx = () => {
    const id = txToDelete;
    setTxToDelete(null);
    if (!id) return;
    store.reverseLedgerEntry(id)
      .then(() => toast({ title: 'Transaction Reversed', description: 'An offsetting entry has been recorded.' }))
      .catch((err: any) => toast({ variant: 'destructive', title: 'Reversal Failed', description: err?.message || 'Please try again.' }));
  };

  const summaryCards = [
    { label: 'Available Balance', value: financials.availableBalance, icon: Wallet, color: 'text-blue-400', big: true },
    { label: 'Total Income', value: financials.totalIncome, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Total Expenses', value: financials.totalExpenses, icon: TrendingDown, color: 'text-rose-400' },
    { label: 'Net Profit', value: financials.netProfit, icon: financials.netProfit >= 0 ? TrendingUp : TrendingDown, color: financials.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'Pending Receivables', value: financials.pendingReceivables, icon: ArrowDownRight, color: 'text-amber-400' },
    { label: 'Pending Payables', value: financials.pendingPayables, icon: ArrowUpRight, color: 'text-orange-400' },
    { label: "Today's Income", value: financials.todayIncome, color: 'text-emerald-400', icon: ArrowUpRight },
    { label: "Today's Expense", value: financials.todayExpense, color: 'text-rose-400', icon: ArrowDownRight },
    { label: 'This Month Income', value: financials.monthIncome, color: 'text-emerald-400', icon: TrendingUp },
    { label: 'This Month Expense', value: financials.monthExpense, color: 'text-rose-400', icon: TrendingDown },
  ];

  // ---- Master Money Control: the 19-card breakdown (exactly matching the
  // spec's numbered list 1-19) — a new, clearly-labeled section, additive
  // to the existing dashboard above rather than replacing it. Today/Week/
  // Month/All-Time P&L are computed here (trivial subtraction); everything
  // else comes straight from computeFinancials/computeAccountRollups/
  // computeCustomerAdvances, never fabricated.
  const todayPL = financials.todayIncome - financials.todayExpense;
  const weekPL = financials.weekIncome - financials.weekExpense;
  const monthPL = financials.monthIncome - financials.monthExpense;
  const masterKpiCards = [
    { label: 'Total Company Balance', value: accountRollups.totalCompanyBalance, icon: Building2, color: 'text-blue-400' },
    { label: "Today's Income", value: financials.todayIncome, icon: ArrowUpRight, color: 'text-emerald-400' },
    { label: "Today's Expense", value: financials.todayExpense, icon: ArrowDownRight, color: 'text-rose-400' },
    { label: "Today's P/L", value: todayPL, icon: todayPL >= 0 ? TrendingUp : TrendingDown, color: todayPL >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'This Week Income', value: financials.weekIncome, icon: ArrowUpRight, color: 'text-emerald-400' },
    { label: 'This Week Expense', value: financials.weekExpense, icon: ArrowDownRight, color: 'text-rose-400' },
    { label: 'This Week P/L', value: weekPL, icon: weekPL >= 0 ? TrendingUp : TrendingDown, color: weekPL >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'This Month Income', value: financials.monthIncome, icon: ArrowUpRight, color: 'text-emerald-400' },
    { label: 'This Month Expense', value: financials.monthExpense, icon: ArrowDownRight, color: 'text-rose-400' },
    { label: 'This Month P/L', value: monthPL, icon: monthPL >= 0 ? TrendingUp : TrendingDown, color: monthPL >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'All-Time Income', value: financials.totalIncome, icon: ArrowUpRight, color: 'text-emerald-400' },
    { label: 'All-Time Expense', value: financials.totalExpenses, icon: ArrowDownRight, color: 'text-rose-400' },
    { label: 'All-Time P/L', value: financials.netProfit, icon: financials.netProfit >= 0 ? TrendingUp : TrendingDown, color: financials.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'Total Customer Pending', value: financials.pendingReceivables, icon: Users, color: 'text-amber-400' },
    { label: 'Total Customer Advance', value: customerAdvances, icon: HandCoins, color: 'text-sky-400' },
    { label: 'Total Employee Advances', value: accountRollups.totalEmployeeAdvances, icon: HandCoins, color: 'text-orange-400' },
    { label: 'Total Money With Employees', value: accountRollups.totalWithEmployees, icon: UserCircle, color: 'text-purple-400' },
    { label: 'Total Cash', value: accountRollups.totalCash, icon: Banknote, color: 'text-emerald-400' },
    { label: 'Total UPI/Bank Balance', value: accountRollups.totalUpiBank, icon: Landmark, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* ================= 1. MAIN FINANCIAL DASHBOARD ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-2 bg-gradient-to-br from-[#0066FF] to-[#0052CC] p-6 md:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 w-24 h-24 md:w-32 md:h-32 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-full h-full" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="space-y-1">
              <p className="text-blue-100/80 font-bold uppercase tracking-widest text-[10px] md:text-xs">Available Balance</p>
              <h2 className="text-4xl md:text-6xl font-headline font-black tracking-tight">{fmtMoney(financials.availableBalance)}</h2>
              <p className="text-blue-100/60 text-[9px] uppercase font-bold">Opening Balance + Real Income Received − Real Expenses Paid</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setIsTopUpOpen(true)} className="bg-white text-[#0066FF] hover:bg-slate-100 h-11 px-6 rounded-xl font-bold uppercase text-xs shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" /> Top-Up
              </Button>
              <Button onClick={() => setIsOtherIncomeOpen(true)} variant="outline" className="bg-emerald-600/20 border-emerald-400/30 text-white hover:bg-emerald-600/40 h-11 px-6 rounded-xl font-bold uppercase text-xs">
                <Sparkles className="w-4 h-4 mr-2" /> Other Income
              </Button>
              <Button onClick={() => setIsAdjustmentOpen(true)} variant="outline" className="bg-blue-600/20 border-blue-400/30 text-white hover:bg-blue-600/40 h-11 px-6 rounded-xl font-bold uppercase text-xs">
                <Filter className="w-4 h-4 mr-2" /> Manual Adjustment
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:col-span-2">
          {summaryCards.slice(1, 5).map((stat, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{stat.label}</p>
                <stat.icon className={cn('w-3.5 h-3.5 opacity-60', stat.color)} />
              </div>
              <p className={cn('text-lg md:text-2xl font-headline font-bold mt-2', stat.color)}>{fmtMoney(stat.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.slice(5).map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{stat.label}</p>
              <stat.icon className={cn('w-3 h-3 opacity-50', stat.color)} />
            </div>
            <p className={cn('text-base md:text-xl font-headline font-bold mt-2', stat.color)}>{fmtMoney(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* ================= MASTER MONEY CONTROL — the 19-card KPI breakdown ================= */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
        <h3 className="text-sm font-headline font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" /> Master Money Control</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {masterKpiCards.map((stat, i) => (
            <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{stat.label}</p>
                <stat.icon className={cn('w-3 h-3 opacity-50 shrink-0', stat.color)} />
              </div>
              <p className={cn('text-sm md:text-lg font-headline font-bold mt-1.5', stat.color)}>{fmtMoney(stat.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-950/50 border border-slate-800 h-11 p-1 rounded-xl mb-6 grid grid-cols-3 sm:grid-cols-6 gap-1">
          <TabsTrigger value="overview" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Money Flow</TabsTrigger>
          <TabsTrigger value="accounts" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Accounts</TabsTrigger>
          <TabsTrigger value="ledger" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Ledger</TabsTrigger>
          <TabsTrigger value="receivables" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Receivables/Payables</TabsTrigger>
          <TabsTrigger value="repairstock" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Repair/Stock</TabsTrigger>
          <TabsTrigger value="reports" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Reports</TabsTrigger>
        </TabsList>

        {/* ================= MONEY FLOW (sections 4, 5, 13) ================= */}
        <TabsContent value="overview" className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-headline font-bold flex items-center gap-2 mb-2"><ArrowUpRight className="w-4 h-4 text-emerald-400" /> Income Breakdown</h3>
              {Object.entries(financials.incomeByCategory).length === 0 && <p className="text-xs text-slate-600 italic">No income recorded yet.</p>}
              {Object.entries(financials.incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{cat}</span>
                  <span className="font-code font-bold text-emerald-400">{fmtMoney(amt)}</span>
                </div>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400">Total Income</span>
                <span className="font-code font-black text-emerald-400">{fmtMoney(financials.totalIncome)}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-headline font-bold flex items-center gap-2 mb-2"><ArrowDownRight className="w-4 h-4 text-rose-400" /> Expense Breakdown</h3>
              {Object.entries(financials.expenseByCategory).length === 0 && <p className="text-xs text-slate-600 italic">No expenses recorded yet.</p>}
              {Object.entries(financials.expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{cat}</span>
                  <span className="font-code font-bold text-rose-400">{fmtMoney(amt)}</span>
                </div>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400">Total Expenses</span>
                <span className="font-code font-black text-rose-400">{fmtMoney(financials.totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold">Net Result (Income − Expenses)</h3>
              <span className={cn('text-2xl font-headline font-black', financials.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{fmtMoney(financials.netProfit)}</span>
            </div>
          </div>

          {/* Payment method breakdown (section 5) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-headline font-bold mb-4">Payment Method Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PAYMENT_METHODS_LIST.map((method) => {
                const bucket = financials.paymentMethods[method] || { received: 0, paid: 0, net: 0 };
                const Icon = METHOD_ICON[method] || HelpCircle;
                return (
                  <div key={method} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-slate-300"><Icon className="w-4 h-4" /><span className="text-xs font-bold uppercase">{method}</span></div>
                    <div className="text-[10px] text-slate-500 flex justify-between"><span>Received</span><span className="text-emerald-400 font-code">{fmtMoney(bucket.received)}</span></div>
                    <div className="text-[10px] text-slate-500 flex justify-between"><span>Paid</span><span className="text-rose-400 font-code">{fmtMoney(bucket.paid)}</span></div>
                    <div className="text-[10px] font-bold flex justify-between pt-1 border-t border-slate-800"><span className="text-slate-400 uppercase">Net</span><span className={cn('font-code', bucket.net >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{fmtMoney(bucket.net)}</span></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual expense entry (section 13) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="border-b border-slate-800 p-4 md:p-6">
              <h3 className="font-headline font-bold text-base md:text-lg flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-[#FF3366]" /> Log Business Expense</h3>
            </div>
            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Category</Label>
                  <Select value={expense.category} onValueChange={(v) => setExpense({ ...expense, category: v })}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {EXPENSE_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</Label>
                  <Input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} className="bg-slate-950 border-slate-800 h-10 md:h-11 font-code" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Vendor / Store</Label>
                  <Input value={expense.vendorName} onChange={(e) => setExpense({ ...expense, vendorName: e.target.value })} className="bg-slate-950 border-slate-800 h-10 md:h-11" placeholder="e.g. Local Hardware" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                  <Input type="date" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} className="bg-slate-950 border-slate-800 h-10 md:h-11 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Payment Method</Label>
                  <Select value={expense.paymentMode} onValueChange={(v) => setExpense({ ...expense, paymentMode: v })}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {PAYMENT_METHODS_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Reference (optional)</Label>
                  <Input value={expense.reference} onChange={(e) => setExpense({ ...expense, reference: e.target.value })} className="bg-slate-950 border-slate-800 h-10 md:h-11" placeholder="Bill / PO number" />
                </div>
                {accounts.filter((a: any) => a.isActive).length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Paid From Account (optional)</Label>
                    <Select value={expense.accountId} onValueChange={(v) => setExpense({ ...expense, accountId: v })}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue placeholder="Not tracked per-account" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        {accounts.filter((a: any) => a.isActive).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Description (optional)</Label>
                  <Textarea value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} className="bg-slate-950 border-slate-800 min-h-[70px]" />
                </div>
              </div>
              <Button onClick={handleAddExpense} disabled={!expense.amount} className="w-full bg-[#FF3366] hover:bg-rose-600 h-12 rounded-xl font-bold uppercase text-sm shadow-lg shadow-rose-500/10">Log Expense Record</Button>
            </div>
          </div>
        </TabsContent>

        {/* ================= MASTER MONEY CONTROL — ACCOUNT BREAKDOWN ================= */}
        <TabsContent value="accounts" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-lg font-headline font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Account Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setIsAccountFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-[10px] uppercase font-bold h-9">
                  <Building2 className="w-3.5 h-3.5 mr-1" /> Add Account
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoveModalMode('TRANSFER')} className="border-slate-800 text-[10px] uppercase font-bold h-9">
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Transfer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoveModalMode('ADVANCE')} className="border-slate-800 text-[10px] uppercase font-bold h-9">
                  <HandCoins className="w-3.5 h-3.5 mr-1" /> Give Advance
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoveModalMode('SETTLEMENT')} className="border-slate-800 text-[10px] uppercase font-bold h-9">
                  <Undo2 className="w-3.5 h-3.5 mr-1" /> Settle
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoveModalMode('REFUND')} className="border-slate-800 text-[10px] uppercase font-bold h-9">
                  <Receipt className="w-3.5 h-3.5 mr-1" /> Refund
                </Button>
              </div>
            </div>

            <MobileCardList>
              {accounts.map((a: any) => (
                <MobileCard key={a.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{a.name}</p>
                      <Badge variant="outline" className="text-[8px] uppercase px-1 border-0 bg-slate-800/50 text-slate-400">{a.type}</Badge>
                    </div>
                    <Badge className={cn('text-[8px] uppercase h-4 px-1.5 border-0 shrink-0', a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-600/20 text-slate-400')}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <MobileCardRow label="Current Balance" value={<span className="font-bold text-blue-400">{fmtMoney(a.currentBalance)}</span>} />
                    <MobileCardRow label="Total In" value={<span className="text-emerald-400">{fmtMoney(a.totalIn)}</span>} />
                    <MobileCardRow label="Total Out" value={<span className="text-rose-400">{fmtMoney(a.totalOut)}</span>} />
                  </div>
                </MobileCard>
              ))}
              {accounts.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-center text-slate-500 italic text-xs rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <p>No accounts yet — add your first one (e.g. "Owner Cash" or "UPI-1") to start tracking exactly where company money is.</p>
                </div>
              )}
            </MobileCardList>

            <div className="hidden md:block rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60"><tr className="border-b border-slate-800">{['Account Name', 'Type', 'Current Balance', 'Total In', 'Total Out', 'Status'].map((h) => <th key={h} className="text-left text-[10px] font-bold uppercase p-3">{h}</th>)}</tr></thead>
                <tbody>
                  {accounts.map((a: any) => (
                    <tr key={a.id} className="border-b border-slate-800/50">
                      <td className="p-3 font-bold text-xs">{a.name}</td>
                      <td className="p-3 text-[10px] text-slate-500">{a.type}</td>
                      <td className="p-3 font-code text-xs font-bold text-blue-400">{fmtMoney(a.currentBalance)}</td>
                      <td className="p-3 font-code text-xs text-emerald-400">{fmtMoney(a.totalIn)}</td>
                      <td className="p-3 font-code text-xs text-rose-400">{fmtMoney(a.totalOut)}</td>
                      <td className="p-3"><Badge className={cn('text-[8px] uppercase h-4 px-1.5 border-0', a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-600/20 text-slate-400')}>{a.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    </tr>
                  ))}
                  {accounts.length === 0 && <tr><td colSpan={6} className="h-24 text-center text-slate-500 text-xs italic">No accounts yet — add your first one to start tracking exactly where company money is.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= 8/9/14/22 TRANSACTION LEDGER ================= */}
        <TabsContent value="ledger" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-lg font-headline font-bold flex items-center gap-2"><History className="w-5 h-5 text-blue-500" /> Complete Transaction Ledger</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadCSV(`gj5-wallet-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`, filteredLedger)} className="border-slate-800 text-[10px] uppercase font-bold h-9">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="border-slate-800 text-[10px] uppercase font-bold h-9 print:hidden">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Statement
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 print:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input placeholder="Search customer, vendor, invoice, ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-slate-950 border-slate-800 text-xs" />
              </div>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                  <SelectItem value="THIS_WEEK">This Week</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="CUSTOM">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as any)}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">Income & Expense</SelectItem>
                  <SelectItem value="INCOME">Income Only</SelectItem>
                  <SelectItem value="EXPENSE">Expense Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Stock">Stock</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Wallet">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Methods</SelectItem>
                  {PAYMENT_METHODS_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {datePreset === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2 print:hidden">
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 bg-slate-950 border-slate-800 text-xs" />
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 bg-slate-950 border-slate-800 text-xs" />
              </div>
            )}

            <MobileCardList>
              {filteredLedger.map((tx) => (
                <MobileCard key={tx.id} onClick={() => setDetailEntry(tx)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('p-1.5 rounded-lg shrink-0', tx.direction === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                        {tx.direction === 'INCOME' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">{tx.description}</p>
                        <Badge variant="outline" className="text-[8px] uppercase px-1 border-0 bg-slate-800/50 text-slate-400">{tx.category}</Badge>
                      </div>
                    </div>
                    <span className={cn('font-code font-bold text-sm shrink-0', tx.direction === 'INCOME' ? 'text-emerald-400' : 'text-rose-500')}>
                      {tx.direction === 'INCOME' ? '+' : '-'}{fmtMoney(tx.amount)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <MobileCardRow label="Date" value={fmtDate(tx.date)} />
                    <MobileCardRow label="Customer/Vendor" value={tx.customerOrVendor} />
                    <MobileCardRow label="Method" value={tx.paymentMethod} />
                  </div>
                  {tx.sourceModule === 'Wallet' && (
                    <MobileCardActions>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setTxToDelete(tx.sourceRecordId); }} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </MobileCardActions>
                  )}
                </MobileCard>
              ))}
              {filteredLedger.length === 0 && (
                <div className="h-32 flex items-center justify-center text-center text-slate-500 italic text-xs rounded-2xl border border-slate-800 bg-slate-900/20">No transactions match your filters.</div>
              )}
            </MobileCardList>

            <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/60 sticky top-0">
                    <tr className="border-b border-slate-800">
                      {['Date', 'Description', 'Category', 'Source', 'Customer/Vendor', 'Method', 'Income', 'Expense', 'Balance', 'Status', ''].map((h) => (
                        <th key={h} className={cn('text-[10px] font-bold uppercase p-3', (h === 'Income' || h === 'Expense' || h === 'Balance') ? 'text-right' : 'text-left')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((tx) => (
                      <tr key={tx.id} onClick={() => setDetailEntry(tx)} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors cursor-pointer">
                        <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                        <td className="p-3 text-xs font-bold text-slate-100 max-w-[220px] truncate">{tx.description}</td>
                        <td className="p-3 text-[10px] text-slate-400">{tx.category}</td>
                        <td className="p-3 text-[10px] text-slate-500">{tx.sourceModule}</td>
                        <td className="p-3 text-[10px] text-slate-400 max-w-[140px] truncate">{tx.customerOrVendor || '—'}</td>
                        <td className="p-3 text-[10px] text-slate-500">{tx.paymentMethod || '—'}</td>
                        <td className="p-3 text-right font-code font-bold text-xs text-emerald-400">{tx.direction === 'INCOME' ? fmtMoney(tx.amount) : ''}</td>
                        <td className="p-3 text-right font-code font-bold text-xs text-rose-400">{tx.direction === 'EXPENSE' ? fmtMoney(tx.amount) : ''}</td>
                        <td className="p-3 text-right font-code text-xs text-slate-300">{fmtMoney(tx.balance)}</td>
                        <td className="p-3">
                          <Badge className={cn('text-[8px] uppercase h-4 px-1.5 border-0', tx.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400')}>{tx.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          {tx.sourceModule === 'Wallet' && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setTxToDelete(tx.sourceRecordId); }} className="h-7 w-7 text-rose-500 hover:bg-rose-500/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr><td colSpan={11} className="h-32 text-center text-slate-500 text-xs italic">No transactions match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ================= 6/7 RECEIVABLES & PAYABLES ================= */}
        <TabsContent value="receivables" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" /> Pending Receivables</h3>
              <span className="font-code font-black text-amber-400">{fmtMoney(financials.pendingReceivables)}</span>
            </div>
            <MobileCardList>
              {receivables.map((r, i) => (
                <MobileCard key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-bold text-sm truncate">{r.customer}</p><p className="text-[9px] text-slate-500 uppercase font-bold">{r.sourceModule} • {r.referenceId}</p></div>
                    <Badge className="text-[8px] uppercase h-4 px-1.5 border-0 bg-amber-500/10 text-amber-400 shrink-0">{r.status}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <MobileCardRow label="Total" value={fmtMoney(r.total)} />
                    <MobileCardRow label="Paid" value={Number.isFinite(r.paid) ? fmtMoney(r.paid) : 'Not tracked'} />
                    <MobileCardRow label="Pending" value={<span className="text-amber-400 font-bold">{fmtMoney(r.pending)}</span>} />
                    <MobileCardRow label="Due" value={r.dueDate} />
                  </div>
                  {r.note && <p className="text-[9px] text-slate-600 italic pt-1">{r.note}</p>}
                </MobileCard>
              ))}
              {receivables.length === 0 && <div className="h-24 flex items-center justify-center text-center text-slate-500 italic text-xs rounded-2xl border border-slate-800 bg-slate-900/20">No pending receivables — everything is settled.</div>}
            </MobileCardList>
            <div className="hidden md:block rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60"><tr className="border-b border-slate-800">{['Customer', 'Source', 'Total', 'Paid', 'Pending', 'Due', 'Status'].map((h) => <th key={h} className="text-left text-[10px] font-bold uppercase p-3">{h}</th>)}</tr></thead>
                <tbody>
                  {receivables.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="p-3 font-bold text-xs">{r.customer}</td>
                      <td className="p-3 text-[10px] text-slate-500">{r.sourceModule} • {r.referenceId}</td>
                      <td className="p-3 font-code text-xs">{fmtMoney(r.total)}</td>
                      <td className="p-3 font-code text-xs text-emerald-400">{Number.isFinite(r.paid) ? fmtMoney(r.paid) : <span className="text-slate-600 italic">not tracked</span>}</td>
                      <td className="p-3 font-code text-xs text-amber-400 font-bold">{fmtMoney(r.pending)}</td>
                      <td className="p-3 text-[10px] text-slate-500">{r.dueDate || '—'}</td>
                      <td className="p-3"><Badge className="text-[8px] uppercase h-4 px-1.5 border-0 bg-amber-500/10 text-amber-400">{r.status}</Badge></td>
                    </tr>
                  ))}
                  {receivables.length === 0 && <tr><td colSpan={7} className="h-24 text-center text-slate-500 text-xs italic">No pending receivables — everything is settled.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-orange-400" /> Pending Payables</h3>
              <span className="font-code font-black text-orange-400">{fmtMoney(financials.pendingPayables)}</span>
            </div>
            <p className="text-[10px] text-slate-600 italic">Only pending salaries are shown — this ERP doesn't yet track a separate "amount still owed to supplier" for stock purchases, so supplier payables aren't fabricated here.</p>
            <MobileCardList>
              {payables.map((p, i) => (
                <MobileCard key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-bold text-sm truncate">{p.vendorOrEmployee}</p><p className="text-[9px] text-slate-500 uppercase font-bold">{p.reference} • {p.dueContext}</p></div>
                    <Badge className="text-[8px] uppercase h-4 px-1.5 border-0 bg-orange-500/10 text-orange-400 shrink-0">{p.status}</Badge>
                  </div>
                  <MobileCardRow label="Pending" value={<span className="text-orange-400 font-bold">{fmtMoney(p.pending)}</span>} />
                </MobileCard>
              ))}
              {payables.length === 0 && <div className="h-24 flex items-center justify-center text-center text-slate-500 italic text-xs rounded-2xl border border-slate-800 bg-slate-900/20">No pending payables.</div>}
            </MobileCardList>
            <div className="hidden md:block rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60"><tr className="border-b border-slate-800">{['Employee', 'Reference', 'Period', 'Pending', 'Status'].map((h) => <th key={h} className="text-left text-[10px] font-bold uppercase p-3">{h}</th>)}</tr></thead>
                <tbody>
                  {payables.map((p, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="p-3 font-bold text-xs">{p.vendorOrEmployee}</td>
                      <td className="p-3 font-code text-[10px]">{p.reference}</td>
                      <td className="p-3 text-[10px] text-slate-500">{p.dueContext}</td>
                      <td className="p-3 font-code text-xs text-orange-400 font-bold">{fmtMoney(p.pending)}</td>
                      <td className="p-3"><Badge className="text-[8px] uppercase h-4 px-1.5 border-0 bg-orange-500/10 text-orange-400">{p.status}</Badge></td>
                    </tr>
                  ))}
                  {payables.length === 0 && <tr><td colSpan={5} className="h-24 text-center text-slate-500 text-xs italic">No pending payables.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= 11/12 REPAIR & STOCK FINANCE ================= */}
        <TabsContent value="repairstock" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
            <h3 className="text-sm font-headline font-bold flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-400" /> Repair Financial Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Total Revenue', value: repairFinancials.totalRevenue, color: 'text-blue-400' },
                { label: 'Received', value: repairFinancials.totalReceived, color: 'text-emerald-400' },
                { label: 'Pending', value: repairFinancials.totalPending, color: 'text-amber-400' },
                { label: 'Parts Cost', value: repairFinancials.totalPartsCost, color: 'text-rose-400' },
                { label: 'Profit', value: repairFinancials.totalProfit, color: repairFinancials.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">{s.label}</p>
                  <p className={cn('text-base font-headline font-bold mt-1', s.color)}>{fmtMoney(s.value)}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 italic">Profit = Revenue − recorded parts cost only (labour/technician time isn't a captured cost in this ERP, so it isn't subtracted — this is a parts-adjusted gross figure, not full net profit).</p>
            <div className="hidden md:block rounded-2xl border border-slate-800 overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60"><tr className="border-b border-slate-800">{['Repair ID', 'Customer', 'Revenue', 'Parts Cost', 'Paid', 'Pending', 'Profit'].map((h) => <th key={h} className="text-left text-[10px] font-bold uppercase p-3">{h}</th>)}</tr></thead>
                <tbody>
                  {repairFinancials.rows.slice(0, 50).map((r) => (
                    <tr key={r.jobId} className="border-b border-slate-800/50">
                      <td className="p-3 font-code text-xs text-blue-400">{r.jobId}</td>
                      <td className="p-3 text-xs font-bold">{r.customer}</td>
                      <td className="p-3 font-code text-xs">{fmtMoney(r.revenue)}</td>
                      <td className="p-3 font-code text-xs text-rose-400">{fmtMoney(r.partsCost)}</td>
                      <td className="p-3 font-code text-xs text-emerald-400">{fmtMoney(r.paid)}</td>
                      <td className="p-3 font-code text-xs text-amber-400">{fmtMoney(Math.max(0, r.pending))}</td>
                      <td className={cn('p-3 font-code text-xs font-bold', r.profit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{fmtMoney(r.profit)}</td>
                    </tr>
                  ))}
                  {repairFinancials.rows.length === 0 && <tr><td colSpan={7} className="h-24 text-center text-slate-500 text-xs italic">No repair jobs recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
            <h3 className="text-sm font-headline font-bold flex items-center gap-2"><Package className="w-4 h-4 text-purple-400" /> Stock Financial Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Stock Purchase Cost (recorded)</p>
                <p className="text-base font-headline font-bold mt-1 text-rose-400">{fmtMoney(stockFinancials.stockPurchaseCost)}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Current Stock Cost Value</p>
                <p className="text-base font-headline font-bold mt-1 text-blue-400">{fmtMoney(stockFinancials.stockCostValue)}</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-600 italic">Purchase cost uses each item's current purchase price against its recorded PURCHASE/INWARD movement quantity — individual movements don't store their own historical unit cost, so this is a labelled approximation, not an invented figure. Stock sales revenue/gross margin aren't shown here because invoice line items are matched to stock only by product name in this schema, which isn't reliable enough to report as an exact figure — TV/Product Sales income is already shown accurately in Money Flow above, sourced directly from invoices.</p>
          </div>
        </TabsContent>

        {/* ================= 10 DAILY / MONTHLY REPORT ================= */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6">
            <h3 className="text-sm font-headline font-bold mb-4">Daily Income vs Expense (Last 14 Days)</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#FB7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6">
            <h3 className="text-sm font-headline font-bold mb-4">Monthly Income vs Expense (Last 6 Months)</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#FB7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= Modals ================= */}
      <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} onSuccess={(amt) => store.topUpWallet(amt)} />
      <OtherIncomeModal isOpen={isOtherIncomeOpen} onClose={() => setIsOtherIncomeOpen(false)} onSubmit={handleOtherIncome} />
      <TransactionDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} onNavigate={onNavigate} />
      <AccountFormModal
        isOpen={isAccountFormOpen}
        onClose={() => setIsAccountFormOpen(false)}
        employees={employeeOptions}
        onSubmit={(data) => store.createAccount(data)}
      />
      <AccountMoveModal
        isOpen={!!moveModalMode}
        mode={moveModalMode || 'TRANSFER'}
        onClose={() => setMoveModalMode(null)}
        accounts={accounts}
        onSubmit={(data) => {
          if (moveModalMode === 'TRANSFER') return store.transferBetweenAccounts(data.fromAccountId, data.toAccountId, data.amount, data.note);
          if (moveModalMode === 'ADVANCE') return store.giveAdvance({ fromAccountId: data.fromAccountId, toAccountId: data.toAccountId!, amount: data.amount, note: data.note });
          if (moveModalMode === 'SETTLEMENT') return store.recordSettlement({ fromAccountId: data.fromAccountId, toAccountId: data.toAccountId!, amount: data.amount, note: data.note });
          return store.recordRefund({ fromAccountId: data.fromAccountId, amount: data.amount, note: data.note });
        }}
      />

      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Filter className="w-5 h-5 text-blue-400" /> Manual Wallet Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={() => setAdjustment({ ...adjustment, type: 'CREDIT' })} variant={adjustment.type === 'CREDIT' ? 'default' : 'outline'} className={cn('h-12 font-bold uppercase', adjustment.type === 'CREDIT' && 'bg-emerald-600 hover:bg-emerald-700')}>
                <PlusCircle className="w-4 h-4 mr-2" /> Credit (+)
              </Button>
              <Button onClick={() => setAdjustment({ ...adjustment, type: 'DEBIT' })} variant={adjustment.type === 'DEBIT' ? 'default' : 'outline'} className={cn('h-12 font-bold uppercase', adjustment.type === 'DEBIT' && 'bg-rose-600 hover:bg-rose-700')}>
                <MinusCircle className="w-4 h-4 mr-2" /> Debit (-)
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Amount (₹)</Label>
                <Input type="number" value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} className="bg-slate-950 border-slate-800 h-12 font-code font-bold text-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Reference / Note</Label>
                <Input value={adjustment.description} onChange={(e) => setAdjustment({ ...adjustment, description: e.target.value })} placeholder="e.g. Correcting bank error" className="bg-slate-950 border-slate-800 h-11" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button>
            <Button onClick={handleManualAdjust} className="bg-blue-600 hover:bg-blue-700 px-10 h-11 font-bold uppercase">Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!txToDelete} onOpenChange={() => setTxToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Reverse Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Only applies to wallet-native entries (top-ups / adjustments / transfers / advances / settlements / refunds). The original entry is never deleted — an equal-and-opposite reversal entry will be recorded instead, and the affected balance(s) re-adjusted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverseWalletTx} className="bg-rose-600 hover:bg-rose-700 text-white">Confirm Reversal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
