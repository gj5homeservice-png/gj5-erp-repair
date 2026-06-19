
"use client"

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download,
  Activity,
  ShieldCheck,
  CreditCard,
  History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameMonth } from 'date-fns';

export function AnalyticsModule({ store }: { store: any }) {
  const stats = useMemo(() => {
    const currentMonth = store.invoices.filter((i: any) => isSameMonth(parseISO(i.timestamp), new Date()));
    const totalSales = currentMonth.reduce((acc: number, curr: any) => acc + curr.grandTotal, 0);
    const totalProfit = currentMonth.reduce((acc: number, curr: any) => {
      const itemsProfit = curr.items.reduce((sum: number, item: any) => sum + ((item.rate - (item.purchasePrice || 0)) * item.quantity), 0);
      return acc + itemsProfit;
    }, 0);
    const pendingAmount = store.invoices.filter((i: any) => i.paymentStatus !== 'Paid').reduce((acc: number, curr: any) => acc + curr.grandTotal, 0);
    const gstLiability = currentMonth.reduce((acc: number, curr: any) => acc + (curr.cgst + curr.sgst), 0);

    return { totalSales, totalProfit, pendingAmount, gstLiability };
  }, [store.invoices]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-600 rounded-xl text-white shadow-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold text-white">Monthly Fiscal Audit</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Real-time Revenue & GST Monitoring</p>
          </div>
        </div>
        <Button variant="outline" className="border-slate-800 h-10 font-bold uppercase text-[10px]">
          <Download className="w-4 h-4 mr-2" /> Export GST Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Sales', value: stats.totalSales, icon: DollarSign, color: 'text-blue-400' },
          { label: 'Est. Net Profit', value: stats.totalProfit, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'GST Liability', value: stats.gstLiability, icon: ShieldCheck, color: 'text-rose-400' },
          { label: 'Outstanding', value: stats.pendingAmount, icon: CreditCard, color: 'text-amber-400' }
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-5 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <div className={cn("p-2 rounded-lg bg-slate-800", s.color)}><s.icon className="w-4 h-4" /></div>
              </div>
              <h3 className={cn("text-2xl font-headline font-bold", s.color)}>₹{s.value.toLocaleString()}</h3>
              <p className="text-[9px] text-slate-600 font-bold uppercase">Current Period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics continues with existing chart logic... */}
    </div>
  );
}
