
"use client"

import React from 'react';
import { 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Star,
  Zap,
  Calendar,
  Infinity
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
    desc: 'Perfect for exploring core features.',
    icon: Zap,
    button: 'Start Free Trial',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    id: '6months',
    title: '6 MONTHS',
    price: '₹5,999',
    duration: '6 Months',
    desc: 'Ideal for small service hubs.',
    icon: Calendar,
    button: 'Choose 6 Months',
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
  {
    id: '1year',
    title: '1 YEAR',
    price: '₹10,999',
    duration: '1 Year',
    desc: 'Best for growing businesses.',
    icon: Calendar,
    button: 'Choose 1 Year',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  {
    id: 'lifetime',
    title: 'LIFETIME',
    price: '₹25,999',
    duration: 'Lifetime',
    desc: 'One-time payment. Forever access.',
    icon: Infinity,
    button: 'Choose Lifetime',
    color: 'text-[#DC2626]',
    bg: 'bg-red-50',
    highlight: true
  }
];

export default function PlansPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    localStorage.setItem('gj5_selected_plan', planId);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body selection:bg-red-100">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-1/3 h-1/3 bg-red-600/5 rounded-full blur-[120px] -z-10"></div>
      <div className="fixed bottom-0 left-0 w-1/3 h-1/3 bg-blue-600/5 rounded-full blur-[120px] -z-10"></div>

      <header className="h-20 border-b border-slate-100 flex items-center px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
           <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-xl shadow-lg">G</div>
            <div className="flex flex-col">
              <span className="text-sm font-headline font-black tracking-tighter leading-none">GJ5 HOME SERVICE</span>
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Enterprise Plans</span>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back Home
          </Link>
        </div>
      </header>

      <main className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#0F172A]">Choose your <span className="text-[#DC2626]">Growth Node</span></h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">Select a subscription plan to unlock the master service hub and billing engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PLANS.map((plan) => (
              <Card 
                key={plan.id} 
                className={cn(
                  "border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden group hover:shadow-2xl flex flex-col",
                  plan.highlight ? "border-[#DC2626] shadow-xl shadow-red-600/10 scale-105" : "border-slate-100 hover:border-slate-300"
                )}
              >
                {plan.highlight && (
                   <div className="bg-[#DC2626] text-white py-2 text-center text-[10px] font-black uppercase tracking-[0.3em]">
                      Most Popular Plan
                   </div>
                )}
                <CardHeader className="p-8 pb-0 flex flex-col items-center text-center space-y-4">
                   <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", plan.bg, plan.color)}>
                      <plan.icon className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{plan.title}</h3>
                      <div className="flex items-baseline gap-1 justify-center">
                         <span className="text-4xl font-headline font-black text-slate-900">{plan.price}</span>
                         <span className="text-xs font-bold text-slate-400 uppercase">/ {plan.duration}</span>
                      </div>
                   </div>
                </CardHeader>
                <CardContent className="p-8 pt-6 flex-1 flex flex-col justify-between space-y-8">
                   <div className="space-y-4">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-b border-slate-100 pb-4">"{plan.desc}"</p>
                      <ul className="space-y-3">
                         {[
                           'Master Call Registry',
                           'GST Billing Engine',
                           'Inventory & Stock',
                           'Staff Management',
                           'Daily Cloud Backup',
                           'WhatsApp Notifications'
                         ].map((feat, i) => (
                           <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500">
                              <CheckCircle2 className={cn("w-4 h-4 shrink-0", plan.color)} />
                              {feat}
                           </li>
                         ))}
                      </ul>
                   </div>
                   <Button 
                    onClick={() => handleSelectPlan(plan.id)}
                    className={cn(
                      "w-full h-14 rounded-2xl font-headline font-bold text-sm uppercase transition-all shadow-lg",
                      plan.highlight 
                        ? "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-red-600/20" 
                        : "bg-[#0F172A] hover:bg-[#1E293B] text-white"
                    )}
                   >
                     {plan.button}
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
             <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Secure Data Encryption • Industrial Compliance</span>
             </div>
             <p className="text-[10px] text-slate-400 text-center max-w-lg font-bold uppercase leading-relaxed tracking-widest">
               All plans include full feature access to the Master Console, Mobile Android APK support, and 24/7 technical audit assistance.
             </p>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">© 2024 GJ5 ENTERPRISE • ALL RIGHTS RESERVED</p>
      </footer>
    </div>
  );
}
