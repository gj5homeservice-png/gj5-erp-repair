
"use client"

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  Tag, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Plus,
  Search,
  Bell,
  User,
  Tv,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/AuthGuard';
import { auth, signOut } from '@/firebase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Sub-components for modules
const DashboardModule = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Master Console</h2>
        <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Operational Status: Optimal</p>
      </div>
      <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Cloud Node</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {[
        { label: 'Total Assets', value: '24', icon: Tv, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Sales Orders', value: '158', icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Pending Node', value: '12', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Audit Done', value: '146', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'Stock Registry', value: '842', icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        { label: 'Customer Base', value: '1.2k', icon: Users, color: 'text-rose-400', bg: 'bg-rose-400/10' },
      ].map((stat, i) => (
        <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-xl group hover:border-blue-500/30 transition-all cursor-default overflow-hidden relative">
          <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-5 -mr-4 -mt-4", stat.color)}>
            <stat.icon className="w-full h-full" />
          </div>
          <CardContent className="p-6 space-y-4">
            <div className={cn("p-2.5 rounded-xl w-fit", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-headline font-black text-white">{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-6">
          <CardTitle className="text-lg font-headline font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Recent Activity Logs
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-slate-500 hover:text-white">View Ledger</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">New Inquiry: GJ5 PLUS QLED 55"</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">From: Rajesh Patel • Surat Hub</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] uppercase px-2">Pending</Badge>
                  <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">2m ago</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-6">
          <CardTitle className="text-lg font-headline font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" /> Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {[
            { name: 'GJ5 32" HD Ready', stock: 2, limit: 5 },
            { name: 'Samsung 43" 4K', stock: 0, limit: 3 },
            { name: 'LG 50" ThinQ', stock: 1, limit: 4 },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-2">
               <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-300">{item.name}</span>
                  <span className="font-black text-rose-500">{item.stock} LEFT</span>
               </div>
               <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(item.stock/item.limit)*100}%` }}></div>
               </div>
            </div>
          ))}
          <Button variant="outline" className="w-full border-slate-800 text-[10px] font-black uppercase h-10 mt-4">Order Inventory</Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Products', icon: Tv },
    { name: 'Orders', icon: ShoppingCart },
    { name: 'Billing', icon: Receipt },
    { name: 'Offers', icon: Tag },
    { name: 'Customers', icon: Users },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login/');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex overflow-hidden font-body">
        {/* Sidebar Terminal */}
        <aside className="w-72 bg-slate-900/40 border-r border-slate-800 backdrop-blur-xl hidden lg:flex flex-col z-20">
          <div className="p-8 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-red-600/20">G</div>
              <div className="flex flex-col">
                <span className="text-sm font-headline font-black text-white tracking-tighter leading-none">GJ5 HOME SERVICE</span>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1.5">Admin Matrix v2.4</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group",
                  activeTab === item.name 
                    ? "bg-[#0066FF] text-white shadow-lg shadow-blue-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.name ? "text-white" : "group-hover:text-blue-400")} />
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
                {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-800">
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              className="w-full justify-start gap-4 text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 h-12 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">Terminate Session</span>
            </Button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-600/5 rounded-full blur-[120px] -z-10"></div>
          
          {/* Top Header Bar */}
          <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0B0F19]/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-6">
               <div className="lg:hidden w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-black">G</div>
               <div className="relative w-96 hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="Global Audit: Search Products, Orders, IDs..." 
                    className="bg-slate-900/50 border-slate-800 pl-10 h-11 focus-visible:ring-blue-500 transition-all placeholder:text-slate-600"
                  />
               </div>
            </div>

            <div className="flex items-center gap-6">
              <Button size="icon" variant="ghost" className="relative text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0B0F19]"></span>
              </Button>
              <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                   <p className="text-xs font-bold text-white">System Admin</p>
                   <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Authorized</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-inner">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </div>
          </header>

          {/* Scrolling Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'Dashboard' ? <DashboardModule /> : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 grayscale">
                 <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Tv className="w-12 h-12 text-blue-500" />
                 </div>
                 <div>
                    <h2 className="text-xl font-headline font-bold text-white uppercase tracking-widest">{activeTab} Interface</h2>
                    <p className="text-sm text-slate-500 mt-1 uppercase tracking-[0.2em] font-black">Module calibration in progress</p>
                 </div>
                 <Button className="bg-[#0066FF] hover:bg-blue-600 rounded-xl font-black uppercase text-[10px] h-10 px-8">Initialize Module</Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </AuthGuard>
  );
}

