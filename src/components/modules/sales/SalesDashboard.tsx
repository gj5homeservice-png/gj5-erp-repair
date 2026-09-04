"use client"

import React, { useMemo } from 'react';
import { ShoppingCart, Clock, CheckCircle2, IndianRupee, Wallet, Package, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function SalesDashboard({ store }: { store: any }) {
  const orders = store.salesOrders || [];
  const today = format(new Date(), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    const totalSales = orders.length;
    const todaysSales = orders.filter((o: any) => (o.saleDate || '').startsWith(today)).length;
    const pendingOrders = orders.filter((o: any) => o.orderStatus === 'New' || o.orderStatus === 'Processing').length;
    const completedOrders = orders.filter((o: any) => o.orderStatus === 'Completed').length;
    const totalRevenue = orders.reduce((a: number, o: any) => a + (o.grandTotal || 0), 0);
    const pendingPayments = orders.reduce((a: number, o: any) => a + (o.balanceDue || 0), 0);
    const productsSold = orders.reduce((a: number, o: any) => a + (o.quantity || 0), 0);
    return { totalSales, todaysSales, pendingOrders, completedOrders, totalRevenue, pendingPayments, productsSold };
  }, [orders, today]);

  const recent = useMemo(() => [...orders].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [orders]);
  const pending = useMemo(() => orders.filter((o: any) => o.orderStatus === 'New' || o.orderStatus === 'Processing').slice(0, 6), [orders]);

  const cards = [
    { label: 'Total Sales', value: stats.totalSales, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: "Today's Sales", value: stats.todaysSales, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Completed Orders', value: stats.completedOrders, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Pending Payments', value: `₹${stats.pendingPayments.toLocaleString()}`, icon: Wallet, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Products Sold', value: stats.productsSold, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Sales Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Retail Sales Overview</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sales Module</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
            <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-5 -mr-4 -mt-4", c.color)}>
              <c.icon className="w-full h-full" />
            </div>
            <div className={cn("p-2.5 rounded-xl w-fit", c.bg, c.color)}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
              <h3 className="text-lg font-headline font-black text-white">{c.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-widest">Recent Sales</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {recent.map((o: any) => (
              <div key={o.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-200">{o.customerName} — {o.brand} {o.model}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">ID: {o.id} · ₹{(o.grandTotal || 0).toLocaleString()}</p>
                </div>
                <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] uppercase">{o.orderStatus}</Badge>
              </div>
            ))}
            {recent.length === 0 && <div className="p-10 text-center text-slate-600 text-xs italic">No sales recorded yet.</div>}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-widest">Pending Orders</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {pending.map((o: any) => (
              <div key={o.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-200">{o.customerName}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">ID: {o.id} · {o.paymentStatus}</p>
                </div>
                <Badge className="bg-amber-600/10 text-amber-400 border-amber-600/20 text-[9px] uppercase">{o.deliveryStatus}</Badge>
              </div>
            ))}
            {pending.length === 0 && <div className="p-10 text-center text-slate-600 text-xs italic">No pending orders.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
