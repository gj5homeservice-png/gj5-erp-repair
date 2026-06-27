
"use client"

import React from 'react';
import { 
  ChevronRight, 
  Tv, 
  Receipt, 
  Truck, 
  Package, 
  Users, 
  History, 
  BarChart3, 
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    { title: 'Call Management', icon: Tv, desc: 'Track repair jobs from entry to completion.' },
    { title: 'Billing Software', icon: Receipt, desc: 'Generate GST-compliant A4 and thermal bills.' },
    { title: 'Pickup Management', icon: Truck, desc: 'Real-time tracking of runner pickup schedules.' },
    { title: 'Delivery Management', icon: Truck, desc: 'Streamlined delivery and customer sign-off.' },
    { title: 'Customer Records', icon: Users, desc: 'Comprehensive CRM for client history tracking.' },
    { title: 'Stock Management', icon: Package, desc: 'Barcode-ready inventory and low-stock alerts.' },
    { title: 'Employee Attendance', icon: Smartphone, desc: 'Biometric selfie and GPS verified shift logs.' },
    { title: 'Salary Management', icon: BarChart3, desc: 'Automated payroll and earnings slip generator.' },
    { title: 'Invoice History', icon: History, desc: 'Full financial audit trail for your business.' },
    { title: 'Reports & Analytics', icon: BarChart3, desc: 'Real-time P&L and operational performance nodes.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-red-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-xl shadow-lg">G</div>
            <div className="flex flex-col">
              <span className="text-sm font-headline font-black tracking-tighter leading-none">GJ5 HOME SERVICE</span>
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Enterprise Suite</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600">Features</Link>
            <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600">Software Access</Link>
            <Button onClick={() => router.push('/login')} className="bg-[#DC2626] hover:bg-[#B91C1C] h-10 px-6 rounded-full font-bold uppercase text-[10px] shadow-lg">Start Software</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">New Matrix V2.8 Live</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tight leading-[1.1] text-slate-900">
              Best Call Management & <span className="text-[#DC2626]">Billing Software</span> for TV Service Business
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl font-medium">
              Manage repairing calls, pickup, delivery, billing, stock, employees and reports in one powerful, multi-platform software designed for Indian service centers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => router.push('/login')} className="h-16 px-10 bg-[#DC2626] hover:bg-[#B91C1C] rounded-2xl font-headline font-bold text-lg shadow-xl shadow-red-600/20 group">
                Start Software <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button onClick={() => router.push('/register')} variant="outline" className="h-16 px-10 border-slate-200 hover:bg-slate-50 rounded-2xl font-headline font-bold text-lg text-slate-700">
                Create New Account
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${i+40}/100`} alt="user" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Trusted by <span className="text-slate-900">500+ Service Centers</span> in Gujarat</p>
            </div>
          </div>
          <div className="relative animate-in zoom-in duration-1000">
            <div className="aspect-[4/3] rounded-[3rem] bg-slate-900 p-2 shadow-2xl relative overflow-hidden group">
               <img src="https://picsum.photos/seed/erp-dash/1200/900" className="w-full h-full object-cover rounded-[2.5rem] opacity-80 group-hover:scale-105 transition-transform duration-700" alt="ERP Preview" />
               <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
               {/* UI Floating Cards */}
               <div className="absolute top-10 -left-10 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg text-white"><CheckCircle2 className="w-4 h-4" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400">Sale Committed</span><span className="text-sm font-black text-slate-900">₹45,200.00</span></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tight text-slate-900">Everything you need to <span className="text-[#DC2626]">Scale</span></h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">Built specifically for the technical service industry with local-first data resilience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-lg bg-white rounded-[2rem] group hover:bg-[#DC2626] transition-all duration-500 overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#DC2626] group-hover:bg-white/20 group-hover:text-white transition-colors">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline font-bold text-lg text-slate-900 group-hover:text-white transition-colors">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium group-hover:text-white/80 transition-colors">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-20">
         <div className="max-w-7xl mx-auto px-6 bg-[#0F172A] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px]"></div>
            <div className="relative z-10 space-y-8">
               <h2 className="text-3xl md:text-5xl font-headline font-bold text-white leading-tight">Ready to modernize your <br /> service business?</h2>
               <p className="text-slate-400 max-w-xl mx-auto text-lg italic font-medium">"This software changed how we handle TV repairs. No more lost job cards or billing mistakes."</p>
               <Button onClick={() => router.push('/register')} className="h-16 px-12 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-headline font-bold text-lg">Create Free Account</Button>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6 col-span-1 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#DC2626] flex items-center justify-center text-white font-black italic text-lg">G</div>
              <span className="text-sm font-headline font-black text-slate-900">GJ5 HOME SERVICE</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">The leading ERP ecosystem for independent service centers and repair hubs in Gujarat.</p>
            <div className="flex gap-4">
               <Button size="icon" variant="outline" className="rounded-full"><MessageSquare className="w-4 h-4 text-slate-600" /></Button>
               <Button size="icon" variant="outline" className="rounded-full"><ShieldCheck className="w-4 h-4 text-slate-600" /></Button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Legal Nodes</h4>
            <div className="flex flex-col gap-2">
               <Link href="#" className="text-xs font-bold text-slate-500 hover:text-red-600">Privacy Protocol</Link>
               <Link href="#" className="text-xs font-bold text-slate-500 hover:text-red-600">Terms of Deployment</Link>
               <Link href="#" className="text-xs font-bold text-slate-500 hover:text-red-600">GST Compliance</Link>
            </div>
          </div>
          <div className="space-y-4 text-right md:text-left">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Surat HQ Node</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">Katargam, Surat, <br />Gujarat, India - 395004</p>
            <p className="text-xs font-black text-red-600 tracking-widest mt-4">+91 88669 83900</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-50 text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">© 2024 GJ5 ENTERPRISE • ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}
