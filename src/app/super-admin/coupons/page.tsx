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
  Database,
  X
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
import { format, parseISO, isAfter, isBefore, addMonths, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Coupon, CouponDiscountType } from '@/lib/types';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp, Timestamp } from '@/firebase';
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
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon>>(INITIAL_COUPON);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      setError("Cloud Registry Node Offline. Verify Firebase Configuration.");
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Network Handshake Timeout (10s).");
      }
    }, 10000);

    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          // Safe conversion for table display
          return { 
            ...d, 
            id: doc.id,
            startAt: d.startAt instanceof Timestamp ? format(d.startAt.toDate(), 'yyyy-MM-dd') : d.startAt,
            expiresAt: d.expiresAt instanceof Timestamp ? format(d.expiresAt.toDate(), 'yyyy-MM-dd') : d.expiresAt
          };
        });
        setCoupons(data);
        setError(null);
      } catch (err: any) {
        console.error("Registry Sync Failure:", err);
        setError(err.message || "Failed to load master ledger.");
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    }, (err) => {
      console.error("Firestore Listener Fault:", err);
      setError(`Security Access Denied: ${err.code}`);
      setLoading(false);
      clearTimeout(timer);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = 
        (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const expiryDate = c.expiresAt ? parseISO(c.expiresAt as string) : null;
      const isExpired = expiryDate && isValid(expiryDate) ? isBefore(expiryDate, new Date()) : false;

      let matchesStatus = true;
      if (statusFilter === 'Active') matchesStatus = c.active && !isExpired;
      else if (statusFilter === 'Inactive') matchesStatus = !c.active;
      else if (statusFilter === 'Expired') matchesStatus = isExpired;
      
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const active = coupons.filter(c => {
      const expiryDate = c.expiresAt ? parseISO(c.expiresAt as string) : null;
      const isExpired = expiryDate && isValid(expiryDate) ? isBefore(expiryDate, new Date()) : false;
      return c.active && !isExpired;
    }).length;
    
    const expired = coupons.filter(c => {
      const expiryDate = c.expiresAt ? parseISO(c.expiresAt as string) : null;
      return expiryDate && isValid(expiryDate) && isBefore(expiryDate, new Date());
    }).length;

    const redemptions = coupons.reduce((acc, curr) => acc + (curr.usedCount || 0), 0);
    const fullDiscount = coupons.filter(c => c.discountType === 'Percentage' && c.discountValue === 100).length;
    
    return { total: coupons.length, active, expired, redemptions, fullDiscount };
  }, [coupons]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Coupon submit sequence initiated...");

    if (!editingCoupon.code || !editingCoupon.name || !editingCoupon.discountType || !editingCoupon.startAt || !editingCoupon.expiresAt) {
      toast({ variant: "destructive", title: "Validation Warning", description: "All required identity nodes must be filled." });
      return;
    }

    const normalizedCode = editingCoupon.code.toUpperCase().trim();
    
    if (editingCoupon.discountType === 'Percentage' && (editingCoupon.discountValue! < 1 || editingCoupon.discountValue! > 100)) {
      toast({ variant: "destructive", title: "Logic Error", description: "Yield percentage must be between 1 and 100." });
      return;
    }

    const start = parseISO(editingCoupon.startAt as string);
    const end = parseISO(editingCoupon.expiresAt as string);

    if (isValid(start) && isValid(end) && isBefore(end, start)) {
      toast({ variant: "destructive", title: "Timeline Conflict", description: "Terminating node must be after launch node." });
      return;
    }

    if (!db) {
       toast({ variant: "destructive", title: "Cloud Error", description: "Firebase Connection Node Unavailable. Check API configuration." });
       return;
    }

    console.log("Form validation success. Identity Normalized:", normalizedCode);
    setIsSaving(true);

    try {
      const docRef = doc(db, "coupons", normalizedCode);
      
      // Check for existence if it's a new entry
      if (!editingCoupon.id) {
        console.log("Checking for duplicate identity...");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           throw new Error(`Coupon code ${normalizedCode} is already registered in matrix.`);
        }
      }

      console.log("Transmitting payload to Cloud Node...");
      
      // Convert to Firestore Timestamps
      const finalCoupon = {
        ...editingCoupon,
        id: normalizedCode,
        code: normalizedCode,
        discountValue: Number(editingCoupon.discountValue || 0),
        minimumOrderAmount: Number(editingCoupon.minimumOrderAmount || 0),
        maxUses: Number(editingCoupon.maxUses || 0),
        perCustomerLimit: Number(editingCoupon.perCustomerLimit || 1),
        usedCount: editingCoupon.usedCount || 0,
        startAt: Timestamp.fromDate(start),
        expiresAt: Timestamp.fromDate(end),
        createdAt: editingCoupon.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'Master Terminal',
        active: editingCoupon.active ?? true,
        applicablePlans: editingCoupon.applicablePlans || ['All Plans']
      };

      await setDoc(docRef, finalCoupon);
      console.log("Transaction Committed. Registry updated.");
      
      toast({ title: "Node Synchronized", description: `Coupon ${normalizedCode} successfully registered.` });
      setIsModalOpen(false);
      setEditingCoupon(INITIAL_COUPON);
    } catch (err: any) {
      console.error("Registry Commitment Failure:", err);
      toast({ 
        variant: "destructive", 
        title: "Submission Fault", 
        description: err.code === 'permission-denied' 
          ? "Permission Denied: Master Terminal Restricted." 
          : (err.message || "Failed to commit node to cloud.") 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      toast({ title: "Node Terminated", description: "Identity purged from cloud registry." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Failure", description: err.message });
    }
  };

  const handleDuplicate = (c: any) => {
    const { id, usedCount, createdAt, updatedAt, ...rest } = c;
    setEditingCoupon({
      ...rest,
      code: `${c.code}_CLONE`,
      name: `${c.name} (Clone)`,
      usedCount: 0
    });
    setIsModalOpen(true);
  };

  const toggleActive = async (c: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "coupons", c.id), { ...c, active: !c.active, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: c.active ? "Node Paused" : "Node Resumed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Toggle Fault" });
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(coupons);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coupons");
    XLSX.writeFile(wb, `GJ5_Coupon_Manifest_${format(new Date(), 'dd_MMM_yy')}.xlsx`);
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
             <FileDown className="w-4 h-4 mr-2" /> Export Ledger
          </Button>
          <Button onClick={() => { setEditingCoupon(INITIAL_COUPON); setIsModalOpen(true); }} className="bg-[#0066FF] hover:bg-blue-600 px-8 h-12 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/20 flex gap-2">
             <Plus className="w-4 h-4" /> Define Coupon Node
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Registry', value: stats.total, icon: TicketPercent, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Active Nodes', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Expired Nodes', value: stats.expired, icon: History, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Total Redemptions', value: stats.redemptions, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
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
             placeholder="Audit Search: Code, Name, Class..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-12 h-14 bg-white border-slate-800 rounded-2xl font-bold placeholder:text-slate-500 text-[#111827]"
           />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-full sm:w-48 h-14 bg-slate-950 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-white">
              <SelectValue />
           </SelectTrigger>
           <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="All">All Identities</SelectItem>
              <SelectItem value="Active">Active Nodes</SelectItem>
              <SelectItem value="Inactive">Paused Nodes</SelectItem>
              <SelectItem value="Expired">Terminated Nodes</SelectItem>
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
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Establishing Secure Cloud Link...</p>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 p-8 text-center">
             <AlertCircle className="w-12 h-12 text-rose-500" />
             <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">{error}</p>
             <Button variant="outline" onClick={() => window.location.reload()} className="h-10 text-[10px] uppercase font-black">Retry Handshake</Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-900/60 h-16 border-b border-slate-800/50">
              <TableRow className="border-transparent hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase px-8">Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Yield</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Plan Scope</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Audit Usage</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Lifecycle</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase px-8">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((c) => {
                const isExpired = c.expiresAt ? isBefore(parseISO(c.expiresAt as string), new Date()) : false;
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
                            {c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue?.toLocaleString()} OFF`}
                          </span>
                          <span className="text-[8px] text-slate-600 font-black uppercase">Min Order: ₹{c.minimumOrderAmount}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {c.applicablePlans?.map((p: any) => (
                            <Badge key={`${c.id}-${p}`} variant="outline" className="text-[8px] h-4 px-1.5 border-slate-800 bg-slate-950 text-slate-400 font-black uppercase">{p}</Badge>
                          ))}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-300">{c.usedCount || 0} / {c.maxUses || 0}</span>
                          <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                             <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, ((c.usedCount || 0) / (c.maxUses || 1)) * 100)}%` }}></div>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className={cn("text-[10px] font-bold uppercase", isExpired ? "text-rose-500" : "text-slate-400")}>
                            {c.expiresAt ? format(parseISO(c.expiresAt as string), 'dd MMM yy') : 'N/A'}
                          </span>
                          <span className="text-[8px] text-slate-600 uppercase font-black">Launched: {c.startAt ? format(parseISO(c.startAt as string), 'dd MMM') : 'N/A'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase px-2 h-5 border-0 tracking-widest",
                        isExpired ? "bg-rose-500/10 text-rose-500" :
                        c.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                      )}>
                        {isExpired ? 'Terminated' : (c.active ? 'Active' : 'Paused')}
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
                            <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-blue-500/10 transition-colors"><TrendingUp className="w-3.5 h-3.5" /> Redemption Audit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id!)} className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-rose-600 text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /> Purge Permanent</DropdownMenuItem>
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
                      No identities registered in promotion matrix.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[90vh] flex flex-col">
          <form onSubmit={handleSave} className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                     <TicketPercent className="w-6 h-6" />
                  </div>
                  <div>
                     <DialogTitle className="text-xl font-headline font-bold text-white">
                       {editingCoupon.id ? 'Modify Campaign Node' : 'Campaign Identity Entry'}
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
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Coupon Unique Code *</Label>
                         <Input 
                           required
                           value={editingCoupon.code || ''} 
                           onChange={e => setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})}
                           className="bg-slate-950 border-slate-700 h-11 font-code font-black text-blue-400 tracking-widest text-lg" 
                           placeholder="e.g. GJ5FREE"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Promotion Name *</Label>
                         <Input 
                           required
                           value={editingCoupon.name || ''} 
                           onChange={e => setEditingCoupon({...editingCoupon, name: e.target.value})}
                           className="bg-slate-950 border-slate-700 h-11 text-white font-bold" 
                           placeholder="e.g. 100% Master Test"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Public Description</Label>
                         <Textarea 
                           value={editingCoupon.description || ''} 
                           onChange={e => setEditingCoupon({...editingCoupon, description: e.target.value})}
                           className="bg-slate-950 border-slate-700 min-h-[80px] text-sm text-slate-200 resize-none font-medium" 
                           placeholder="Visual context for customer terminal..."
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
                            <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Discount Type *</Label>
                            <Select required value={editingCoupon.discountType || 'Percentage'} onValueChange={v => setEditingCoupon({...editingCoupon, discountType: v as CouponDiscountType})}>
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
                            <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Discount Value *</Label>
                            <Input 
                              required
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
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Launch Date *</Label>
                         <Input 
                           required
                           type="date"
                           value={editingCoupon.startAt || ''} 
                           onChange={e => setEditingCoupon({...editingCoupon, startAt: e.target.value})}
                           className="bg-slate-950 border-slate-700 h-11 text-white text-xs font-bold" 
                           style={{ colorScheme: 'dark' }}
                         />
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Terminating Date *</Label>
                         <Input 
                           required
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
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Total System Uses *</Label>
                         <Input 
                           required
                           type="number"
                           value={editingCoupon.maxUses || 0} 
                           onChange={e => setEditingCoupon({...editingCoupon, maxUses: Number(e.target.value)})}
                           className="bg-slate-950 border-slate-700 h-11 font-code text-white font-bold" 
                         />
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-semibold text-slate-100 tracking-widest ml-1">Per Customer Cap *</Label>
                         <Input 
                           required
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
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="px-8 font-bold uppercase text-[10px] text-slate-300 hover:text-white hover:bg-slate-800">Discard Entry</Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 px-12 min-w-[240px] h-12 rounded-xl font-black uppercase text-[10px] text-white shadow-lg shadow-emerald-900/20"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> SAVING COUPON...</span>
                ) : "EXECUTE PROMOTION NODE"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
