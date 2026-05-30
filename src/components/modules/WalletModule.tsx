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
  Store,
  Fuel,
  Home,
  Zap,
  Globe,
  Smartphone,
  Users,
  Truck,
  Box,
  FileText,
  Tool,
  Megaphone,
  Mail,
  ShieldCheck,
  Calendar,
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
import { jsPDF } from 'jspdf';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const EXPENSE_CATEGORIES = [
  { name: 'TV Purchase', icon: Box, color: '#3B82F6' },
  { name: 'TV Spare Parts', icon: Wrench, color: '#8B5CF6' },
  { name: 'Petrol / Diesel', icon: Fuel, color: '#F59E0B' },
  { name: 'Chai - Nasta', icon: Coffee, color: '#D97706' },
  { name: 'Shop Rent', icon: Home, color: '#EF4444' },
  { name: 'Electricity Bill', icon: Zap, color: '#FCD34D' },
  { name: 'Internet Bill', icon: Globe, color: '#60A5FA' },
  { name: 'Mobile Recharge', icon: Smartphone, color: '#F472B6' },
  { name: 'Salary Payment', icon: Users, color: '#10B981' },
  { name: 'Transportation Expense', icon: Truck, color: '#6366F1' },
  { name: 'Packaging Material', icon: Box, color: '#9CA3AF' },
  { name: 'Stationery', icon: PenTool, color: '#6B7280' },
  { name: 'Tools & Equipment', icon: Wrench, color: '#4B5563' },
  { name: 'Marketing / Advertisement', icon: Megaphone, color: '#EC4899' },
  { name: 'Courier Charges', icon: Mail, color: '#4ADE80' },
  { name: 'Maintenance Expense', icon: Wrench, color: '#FB923C' },
  { name: 'GST / Tax Payment', icon: ShieldCheck, color: '#2DD4BF' },
  { name: 'Miscellaneous', icon: MoreHorizontal, color: '#94A3B8' },
  { name: 'Other', icon: MoreHorizontal, color: '#64748B' }
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const;

export function WalletModule({ store }: { store: any }) {
  const [expense, setExpense] = useState({
    amount: 0,
    category: 'Chai - Nasta',
    customCategory: '',
    quantity: '',
    vendorName: '',
    billNumber: '',
    paymentMode: 'UPI' as typeof PAYMENT_MODES[number],
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
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

    return Object.entries(totals)
      .map(([name, value]) => ({ 
        name, 
        value: Number(value),
        color: EXPENSE_CATEGORIES.find(c => c.name === name)?.color || '#94A3B8'
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 7);
  }, [store.expenses]);

  const filteredExpenses = useMemo(() => {
    const expenses = store.expenses || [];
    return expenses.filter((e: any) => 
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [store.expenses, searchQuery]);

  const handleAddExpense = () => {
    if (expense.amount <= 0) return;
    
    const newExpense = {
      id: `EXP${Date.now()}`,
      ...expense,
      timestamp: new Date().toISOString()
    };

    store.addExpense(newExpense);
    
    // Reset form but keep date and payment mode
    setExpense(prev => ({
      ...prev,
      amount: 0,
      category: 'Chai - Nasta',
      customCategory: '',
      quantity: '',
      vendorName: '',
      billNumber: '',
      notes: ''
    }));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Business Expense Report - GJ5 HOME SERVICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 30, { align: 'center' });

    doc.setFontSize(14);
    doc.text('SUMMARY STATISTICS', 20, 45);
    doc.setFontSize(10);
    doc.text(`Today's Spending: INR ${stats.today}`, 20, 55);
    doc.text(`Weekly Spending: INR ${stats.week}`, 20, 60);
    doc.text(`Monthly Spending: INR ${stats.month}`, 20, 65);
    doc.text(`Total Spending: INR ${stats.total}`, 20, 70);

    let y = 85;
    doc.setFontSize(14);
    doc.text('RECENT TRANSACTIONS', 20, y);
    y += 10;
    
    doc.setFontSize(8);
    doc.text('DATE', 20, y);
    doc.text('CATEGORY', 45, y);
    doc.text('VENDOR', 85, y);
    doc.text('QTY', 125, y);
    doc.text('MODE', 155, y);
    doc.text('AMOUNT', 185, y, { align: 'right' });
    
    y += 5;
    doc.line(20, y, 190, y);
    y += 5;

    filteredExpenses.slice(0, 20).forEach((e: any) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(e.date, 20, y);
      doc.text(e.category, 45, y);
      doc.text(e.vendorName || '-', 85, y);
      doc.text(e.quantity || '-', 125, y);
      doc.text(e.paymentMode, 155, y);
      doc.text(Number(e.amount).toFixed(2), 185, y, { align: 'right' });
      y += 7;
    });

    doc.save(`Expense_Report_${format(new Date(), 'ddMMyy')}.pdf`);
  };

  const exportExcel = () => {
    const headers = ['Date', 'Category', 'Vendor', 'Quantity', 'Bill Number', 'Payment Mode', 'Amount', 'Notes'];
    const rows = filteredExpenses.map((e: any) => [
      e.date,
      e.category === 'Other' ? e.customCategory : e.category,
      e.vendorName || '-',
      e.quantity || '-',
      e.billNumber || '-',
      e.paymentMode,
      e.amount,
      e.notes || '-'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Expenses_GJ5_${format(new Date(), 'ddMMyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Wallet Balance & Quick Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-2 bg-[#0066FF] p-8 rounded-3xl text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-32 h-32" />
           </div>
           <div className="relative z-10 space-y-4">
              <div className="space-y-1">
                 <p className="text-blue-100/80 font-bold uppercase tracking-widest text-xs">Available Business Balance</p>
                 <h2 className="text-5xl font-headline font-black">₹{store.walletBalance.toFixed(2)}</h2>
              </div>
              <div className="flex gap-4">
                 <Button className="bg-white text-[#0066FF] hover:bg-blue-50 h-12 px-6 rounded-xl font-headline font-bold uppercase shadow-xl">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Top-Up
                 </Button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:col-span-2">
           {[
             { label: "Today's Outflow", value: stats.today, color: "text-emerald-400" },
             { label: "Weekly Burn", value: stats.week, color: "text-blue-400" },
             { label: "Monthly Overhead", value: stats.month, color: "text-purple-400" },
             { label: "Total Business Expense", value: stats.total, color: "text-rose-400" }
           ].map((stat, i) => (
             <Card key={i} className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-4 flex flex-col justify-center">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">{stat.label}</p>
                   <p className={cn("text-xl font-headline font-bold", stat.color)}>₹{stat.value.toFixed(0)}</p>
                </CardContent>
             </Card>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
           {/* Business Expense Manager Form */}
           <Card className="bg-slate-900/40 border-slate-800 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-900/20">
                 <CardTitle className="font-headline font-bold text-xl flex items-center gap-2">
                    <ArrowDownRight className="w-6 h-6 text-[#FF3366]" />
                    Business Expense Manager
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Category Selection</Label>
                       <Select value={expense.category} onValueChange={v => setExpense({...expense, category: v})}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-12">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 max-h-[300px]">
                             {EXPENSE_CATEGORIES.map(cat => (
                               <SelectItem key={cat.name} value={cat.name}>
                                 <div className="flex items-center gap-2">
                                    <cat.icon className="w-4 h-4" />
                                    {cat.name}
                                 </div>
                               </SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    {expense.category === 'Other' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                         <Label className="text-slate-400 text-xs uppercase font-bold">Other Category Name</Label>
                         <Input 
                           value={expense.customCategory}
                           onChange={e => setExpense({...expense, customCategory: e.target.value})}
                           placeholder="Enter custom category" 
                           className="bg-slate-950 border-slate-800 h-12" 
                         />
                      </div>
                    )}

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Expense Amount (₹)</Label>
                       <Input 
                         type="number" 
                         value={expense.amount}
                         onChange={e => setExpense({...expense, amount: Number(e.target.value)})}
                         className="bg-slate-950 border-slate-800 h-12 font-code font-bold text-xl text-[#FF3366]" 
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Item Quantity</Label>
                       <Input 
                         value={expense.quantity}
                         onChange={e => setExpense({...expense, quantity: e.target.value})}
                         placeholder="e.g. 10 Ltr, 5 TVs" 
                         className="bg-slate-950 border-slate-800 h-12" 
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Vendor / Shop Name</Label>
                       <Input 
                         value={expense.vendorName}
                         onChange={e => setExpense({...expense, vendorName: e.target.value})}
                         placeholder="e.g. Reliance Petrol Pump" 
                         className="bg-slate-950 border-slate-800 h-12" 
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Bill / Invoice Number</Label>
                       <Input 
                         value={expense.billNumber}
                         onChange={e => setExpense({...expense, billNumber: e.target.value})}
                         placeholder="Optional" 
                         className="bg-slate-950 border-slate-800 h-12" 
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Payment Mode</Label>
                       <Select value={expense.paymentMode} onValueChange={(v: any) => setExpense({...expense, paymentMode: v})}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-12">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                             {PAYMENT_MODES.map(mode => (
                               <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-slate-400 text-xs uppercase font-bold">Expense Date</Label>
                       <Input 
                         type="date"
                         value={expense.date}
                         onChange={e => setExpense({...expense, date: e.target.value})}
                         className="bg-slate-950 border-slate-800 h-12 text-sm" 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Transaction Notes</Label>
                    <Textarea 
                      value={expense.notes}
                      onChange={e => setExpense({...expense, notes: e.target.value})}
                      placeholder="Enter additional details about this expense..." 
                      className="bg-slate-950 border-slate-800 min-h-[100px]" 
                    />
                 </div>

                 <Button 
                   onClick={handleAddExpense}
                   className="w-full bg-[#FF3366] hover:bg-rose-600 h-14 rounded-2xl font-headline font-bold uppercase shadow-lg shadow-rose-500/20"
                 >
                    <PlusCircle className="w-5 h-5 mr-3" />
                    Securely Record Expense & Sync Balance
                 </Button>
              </CardContent>
           </Card>

           {/* Expense Ledger Table */}
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-xl font-headline font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-500" />
                    Transaction Ledger Registry
                 </h3>
                 <div className="flex items-center gap-3">
                    <div className="relative w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                       <Input 
                         placeholder="Filter transactions..." 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         className="pl-10 h-10 bg-slate-900 border-slate-800" 
                       />
                    </div>
                    <Button variant="outline" size="icon" onClick={exportExcel} className="border-slate-800"><TableIcon className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" onClick={exportPDF} className="border-slate-800"><FileDown className="w-4 h-4" /></Button>
                 </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                 <Table>
                    <TableHeader className="bg-slate-900/60">
                       <TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Date</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Category</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Vendor / Qty</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-bold">Payment</TableHead>
                          <TableHead className="text-right text-slate-500 uppercase text-[10px] font-bold">Amount</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredExpenses.map((exp: any) => {
                         const catInfo = EXPENSE_CATEGORIES.find(c => c.name === exp.category) || EXPENSE_CATEGORIES[18];
                         return (
                           <TableRow key={exp.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <TableCell className="font-code text-[11px] text-slate-400">
                                 {format(parseISO(exp.date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-slate-800">
                                       <catInfo.icon className="w-3.5 h-3.5" style={{ color: catInfo.color }} />
                                    </div>
                                    <span className="font-bold text-sm">{exp.category === 'Other' ? exp.customCategory : exp.category}</span>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-col">
                                    <span className="text-xs font-semibold">{exp.vendorName || '-'}</span>
                                    <span className="text-[10px] text-slate-500">{exp.quantity || '-'}</span>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3 h-3 text-slate-600" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{exp.paymentMode}</span>
                                 </div>
                              </TableCell>
                              <TableCell className="text-right">
                                 <span className="font-code font-bold text-rose-500">-₹{Number(exp.amount).toFixed(2)}</span>
                              </TableCell>
                           </TableRow>
                         );
                       })}
                       {filteredExpenses.length === 0 && (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">No business expenses recorded in this period.</TableCell>
                         </TableRow>
                       )}
                    </TableBody>
                 </Table>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           {/* Overhead Charts */}
           <Card className="bg-slate-900/40 border-slate-800 sticky top-24">
              <CardHeader className="border-b border-slate-800">
                 <CardTitle className="font-headline font-bold text-lg flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-[#FFD700]" />
                    Overhead Intelligence
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="h-[250px] w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}
                             itemStyle={{ color: '#F8FAFC' }}
                          />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Top Spending Sectors</h4>
                    {chartData.map((sector, i) => (
                      <div key={i} className="flex justify-between items-center text-xs group">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }}></div>
                            <span className="text-slate-300 group-hover:text-white transition-colors">{sector.name}</span>
                         </div>
                         <span className="font-code font-bold">₹{sector.value}</span>
                      </div>
                    ))}
                 </div>

                 <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
                       <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Fiscal Integrity</span>
                       </div>
                       <p className="text-xs text-slate-400">Total verified outlays are within operational thresholds.</p>
                    </div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Total Lifetime Expenditure</p>
                    <h3 className="text-3xl font-headline font-black text-white">
                      ₹{stats.total.toLocaleString()}
                    </h3>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-6">
                 <div className="flex items-center gap-4 text-emerald-400">
                    <div className="p-3 bg-emerald-500/10 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
                    <div>
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Business Health</p>
                       <p className="text-xl font-headline font-bold tracking-tight text-white">STABLE LIQUIDITY</p>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
