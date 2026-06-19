"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
  Box,
  History,
  TrendingUp,
  Receipt,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  Download,
  FileJson,
  XCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Activity,
  ShieldCheck,
  CreditCard,
  Lock,
  ShieldAlert,
  ClipboardList,
  CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErpStore } from '@/hooks/use-erp-store';
import { RepairingModule } from '@/components/modules/RepairingModule';
import { InquiryModule } from '@/components/modules/InquiryModule';
import { BillingModule } from '@/components/modules/BillingModule';
import { InvoiceHistoryModule } from '@/components/modules/InvoiceHistoryModule';
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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { isSameMonth, parseISO } from 'date-fns';

type ActiveTab = 'Repairing' | 'CRM Leads' | 'Billing' | 'Invoice History' | 'Stock' | 'Analytics' | 'E-Wallet' | 'Transportation';

export default function DashboardPage() {
  const store = useErpStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('Repairing');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const navigation = [
    { name: 'Repairing', icon: Wrench, id: 'Repairing' as ActiveTab, visible: store.visibility.tabs.Repairing },
    { name: 'CRM Leads', icon: UserPlus, id: 'CRM Leads' as ActiveTab, visible: store.visibility.tabs['CRM Leads'] },
    { name: 'Billing', icon: Receipt, id: 'Billing' as ActiveTab, visible: store.visibility.tabs.Billing },
    { name: 'Invoice History', icon: History, id: 'Invoice History' as ActiveTab, visible: store.visibility.tabs['Invoice History'] },
    { name: 'Stock', icon: Box, id: 'Stock' as ActiveTab, visible: store.visibility.tabs.Stock },
    { name: 'P&L Analytics', icon: BarChart3, id: 'Analytics' as ActiveTab, visible: store.visibility.tabs.Analytics },
    { name: 'E-Wallet', icon: Wallet, id: 'E-Wallet' as ActiveTab, visible: store.visibility.tabs['E-Wallet'] },
    { name: 'Logistics', icon: Truck, id: 'Transportation' as ActiveTab, visible: store.visibility.tabs.Transportation },
  ];

  const sortedNavigation = useMemo(() => {
    return [...navigation].sort((a, b) => {
      const indexA = store.navOrder.indexOf(a.id);
      const indexB = store.navOrder.indexOf(b.id);
      return indexA - indexB;
    });
  }, [store.navOrder, store.visibility.tabs]);

  const dashboardStats = useMemo(() => {
    const allCalls = store.calls || [];
    const totalActive = allCalls.filter((c: any) => c.status !== 'Completed' && c.status !== 'Rejected').length;
    const pending = allCalls.filter((c: any) => c.status === 'Pending').length;
    const completed = allCalls.filter((c: any) => c.status === 'Completed').length;
    const rejected = allCalls.filter((c: any) => c.status === 'Rejected').length;

    const currentMonth = store.invoices.filter((i: any) => i.timestamp && isSameMonth(parseISO(i.timestamp), new Date()));
    const totalSales = currentMonth.reduce((acc: number, curr: any) => acc + (curr.grandTotal || 0), 0);
    const totalProfit = currentMonth.reduce((acc: number, curr: any) => {
      const itemsProfit = (curr.items || []).reduce((sum: number, item: any) => {
        const stockRef = store.stock.find((s: any) => s.name === item.name);
        const cost = stockRef?.purchasePrice || item.rate * 0.6;
        return sum + (item.rate - cost) * item.quantity;
      }, 0);
      return acc + itemsProfit;
    }, 0);
    const pendingAmount = store.invoices.filter((i: any) => i.paymentStatus !== 'Paid').reduce((acc: number, curr: any) => acc + (curr.grandTotal || 0), 0);
    const gstLiability = currentMonth.reduce((acc: number, curr: any) => acc + ((curr.cgst || 0) + (curr.sgst || 0)), 0);

    return { totalActive, pending, completed, rejected, totalSales, totalProfit, pendingAmount, gstLiability };
  }, [store.calls, store.invoices, store.stock]);

  const visibleNavigation = sortedNavigation.filter(item => item.visible);

  useEffect(() => {
    if (visibleNavigation.length > 0 && !visibleNavigation.find(n => n.id === activeTab)) {
      setActiveTab(visibleNavigation[0].id as ActiveTab);
    }
  }, [store.visibility.tabs, sortedNavigation]);

  const handleToggleTab = (tab: string) => {
    const newSettings = {
      ...store.visibility,
      tabs: { ...store.visibility.tabs, [tab]: !store.visibility.tabs[tab] }
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

  const reorderNav = (index: number, direction: 'UP' | 'DOWN' | 'TOP' | 'BOTTOM') => {
    const newOrder = [...store.navOrder];
    const item = newOrder[index];
    newOrder.splice(index, 1);

    if (direction === 'UP') newOrder.splice(Math.max(0, index - 1), 0, item);
    else if (direction === 'DOWN') newOrder.splice(Math.min(newOrder.length, index + 1), 0, item);
    else if (direction === 'TOP') newOrder.splice(0, 0, item);
    else if (direction === 'BOTTOM') newOrder.push(item);

    store.setNavOrder(newOrder);
  };

  const NavItems = ({ isMobile = false }) => (
    <nav className={cn("space-y-1.5", isMobile ? "px-0" : "px-4")}>
      {sortedNavigation.map((item) => item.visible && (
        <button 
          key={item.id} 
          onClick={() => {
            setActiveTab(item.id);
            if (isMobile) setIsMobileMenuOpen(false);
          }} 
          className={cn(
            "w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all group", 
            activeTab === item.id ? "bg-[#0066FF] text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
          )}
        >
          <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "group-hover:scale-110 transition-transform")} />
          {(isSidebarOpen || isMobile) && <span className="font-medium whitespace-nowrap text-sm">{item.name}</span>}
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

        <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
          <NavItems />
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all">
            <SettingsIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium text-sm">Master Settings</span>}
          </button>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800/50 transition-all">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {isSidebarOpen && <span className="font-medium text-sm">Collapse</span>}
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
              <span className="text-sm font-semibold text-blue-400 italic">GJ5 PLUS</span>
              <span className="text-[10px] text-slate-500 tracking-widest font-code">PRO-V3.2.0</span>
            </div>
            
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4 md:pl-6">
              <Avatar className="w-9 h-9 border border-slate-800">
                <AvatarImage src="" />
                <AvatarFallback className="bg-blue-600 text-white text-xs">A</AvatarFallback>
              </Avatar>
              <div className="hidden xl:flex flex-col">
                <span className="text-xs font-bold">Admin</span>
                <span className="text-[9px] text-slate-500">System Root</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {activeTab === 'Billing' || activeTab === 'Analytics' || activeTab === 'Invoice History' ? (
              <>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Monthly Sales</p>
                      <h3 className="text-2xl font-headline font-bold text-blue-400">₹{dashboardStats.totalSales.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><DollarSign className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Est. Net Profit</p>
                      <h3 className="text-2xl font-headline font-bold text-emerald-400">₹{dashboardStats.totalProfit.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">GST Liability</p>
                      <h3 className="text-2xl font-headline font-bold text-rose-400">₹{dashboardStats.gstLiability.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><ShieldCheck className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Outstanding</p>
                      <h3 className="text-2xl font-headline font-bold text-amber-400">₹{dashboardStats.pendingAmount.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><CreditCard className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Active</p>
                      <h3 className="text-2xl font-headline font-bold text-[#0066FF]">{dashboardStats.totalActive}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><TrendingUp className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Pending Cases</p>
                      <h3 className="text-2xl font-headline font-bold text-amber-400">{dashboardStats.pending}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Clock className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Completed Jobs</p>
                      <h3 className="text-2xl font-headline font-bold text-emerald-400">{dashboardStats.completed}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Rejected Calls</p>
                      <h3 className="text-2xl font-headline font-bold text-rose-400">{dashboardStats.rejected}</h3>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><XCircle className="w-5 h-5" /></div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {activeTab === 'Repairing' && <RepairingModule store={store} />}
          {activeTab === 'CRM Leads' && <InquiryModule store={store} />}
          {activeTab === 'Billing' && <BillingModule store={store} />}
          {activeTab === 'Invoice History' && <InvoiceHistoryModule store={store} onEditInvoice={(inv) => { setActiveTab('Billing'); (window as any).__EDIT_INVOICE = inv; }} />}
          {activeTab === 'Stock' && <StockModule store={store} />}
          {activeTab === 'Analytics' && <AnalyticsModule store={store} />}
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
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4" /> Security Matrix</h4>
               <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Master Delete Password</Label>
                        <p className="text-[10px] text-slate-600 leading-tight">Required for terminating jobs, assets, and registry records.</p>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Input 
                          type="password" 
                          value={store.deletePassword} 
                          onChange={e => store.setDeletePassword(e.target.value)} 
                          className="bg-slate-950 border-slate-800 h-10 w-full sm:w-40 font-code text-center" 
                          placeholder="••••"
                        />
                        <Button size="sm" variant="ghost" className="h-10 text-[9px] uppercase font-black text-blue-500" onClick={() => toast({title: "Security Updated", description: "Master password committed to local node."})}>Commit</Button>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                     <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                     <p className="text-[10px] text-amber-500 leading-tight italic">Warning: This password protects all critical database destructive actions.</p>
                  </div>
               </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Sidebar Layout Manager</h4>
                  <div className="flex gap-2">
                     <input type="file" id="import-nav" className="hidden" accept=".json" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const content = JSON.parse(event.target?.result as string);
                              if (content.navOrder) store.setNavOrder(content.navOrder);
                            } catch (err) { toast({ title: "Import Error", variant: "destructive" }); }
                          };
                          reader.readAsText(file);
                        }
                     }} />
                     <Button variant="outline" size="sm" onClick={() => document.getElementById('import-nav')?.click()} className="h-8 text-[9px] uppercase border-slate-700"><FileJson className="w-3 h-3 mr-1.5" /> Import</Button>
                     <Button variant="outline" size="sm" onClick={() => {
                        const data = JSON.stringify({ navOrder: store.navOrder });
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Sidebar_Layout.json`;
                        link.click();
                     }} className="h-8 text-[9px] uppercase border-slate-700"><Download className="w-3 h-3 mr-1.5" /> Export</Button>
                     <Button variant="ghost" size="sm" onClick={() => store.resetNavOrder()} className="h-8 text-[9px] uppercase text-slate-500 hover:text-white">Reset Default</Button>
                  </div>
               </div>
               <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="divide-y divide-slate-800">
                     {store.navOrder.map((id: string, idx: number) => {
                        const item = navigation.find(n => n.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex items-center p-3 hover:bg-slate-900/50 group">
                             <div className="flex items-center gap-3 flex-1">
                                <GripVertical className="w-4 h-4 text-slate-700 group-hover:text-slate-500" />
                                <div className={cn("p-2 rounded-lg bg-slate-900", item.visible ? "text-blue-400" : "text-slate-600")}>
                                   <item.icon className="w-4 h-4" />
                                </div>
                                <span className={cn("text-xs font-bold", item.visible ? "text-slate-100" : "text-slate-500")}>{item.name}</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <Switch checked={!!store.visibility.tabs[id]} onCheckedChange={() => handleToggleTab(id)} />
                                <div className="flex gap-1 border-l border-slate-800 pl-4">
                                   <Button variant="ghost" size="icon" onClick={() => reorderNav(idx, 'TOP')} disabled={idx === 0} className="h-7 w-7 text-slate-500 hover:text-blue-400"><ChevronsUp className="w-3.5 h-3.5" /></Button>
                                   <Button variant="ghost" size="icon" onClick={() => reorderNav(idx, 'UP')} disabled={idx === 0} className="h-7 w-7 text-slate-500 hover:text-blue-400"><ArrowUp className="w-3.5 h-3.5" /></Button>
                                   <Button variant="ghost" size="icon" onClick={() => reorderNav(idx, 'DOWN')} disabled={idx === store.navOrder.length - 1} className="h-7 w-7 text-slate-500 hover:text-blue-400"><ArrowDown className="w-3.5 h-3.5" /></Button>
                                   <Button variant="ghost" size="icon" onClick={() => reorderNav(idx, 'BOTTOM')} disabled={idx === store.navOrder.length - 1} className="h-7 w-7 text-slate-500 hover:text-blue-400"><ChevronsDown className="w-3.5 h-3.5" /></Button>
                                </div>
                             </div>
                          </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Database className="w-4 h-4" /> Backup Center</h4>
              <BackupCenter store={store} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}