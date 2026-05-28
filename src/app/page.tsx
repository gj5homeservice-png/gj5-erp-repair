"use client"

import React, { useState } from 'react';
import { 
  Wrench, 
  ReceiptText, 
  Users, 
  Wallet, 
  Search, 
  Bell, 
  Settings,
  Menu,
  X,
  PlusCircle,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErpStore } from '@/hooks/use-erp-store';
import { RepairingModule } from '@/components/modules/RepairingModule';
import { BillingModule } from '@/components/modules/BillingModule';
import { EmployeesModule } from '@/components/modules/EmployeesModule';
import { WalletModule } from '@/components/modules/WalletModule';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'Repairing' | 'Billing' | 'Employees' | 'E-Wallet'>('Repairing');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const store = useErpStore();

  const navigation = [
    { name: 'Repairing', icon: Wrench, id: 'Repairing' },
    { name: 'Billing', icon: ReceiptText, id: 'Billing' },
    { name: 'Employees', icon: Users, id: 'Employees' },
    { name: 'E-Wallet', icon: Wallet, id: 'E-Wallet' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 border-r border-slate-800 bg-[#0B0F19]",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center font-headline font-bold text-xl">
            G
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

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {isSidebarOpen && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* Header */}
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
              <span className="text-xs text-slate-500 uppercase tracking-widest font-code">v2.4.0</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF3366] rounded-full border-2 border-[#0B0F19]"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {activeTab === 'Repairing' && <RepairingModule store={store} onInvoiceRequest={(call) => setActiveTab('Billing')} />}
          {activeTab === 'Billing' && <BillingModule store={store} />}
          {activeTab === 'Employees' && <EmployeesModule store={store} />}
          {activeTab === 'E-Wallet' && <WalletModule store={store} />}
        </div>
      </main>
    </div>
  );
}
