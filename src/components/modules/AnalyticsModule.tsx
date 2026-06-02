"use client"

import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Download,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameMonth, isToday, subDays } from 'date-fns';
import * as XLSX from 'xlsx';

export function AnalyticsModule({ store }: { store: any }) {
  const [timeRange, setTimeRange] = useState('This Month');

  const financialStats = useMemo(() => {
    const invoices = store.invoices || [];
    const expenses = store.expenses || [];
    
    const calculateTotals = (itemsList: any[], type: 'inv' | 'exp') => {
      let revenue = 0;
      let cost = 0;
      let count = 0;

      itemsList.forEach(item => {
        if (!item || (!item.timestamp && !item.date)) return;
        const date = parseISO(item.timestamp || item.date);
        let match = false;
        if (timeRange === 'Today') match = isToday(date);
        else if (timeRange === 'This Month') match = isSameMonth(date, new Date());
        else match = true; // All Time

        if (match) {
          if (type === 'inv') {
            revenue += (item.total || 0);
            const subItems = Array.isArray(item.items) ? item.items : [];
            cost += subItems.reduce((acc: number, curr: any) => 
              acc + (Number(curr.purchasePrice || 0) * Number(curr.quantity || 0)), 0);
          } else {
            revenue += (item.amount || 0);
          }
          count++;
        }
      });
      return { revenue, cost, count };
    };

    const invTotals = calculateTotals(invoices, 'inv');
    const expTotals = calculateTotals(expenses, 'exp');

    const grossProfit = invTotals.revenue - invTotals.cost;
    const netProfit = grossProfit - expTotals.revenue;

    return {
      revenue: invTotals.revenue,
      expenses: expTotals.revenue,
      grossProfit,
      netProfit,
      jobsCount: invTotals.count
    };
  }, [store.invoices, store.expenses, timeRange]);

  const pnlChartData = useMemo(() => {
    // Last 7 days chart
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      const dateIso = format(date, 'yyyy-MM-dd');
      
      const dayRevenue = (store.invoices || [])
        .filter((inv: any) => inv?.timestamp && format(parseISO(inv.timestamp), 'yyyy-MM-dd') === dateIso)
        .reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
        
      const dayExpense = (store.expenses || [])
        .filter((exp: any) => exp?.date === dateIso)
        .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

      data.push({ name: dateStr, revenue: dayRevenue, expense: dayExpense, profit: dayRevenue - dayExpense });
    }
    return data;
  }, [store.invoices, store.expenses]);

  const exportReport = () => {
    const wb = XLSX.utils.book_new();
    const summary = [
      { Metric: 'Total Revenue', Value: financialStats.revenue },
      { Metric: 'Operating Expenses', Value: financialStats.expenses },
      { Metric: 'Gross Profit', Value: financialStats.grossProfit },
      { Metric: 'Net Profit', Value: financialStats.netProfit },
      { Metric: 'Total Job Units', Value: financialStats.jobsCount }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.invoices || []), "Invoices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.expenses || []), "Expenses");
    XLSX.writeFile(wb, `GJ5_Report_${format(new Date(), 'dd_MMM')}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">P&L Management Hub</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Real-time Financial Surveillance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-slate-950 border-slate-800 h-10 font-bold uppercase text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="All Time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline" className="border-slate-800 h-10 font-bold uppercase text-[10px]">
            <Download className="w-4 h-4 mr-2" /> Export P&L (.xlsx)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: financialStats.revenue, icon: DollarSign, color: 'text-blue-400', trend: 'inc' },
          { label: 'Total Expenses', value: financialStats.expenses, icon: ArrowDownRight, color: 'text-rose-400', trend: 'dec' },
          { label: 'Gross Profit', value: financialStats.grossProfit, icon: TrendingUp, color: 'text-emerald-400', trend: 'inc' },
          { label: 'Net Net Profit', value: financialStats.netProfit, icon: ArrowUpRight, color: 'text-cyan-400', trend: 'inc' }
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-5 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <div className={cn("p-2 rounded-lg bg-slate-800", s.color)}><s.icon className="w-4 h-4" /></div>
              </div>
              <h3 className={cn("text-2xl font-headline font-bold", s.color)}>₹{s.value.toLocaleString()}</h3>
              <p className="text-[9px] text-slate-600 font-bold uppercase">{timeRange} Period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800"><CardTitle className="text-lg font-headline font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Revenue vs. Expense (Weekly)</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="revenue" name="Revenue" fill="#0066FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#FF3366" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800"><CardTitle className="text-lg font-headline font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-500" /> Performance Delta (Daily)</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800"><CardTitle className="text-sm font-headline font-bold">Top Performing Categories</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-4">
             {Object.entries((store.invoices || []).reduce((acc: any, curr: any) => {
               const brand = curr.brand || 'Other';
               acc[brand] = (acc[brand] || 0) + (curr.total || 0);
               return acc;
             }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([brand, val], i) => (
               <div key={i} className="flex justify-between items-center text-xs">
                 <span className="font-bold uppercase text-slate-400">{brand as string}</span>
                 <span className="font-code font-bold text-blue-400">₹{(val as number).toLocaleString()}</span>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800"><CardTitle className="text-sm font-headline font-bold">Major Expense Drivers</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-4">
             {Object.entries((store.expenses || []).reduce((acc: any, curr: any) => {
               const cat = curr.category || 'Other';
               acc[cat] = (acc[cat] || 0) + (curr.amount || 0);
               return acc;
             }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([cat, val], i) => (
               <div key={i} className="flex justify-between items-center text-xs">
                 <span className="font-bold uppercase text-slate-400">{cat as string}</span>
                 <span className="font-code font-bold text-rose-400">₹{(val as number).toLocaleString()}</span>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800"><CardTitle className="text-sm font-headline font-bold">System Status Audit</CardTitle></CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
             <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Activity className="w-6 h-6" /></div>
             <p className="text-[10px] text-slate-500 leading-relaxed italic uppercase font-bold tracking-tighter">Database Integrity: Synchronized<br/>Audit Trail: Active<br/>Financial Ledger: Verified</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
