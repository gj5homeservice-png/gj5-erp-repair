
"use client"

import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Settings2, 
  ShieldCheck, 
  Database, 
  MessageSquare, 
  Smartphone, 
  Users2, 
  Receipt,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PlanManagement() {
  const plans = [
    { id: '1', name: 'Free Trial', price: 0, duration: '7 Days', status: 'Enabled', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    { id: '2', name: 'Starter Plan', price: 2999, duration: '3 Months', status: 'Enabled', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    { id: '3', name: 'Growth Plan', price: 5999, duration: '6 Months', status: 'Enabled', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { id: '4', name: 'Master Plan', price: 8999, duration: '12 Months', status: 'Enabled', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10', highlight: true },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">SLA & Plan Architect</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Configure Resource Quotas & Industrial Tiers</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 px-8 h-12 rounded-2xl font-black uppercase text-xs shadow-xl shadow-purple-900/20 flex gap-2">
           <Plus className="w-4 h-4" /> Define New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={cn(
            "bg-slate-900/40 border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden group flex flex-col relative",
            plan.border,
            plan.highlight && "ring-2 ring-purple-500/50 shadow-2xl shadow-purple-900/20 scale-[1.02]"
          )}>
            <div className="p-8 space-y-6 flex-1">
               <div className="flex justify-between items-start">
                  <div className={cn("p-3 rounded-2xl border border-white/5 shadow-lg", plan.bg, plan.color)}>
                     <Zap className="w-6 h-6" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100">
                       <DropdownMenuItem className="text-[10px] font-black uppercase gap-2"><Edit className="w-3.5 h-3.5" /> Edit Limits</DropdownMenuItem>
                       <DropdownMenuItem className="text-[10px] font-black uppercase gap-2 text-rose-500"><Trash2 className="w-3.5 h-3.5" /> Retire Plan</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
               </div>

               <div className="space-y-1">
                  <h3 className="text-lg font-headline font-black text-white uppercase">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                     <span className="text-2xl font-headline font-black text-white">₹{plan.price.toLocaleString()}</span>
                     <span className="text-[10px] font-bold text-slate-500 uppercase">/ {plan.duration}</span>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-800/50">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Resource Quotas</p>
                  {[
                    { label: 'Cloud Storage', val: '5GB', icon: Database },
                    { label: 'Technician Nodes', val: '20 Active', icon: Users2 },
                    { label: 'Invoice Cycles', val: 'Unlimited', icon: Receipt },
                    { label: 'WhatsApp Credits', val: '1,000/mo', icon: MessageSquare },
                  ].map((limit, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                       <div className="flex items-center gap-2.5">
                          <limit.icon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{limit.label}</span>
                       </div>
                       <span className="text-white font-black">{limit.val}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-6 bg-slate-900/60 border-t border-slate-800/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{plan.status}</span>
               </div>
               <Button variant="ghost" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-white group">
                  Audit Analytics <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/50 p-8 space-y-6">
            <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
               <Settings2 className="w-4 h-4 text-blue-500" /> Global Resource Caps
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               {[
                 { label: 'Global Attachment Limit', desc: 'Maximum photo size per repair log', val: '5 MB', color: 'blue' },
                 { label: 'Auto-Purge Threshold', desc: 'Auto-delete unlogged trial data', val: '30 Days', color: 'amber' },
                 { label: 'Concurrent Device Node', desc: 'Active sessions per enterprise', val: '5 Nodes', color: 'emerald' },
                 { label: 'SLA Response Guarantee', desc: 'Support ticket response target', val: '4 Hours', color: 'purple' },
               ].map((setting, i) => (
                 <div key={i} className="p-5 bg-slate-950/50 rounded-3xl border border-slate-800/50 flex flex-col justify-between h-full group hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-200 uppercase tracking-tighter">{setting.label}</p>
                       <p className="text-[9px] text-slate-600 leading-tight italic">{setting.desc}</p>
                    </div>
                    <div className="pt-4 flex justify-between items-center mt-4">
                       <span className="text-xl font-headline font-black text-white tracking-tighter">{setting.val}</span>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus className="w-4 h-4" /></Button>
                    </div>
                 </div>
               ))}
            </div>
         </Card>

         <Card className="bg-slate-900/40 border-slate-800/50 p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-600/10 rounded-full blur-[80px] -z-10"></div>
            <div className="space-y-6 relative z-10">
               <h3 className="font-headline font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-500" /> License Matrix Integrity
               </h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase">License nodes are cryptographically bound to Enterprise IDs. Any modification to resource limits triggers a re-sync event across all active sessions for that node.</p>
               <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] font-black text-slate-300 uppercase">Automated Billing Sync</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] font-black text-slate-300 uppercase">Resource Guard Active</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] font-black text-slate-300 uppercase">License Heartbeat: OK</span>
                  </div>
               </div>
            </div>
            <Button className="w-full bg-slate-800 hover:bg-slate-700 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-10">
               Update Global Pricing Matrix
            </Button>
         </Card>
      </div>
    </div>
  );
}

// Add these exports at the end to satisfy DropdownMenu imports if not already present globally
const DropdownMenu = ({ children }: any) => <div>{children}</div>;
const DropdownMenuTrigger = ({ children }: any) => <div>{children}</div>;
const DropdownMenuContent = ({ children, className }: any) => <div className={className}>{children}</div>;
const DropdownMenuItem = ({ children, className }: any) => <div className={className}>{children}</div>;
