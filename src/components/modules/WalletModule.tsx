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
  Search
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

  const stats = useMemo(() => {
    const expenses = store.expenses || [];
    let today = 0, week = 0, month = 0, total = 0;
    expenses.forEach((e: any) => {
      const date = parseISO(e.date);
      const amount = Number(e.amount);
      total += amount;
      if (isToday(date)) today += amount;
      if (isSameWeek(date, new Date())) week += amount;
      if (isSameMonth(date, new Date())) month += amount;
    });
    return { today, week, month, total };
  }, [store.expenses]);

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

  const filteredExpenses = useMemo(() => {
    return (store.expenses || []).filter((e: any) => 
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) || e.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [store.expenses, searchQuery]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-2 bg-[#0066FF] p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
           <Wallet className="absolute top-0 right-0 p-4 w-24 h-24 md:w-32 md:h-32 opacity-10" />
           <div className="relative z-10 space-y-4">
              <p className="text-blue-100/80 font-bold uppercase tracking-widest text-[10px] md:text-xs">Balance</p>
              <h2 className="text-3xl md:text-5xl font-headline font-black">₹{store.walletBalance.toFixed(2)}</h2>
              <Button className="bg-white text-[#0066FF] h-10 px-6 rounded-xl font-bold uppercase text-xs">Top-Up</Button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:col-span-2">
           {[
             { label: "Today", value: stats.today, color: "text-emerald-400" },
             { label: "Weekly", value: stats.week, color: "text-blue-400" },
             { label: "Monthly", value: stats.month, color: "text-purple-400" },
             { label: "Total", value: stats.total, color: "text-rose-400" }
           ].map((stat, i) => (
             <Card key={i} className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-3 md:p-4">
                   <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase truncate">{stat.label}</p>
                   <p className={cn("text-base md:text-lg font-headline font-bold", stat.color)}>₹{stat.value.toFixed(0)}</p>
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
                    <ArrowDownRight className="w-5 h-5 text-[#FF3366]" /> Logger
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold">Category</Label>
                       <Select value={expense.category} onValueChange={v => setExpense({...expense, category: v})}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                             {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold">Amount (₹)</Label>
                       <Input type="number" value={expense.amount} onChange={e => setExpense({...expense, amount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-10 md:h-11" />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold">Vendor</Label>
                       <Input value={expense.vendorName} onChange={e => setExpense({...expense, vendorName: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11" />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold">Date</Label>
                       <Input type="date" value={expense.date} onChange={e => setExpense({...expense, date: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11 text-xs" />
                    </div>
                 </div>
                 <Button onClick={() => store.addExpense({id: `EXP${Date.now()}`, ...expense, timestamp: new Date().toISOString()})} className="w-full bg-[#FF3366] h-11 md:h-12 rounded-xl font-bold uppercase text-xs md:text-sm">Save Transaction</Button>
              </CardContent>
           </Card>

           <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                 <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" /> Registry
                 </h3>
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-slate-900 border-slate-800 text-xs w-full" />
                 </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                 <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold">Date</TableHead>
                            <TableHead className="text-[10px] font-bold">Category</TableHead>
                            <TableHead className="text-right text-[10px] font-bold">Amount</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {filteredExpenses.map((exp: any) => (
                           <TableRow key={exp.id} className="border-slate-800/50">
                              <TableCell className="text-[10px] text-slate-400 whitespace-nowrap">{format(parseISO(exp.date), 'dd MMM')}</TableCell>
                              <TableCell className="font-bold text-xs truncate max-w-[100px]">{exp.category}</TableCell>
                              <TableCell className="text-right font-code font-bold text-rose-500 text-xs">₹{Number(exp.amount).toFixed(0)}</TableCell>
                           </TableRow>
                         ))}
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
                    <PieIcon className="w-5 h-5 text-[#FFD700]" /> Intelligence
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
        </div>
      </div>
    </div>
  );
}