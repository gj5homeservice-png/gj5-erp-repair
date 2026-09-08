
"use client"

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coffee, 
  Wrench, 
  MoreHorizontal,
  PlusCircle,
  PieChart as PieIcon,
  TrendingUp,
  Fuel,
  Users,
  Box,
  Search,
  History,
  Trash2,
  Edit,
  MinusCircle,
  Filter,
  Calendar,
  CheckCircle2,
  X,
  AlertTriangle
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isSameMonth, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TopUpModal } from './wallet/TopUpModal';
import { WalletTransaction } from '@/lib/types';
import { MobileCard, MobileCardList, MobileCardRow, MobileCardActions } from '@/components/ui/mobile-card';

const EXPENSE_CATEGORIES = [
  { name: 'TV Purchase', icon: Box, color: '#3B82F6' },
  { name: 'TV Spare Parts', icon: Wrench, color: '#8B5CF6' },
  { name: 'Petrol / Diesel', icon: Fuel, color: '#F59E0B' },
  { name: 'Chai - Nasta', icon: Coffee, color: '#D97706' },
  { name: 'Salary Payment', icon: Users, color: '#10B981' },
  { name: 'Other', icon: MoreHorizontal, color: '#64748B' }
];

export function WalletModule({ store }: { store: any }) {
  const [expense, setExpense] = useState({
    amount: 0, category: 'Chai - Nasta', vendorName: '', date: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [txToEdit, setTxToEdit] = useState<WalletTransaction | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustment, setAdjustment] = useState({ amount: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT', description: '' });

  const stats = useMemo(() => {
    const transactions = store.transactions || [];
    
    let todayExp = 0, monthExp = 0;
    let todayInc = 0, monthInc = 0;

    transactions.forEach((t: any) => {
      const date = parseISO(t.date);
      const amount = Number(t.amount);
      const isCredit = t.type === 'TOPUP' || t.type === 'MANUAL_CREDIT';
      
      if (isToday(date)) {
        if (isCredit) todayInc += amount;
        else todayExp += amount;
      }
      if (isSameMonth(date, new Date())) {
        if (isCredit) monthInc += amount;
        else monthExp += amount;
      }
    });

    return { todayExp, monthExp, todayInc, monthInc };
  }, [store.transactions]);

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

  const filteredTransactions = useMemo(() => {
    return (store.transactions || []).filter((t: any) => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.metadata?.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.amount.toString().includes(searchQuery);
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      return matchesSearch && matchesType;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [store.transactions, searchQuery, typeFilter]);

  const handleManualAdjust = () => {
    const amt = Number(adjustment.amount);
    if (!amt || isNaN(amt)) return;
    store.manualAdjust(amt, adjustment.type, adjustment.description);
    setAdjustment({ amount: '', type: 'CREDIT', description: '' });
    setIsAdjustmentOpen(false);
  };

  const handleUpdateTx = () => {
    if (txToEdit) {
      store.updateTransaction(txToEdit);
      setTxToEdit(null);
    }
  };

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
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setIsTopUpOpen(true)}
                  className="bg-white text-[#0066FF] hover:bg-slate-100 h-11 px-6 rounded-xl font-bold uppercase text-xs shadow-lg"
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> Top-Up
                </Button>
                <Button 
                  onClick={() => setIsAdjustmentOpen(true)}
                  variant="outline"
                  className="bg-blue-600/20 border-blue-400/30 text-white hover:bg-blue-600/40 h-11 px-6 rounded-xl font-bold uppercase text-xs"
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Manual Adjustment
                </Button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 xl:col-span-2">
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
                    <ArrowDownRight className="w-5 h-5 text-[#FF3366]" /> New Expense Registry
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
                 <Button onClick={() => store.addExpense({id: `EXP${Date.now()}`, ...expense, paymentMode: 'UPI', timestamp: new Date().toISOString()})} className="w-full bg-[#FF3366] hover:bg-rose-600 h-12 rounded-xl font-bold uppercase text-sm shadow-lg shadow-rose-500/10">Log Expense Record</Button>
              </CardContent>
           </Card>

           <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                 <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" /> Transaction Audit Ledger
                 </h3>
                 <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                       <Input placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-slate-900 border-slate-800 text-xs" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                       <SelectTrigger className="w-full sm:w-36 h-9 bg-slate-900 border-slate-800 text-[10px] font-bold uppercase"><SelectValue placeholder="All Types" /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="ALL">All Types</SelectItem>
                          <SelectItem value="TOPUP">Top-Up</SelectItem>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="MANUAL_CREDIT">Manual Credit</SelectItem>
                          <SelectItem value="MANUAL_DEBIT">Manual Debit</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <MobileCardList>
                {filteredTransactions.map((tx: any) => {
                  const isCredit = tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT';
                  return (
                    <MobileCard key={tx.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-100 truncate">{tx.description}</p>
                            <Badge variant="outline" className={cn("text-[8px] uppercase px-1 border-0 bg-slate-800/50", isCredit ? "text-emerald-500" : "text-rose-500")}>
                              {tx.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <span className={cn("font-code font-bold text-sm shrink-0", isCredit ? "text-emerald-400" : "text-rose-500")}>
                          {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <MobileCardRow label="Date" value={format(parseISO(tx.date), 'dd MMM yyyy')} />
                        <MobileCardRow label="Time" value={tx.time} />
                      </div>
                      <MobileCardActions>
                        <Button variant="ghost" size="icon" onClick={() => setTxToEdit(tx)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setTxToDelete(tx.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </MobileCardActions>
                    </MobileCard>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-center text-slate-500 italic text-xs rounded-2xl border border-slate-800 bg-slate-900/20">No transaction records found matching your filters.</div>
                )}
              </MobileCardList>

              <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                 <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Details & Class</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Chronology</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Amount (₹)</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Control</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {filteredTransactions.map((tx: any) => {
                           const isCredit = tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT';
                           return (
                             <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "p-1.5 rounded-lg shrink-0",
                                      isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                    )}>
                                      {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-100 truncate">{tx.description}</p>
                                      <Badge variant="outline" className={cn("text-[8px] uppercase px-1 border-0 bg-slate-800/50", isCredit ? "text-emerald-500" : "text-rose-500")}>
                                         {tx.type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[10px] text-slate-400 whitespace-nowrap">
                                  <p className="font-bold">{format(parseISO(tx.date), 'dd MMM yyyy')}</p>
                                  <p className="text-[9px] text-slate-600 uppercase font-black">{tx.time}</p>
                                </TableCell>
                                <TableCell className={cn(
                                  "text-right font-code font-bold text-sm",
                                  isCredit ? "text-emerald-400" : "text-rose-500"
                                )}>
                                  {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell className="text-right">
                                   <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => setTxToEdit(tx)} className="h-7 w-7 text-blue-400 hover:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /></Button>
                                      <Button variant="ghost" size="icon" onClick={() => setTxToDelete(tx.id)} className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                                   </div>
                                </TableCell>
                             </TableRow>
                           );
                         })}
                         {filteredTransactions.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={4} className="h-32 text-center text-slate-500 text-xs italic">
                               No transaction records found matching your filters.
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
                    <PieIcon className="w-5 h-5 text-[#FFD700]" /> Cost Distribution
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                 <div className="h-[180px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                             {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px' }} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-2.5">
                    {chartData.map((sector, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px]">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }}></div>
                            <span className="text-slate-300 truncate max-w-[120px] font-bold uppercase">{sector.name}</span>
                         </div>
                         <span className="font-code font-bold">₹{sector.value.toLocaleString()}</span>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-slate-900/40 border-slate-800 border-dashed">
             <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><TrendingUp className="w-5 h-5" /></div>
                  <h4 className="text-sm font-bold uppercase tracking-tighter">Instant Recalculation</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">The Master Ledger is self-balancing. Any edit or deletion triggers an immediate cascade update across analytics, monthly reports, and visual charts.</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-600 uppercase">Integrity: Verified</span>
                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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

      {/* Manual Adjustment Modal */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Filter className="w-5 h-5 text-blue-400" /> Manual Wallet Adjustment</DialogTitle>
           </DialogHeader>
           <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <Button
                   onClick={() => setAdjustment({...adjustment, type: 'CREDIT'})}
                   variant={adjustment.type === 'CREDIT' ? 'default' : 'outline'}
                   className={cn("h-12 font-bold uppercase", adjustment.type === 'CREDIT' && "bg-emerald-600 hover:bg-emerald-700")}
                 >
                   <PlusCircle className="w-4 h-4 mr-2" /> Credit (+)
                 </Button>
                 <Button 
                   onClick={() => setAdjustment({...adjustment, type: 'DEBIT'})}
                   variant={adjustment.type === 'DEBIT' ? 'default' : 'outline'}
                   className={cn("h-12 font-bold uppercase", adjustment.type === 'DEBIT' && "bg-rose-600 hover:bg-rose-700")}
                 >
                   <MinusCircle className="w-4 h-4 mr-2" /> Debit (-)
                 </Button>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Amount (₹)</Label>
                    <Input 
                      type="number" 
                      value={adjustment.amount} 
                      onChange={e => setAdjustment({...adjustment, amount: e.target.value})}
                      className="bg-slate-950 border-slate-800 h-12 font-code font-bold text-xl" 
                    />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Reference / Note</Label>
                    <Input 
                      value={adjustment.description} 
                      onChange={e => setAdjustment({...adjustment, description: e.target.value})}
                      placeholder="e.g. Correcting bank error"
                      className="bg-slate-950 border-slate-800 h-11" 
                    />
                 </div>
              </div>
           </div>
           <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button>
              <Button onClick={handleManualAdjust} className="bg-blue-600 hover:bg-blue-700 px-10 h-11 font-bold uppercase">Apply Adjustment</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={!!txToEdit} onOpenChange={() => setTxToEdit(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-blue-400" /> Modify Transaction</DialogTitle>
           </DialogHeader>
           {txToEdit && (
             <div className="space-y-5 py-4">
                <div className="space-y-1">
                   <Label className="text-[10px] font-bold text-slate-500 uppercase">Label / Description</Label>
                   <Input value={txToEdit.description} onChange={e => setTxToEdit({...txToEdit, description: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</Label>
                      <Input type="number" value={txToEdit.amount} onChange={e => setTxToEdit({...txToEdit, amount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                      <Input type="date" value={txToEdit.date} onChange={e => setTxToEdit({...txToEdit, date: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                   </div>
                </div>
                {txToEdit.type === 'EXPENSE' && (
                  <div className="space-y-4 pt-2">
                     <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Expense Category</Label>
                        <Select 
                          value={txToEdit.metadata?.category} 
                          onValueChange={v => setTxToEdit({...txToEdit, metadata: {...txToEdit.metadata, category: v}})}
                        >
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {EXPENSE_CATEGORIES.map(cat => <SelectItem key={`edit-cat-${cat.name}`} value={cat.name}>{cat.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Vendor</Label>
                        <Input 
                          value={txToEdit.metadata?.vendorName} 
                          onChange={e => setTxToEdit({...txToEdit, metadata: {...txToEdit.metadata, vendorName: e.target.value}})} 
                          className="bg-slate-950 border-slate-800 h-11" 
                        />
                     </div>
                  </div>
                )}
             </div>
           )}
           <DialogFooter>
              <Button variant="ghost" onClick={() => setTxToEdit(null)}>Cancel</Button>
              <Button onClick={handleUpdateTx} className="bg-blue-600 hover:bg-blue-700 px-10 h-11 font-bold uppercase">Save Changes</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!txToDelete} onOpenChange={() => setTxToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
           <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Void Transaction?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                 This action is irreversible. The wallet balance will be re-adjusted, and if this was a linked expense, the record will be completely removed from analytics.
              </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700">Abort</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { if (txToDelete) store.deleteTransaction(txToDelete); setTxToDelete(null); }}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </AlertDialogAction>
           </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
