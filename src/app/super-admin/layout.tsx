
"use client"

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Zap, 
  CreditCard, 
  TicketPercent, 
  Users2, 
  LifeBuoy, 
  BarChart3, 
  Bell, 
  Settings, 
  ShieldCheck, 
  Database, 
  History, 
  MonitorPlay,
  LogOut,
  Search,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ADMIN_NAV = [
  { group: 'MAIN', items: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
    { name: 'Companies', icon: Building2, path: '/super-admin/companies' },
    { name: 'Subscriptions', icon: Zap, path: '/super-admin/plans' },
    { name: 'Payments', icon: CreditCard, path: '/super-admin/payments' },
    { name: 'Coupons', icon: TicketPercent, path: '/super-admin/coupons' },
  ]},
  { group: 'MANAGEMENT', items: [
    { name: 'Customers', icon: Users2, path: '/super-admin/customers' },
    { name: 'Support Tickets', icon: LifeBuoy, path: '/super-admin/support' },
    { name: 'Analytics', icon: BarChart3, path: '/super-admin/analytics' },
    { name: 'Broadcast', icon: Bell, path: '/super-admin/broadcast' },
  ]},
  { group: 'SYSTEM', items: [
    { name: 'App Settings', icon: Settings, path: '/super-admin/settings' },
    { name: 'Security', icon: ShieldCheck, path: '/super-admin/security' },
    { name: 'Backup', icon: Database, path: '/super-admin/backup' },
    { name: 'Audit Logs', icon: History, path: '/super-admin/logs' },
    { name: 'Live Monitor', icon: MonitorPlay, path: '/super-admin/monitor' },
  ]}
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex font-body overflow-hidden selection:bg-purple-500/30">
      {/* Premium Sidebar */}
      <aside className={cn(
        "bg-slate-950/40 border-r border-slate-800/50 backdrop-blur-3xl transition-all duration-500 flex flex-col z-50 shrink-0",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 h-24 border-b border-slate-800/50 flex items-center gap-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-50"></div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0 border border-white/10">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2">
              <span className="text-lg font-headline font-black tracking-tighter text-white">GJ5 CONTROL</span>
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em]">Master Terminal</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar pt-8">
          {ADMIN_NAV.map((group) => (
            <div key={group.group} className="space-y-2">
              {isSidebarOpen && (
                <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">{group.group}</p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative",
                      isActive 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-900/20 border border-white/10" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                    {isSidebarOpen && (
                      <span className="text-xs font-bold tracking-tight whitespace-nowrap">{item.name}</span>
                    )}
                    {isActive && isSidebarOpen && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    )}
                    {!isSidebarOpen && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 h-14 rounded-2xl",
              !isSidebarOpen && "justify-center px-0"
            )}
            onClick={() => router.push('/')}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">Destroy Session</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[120px] -z-10"></div>

        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 bg-slate-950/20 backdrop-blur-xl z-10 shrink-0">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white rounded-xl">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="relative w-80 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Search Enterprise, Payments, Tickets..." 
                className="pl-10 h-11 bg-slate-900/40 border-slate-800 focus-visible:ring-blue-500 rounded-xl text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Network Operational</span>
            </div>
            
            <Button size="icon" variant="ghost" className="relative text-slate-400 rounded-xl hover:bg-slate-800/50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950"></span>
            </Button>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-800/50">
              <div className="text-right hidden sm:block">
                 <p className="text-xs font-bold text-white uppercase tracking-tighter">Super Admin Node</p>
                 <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Master Authorization</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-blue-500 text-xs uppercase tracking-tighter">SA</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
