
"use client"

import React, { useMemo } from 'react';
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
  Package
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const REVENUE_DATA = [
  { name: 'Jan', rev: 45000 }, { name: 'Feb', rev: 52000 }, { name: 'Mar', rev: 48000 },
  { name: 'Apr', rev: 61000 }, { name: 'May', rev: 55000 }, { name: 'Jun', rev: 72000 },
  { name: 'Jul', rev: 85000 }, { name: 'Aug', rev: 89000 }, { name: 'Sep', rev: 94000 }
];

const PLAN_DISTRIBUTION = [
  { name: 'Free Trial', value: 45, color: '#3b82f6' },
  { name: '3 Months', value: 25, color: '#f59e0b' },
  { name: '6 Months', value: 15, color: '#10b981' },
  { name: '12 Months', value: 15, color: '#8b5cf6' }
];

export default function SuperAdminDashboard() {
  const topStats = [
    { label: 'Total Companies', value: '1,284', sub: '+12% this month', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Licenses', value: '942', sub: '73% occupancy', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Revenue', value: '₹14.2L', sub: 'Last 30 days', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Trial Nodes', value: '156', sub: 'Awaiting commit', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const gridStats = [
    { label: 'Today Revenue', value: '₹42,800', change: '+18%', up: true },
    { label: 'Pending Payouts', value: '₹1.5L', change: '-5%', up: false },
    { label: 'Support Tickets', value: '24', change: '8 Urgent', up: true },
    { label: 'Online Nodes', value: '412', change: 'Live Now', up: true }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">SaaS Command Matrix</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Operational Period: Q3 FY25 • Secure Node 4.2</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
           <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><Globe className="w-4 h-4" /></div>
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Global Network Sync: 100%</span>
        </div>
      </div>

      {/* Primary KPI Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topStats.map((stat, i) => (
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
                  <p className="text-[10px] text-slate-400 font-bold">{stat.sub}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Analytics Node */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/50 p-8">
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shadow-lg"><TrendingUp className="w-5 h-5" /></div>
                 <h3 className="font-headline font-black text-white uppercase tracking-widest text-sm">Financial Growth Matrix</h3>
              </div>
              <div className="flex gap-2">
                 {['7D', '30D', '1Y'].map(t => (
                   <button key={t} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", t === '30D' ? "bg-blue-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:text-white")}>{t}</button>
                 ))}
              </div>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={REVENUE_DATA}>
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
           </div>
        </Card>

        {/* License Distribution */}
        <Card className="bg-slate-900/40 border-slate-800/50 p-8 space-y-8">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shadow-lg"><Activity className="w-5 h-5" /></div>
              <h3 className="font-headline font-black text-white uppercase tracking-widest text-sm">License Distribution</h3>
           </div>
           
           <div className="h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={PLAN_DISTRIBUTION} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                       {PLAN_DISTRIBUTION.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[10px] font-black text-slate-500 uppercase">Total Nodes</span>
                 <span className="text-3xl font-headline font-black text-white tracking-tighter">1.2K</span>
              </div>
           </div>

           <div className="space-y-3">
              {PLAN_DISTRIBUTION.map((plan, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }}></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{plan.name}</span>
                   </div>
                   <span className="text-xs font-code font-bold text-white">{plan.value}%</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {gridStats.map((gs, i) => (
           <div key={i} className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] shadow-xl flex items-center justify-between hover:bg-slate-800/40 transition-colors cursor-pointer group">
              <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{gs.label}</p>
                 <h4 className="text-xl font-headline font-black text-white">{gs.value}</h4>
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                gs.up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                 {gs.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                 {gs.change}
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
         {/* Live Audit Feed */}
         <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
               <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                 <MonitorPlay className="w-4 h-4 text-blue-500" /> Operational System Feed
               </h3>
               <Badge className="bg-blue-600/10 text-blue-400 border-0 text-[8px] uppercase font-black">Live Pulse</Badge>
            </div>
            <div className="divide-y divide-slate-800/50">
               {[
                 { action: 'New Company Registered', node: 'Matrix Services', time: '2 mins ago', status: 'Success', color: 'text-emerald-400' },
                 { action: 'Plan Expired & Blocked', node: 'Royal Electronics', time: '14 mins ago', status: 'Alert', color: 'text-rose-400' },
                 { action: 'Master Backup Initialized', node: 'System Cloud', time: '1 hour ago', status: 'Neutral', color: 'text-blue-400' },
                 { action: 'Manual Payout Authorized', node: 'GJ5 ERP HQ', time: '2 hours ago', status: 'Success', color: 'text-emerald-400' },
               ].map((log, i) => (
                 <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                          <Activity className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-200">{log.action}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black mt-0.5">Target: {log.node} • {log.time}</p>
                       </div>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", log.color)}>{log.status}</span>
                 </div>
               ))}
            </div>
         </Card>

         <Card className="bg-slate-900/40 border-slate-800/50 p-8 space-y-6">
            <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" /> High-Priority Nodes
            </h3>
            <div className="space-y-4">
               {[
                 { node: 'System DB Usage', value: 82, color: 'bg-blue-500' },
                 { node: 'CPU Node Matrix', value: 45, color: 'bg-emerald-500' },
                 { node: 'Payment Link Latency', value: 12, color: 'bg-purple-500' },
                 { node: 'Customer Complaint Volume', value: 68, color: 'bg-rose-500' }
               ].map((m, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-500">{m.node}</span>
                       <span className="text-white">{m.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className={cn("h-full rounded-full transition-all duration-1000", m.color)} style={{ width: `${m.value}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="pt-6 border-t border-slate-800/50">
               <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[9px] text-slate-500 leading-tight font-medium italic">Master integrity node is active. All system transits are encrypted via Secure Vault 4.0.</p>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
