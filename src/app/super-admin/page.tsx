
"use client"

import React, { useMemo, useEffect, useState } from 'react';
import { 
  Building2, 
  Zap, 
  CreditCard, 
  TrendingUp, 
  Users2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Activity,
  Globe,
  MonitorPlay,
  Package,
  Trash2,
  RefreshCw,
  TicketPercent
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { db, collection, onSnapshot, getDocs, doc, deleteDoc, writeBatch } from '@/firebase';
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminDashboard() {
  const [data, setData] = useState({
    companies: [] as any[],
    subscriptions: [] as any[],
    payments: [] as any[],
    coupons: [] as any[],
    customers: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;

    const unsubscribers = [
      onSnapshot(collection(db, "companies"), (s) => setData(prev => ({ ...prev, companies: s.docs.map(d => d.data()) }))),
      onSnapshot(collection(db, "subscriptions"), (s) => setData(prev => ({ ...prev, subscriptions: s.docs.map(d => d.data()) }))),
      onSnapshot(collection(db, "payments"), (s) => setData(prev => ({ ...prev, payments: s.docs.map(d => d.data()) }))),
      onSnapshot(collection(db, "coupons"), (s) => setData(prev => ({ ...prev, coupons: s.docs.map(d => d.data()) }))),
      onSnapshot(collection(db, "customers"), (s) => setData(prev => ({ ...prev, customers: s.docs.map(d => d.data()) })))
    ];

    setLoading(false);
    return () => unsubscribers.forEach(u => u());
  }, []);

  const stats = useMemo(() => {
    const totalRev = data.payments.filter(p => p.status === 'Captured').reduce((acc, curr) => acc + (curr.amount / 100), 0);
    const activeSubs = data.subscriptions.filter(s => s.active).length;
    const trials = data.companies.filter(c => c.companyStatus === 'trial').length;
    
    return [
      { label: 'Total Companies', value: data.companies.length, sub: 'Registered Nodes', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'Active Licenses', value: activeSubs, sub: 'Authorized Access', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      { label: 'Total Revenue', value: `₹${totalRev.toLocaleString()}`, sub: 'Settled Settlements', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
      { label: 'Trial Nodes', value: trials, sub: 'Awaiting Commit', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];
  }, [data]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    return months.map(m => {
      const monthPayments = data.payments.filter(p => p.status === 'Captured' && isSameMonth(parseISO(p.createdAt), m));
      return {
        name: format(m, 'MMM'),
        rev: monthPayments.reduce((acc, curr) => acc + (curr.amount / 100), 0)
      };
    });
  }, [data.payments]);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = { 'Trial': 0, 'Starter': 0, 'Growth': 0, 'Master': 0 };
    data.subscriptions.forEach(s => {
      if (s.planName?.includes('Starter')) counts['Starter']++;
      else if (s.planName?.includes('Growth')) counts['Growth']++;
      else if (s.planName?.includes('Master')) counts['Master']++;
    });
    counts['Trial'] = data.companies.filter(c => c.companyStatus === 'trial').length;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return [
      { name: 'Free Trial', value: counts['Trial'], color: '#3b82f6' },
      { name: 'Starter', value: counts['Starter'], color: '#f59e0b' },
      { name: 'Growth', value: counts['Growth'], color: '#10b981' },
      { name: 'Master', value: counts['Master'], color: '#8b5cf6' }
    ].filter(p => p.value > 0);
  }, [data.subscriptions, data.companies]);

  const handleResetData = async () => {
    if (!db) return;
    try {
      const collections = ["companies", "payments", "subscriptions", "coupons", "customers"];
      for (const collName of collections) {
        const snapshot = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      toast({ title: "System Node Purged", description: "All testing/demo data has been permanently removed." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Purge Failure", description: "Failed to reset cloud nodes." });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">SaaS Command Matrix</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Operational Period: {format(new Date(), 'MMMM yyyy')} • Secure Node 4.2</p>
        </div>
        <div className="flex items-center gap-3">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 h-11 px-6 rounded-xl font-bold uppercase text-[10px]">
                    <Trash2 className="w-4 h-4 mr-2" /> Reset System Node
                 </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                 <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-500"><AlertCircle className="w-5 h-5" /> Critical Data Purge</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                       This action will permanently delete all Companies, Payments, Subscriptions, Coupons, and Customers from the cloud matrix. This is intended for testing reset only.
                    </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 border-0">Abort</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-rose-600 hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                 </AlertDialogFooter>
              </AlertDialogContent>
           </AlertDialog>
           <div className="flex items-center gap-3 bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><Globe className="w-4 h-4" /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Global Network Sync: 100%</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800/50 hover:border-blue-500/30 transition-all duration-500 shadow-2xl relative overflow-hidden group">
            <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-5 -mr-8 -mt-8", stat.color)}>
               <stat.icon className="w-full h-full rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>
            <CardContent className="p-6 space-y-4">
               <div className={cn("p-2.5 rounded-xl w-fit border border-white/5", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5" />
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-3xl font-headline font-black text-white tracking-tighter">{stat.value}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{stat.sub}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/50 p-8">
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shadow-lg"><TrendingUp className="w-5 h-5" /></div>
                 <h3 className="font-headline font-black text-white uppercase tracking-widest text-sm">Financial Growth Matrix</h3>
              </div>
           </div>
           <div className="h-[350px] w-full flex items-center justify-center">
              {data.payments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="rev" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-4 text-slate-600">
                   <CreditCard className="w-12 h-12 opacity-10" />
                   <p className="text-xs font-bold uppercase tracking-widest">No revenue data available</p>
                </div>
              )}
           </div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/50 p-8 space-y-8">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shadow-lg"><Activity className="w-5 h-5" /></div>
              <h3 className="font-headline font-black text-white uppercase tracking-widest text-sm">License Distribution</h3>
           </div>
           
           <div className="h-[220px] w-full relative flex items-center justify-center">
              {planDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                        {planDistribution.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-4 text-slate-600">
                   <Zap className="w-12 h-12 opacity-10" />
                   <p className="text-xs font-bold uppercase tracking-widest text-center">No subscription data available</p>
                </div>
              )}
              {planDistribution.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Nodes</span>
                  <span className="text-3xl font-headline font-black text-white tracking-tighter">{data.subscriptions.length + data.companies.filter(c => c.companyStatus === 'trial').length}</span>
                </div>
              )}
           </div>

           <div className="space-y-3">
              {planDistribution.map((plan, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }}></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{plan.name}</span>
                   </div>
                   <span className="text-xs font-code font-bold text-white">{plan.value}</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
         <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
               <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                 <MonitorPlay className="w-4 h-4 text-blue-500" /> Operational System Feed
               </h3>
               <Badge className="bg-blue-600/10 text-blue-400 border-0 text-[8px] uppercase font-black">Live Pulse</Badge>
            </div>
            <div className="divide-y divide-slate-800/50">
               {data.companies.slice(0, 5).map((comp, i) => (
                 <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                          <Building2 className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-200">New Company Node Detected</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black mt-0.5">Target: {comp.companyName} • {comp.createdAt ? format(parseISO(comp.createdAt), 'PP p') : 'N/A'}</p>
                       </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Success</span>
                 </div>
               ))}
               {data.companies.length === 0 && (
                 <div className="p-10 text-center text-slate-600 text-xs italic uppercase tracking-widest">No activity node logs yet</div>
               )}
            </div>
         </Card>

         <Card className="bg-slate-900/40 border-slate-800/50 p-8 space-y-6">
            <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" /> Active Promotions
            </h3>
            <div className="space-y-4">
               {data.coupons.slice(0, 4).map((coupon, i) => (
                 <div key={i} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-3">
                       <TicketPercent className="w-4 h-4 text-blue-400" />
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-white uppercase font-code">{coupon.code}</span>
                          <span className="text-[8px] text-slate-500 uppercase font-black">{coupon.discountType}</span>
                       </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-5 border-slate-800 text-emerald-400 bg-emerald-500/5 uppercase font-black">
                       {coupon.usedCount} / {coupon.maxUses} Uses
                    </Badge>
                 </div>
               ))}
               {data.coupons.length === 0 && (
                 <p className="text-slate-600 text-xs italic text-center py-6">No active campaigns.</p>
               )}
            </div>
            <div className="pt-6 border-t border-slate-800/50">
               <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[9px] text-slate-500 leading-tight font-medium italic uppercase">Master integrity node is active. All system transits are encrypted via Secure Vault 4.0.</p>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
