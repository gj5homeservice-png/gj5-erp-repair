
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TicketPercent, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical, 
  History,
  Copy,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  Gift,
  FileDown,
  AlertCircle,
  ChevronRight,
  Target,
  Loader2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Coupon, CouponDiscountType } from '@/lib/types';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from '@/firebase';
import * as XLSX from 'xlsx';

const INITIAL_COUPON: Partial<Coupon> = {
  code: '',
  name: '',
  description: '',
  discountType: 'Percentage',
  discountValue: 10,
  applicablePlans: ['All Plans'],
  startAt: format(new Date(), 'yyyy-MM-dd'),
  expiresAt: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  maxUses: 100,
  perCustomerLimit: 1,
  minimumOrderAmount: 0,
  active: true
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon>>(INITIAL_COUPON);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Coupon)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = 
        (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const isExpired = c.expiresAt ? isBefore(parseISO(c.expiresAt), new Date()) : false;
      let matchesStatus = true;
      if (statusFilter === 'Active') matchesStatus = c.active && !isExpired;
      else if (statusFilter === 'Inactive') matchesStatus = !c.active;
      else if (statusFilter === 'Expired') matchesStatus = isExpired;
      
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const active = coupons.filter(c => c.active && (c.expiresAt ? !isBefore(parseISO(c.expiresAt), new Date()) : true)).length;
    const expired = coupons.filter(c => c.expiresAt ? isBefore(parseISO(c.expiresAt), new Date()) : false).length;
    const redemptions = coupons.reduce((acc, curr) => acc + (curr.usedCount || 0), 0);
    const fullDiscount = coupons.filter(c => c.discountType === 'Percentage' && c.discountValue === 100).length;
    return { total: coupons.length, active, expired, redemptions, fullDiscount };
  }, [coupons]);

  const handleSave = async () => {
    if (!formDataValid()) return;
    if (!db) return;

    const couponId = editingCoupon.id || `CPN-${Date.now()}`;
    const finalCoupon = {
      ...editingCoupon,
      id: couponId,
      code: editingCoupon.code?.toUpperCase(),
      usedCount: editingCoupon.usedCount || 0,
      createdAt: editingCoupon.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Super Admin'
    } as Coupon;

    try {
      await setDoc(doc(db, "coupons", couponId), finalCoupon);
      setIsModalOpen(false);
      toast({ title: "Coupon Committed", description: `Node ${finalCoupon.code} is now live.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failure", description: "Failed to save coupon node." });
    }
  };

  const formDataValid = () => {
    if (!editingCoupon.code || !editingCoupon.discountValue) {
      toast({ variant: "destructive", title: "Missing Data", description: "Code and Discount Value are required." });
      return false;
    }
    return true;
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      toast({ title: "Node Terminated", description: "Coupon removed from registry." });
    } catch (err) {
      toast({ variant: "destructive", title: "Delete Failure", description: "Failed to remove node." });
    }
  };

  const handleDuplicate = (c: Coupon) => {
    const { id, usedCount, ...rest } = c;
    setEditingCoupon({
      ...rest,
      code: `${c.code}_COPY`,
      name: `${c.name} (Copy)`,
      usedCount: 0,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const toggleActive = async (c: Coupon) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "coupons", c.id), { ...c, active: !c.active, updatedAt: new Date().toISOString() });
    } catch (err) {
      toast({ variant: "destructive", title: "Status Update Failure" });
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(coupons);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coupons");
    XLSX.writeFile(wb, `GJ5_Coupons_${format(new Date(), 'dd_MMM_yy')}.xlsx`);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">Promotion Logic Matrix</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Campaign & Coupon Lifecycle Architect</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="outline" className="border-slate-800 h-12 rounded-2xl font-black uppercase text-xs px-6">
             <FileDown className="w-4 h-4 mr-2" /> Export Registry
          </Button>
          <Button onClick={() => { setEditingCoupon(INITIAL_COUPON); setIsModalOpen(true); }} className="bg-[#0066FF] hover:bg-blue-600 px-8 h-12 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/20 flex gap-2">
             <Plus className="w-4 h-4" /> Define Coupon Node
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Coupons', value: stats.total, icon: TicketPercent, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Active Nodes', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Expired Nodes', value: stats.expired, icon: History, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Redemptions', value: stats.redemptions, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: '100% Offers', value: stats.fullDiscount, icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800/50 shadow-2xl overflow-hidden group">
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
        <div className="relative w-full sm:max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search by Coupon Code, Name, or Promotion Class..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-12 h-14 bg-white border-slate-800 rounded-2xl font-bold placeholder:font-medium placeholder:text-slate-600 text-[#111827]"
           />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-full sm:w-48 h-14 bg-slate-950 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-white">
              <SelectValue />
           </SelectTrigger>
           <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active Nodes</SelectItem>
              <SelectItem value="Inactive">Inactive Nodes</SelectItem>
              <SelectItem value="Expired">Expired Nodes</SelectItem>
           </SelectContent>
        </Select>
      </div>

      <div className="rounded-[2.5rem] border border-slate-800/50 bg-slate-900/20 overflow-hidden shadow-2xl min-h-[400px]">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
             <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <Database className="w-4 h-4 text-blue-400 opacity-40" />
                </div>
             </div>
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Syncing Cloud Matrix Registry...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-900/60 h-16 border-b border-slate-800/50">
              <TableRow className="border-transparent hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase px-8">Coupon Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Yield Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase">License Scope</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Usage</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Expiry</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase px-8">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((c) => {
                const isExpired = c.expiresAt ? isBefore(parseISO(c.expiresAt), new Date()) : false;
                return (
                  <TableRow key={c.id} className="border-slate-800/40 hover:bg-white/5 transition-all group h-20">
                    <TableCell className="px-8">
                      <div className="flex flex-col">
                        <span className="font-code font-black text-blue-400 text-sm tracking-widest">{c.code}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[150px]">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-300">
                            {c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue.toLocaleString()} OFF`}
                          </span>
                          <span className="text-[8px] text-slate-600 font-black uppercase">Min Order: ₹{c.minimumOrderAmount}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {c.applicablePlans?.map(p => (
                            <Badge key={p} variant="outline" className="text-[8px] h-4 px-1.5 border-slate-800 bg-slate-950 text-slate-400 font-black uppercase">{p}</Badge>
                          ))}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-300">{c.usedCount || 0} / {c.maxUses || 0}</span>
                          <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                             <div className="bg-blue-600 h-full" style={{ width: `${(c.usedCount / c.maxUses) * 100}%` }}></div>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className={cn("text-[10px] font-bold uppercase", isExpired ? "text-rose-500" : "text-slate-400")}>
                         {c.expiresAt ? format(parseISO(c.expiresAt), 'dd MMM yyyy') : 'N/A'}
                       </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase px-2 h-5 border-0 tracking-widest",
                        isExpired ? "bg-rose-500/10 text-rose-500" :
                        c.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                      )}>
                        {isExpired ? 'Expired' : (c.active ? 'Active' : 'Paused')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(c)} className={cn("h-9 w-9 rounded-xl", c.active ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}>
                          {c.active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(c)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"><Copy className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(c); setIsModalOpen(true); }} className="h-9 w-9 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800"><Edit className="w-4 h-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 p-2 rounded-xl">
                            <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-blue-500/10 transition-colors"><TrendingUp className="w-3.5 h-3.5" /> View Usage History</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-rose-600 text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete Permanently</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filteredCoupons.length === 0 && (
                <TableRow>
                   <TableCell colSpan={7} className="h-48 text-center text-slate-700 uppercase tracking-widest font-black text-xs opacity-50 italic">
                      No coupon campaigns active in matrix registry.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[90vh] flex flex-col">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                   <TicketPercent className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-headline font-bold text-white">
                     {editingCoupon.id ? 'Modify Coupon Node' : 'Campaign Identity Entry'}
                   </DialogTitle>
                   <DialogDescription className="text-slate-400 text-[10px] uppercase font-black tracking-widest">SaaS Enterprise Marketing Matrix</DialogDescription>
                </div>
             </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Node Identity
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Coupon Unique Code</Label>
                       <Input 
                         value={editingCoupon.code || ''} 
                         onChange={e => setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})}
                         className="bg-slate-950 border-slate-700 h-11 font-code font-black text-blue-400 tracking-widest text-lg placeholder:text-slate-500" 
                         placeholder="e.g. GJ5OFF50"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Promotion Name</Label>
                       <Input 
                         value={editingCoupon.name || ''} 
                         onChange={e => setEditingCoupon({...editingCoupon, name: e.target.value})}
                         className="bg-slate-950 border-slate-700 h-11 text-white placeholder:text-slate-500 font-bold" 
                         placeholder="Internal Campaign Label"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Public Description</Label>
                       <Textarea 
                         value={editingCoupon.description || ''} 
                         onChange={e => setEditingCoupon({...editingCoupon, description: e.target.value})}
                         className="bg-slate-950 border-slate-700 min-h-[80px] text-sm text-slate-200 placeholder:text-slate-500 resize-none font-medium" 
                         placeholder="Visual prompt for customer checkout..."
                       />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" /> Yield & Logic
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Discount Type</Label>
                          <Select value={editingCoupon.discountType || 'Percentage'} onValueChange={v => setEditingCoupon({...editingCoupon, discountType: v as CouponDiscountType})}>
                             <SelectTrigger className="bg-slate-950 border-slate-700 h-11 text-white font-bold">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="Percentage">Percentage (%)</SelectItem>
                                <SelectItem value="Fixed Amount">Fixed Amount (₹)</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Discount Value</Label>
                          <Input 
                            type="number"
                            value={editingCoupon.discountValue || 0} 
                            onChange={e => setEditingCoupon({...editingCoupon, discountValue: Number(e.target.value)})}
                            className="bg-slate-950 border-slate-700 h-11 font-code font-black text-emerald-400 text-lg" 
                          />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Minimum Order Node (₹)</Label>
                       <Input 
                         type="number"
                         value={editingCoupon.minimumOrderAmount || 0} 
                         onChange={e => setEditingCoupon({...editingCoupon, minimumOrderAmount: Number(e.target.value)})}
                         className="bg-slate-950 border-slate-700 h-11 font-code text-white font-bold" 
                       />
                    </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Timeline Matrix
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Launch Date</Label>
                       <Input 
                         type="date"
                         value={editingCoupon.startAt || ''} 
                         onChange={e => setEditingCoupon({...editingCoupon, startAt: e.target.value})}
                         className="bg-slate-950 border-slate-700 h-11 text-white text-xs font-bold" 
                         style={{ colorScheme: 'dark' }}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Terminating Date</Label>
                       <Input 
                         type="date"
                         value={editingCoupon.expiresAt || ''} 
                         onChange={e => setEditingCoupon({...editingCoupon, expiresAt: e.target.value})}
                         className="bg-slate-950 border-slate-700 h-11 text-white text-xs font-bold" 
                         style={{ colorScheme: 'dark' }}
                       />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-purple-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Usage Quotas
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Total System Uses</Label>
                       <Input 
                         type="number"
                         value={editingCoupon.maxUses || 0} 
                         onChange={e => setEditingCoupon({...editingCoupon, maxUses: Number(e.target.value)})}
                         className="bg-slate-950 border-slate-700 h-11 font-code text-white font-bold" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Per Customer Cap</Label>
                       <Input 
                         type="number"
                         value={editingCoupon.perCustomerLimit || 0} 
                         onChange={e => setEditingCoupon({...editingCoupon, perCustomerLimit: Number(e.target.value)})}
                         className="bg-slate-950 border-slate-700 h-11 font-code text-white font-bold" 
                       />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 shrink-0 gap-3 flex flex-row items-center justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="px-8 font-bold uppercase text-[10px] text-slate-300 hover:text-white hover:bg-slate-800">Discard Entry</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 px-12 h-12 rounded-xl font-black uppercase text-[10px] text-white shadow-lg shadow-emerald-900/20">Execute Promotion Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
