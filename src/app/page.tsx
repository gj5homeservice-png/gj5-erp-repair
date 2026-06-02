"use client"

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  ReceiptText, 
  Users, 
  Wallet, 
  Search, 
  Bell, 
  Settings as SettingsIcon,
  Menu,
  X,
  LayoutDashboard,
  Eye,
  Upload,
  ImageIcon,
  Trash2,
  Truck,
  Database,
  BarChart3,
  Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErpStore, VisibilitySettings } from '@/hooks/use-erp-store';
import { RepairingModule } from '@/components/modules/RepairingModule';
import { BillingModule } from '@/components/modules/BillingModule';
import { EmployeesModule } from '@/components/modules/EmployeesModule';
import { WalletModule } from '@/components/modules/WalletModule';
import { TransportationModule } from '@/components/modules/TransportationModule';
import { StockModule } from '@/components/modules/StockModule';
import { AnalyticsModule } from '@/components/modules/AnalyticsModule';
import { BackupCenter } from '@/components/modules/BackupCenter';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type ActiveTab = 'Repairing' | 'Billing' | 'Stock' | 'Analytics' | 'Employees' | 'E-Wallet' | 'Transportation';

export default function DashboardPage() {
  const store = useErpStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('Repairing');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const navigation = [
    { name: 'Repairing', icon: Wrench, id: 'Repairing' as ActiveTab, visible: store.visibility.tabs.Repairing },
    { name: 'Billing', icon: ReceiptText, id: 'Billing' as ActiveTab, visible: store.visibility.tabs.Billing },
    { name: 'Stock', icon: Box, id: 'Stock' as ActiveTab, visible: store.visibility.tabs.Stock },
    { name: 'P&L Analytics', icon: BarChart3, id: 'Analytics' as ActiveTab, visible: store.visibility.tabs.Analytics },
    { name: 'Employees', icon: Users, id: 'Employees' as ActiveTab, visible: store.visibility.tabs.Employees },
    { name: 'E-Wallet', icon: Wallet, id: 'E-Wallet' as ActiveTab, visible: store.visibility.tabs['E-Wallet'] },
    { name: 'Logistics', icon: Truck, id: 'Transportation' as ActiveTab, visible: store.visibility.tabs.Transportation },
  ];

  const visibleNavigation = navigation.filter(item => item.visible);

  useEffect(() => {
    if (visibleNavigation.length > 0 && !visibleNavigation.find(n => n.id === activeTab)) {
      setActiveTab(visibleNavigation[0].id as ActiveTab);
    }
  }, [store.visibility.tabs]);

  const handleToggleTab = (tab: keyof VisibilitySettings['tabs']) => {
    const newSettings = {
      ...store.visibility,
      tabs: { ...store.visibility.tabs, [tab]: !store.visibility.tabs[tab] }
    };
    store.updateVisibility(newSettings);
  };

  const handleToggleKpi = (kpi: keyof VisibilitySettings['kpis']) => {
    const newSettings = {
      ...store.visibility,
      kpis: { ...store.visibility.kpis, [kpi]: !store.visibility.kpis[kpi] }
    };
    store.updateVisibility(newSettings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => store.setShopLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const NavItems = ({ isMobile = false }) => (
    <nav className={cn("space-y-2", isMobile ? "px-0" : "px-4")}>
      {navigation.map((item) => item.visible && (
        <button 
          key={item.id} 
          onClick={() => {
            setActiveTab(item.id);
            if (isMobile) setIsMobileMenuOpen(false);
          }} 
          className={cn(
            "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group", 
            activeTab === item.id ? "bg-[#0066FF] text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
          )}
        >
          <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "group-hover:scale-110 transition-transform")} />
          {(isSidebarOpen || isMobile) && <span className="font-medium">{item.name}</span>}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 overflow-x-hidden">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col transition-all duration-300 border-r border-slate-800 bg-[#0B0F19]",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 min-w-[40px] rounded-xl bg-[#0066FF] flex items-center justify-center font-headline font-bold text-xl overflow-hidden">
            {store.shopLogo ? <img src={store.shopLogo} className="w-full h-full object-cover" alt="Logo" /> : "G"}
          </div>
          {isSidebarOpen && <span className="font-headline font-bold text-lg xl:text-xl tracking-tight truncate">GJ5 HOME SERVICE</span>}
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          <NavItems />
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all">
            <SettingsIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Master Settings</span>}
          </button>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {isSidebarOpen && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300 w-full", 
        isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        <header className="h-20 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#0B0F19] border-r border-slate-800 p-0 w-72">
                <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                <SheetDescription className="sr-only">ERP Navigation</SheetDescription>
                <div className="p-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center font-headline font-bold text-xl overflow-hidden">
                    {store.shopLogo ? <img src={store.shopLogo} className="w-full h-full object-cover" alt="Logo" /> : "G"}
                  </div>
                  <span className="font-headline font-bold text-xl tracking-tight">GJ5 HOME SERVICE</span>
                </div>
                <div className="mt-8">
                  <NavItems isMobile />
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Master search..." className="pl-10 bg-slate-950/50 border-slate-800 rounded-xl w-full h-11 focus-visible:ring-[#0066FF]" />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 ml-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-blue-400 italic">ERP Enterprise Edition</span>
              <span className="text-[10px] text-slate-500 tracking-widest font-code">PRO-V2.8.0</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF3366] rounded-full border-2 border-[#0B0F19]"></span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-full">
          {activeTab === 'Repairing' && <RepairingModule store={store} />}
          {activeTab === 'Billing' && <BillingModule store={store} />}
          {activeTab === 'Stock' && <StockModule store={store} />}
          {activeTab === 'Analytics' && <AnalyticsModule store={store} />}
          {activeTab === 'Employees' && <EmployeesModule store={store} />}
          {activeTab === 'E-Wallet' && <WalletModule store={store} />}
          {activeTab === 'Transportation' && <TransportationModule store={store} />}
        </div>
      </main>

      <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl p-0 md:p-6 overflow-hidden max-h-[95vh] flex flex-col">
          <DialogHeader className="p-6 border-b border-slate-800 md:p-0 md:border-0">
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-[#0066FF]" /> Master Controller Panel
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 md:p-0 space-y-8 custom-scrollbar">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Branding</h4>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {store.shopLogo ? <img src={store.shopLogo} className="w-full h-full object-cover" alt="Shop Logo" /> : <ImageIcon className="w-8 h-8 text-slate-700" />}
                </div>
                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <p className="text-sm font-medium text-slate-300">Logo Asset</p>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-[#0066FF] hover:bg-blue-600"><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                    {store.shopLogo && <Button size="sm" variant="ghost" onClick={() => store.setShopLogo(null)} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Database className="w-4 h-4" /> Backup Center</h4>
              <BackupCenter store={store} />
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Sidebar Toggles</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(store.visibility.tabs).map((tab) => (
                  <div key={tab} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Label className="text-sm font-medium">{tab}</Label>
                    <Switch checked={store.visibility.tabs[tab as keyof VisibilitySettings['tabs']]} onCheckedChange={() => handleToggleTab(tab as keyof VisibilitySettings['tabs'])} />
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4 pb-8">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye className="w-4 h-4" /> 7-Card Analytics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'totalActive', label: 'Total Active' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'repeat', label: 'Repeat Call' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'exchange', label: 'Exchange/Purchase' },
                  { id: 'warranty', label: 'Warranty Tracking' }
                ].map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Label className="text-sm font-medium">{kpi.label}</Label>
                    <Switch checked={store.visibility.kpis[kpi.id as keyof VisibilitySettings['kpis']]} onCheckedChange={() => handleToggleKpi(kpi.id as keyof VisibilitySettings['kpis'])} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
