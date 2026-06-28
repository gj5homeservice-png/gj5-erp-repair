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
  Smartphone,
  LayoutDashboard,
  LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-white text-slate-900 selection:bg-red-100 font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 overflow-hidden flex items-center justify-center">
               <img src="https://picsum.photos/seed/gj5-logo-main/200/200" className="w-full h-full object-contain" alt="GJ5 ERP Logo" data-ai-hint="company logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-headline font-black tracking-tighter leading-none uppercase text-[#123C8C]">GJ5 ERP</span>
              <span className="text-[8px] font-black text-[#E53935] uppercase tracking-[0.2em] mt-1">GOOD JOB 5 ERP</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-[#123C8C] transition-colors">Features</Link>
            <Link href="/plans" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-[#123C8C] transition-colors">Software Access</Link>
            <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-slate-900 hover:text-[#123C8C] transition-colors">Login</Link>
            <Button onClick={() => router.push('/plans')} className="bg-[#E53935] hover:bg-[#C62828] h-10 px-6 rounded-full font-bold uppercase text-[10px] shadow-lg text-white">Start Software</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-[#123C8C] animate-pulse"></span>
              <span className="text-[10px] font-black text-[#123C8C] uppercase tracking-widest">GJ5 ERP v4.0 Operational</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tight leading-[1.1] text-slate-900">
              Smart <span className="text-[#123C8C]">Business Management</span> & Billing Software
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl font-medium">
              GOOD JOB 5 ERP: The complete solution for Home Appliance Service, Stock Management, and Workforce Tracking. Simplify your operations with a single powerful dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => router.push('/plans')} className="h-16 px-10 bg-[#E53935] hover:bg-[#C62828] rounded-2xl font-headline font-bold text-lg shadow-xl shadow-red-600/20 group text-white">
                Start Software <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                onClick={() => router.push('/login')} 
                className="h-16 px-10 bg-gradient-to-br from-[#123C8C] to-[#0D2E63] hover:from-[#1E56C0] hover:to-[#123C8C] rounded-[18px] font-headline font-bold text-lg shadow-[0_10px_30px_rgba(18,60,140,0.35)] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogIn className="w-5 h-5" /> Login
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
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Trusted by <span className="text-slate-900">5,000+ Enterprises</span></p>
            </div>
          </div>

          {/* Premium Stacked Software Preview */}
          <div className="relative animate-in zoom-in duration-1000 lg:h-[600px] flex items-center">
             <div className="relative w-full aspect-[4/3] max-w-[600px] mx-auto">
                {/* Main Dashboard Window */}
                <div className="absolute inset-0 bg-[#0F172A] rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-slate-100 z-10">
                   <img 
                     src="https://picsum.photos/seed/gj5-erp-preview/1200/900" 
                     className="w-full h-full object-cover opacity-90" 
                     alt="GJ5 ERP Dashboard Preview" 
                     data-ai-hint="erp dashboard"
                   />
                   <div className="absolute top-4 left-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#123C8C] flex items-center justify-center text-white"><LayoutDashboard className="w-4 h-4" /></div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">GJ5 ERP Console</span>
                   </div>
                </div>

                {/* Floating "Billing Software" Window */}
                <div className="absolute -top-10 -right-4 w-1/2 aspect-video bg-white rounded-3xl shadow-2xl z-20 border-2 border-slate-100 p-4 transform rotate-2 animate-bounce-slow">
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-[#E53935] flex items-center justify-center text-white"><Receipt className="w-3 h-3" /></div>
                        <span className="text-[8px] font-black uppercase text-slate-900">Billing Node</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-[#E53935]"></div>
                   </div>
                   <div className="space-y-2">
                      <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                      <div className="h-1 w-3/4 bg-slate-100 rounded-full"></div>
                      <div className="pt-2 flex justify-between">
                         <div className="h-3 w-10 bg-red-50 rounded"></div>
                         <div className="h-3 w-14 bg-[#E53935] rounded"></div>
                      </div>
                   </div>
                </div>

                {/* Floating "Call Management" Window */}
                <div className="absolute -bottom-8 -left-6 w-1/2 aspect-[4/3] bg-[#123C8C] rounded-3xl shadow-2xl z-30 border-2 border-[#0D2E63] p-5 transform -rotate-3">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#123C8C]"><Wrench className="w-3.5 h-3.5" /></div>
                      <span className="text-[9px] font-black uppercase text-white tracking-widest">Call Matrix</span>
                   </div>
                   <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-2 bg-[#0D2E63] rounded-xl border border-blue-900">
                           <div className="w-6 h-6 rounded-full bg-blue-800"></div>
                           <div className="h-1.5 w-16 bg-blue-800 rounded-full"></div>
                           <div className="w-8 h-3 bg-red-600/20 rounded-full"></div>
                        </div>
                      ))}
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
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tight text-slate-900">Smart Business <span className="text-[#123C8C]">Toolsets</span></h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">GOOD JOB 5 ERP provides professional grade features designed for high-growth enterprises.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-lg bg-white rounded-[2rem] group hover:bg-[#123C8C] transition-all duration-500 overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#123C8C] group-hover:bg-white/20 group-hover:text-white transition-colors">
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
              <div className="w-8 h-8 overflow-hidden">
                <img src="https://picsum.photos/seed/gj5-logo-footer/100/100" className="w-full h-full object-contain" alt="GJ5 ERP" />
              </div>
              <span className="text-sm font-headline font-black text-slate-900 uppercase">GJ5 ERP</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm mx-auto md:mx-0">GOOD JOB 5 ERP: Smart Business. Simple Management. Designed for reliability and business growth.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Contact Node</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">Katargam, Surat, Gujarat</p>
            <p className="text-xs font-black text-[#E53935] tracking-widest">+91 88669 83900</p>
          </div>
          <div className="space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Secure Access</h4>
             <Link href="/login" className="text-xs font-bold text-[#123C8C] hover:underline block">Admin Terminal Login</Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
