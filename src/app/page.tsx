"use client"

import React from 'react';
import { 
  ChevronRight, 
  Receipt, 
  Truck, 
  Package, 
  Users, 
  History, 
  BarChart3, 
  Wrench,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    { title: 'Call Management', icon: Wrench, desc: 'Track repair jobs for all appliances from entry to completion.' },
    { title: 'Billing Software', icon: Receipt, desc: 'Generate GST-compliant A4 and thermal bills instantly.' },
    { title: 'Pickup Management', icon: Truck, desc: 'Real-time tracking of runner pickup schedules.' },
    { title: 'Delivery Management', icon: Truck, desc: 'Streamlined delivery and customer sign-off.' },
    { title: 'Customer Records', icon: Users, desc: 'Comprehensive CRM for client history tracking.' },
    { title: 'Stock Management', icon: Package, desc: 'Barcode-ready inventory and low-stock alerts.' },
    { title: 'Employee Attendance', icon: Smartphone, desc: 'Biometric selfie and GPS verified shift logs.' },
    { title: 'Salary Management', icon: BarChart3, desc: 'Automated payroll and earnings slip generator.' },
    { title: 'Invoice History', icon: History, desc: 'Full financial audit trail for your service business.' },
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
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">SaaS Enterprise Suite</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600 transition-colors">Features</Link>
            <Link href="/plans" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600 transition-colors">Software Access</Link>
            <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-slate-900 hover:text-red-600 transition-colors">Login</Link>
            <Button onClick={() => router.push('/plans')} className="bg-[#DC2626] hover:bg-[#B91C1C] h-10 px-6 rounded-full font-bold uppercase text-[10px] shadow-lg text-white">Start Software</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Enterprise V3.5 Operational</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tight leading-[1.1] text-slate-900">
              Best <span className="text-[#DC2626]">Home Appliance Service</span> & Billing Software
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl font-medium">
              The complete ERP solution for AC, Refrigerator, Washing Machine, and Microwave service centers. Manage calls, inventory, and staff in one powerful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => router.push('/plans')} className="h-16 px-10 bg-[#DC2626] hover:bg-[#B91C1C] rounded-2xl font-headline font-bold text-lg shadow-xl shadow-red-600/20 group text-white">
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
                    <img src={`https://picsum.photos/seed/${i+100}/100`} alt="user" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Trusted by <span className="text-slate-900">2,500+ Service Centers</span></p>
            </div>
          </div>
          <div className="relative animate-in zoom-in duration-1000">
            <div className="aspect-[4/3] rounded-[3rem] bg-slate-900 p-2 shadow-2xl relative overflow-hidden group border-4 border-slate-100">
               <img 
                 src="https://picsum.photos/seed/appliance-repair-erp/1200/900" 
                 className="w-full h-full object-cover rounded-[2.5rem] opacity-90 group-hover:scale-105 transition-transform duration-700" 
                 alt="ERP Command Center" 
                 data-ai-hint="appliance repair"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tight text-slate-900">Industrial <span className="text-[#DC2626]">Toolsets</span></h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">Professional grade features designed for high-volume appliance service ecosystems.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-lg bg-white rounded-[2rem] group hover:bg-[#DC2626] transition-all duration-500 overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#DC2626] group-hover:bg-white/20 group-hover:text-white transition-colors">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline font-bold text-lg text-[#0F172A] group-hover:text-white transition-colors">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium group-hover:text-white/80 transition-colors">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="space-y-6 col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-8 h-8 rounded-lg bg-[#DC2626] flex items-center justify-center text-white font-black italic text-lg">G</div>
              <span className="text-sm font-headline font-black text-slate-900">GJ5 HOME SERVICE</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm mx-auto md:mx-0">Universal ERP for Appliance Service businesses. Designed for reliability, speed, and business growth.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Contact Node</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">Katargam, Surat, Gujarat</p>
            <p className="text-xs font-black text-red-600 tracking-widest">+91 88669 83900</p>
          </div>
          <div className="space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Secure Access</h4>
             <Link href="/login" className="text-xs font-bold text-blue-600 hover:underline block">Admin Terminal Login</Link>
          </div>
        </div>
      </footer >
    </div>
  );
}
