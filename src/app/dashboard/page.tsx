"use client"

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  ShoppingCart, 
  Receipt, 
  History,
  Package, 
  Users, 
  CalendarCheck,
  DollarSign,
  BarChart3, 
  Wallet,
  Truck,
  Settings, 
  LogOut,
  Search,
  Bell,
  User,
  AlertCircle,
  Building2,
  Loader2,
  Lock,
  ClipboardList,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AuthGuard } from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useErpStore } from '@/hooks/use-erp-store';
import { createAutoBackupIfDue } from '@/lib/data-management';

// Module Imports
import { RepairingModule } from '@/components/modules/RepairingModule';
import { InquiryModule } from '@/components/modules/InquiryModule';
import { BillingModule } from '@/components/modules/BillingModule';
import { InvoiceHistoryModule } from '@/components/modules/InvoiceHistoryModule';
import { StockModule } from '@/components/modules/StockModule';
import { EmployeesModule } from '@/components/modules/EmployeesModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { SalaryModule } from '@/components/modules/SalaryModule';
import { AnalyticsModule } from '@/components/modules/AnalyticsModule';
import { WalletModule } from '@/components/modules/WalletModule';
import { SettingsModule } from '@/components/modules/SettingsModule';
import { TransportationModule } from '@/components/modules/TransportationModule';
import { RepairJobsModule } from '@/components/modules/repair/RepairJobsModule';

