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
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErpStore, VisibilitySettings } from '@/hooks/use-erp-store';
import { RepairingModule } from '@/components/modules/RepairingModule';
import { BillingModule } from '@/components/modules/BillingModule';
import { EmployeesModule } from '@/components/modules/EmployeesModule';
import { WalletModule } from '@/components/modules/WalletModule';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const store = useErpStore();
  const [activeTab, setActiveTab] = useState<'Repairing' | 'Billing' | 'Employees' | 'E-Wallet'>('Repairing');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const navigation = [
    { name: 'Repairing', icon: Wrench, id: 'Repairing', visible: store.visibility.tabs.Repairing },
    { name: 'Billing', icon: ReceiptText, id: 'Billing', visible: store.visibility.tabs.Billing },
    { name: 'Employees', icon: Users, id: 'Employees', visible: store.visibility.tabs.Employees },
    { name: 'E-Wallet', icon: Wallet, id: 'E-Wallet', visible: store.visibility.tabs['E-Wallet'] },
  ].filter(item => item.visible);

  useEffect(() => {
    if (navigation.length > 0 && !navigation.find(n => n.id === activeTab)) {
      setActiveTab(navigation[0].id as any);
    }
  }, [store.visibility.tabs]);

  const handleToggleTab = (tab: keyof VisibilitySettings['tabs']) => {
    const newSettings = {
      ...store.visibility,
      tabs: {
        ...store.visibility.tabs,
        [tab]: !store.visibility.tabs[tab]
      }
    };
    store.updateVisibility(newSettings);
  };

  const handleToggleKpi = (kpi: keyof VisibilitySettings['kpis']) => {
    const newSettings = {
      ...store.visibility,
      kpis: {
        ...store.visibility.kpis,
        [kpi]: !store.visibility.kpis[kpi]
      }
    };
    store.updateVisibility(newSettings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        store.setShopLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 border-r border-slate-800 bg-[#0B0F19]",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center font-headline font-bold text-xl overflow-hidden">
            {store.shopLogo ? (
              <img src={store.shopLogo} className="w-full h-full object-cover" alt="G" />
            ) : (
              "G"
            )}
          </div>
          {isSidebarOpen && <span className="font-headline font-bold text-xl tracking-tight">GJ5 PLUS</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-[#0066FF] text-white shadow-lg shadow-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "group-hover:scale-110 transition-transform")} />
              {isSidebarOpen && <span className="font-medium">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all">
                <SettingsIcon className="w-5 h-5" />
                {isSidebarOpen && <span className="font-medium">System Settings</span>}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-[#0066FF]" />
                  Master Controller Panel
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Branding & Identity
                  </h4>
                  <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                      {store.shopLogo ? (
                        <img src={store.shopLogo} className="w-full h-full object-cover" alt="Shop Logo" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-medium text-slate-300">Shop Logo Asset</p>
                      <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-[#0066FF] hover:bg-blue-600">
                          <Upload className="w-4 h-4 mr-2" /> Upload Logo
                        </Button>
                        {store.shopLogo && (
                          <Button size="sm" variant="ghost" onClick={() => store.setShopLogo(null)} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Sidebar Module Toggles
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(store.visibility.tabs).map((tab) => (
                      <div key={tab} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <Label className="text-sm font-medium">{tab}</Label>
                        <Switch 
                          checked={store.visibility.tabs[tab as keyof VisibilitySettings['tabs']]} 
                          onCheckedChange={() => handleToggleTab(tab as keyof VisibilitySettings['tabs'])}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Analytics KPI Toggles
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'totalActive', label: 'Total Active' },
                      { id: 'pending', label: 'Pending' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'repeat', label: 'Repeat Complaints' },
                      { id: 'exchange', label: 'Exchange/Pur' },
                      { id: 'warranty', label: 'Warranty Calls' }
                    ].map((kpi) => (
                      <div key={kpi.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <Label className="text-sm font-medium">{kpi.label}</Label>
                        <Switch 
                          checked={store.visibility.kpis[kpi.id as keyof VisibilitySettings['kpis']]} 
                          onCheckedChange={() => handleToggleKpi(kpi.id as keyof VisibilitySettings['kpis'])}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {isSidebarOpen && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        <header className="h-20 border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
             <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Master Search Job ID, Mobile, Customer..." 
                  className="pl-10 bg-slate-900/50 border-slate-800 focus:ring-[#0066FF] h-11 rounded-xl w-full"
                />
             </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end mr-4">
              <span className="text-sm font-semibold">Admin Console</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-code">v2.5.0</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF3366] rounded-full border-2 border-[#0B0F19]"></span>
            </button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'Repairing' && <RepairingModule store={store} onInvoiceRequest={() => setActiveTab('Billing')} />}
          {activeTab === 'Billing' && <BillingModule store={store} />}
          {activeTab === 'Employees' && <EmployeesModule store={store} />}
          {activeTab === 'E-Wallet' && <WalletModule store={store} />}
        </div>
      </main>
    </div>
  );
}
