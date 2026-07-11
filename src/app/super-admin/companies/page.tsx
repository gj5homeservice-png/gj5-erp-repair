
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
  Loader2
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
import { format, parseISO } from 'date-fns';
import { db, collection, query, onSnapshot } from '@/firebase';
import { Company } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function CompanyManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("Super Admin: Initializing Enterprise Registry...");
    
    // Fail-safe Timeout
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Super Admin: Network Sync Timeout (10s). Reverting to Static Cache.");
        setLoading(false);
      }
    }, 10000);

    if (!db) {
      console.error("Super Admin: Firestore Disconnected. Check Firebase Config.");
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const q = query(collection(db, "companies"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        console.log("Super Admin: Companies Synced from Cloud Node. Count:", snapshot.size);
        const data = snapshot.docs.map(doc => ({ ...doc.data() })) as Company[];
        setCompanies(data);
        setLoading(false);
      }, (error) => {
        console.error("Super Admin: Snapshot Error:", error);
        setLoading(false);
      });
    } catch (err) {
      console.error("Super Admin: Registry Handshake Error:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const filtered = useMemo(() => {
    return companies.filter(c => 
      (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ownerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ownerMobile || '').includes(searchQuery)
    );
  }, [searchQuery, companies]);

  const handleLoginAs = (company: Company) => {
    localStorage.setItem('gj5_active_user', company.ownerEmail);
    localStorage.setItem('gj5_auth_token', `super-admin-token-${Date.now()}`);
    router.push('/dashboard');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black tracking-tight text-white uppercase italic">Enterprise Node Registry</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Real-time Management & Database Access Control</p>
        </div>
        <Button className="bg-[#0066FF] hover:bg-blue-600 px-8 h-12 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/20 flex gap-2">
           <Plus className="w-4 h-4" /> Provision New Node
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
        <div className="relative w-full sm:max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search by Enterprise ID, Brand Name, or Authorized Owner..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="pl-12 h-14 bg-white border-slate-800 rounded-2xl font-bold placeholder:font-medium placeholder:text-slate-600 text-[#111827]"
           />
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-slate-800 h-14 px-6 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-white"><Filter className="w-4 h-4 mr-2" /> Global Filters</Button>
           <Button variant="outline" className="border-slate-800 h-14 px-6 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-white group"><Globe className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-1000" /> Region Sync</Button>
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
                <TableHead className="text-[10px] font-black uppercase px-8">Enterprise Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Owner Authority</TableHead>
                <TableHead className="text-[10px] font-black uppercase">License Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase px-8">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="border-slate-800/40 hover:bg-white/5 transition-all group h-20">
                  <TableCell className="px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-blue-500 border border-slate-700 shadow-inner group-hover:border-blue-500/50 transition-colors overflow-hidden">
                        {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-cover" alt="Logo" /> : (c.companyName?.[0] || 'G')}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">{c.companyName}</span>
                        <span className="text-[9px] text-slate-500 font-code font-bold uppercase tracking-widest">{c.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{c.ownerName}</span>
                        <span className="text-[10px] text-slate-500 italic">{c.ownerEmail}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col">
                        <Badge variant="outline" className="text-[9px] uppercase border-slate-800 w-fit h-4 px-1.5 font-black text-blue-400">{c.planName || 'N/A'}</Badge>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">Exp: {c.planExpiryDate ? format(parseISO(c.planExpiryDate), 'dd MMM yy') : 'N/A'}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[8px] font-black uppercase px-2 h-5 border-0 tracking-widest",
                      c.companyStatus === 'active' ? "bg-emerald-500/10 text-emerald-400" :
                      c.companyStatus === 'trial' ? "bg-blue-500/10 text-blue-400" :
                      c.companyStatus === 'suspended' ? "bg-rose-500/10 text-rose-400 animate-pulse" :
                      "bg-slate-800 text-slate-500"
                    )}>
                      {c.companyStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleLoginAs(c)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" title="Login as Company"><LogIn className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10" title="View Database"><Database className="w-4 h-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 p-2 rounded-xl">
                          <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-blue-500/10 transition-colors"><Edit className="w-3.5 h-3.5" /> Modify Node</DropdownMenuItem>
                          <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"><Lock className="w-3.5 h-3.5" /> Reset Access</DropdownMenuItem>
                          <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors"><ShieldCheck className="w-3.5 h-3.5" /> Suspend License</DropdownMenuItem>
                          <DropdownMenuItem className="text-[10px] uppercase font-bold gap-2 cursor-pointer rounded-lg hover:bg-rose-600 text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /> Destroy DB</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                   <TableCell colSpan={5} className="h-48 text-center text-slate-500 font-medium italic">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                         <Search className="w-10 h-10" />
                         <span>No enterprise nodes matching criteria in central registry.</span>
                      </div>
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-600/10 flex flex-col sm:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><AlertCircle className="w-8 h-8" /></div>
            <div className="space-y-1">
               <h4 className="text-sm font-black text-white uppercase tracking-widest">Enterprise Compliance Protocol</h4>
               <p className="text-[10px] text-slate-500 max-w-md font-medium leading-relaxed uppercase">Manual database modification or ownership transfer requires Dual-Admin verification. All destructive actions are logged in the Secure Audit Matrix.</p>
            </div>
         </div>
         <Button variant="link" className="text-blue-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-blue-400 group">
            View Compliance Ledger <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
         </Button>
      </div>
    </div>
  );
}
