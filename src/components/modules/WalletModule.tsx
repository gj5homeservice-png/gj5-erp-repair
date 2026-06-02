
"use client"

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coffee, 
  PenTool, 
  Wrench, 
  Package, 
  MoreHorizontal,
  PlusCircle,
  PieChart as PieIcon,
  TrendingUp,
  Fuel,
  Home,
  Zap,
  Globe,
  Smartphone,
  Users,
  Truck,
  Box,
  FileText,
  Megaphone,
  Mail,
  ShieldCheck,
  CreditCard,
  FileDown,
  Table as TableIcon,
  Search,
  History,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, isToday, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TopUpModal } from './wallet/TopUpModal';

const EXPENSE_CATEGORIES = [
  { name: 'TV Purchase', icon: Box, color: '#3B82F6' },
  { name: 'TV Spare Parts', icon: Wrench, color: '#8B5CF6' },
  { name: 'Petrol / Diesel', icon: Fuel, color: '#F59E0B' },
  { name: 'Chai - Nasta', icon: Coffee, color: '#D97706' },
  { name: 'Salary Payment', icon: Users, color: '#10B981' },
  { name: 'Other', icon: MoreHorizontal, color: '#64748B' }
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const;

export function WalletModule({ store }: { store: any }) {
  const [expense, setExpense] = useState({
    amount: 0, category: 'Chai - Nasta', customCategory: '', quantity: '', vendorName: '', billNumber: '', paymentMode: 'UPI' as any, date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const stats = useMemo(() => {
    const expenses = store.expenses || [];
    const transactions = store.transactions || [];
    
    let todayExp = 0, monthExp = 0;
    let todayInc = 0, monthInc = 0;

    expenses.forEach((e: any) => {
      const date = parseISO(e.date);
      const amount = Number(e.amount);
      if (isToday(date)) todayExp += amount;
      if (isSameMonth(date, new Date())) monthExp += amount;
    });

    transactions.filter((t: any) => t.type === 'TOPUP' && t.status === 'SUCCESS').forEach((t: any) => {
      const date = parseISO(t.date);
      const amount = Number(t.amount);
      if (isToday(date)) todayInc += amount;
      if (isSameMonth(date, new Date())) monthInc += amount;
    });

    return { todayExp, monthExp, todayInc, monthInc };
  }, [store.expenses, store.transactions]);

  const chartData = useMemo(() => {
    const expenses = store.expenses || [];
    const totals = expenses.reduce((acc: any, curr: any) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ 
      name, value: Number(value), color: EXPENSE_CATEGORIES.find(c => c.name === name)?.color || '#94A3B8'
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [store.expenses]);

  const recentTransactions = useMemo(() => {
    return (store.transactions || []).filter((t: any) => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => new Date(b.id.split('-').pop()).getTime() - new Date(a.id.split('-').pop()).getTime());
  }, [store.transactions, searchQuery]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-2 bg-gradient-to-br from-[#0066FF] to-[#0052CC] p-6 md:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 w-24 h-24 md:w-32 md:h-32 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <Wallet className="w-full h-full" />
           </div>
           <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <p className="text-blue-100/80 font-bold uppercase tracking-widest text-[10px] md:text-xs">Master Wallet Balance</p>
                <h2 className="text-4xl md:text-6xl font-headline font-black tracking-tight">₹{store.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
              </div>
              <Button 
                onClick={() => setIsTopUpOpen(true)}
                className="bg-white text-[#0066FF] hover:bg-slate-100 h-12 px-8 rounded-xl font-bold uppercase text-xs shadow-lg"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Quick Top-Up
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:col-span-2">
           {[
             { label: "Today Income", value: stats.todayInc, color: "text-emerald-400", icon: ArrowUpRight },
             { label: "Today Spent", value: stats.todayExp, color: "text-rose-400", icon: ArrowDownRight },
             { label: "Monthly Income", value: stats.monthInc, color: "text-emerald-400", icon: TrendingUp },
             { label: "Monthly Spent", value: stats.monthExp, color: "text-rose-400", icon: PieIcon }
           ].map((stat, i) => (
             <Card key={i} className="bg-slate-900/40 border-slate-800 group hover:border-slate-700 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                   <div className="flex justify-between items-start">
                     <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{stat.label}</p>
                     <stat.icon className={cn("w-3 h-3 opacity-40", stat.color)} />
                   </div>
                   <p className={cn("text-xl md:text-2xl font-headline font-bold mt-2", stat.color)}>₹{stat.value.toLocaleString('en-IN')}</p>
                </CardContent>
             </Card>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
           <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="border-b border-slate-800 p-4 md:p-6">
                 <CardTitle className="font-headline font-bold text-base md:text-lg flex items-center gap-2">
                    <ArrowDownRight className="w-5 h-5 text-[#FF3366]" /> Expense Logger
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Category</Label>
                       <Select value={expense.category} onValueChange={v => setExpense({...expense, category: v})}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                             {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</Label>
                       <Input type="number" value={expense.amount} onChange={e => setExpense({...expense, amount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-10 md:h-11 font-code" />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Vendor / Store</Label>
                       <Input value={expense.vendorName} onChange={e => setExpense({...expense, vendorName: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11" placeholder="e.g. Local Hardware" />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                       <Input type="date" value={expense.date} onChange={e => setExpense({...expense, date: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11 text-xs" />
                    </div>
                 </div>
                 <Button onClick={() => store.addExpense({id: `EXP${Date.now()}`, ...expense, timestamp: new Date().toISOString()})} className="w-full bg-[#FF3366] hover:bg-rose-600 h-12 rounded-xl font-bold uppercase text-sm shadow-lg shadow-rose-500/10">Record Transaction</Button>
              </CardContent>
           </Card>

           <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                 <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" /> Transaction Ledger
                 </h3>
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input placeholder="Search ledger..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10 bg-slate-900 border-slate-800 text-xs w-full" />
                 </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                 <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Details</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Amount</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {recentTransactions.map((tx: any) => (
                           <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-lg",
                                    tx.type === 'TOPUP' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                  )}>
                                    {tx.type === 'TOPUP' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-100">{tx.description}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{tx.status}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] text-slate-400">
                                <p>{format(parseISO(tx.date), 'dd MMM yyyy')}</p>
                                <p className="text-[9px] text-slate-600">{tx.time}</p>
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-code font-bold text-sm",
                                tx.type === 'TOPUP' ? "text-emerald-400" : "text-rose-500"
                              )}>
                                {tx.type === 'TOPUP' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                              </TableCell>
                           </TableRow>
                         ))}
                         {recentTransactions.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={3} className="h-32 text-center text-slate-500 text-xs italic">
                               No transactions found in history.
                             </TableCell>
                           </TableRow>
                         )}
                      </TableBody>
                   </Table>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="border-b border-slate-800 p-4">
                 <CardTitle className="font-headline font-bold text-base flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-[#FFD700]" /> Expense Distribution
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                 <div className="h-[200px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                             {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px' }} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-3">
                    {chartData.map((sector, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }}></div>
                            <span className="text-slate-300 truncate max-w-[100px]">{sector.name}</span>
                         </div>
                         <span className="font-code font-bold">₹{sector.value}</span>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-slate-900/40 border-slate-800 border-dashed">
             <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Safe Transactions</h4>
                  <p className="text-[10px] text-slate-500 mt-1">All top-ups are secured with industry standard encryption. GJ5 HOME SERVICE ensures your funds are tracked and verifiable.</p>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={(amt) => store.topUpWallet(amt)}
      />
    </div>
  );
}
