
"use client"

import React from 'react';
import { 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Zap,
  Calendar,
  Clock,
  Gem,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    title: 'FREE TRIAL',
    price: '₹0',
    duration: '7 Days',
    ribbon: 'FREE TRIAL PLAN',
    ribbonClass: 'bg-blue-600 text-white',
    desc: 'Explore the core appliance service matrix.',
    icon: Zap,
    button: 'Start Free Trial',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'group-hover:border-blue-400 group-hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]',
    btnClass: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: '3months',
    title: '3 MONTHS',
    price: '₹2,999',
    duration: '3 Months',
    ribbon: 'STARTER PLAN',
    ribbonClass: 'bg-amber-600 text-white',
    desc: 'Ideal for small service centers.',
    icon: Clock,
    button: 'Choose 3 Months',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'group-hover:border-amber-400 group-hover:shadow-[0_0_30px_-10px_rgba(251,191,36,0.3)]',
    btnClass: 'bg-amber-600 hover:bg-amber-700'
  },
  {
    id: '6months',
    title: '6 MONTHS',
    price: '₹5,999',
    duration: '6 Months',
    ribbon: 'GROWTH PLAN',
    ribbonClass: 'bg-emerald-600 text-white',
    desc: 'Standard license for growing businesses.',
    icon: Calendar,
    button: 'Choose 6 Months',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'group-hover:border-emerald-400 group-hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700'
  },
  {
    id: '12months',
    title: '12 MONTHS',
    price: '₹8,999',
    duration: '12 Months',
    ribbon: 'BEST VALUE MASTER PLAN',
    ribbonClass: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-black',
    desc: 'Master license for full enterprise control.',
    icon: Gem,
    button: 'Choose 12 Months',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    glow: 'group-hover:border-purple-400 group-hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.4)]',
    btnClass: 'bg-purple-600 hover:bg-purple-700 border-2 border-yellow-500/50',
    highlight: true
  }
];

export default function PlansPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    localStorage.setItem('gj5_selected_plan', planId);
    router.push('/payment');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-body selection:bg-blue-500/30">
      <header className="h-20 border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
           <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg p-1">
               <img src="https://picsum.photos/seed/gj5-logo-official/400/400" className="w-full h-full object-contain" alt="Logo" data-ai-hint="official logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-headline font-black tracking-tighter leading-none uppercase">GJ5 ERP</span>
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Enterprise Plans</span>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back Home
          </Link>
        </div>
      </header>

      <main className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-white">Choose your <span className="text-[#0066FF]">Software Node</span></h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">Select a subscription plan to unlock the master home appliance service hub.</p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={cn(
                "border-2 bg-slate-900/40 transition-all duration-500 rounded-[2.5rem] overflow-hidden group flex flex-col relative",
                plan.border,
                plan.glow,
                plan.highlight 
                  ? "bg-slate-900 border-purple-500 shadow-2xl lg:scale-110 z-10" 
                  : "hover:scale-[1.02]"
              )}
            >
              <div className={cn("py-2 text-center text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-lg", plan.ribbonClass)}>
                {plan.highlight && <Award className="w-3.5 h-3.5" />}
                {plan.ribbon}
              </div>
              <CardHeader className="p-8 pb-0 flex flex-col items-center text-center space-y-4">
                 <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110", plan.bg, plan.color)}>
                    <plan.icon className="w-8 h-8" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{plan.title}</h3>
                    <div className="flex items-baseline gap-1 justify-center">
                       <span className="text-4xl font-headline font-black text-white">{plan.price}</span>
                       <span className="text-xs font-bold text-slate-500 uppercase">/ {plan.duration}</span>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-8 pt-6 flex-1 flex flex-col justify-between space-y-8">
                 <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-400 leading-relaxed italic border-b border-slate-800 pb-4">"{plan.desc}"</p>
                    <ul className="space-y-3 text-left">
                       {[
                         'Universal Call Registry', 
                         'GST Billing Engine', 
                         'Inventory & Stock', 
                         'Workforce Tracking', 
                         'Cloud Sync Matrix'
                       ].map((feat, i) => (
                         <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                            <CheckCircle2 className={cn("w-4 h-4 shrink-0", plan.color)} />
                            {feat}
                         </li>
                       ))}
                    </ul>
                 </div>
                 <Button 
                   onClick={() => handleSelectPlan(plan.id)} 
                   className={cn(
                     "w-full h-14 rounded-2xl font-headline font-bold text-sm uppercase transition-all active:scale-95 shadow-lg",
                     plan.btnClass,
                     "text-white"
                   )}
                 >
                   {plan.button}
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-xl mx-auto mt-20 p-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-2">
           <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3].map(i => <ShieldCheck key={i} className="w-5 h-5 text-blue-500" />)}
           </div>
           <h4 className="text-sm font-bold uppercase tracking-widest text-white">Enterprise Security Node</h4>
           <p className="text-xs text-slate-500 leading-relaxed">All plans include end-to-end encryption, daily automated backups, and 24/7 industrial support nodes.</p>
        </div>
      </main>
    </div>
  );
}
