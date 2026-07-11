"use client"

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Clock, 
  CheckCircle2, 
  User, 
  Building2, 
  Calendar,
  Loader2,
  Database,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { db, collection, query, onSnapshot, orderBy } from '@/firebase';
import { Subscription } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SubscriptionManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Subscription)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = subscriptions.filter(s => 
    (s.planName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.companyId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">Active Subscription Ledger</h1>
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Master License Deployment Monitor</p>
      </div>

      <div className="flex items-center gap-4 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50">
        <div className="relative w-full sm:max-w-md">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Filter by Plan, User, or Company ID..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-12 h-14 bg-white border-slate-800 rounded-2xl font-bold text-[#111827]"
           />
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-800/50 bg-slate-900/20 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
             <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Auditing License Matrix...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-900/60 h-16 border-b border-slate-800/50">
              <TableRow className="border-transparent">
                <TableHead className="text-[10px] font-black uppercase px-8">Tenant Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase">License Tier</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Chronology</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Remittance</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const daysLeft = differenceInDays(parseISO(s.expiryDate), new Date());
                return (
                  <TableRow key={s.id} className="border-slate-800/40 hover:bg-white/5 transition-all h-20">
                    <TableCell className="px-8">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <Building2 className="w-3.5 h-3.5 text-blue-400" />
                           <span className="font-bold text-sm text-slate-100">{s.companyId}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                           <User className="w-3 h-3 text-slate-600" />
                           <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[120px]">{s.userId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-white uppercase font-headline tracking-widest">{s.planName}</span>
                          <span className="text-[9px] text-slate-600 uppercase font-black">Code: {s.couponCode || 'DIRECT'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className={cn("text-xs font-bold", daysLeft > 0 ? "text-emerald-400" : "text-rose-500")}>
                             {daysLeft > 0 ? `${daysLeft} Days Left` : 'Expired'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-500">
                             <Calendar className="w-3 h-3" />
                             <span className="font-black uppercase">{format(parseISO(s.startDate), 'dd MMM')} - {format(parseISO(s.expiryDate), 'dd MMM yy')}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="font-code font-bold text-blue-400">₹{s.finalAmount.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-600 uppercase font-black">{s.paymentMethod}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <Badge className={cn(
                         "text-[8px] font-black uppercase px-2 h-5 border-0",
                         s.active && daysLeft > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                       )}>
                         {s.active && daysLeft > 0 ? 'Active' : 'Terminated'}
                       </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                   <TableCell colSpan={5} className="h-48 text-center text-slate-700 uppercase tracking-widest font-black text-xs">
                      No active licenses found in matrix.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
