"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  ChevronRight,
  Eye,
  LogIn,
  Edit,
  Trash2,
  Lock,
  Calendar,
  Globe,
  Plus,
  Database,
  AlertCircle,
  Loader2,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { db, collection, query, onSnapshot, orderBy } from '@/firebase';
import { Company } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function CompanyManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!db) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Company[];
      setCompanies(data);
      setLoading(false);
    }, (error) => {
      console.warn("Super Admin: Cloud Node Error", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return companies.filter(c => 
      (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ownerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ownerMobile || '').includes(searchQuery)
    );
  }, [searchQuery, companies]);

  const handleLoginAs = (company: Company) => {
    localStorage.setItem('gj5_active_user', company.ownerEmail);
    localStorage.setItem('gj5_auth_token', `super-admin-token-${Date.now()}`);
    localStorage.setItem(`gj5_company_${company.ownerEmail}`, JSON.stringify(company));
    router.push('/dashboard');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">Enterprise Registry Node</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Global SaaS Management Matrix</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
        <div className="relative w-full sm:max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search by Name, Owner, Mobile, or Email..." 
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
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Syncing Cloud Matrix...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-900/60 h-16 border-b border-slate-800/50">
              <TableRow className="border-transparent hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase px-8">Company / Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Plan Context</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Lifecycle</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Paid Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase px-8">Audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const daysLeft = c.planExpiryDate ? differenceInDays(parseISO(c.planExpiryDate), new Date()) : 0;
                return (
                  <TableRow key={c.id} className="border-slate-800/40 hover:bg-white/5 transition-all h-20">
                    <TableCell className="px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-blue-500 border border-slate-700 overflow-hidden">
                          {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-cover" alt="Logo" /> : (c.companyName?.[0] || 'G')}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-headline font-bold text-sm text-slate-100">{c.companyName}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">{c.ownerName} • {c.ownerMobile}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <Badge variant="outline" className="text-[9px] uppercase border-blue-500/20 text-blue-400 bg-blue-500/5 w-fit">{c.planName || 'No Plan'}</Badge>
                          <span className="text-[9px] text-slate-500 uppercase mt-1 font-bold">Method: {c.paymentMethod}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className={cn("text-xs font-bold", daysLeft > 0 ? "text-emerald-400" : "text-rose-500")}>
                             {daysLeft > 0 ? `${daysLeft} Days Remaining` : 'Expired'}
                          </span>
                          <span className="text-[9px] text-slate-600 uppercase font-black">Exp: {c.planExpiryDate ? format(parseISO(c.planExpiryDate), 'dd MMM yy') : 'N/A'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase px-2 h-5 border-0 tracking-widest",
                        c.paymentStatus?.includes('Paid') ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      )}>
                        {c.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleLoginAs(c)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-400" title="Open ERP"><LogIn className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-emerald-400"><Eye className="w-4 h-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 p-2">
                             <DropdownMenuItem className="text-[10px] font-bold uppercase cursor-pointer">Extend Plan Node</DropdownMenuItem>
                             <DropdownMenuItem className="text-[10px] font-bold uppercase cursor-pointer text-rose-500">Block Node Access</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                   <TableCell colSpan={5} className="h-48 text-center text-slate-600 uppercase tracking-widest font-black text-xs">
                      No companies registered yet.
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