const DashboardModule = ({ store }: { store: any }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-headline font-bold text-white tracking-tight">GJ5 ERP Console</h2>
        <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Workspace Status: Operational</p>
      </div>
      <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Cloud Node</span>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {[
        { label: 'Active Jobs', value: store.calls.length, icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Sales Audit', value: store.invoices.length, icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Asset Units', value: store.stock.reduce((a: any, b: any) => a + (b.quantity || 0), 0), icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        { label: 'Staff Roster', value: store.employees.length, icon: Users, color: 'text-rose-400', bg: 'bg-rose-400/10' },
        { label: 'Wallet Matrix', value: `₹${store.walletBalance.toLocaleString()}`, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'CRM Leads', value: store.inquiries.length, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
      ].map((stat, i) => (
        <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden group">
          <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-5 -mr-4 -mt-4", stat.color)}>
            <stat.icon className="w-full h-full" />
          </div>
          <div className={cn("p-2.5 rounded-xl w-fit", stat.bg, stat.color)}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-xl font-headline font-black text-white">{stat.value}</h3>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
           <h3 className="text-lg font-headline font-bold text-white flex items-center gap-2">
             <Bell className="w-5 h-5 text-blue-500" /> Recent Activity
           </h3>
        </div>
        <div className="divide-y divide-slate-800">
           {store.calls.slice(0, 5).map((call: any) => (
             <div key={call.id} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{call.customerName} - {call.category}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">ID: {call.id} • {call.status}</p>
                  </div>
                </div>
                <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] uppercase">Active</Badge>
             </div>
           ))}
           {store.calls.length === 0 && <div className="p-10 text-center text-slate-600 text-xs italic">Awaiting entries...</div>}
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
        <h3 className="text-lg font-headline font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" /> Critical Stock
        </h3>
        <div className="space-y-6">
          {store.stock.filter((s: any) => s.quantity <= s.minStockLevel).slice(0, 4).map((item: any, i: number) => (
            <div key={i} className="flex flex-col gap-2">
               <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-300">{item.name}</span>
                  <span className="font-black text-rose-500">{item.quantity} LEFT</span>
               </div>
               <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.max(10, (item.quantity/item.minStockLevel)*100)}%` }}></div>
               </div>
            </div>
          ))}
          {store.stock.filter((s: any) => s.quantity <= s.minStockLevel).length === 0 && (
             <p className="text-slate-500 text-xs italic text-center py-10">All asset levels optimal.</p>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default function ErpMainHub() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [syncTimeout, setSyncTimeout] = useState(false);
  const store = useErpStore();
  const router = useRouter();

  // Server-verified permissions for the current session (see /api/auth/me
  // via useErpStore) — an owner/admin session has session.permissions ===
  // null, meaning "everything visible," matching the existing behavior
  // exactly. An employee session only sees modules their stored permissions
  // grant "view" on; this is a UI convenience on top of the real
  // enforcement, which happens server-side (bootstrap redaction + each API
  // route's own permission check) — this filtering alone is not the
  // security boundary.
  const canView = (moduleName: string) => !store.session?.permissions || !!store.session.permissions[moduleName]?.view;
  // Filtered per pre-existing group (not the flat array first) so hiding one
  // item can't shift where the "Repair Jobs" standalone entry gets spliced
  // in — the desktop sidebar renders these three groups separately.
  const navItemsFirstGroup = navItems.slice(0, 2).filter((item) => canView(item.name));
  const navItemsSecondGroup = navItems.slice(2).filter((item) => canView(item.name));
  const visibleStandaloneItems = STANDALONE_REPAIR_ITEMS.filter((item) => canView(item.name));
  const visibleAllNavItems = ALL_NAV_ITEMS.filter((item) => canView(item.name));

  useEffect(() => {
    setIsMounted(true);
    console.log("ERP Console: Viewport Mounted. Starting Cloud Handshake...");
    
    const timer = setTimeout(() => {
      console.warn("Global Network Sync: Timeout (10s). Reverting to Fallback Node.");
      setSyncTimeout(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    createAutoBackupIfDue(store);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, store.settings?.autoBackup]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('gj5_auth_token');
      if (token) {
        fetch('/api/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
      localStorage.removeItem('gj5_auth_token');
      localStorage.removeItem('gj5_active_user');
      router.push('/');
    }
  };

  const renderModule = () => {
    // UI-level convenience gate matching the same rule the server already
    // enforces (bootstrap redaction + each API route's own permission
    // check) — this exists so a directly-selected tab (there are no
    // separate per-module URLs in this SPA's architecture) can't render
    // content the current session isn't allowed to view, but it is not
    // itself the security boundary; removing it would not expose any data
    // the server wouldn't already withhold.
    if (!canView(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <Lock className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-headline font-bold text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 max-w-sm">You do not have permission to view {activeTab}. Contact your administrator if you believe this is a mistake.</p>
          <Button onClick={() => setActiveTab('Dashboard')} className="mt-2 bg-[#123C8C] hover:bg-[#0D2E63]">Return to Dashboard</Button>
        </div>
      );
    }
    switch (activeTab) {
      case 'Dashboard': return <DashboardModule store={store} />;
      case 'Repairing': return <RepairingModule store={store} />;
      case 'CRM Leads': return <InquiryModule store={store} />;
      case 'Billing': return <BillingModule store={store} />;
      case 'Invoice History': return <InvoiceHistoryModule store={store} onEditInvoice={() => setActiveTab('Billing')} />;
      case 'Stock': return <StockModule store={store} />;
      case 'Employees': return <EmployeesModule store={store} />;
      case 'Attendance': return <AttendanceModule store={store} />;
      case 'Salary': return <SalaryModule store={store} />;
      case 'Analytics': return <AnalyticsModule store={store} />;
      case 'E-Wallet': return <WalletModule store={store} />;
      case 'Logistics': return <TransportationModule store={store} />;
      case 'Settings': return <SettingsModule store={store} onNavigate={setActiveTab} />;
      case 'Repair Jobs': return <RepairJobsModule store={store} />;
      default: return <DashboardModule store={store} />;
    }
  };

  const getActiveUser = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gj5_active_user');
    }
    return null;
  }

  // LOADING STATE WITH HYDRATION SAFETY
  if (isMounted && !store.companyProfile && getActiveUser() && !syncTimeout) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-6">
         <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <Lock className="w-5 h-5 text-blue-500 opacity-40" />
            </div>
         </div>
         <div className="text-center space-y-2">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Synchronizing Cloud Workspace...</p>
            <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Attempting Security Handshake</p>
         </div>
      </div>
    );
  }

  const companyLogo = store.companyProfile?.logoUrl;
  const companyName = store.companyProfile?.companyName || "GJ5 ERP Workspace";
  const ownerName = store.companyProfile?.ownerName || "Authorized Admin";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex overflow-hidden font-body">
        {/* Sidebar Terminal */}
        <aside className="w-72 bg-slate-900/40 border-r border-slate-800 backdrop-blur-xl hidden lg:flex flex-col z-20 shrink-0">
          <div className="p-8 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-800 bg-white shadow-lg">
                <img src={companyLogo || "https://picsum.photos/seed/gj5-logo-official/400/400"} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-headline font-black text-white tracking-tighter leading-tight truncate uppercase">{companyName}</span>
                <span className="text-[8px] font-black text-[#123C8C] uppercase tracking-[0.3em] mt-1">{store.companyProfile?.category || 'ERP MASTER NODE'}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
            {navItemsFirstGroup.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                  activeTab === item.name
                    ? "bg-[#123C8C] text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.name ? "text-white" : "group-hover:text-[#123C8C]")} />
                <span className="text-xs font-bold tracking-tight">{item.name}</span>
                {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </button>
            ))}

            {visibleStandaloneItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                  activeTab === item.name
                    ? "bg-[#123C8C] text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.name ? "text-white" : "group-hover:text-[#123C8C]")} />
                <span className="text-xs font-bold tracking-tight">{item.name}</span>
                {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </button>
            ))}

            {navItemsSecondGroup.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                  activeTab === item.name
                    ? "bg-[#123C8C] text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.name ? "text-white" : "group-hover:text-[#123C8C]")} />
                <span className="text-xs font-bold tracking-tight">{item.name}</span>
                {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-800">
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              className="w-full justify-start gap-4 text-slate-500 hover:text-[#E53935] hover:bg-red-500/5 h-12 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">Terminate Session</span>
            </Button>
          </div>
        </aside>

        {/* Mobile / Tablet Nav Drawer — same nav items/state as the desktop sidebar above */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-slate-900/95 border-slate-800 backdrop-blur-xl flex flex-col z-50">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="p-8 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-800 bg-white shadow-lg">
                  <img src={companyLogo || "https://picsum.photos/seed/gj5-logo-official/400/400"} className="w-full h-full object-contain" alt="Logo" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-headline font-black text-white tracking-tighter leading-tight truncate uppercase">{companyName}</span>
                  <span className="text-[8px] font-black text-[#123C8C] uppercase tracking-[0.3em] mt-1">{store.companyProfile?.category || 'ERP MASTER NODE'}</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
              {visibleAllNavItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => { setActiveTab(item.name); setMobileNavOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                    activeTab === item.name
                      ? "bg-[#123C8C] text-white shadow-lg shadow-blue-900/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", activeTab === item.name ? "text-white" : "group-hover:text-[#123C8C]")} />
                  <span className="text-xs font-bold tracking-tight">{item.name}</span>
                  {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-slate-800">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-4 text-slate-500 hover:text-[#E53935] hover:bg-red-500/5 h-12 rounded-xl"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-bold">Terminate Session</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Viewport */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <header className="h-20 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-[#0B0F19]/80 backdrop-blur-md z-10 shrink-0 gap-3">
            <div className="flex items-center gap-3 md:gap-6 min-w-0">
               <Button
                 size="icon"
                 variant="ghost"
                 className="lg:hidden text-slate-400 shrink-0"
                 onClick={() => setMobileNavOpen(true)}
               >
                 <Menu className="w-5 h-5" />
               </Button>
               <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                  <Input
                    placeholder="Audit: Jobs, Stock, Invoices..."
                    className="pl-10 h-11 border-slate-800 focus-visible:ring-[#123C8C] placeholder:text-slate-600 bg-white text-slate-900"
                  />
               </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              <Button size="icon" variant="ghost" className="relative text-slate-400">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#E53935] rounded-full border-2 border-[#0B0F19]"></span>
              </Button>
              <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                   <p className="text-xs font-bold text-white uppercase tracking-tighter">{ownerName}</p>
                   <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Verified Identity</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-inner shrink-0">
                  <img src={companyLogo || "https://picsum.photos/seed/gj5-logo-official/400/400"} className="w-full h-full object-contain" alt="Profile" />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {store.dataError && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Could not load your data from the server: {store.dataError}. Your records are not lost — try refreshing the page. If this keeps happening, your session may need to be renewed by logging out and back in.</span>
              </div>
            )}
            {renderModule()}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </AuthGuard>
  );
}

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Repairing', icon: Wrench },
  { name: 'CRM Leads', icon: BarChart3 },
  { name: 'Billing', icon: Receipt },
  { name: 'Invoice History', icon: History },
  { name: 'Stock', icon: Package },
  { name: 'Employees', icon: Users },
  { name: 'Attendance', icon: CalendarCheck },
  { name: 'Salary', icon: DollarSign },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'E-Wallet', icon: Wallet },
  { name: 'Logistics', icon: Truck },
  { name: 'Settings', icon: Settings },
];

const STANDALONE_REPAIR_ITEMS = [
  { name: 'Repair Jobs', icon: ClipboardList },
];

// Same items as the desktop sidebar (navItems.slice(0,2) + STANDALONE_REPAIR_ITEMS + navItems.slice(2)),
// in the same order, for the mobile/tablet nav drawer.
const ALL_NAV_ITEMS = [...navItems.slice(0, 2), ...STANDALONE_REPAIR_ITEMS, ...navItems.slice(2)];
