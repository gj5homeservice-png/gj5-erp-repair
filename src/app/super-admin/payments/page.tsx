
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  FileText,
  User,
  ShieldCheck,
  Building2,
  Calendar,
  MoreVertical,
  ChevronRight,
  ArrowUpRight,
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
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { db, collection, onSnapshot, query, orderBy } from '@/firebase';
import * as XLSX from 'xlsx';

export default function PaymentManager() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        (p.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.planId || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = payments.filter(p => p.status === 'Captured').reduce((acc, curr) => acc + (curr.amount / 100), 0);
    const successful = payments.filter(p => p.status === 'Captured').length;
    const failed = payments.filter(p => p.status === 'Failed').length;
    return { total, successful, failed };
  }, [payments]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(payments);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Ledger");
    XLSX.writeFile(wb, `GJ5_Payments_${format(new Date(), 'dd_MMM')}.xlsx`);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">Financial Settlement Ledger</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Master Revenue Sync & Payment Audit Terminal</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-slate-800 h-12 rounded-2xl font-black uppercase text-xs px-6 shadow-xl">
           <Download className="w-4 h-4 mr-2" /> Export Settlement Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.total.toLocaleString()}`, sub: 'Settled Paisa Node', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Successful Nodes', value: stats.successful, sub: 'Authorized Transits', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Security Blocks', value: stats.failed, sub: 'Failed Verification', icon: ShieldCheck, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-2xl overflow-hidden group">
            <CardContent className="p-6 space-y-4">
               <div className={cn("p-2.5 rounded-xl w-fit", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-headline font-black text-white">{stat.value}</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{stat.sub}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
        <div className="relative w-full sm:max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search by Transaction ID, Merchant, or Company ID..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-12 h-14 bg-white border-slate-800 rounded-2xl font-bold placeholder:font-medium placeholder:text-slate-600 text-[#111827]"
           />
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-slate-800 h-14 px-6 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-white"><Filter className="w-4 h-4 mr-2" /> All Channels</Button>
           <Button variant="outline" className="border-slate-800 h-14 px-6 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-white">Active Nodes</Button>
        </div>
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
                <TableHead className="text-[10px] font-black uppercase px-8">Transaction Hub</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Identity Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Chronology</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Settlement</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase px-8">Audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="border-slate-800/40 hover:bg-white/5 transition-all group h-20">
                  <TableCell className="px-8">
                    <div className="flex flex-col">
                      <span className="font-code font-black text-blue-400 text-sm tracking-widest">{p.id}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{p.orderId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <User className="w-3 h-3 text-slate-600" />
                           <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{p.userId}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-black mt-0.5 uppercase">Plan: {p.planId}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">{p.createdAt ? format(parseISO(p.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col">
                        <span className="text-sm font-code font-black text-white">₹{(p.amount / 100).toLocaleString()}</span>
                        <span className="text-[8px] text-slate-600 uppercase font-black">{p.currency} Settlement</span>
                     </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[8px] font-black uppercase px-2 h-5 border-0 tracking-widest",
                      p.status === 'Captured' ? "bg-emerald-500/10 text-emerald-400" :
                      p.status === 'Failed' ? "bg-rose-500/10 text-rose-400" :
                      "bg-slate-800 text-slate-500"
                    )}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                     <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"><FileText className="w-4 h-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 p-2 rounded-xl">
                            <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-blue-500/10 transition-colors"><ShieldCheck className="w-3.5 h-3.5" /> Verify Integrity</DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"><ArrowUpRight className="w-3.5 h-3.5" /> Manual Payout</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                   <TableCell colSpan={6} className="h-48 text-center text-slate-700 uppercase tracking-widest font-black text-xs opacity-50 italic">
                      No transaction records found in central ledger.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-600/10 flex flex-col sm:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><CreditCard className="w-8 h-8" /></div>
            <div className="space-y-1">
               <h4 className="text-sm font-black text-white uppercase tracking-widest">Global Financial Security Node</h4>
               <p className="text-[10px] text-slate-500 max-w-md font-medium leading-relaxed uppercase">All transactions are processed via Razorpay Standard Secure Node with 256-bit encryption. Settlements are reconciled against the master subscription matrix every 24 hours.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
