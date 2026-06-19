"use client"

import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  UserCheck, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  Calendar,
  AlertCircle,
  Copy,
  Printer,
  FileDown,
  ChevronRight,
  ShieldCheck,
  Target,
  ArrowRight
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
import { Inquiry, InquiryStatus, InquiryPriority, InquirySource } from '@/lib/types';
import { InquiryModal } from './inquiry/InquiryModal';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { format, isToday, isPast, parseISO, differenceInDays, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function InquiryModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<InquiryStatus | 'All'>('All');
  const { toast } = useToast();

  const stats = useMemo(() => {
    const all = store.inquiries || [];
    const today = all.filter((i: Inquiry) => i.createdAt && isToday(parseISO(i.createdAt))).length;
    const converted = all.filter((i: Inquiry) => i.status === 'Converted').length;
    const pending = all.filter((i: Inquiry) => i.status === 'New' || i.status === 'Pending' || i.status === 'Follow-up').length;
    const conversionRate = all.length > 0 ? (converted / all.length * 100).toFixed(1) : '0';
    const highPriority = all.filter((i: Inquiry) => i.priority === 'High' && i.status !== 'Converted').length;
    
    return { total: all.length, today, converted, pending, conversionRate, highPriority };
  }, [store.inquiries]);

  const filteredInquiries = useMemo(() => {
    return (store.inquiries || []).filter((i: Inquiry) => {
      const matchesSearch = 
        (i.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.mobile || '').includes(searchQuery) ||
        (i.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = activeFilter === 'All' || i.status === activeFilter;
      return matchesSearch && matchesFilter;
    }).sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [store.inquiries, searchQuery, activeFilter]);

  const handleStatusChange = (inq: Inquiry, newStatus: InquiryStatus) => {
    store.updateInquiry({ ...inq, status: newStatus, updatedAt: new Date().toISOString() });
    toast({ title: "Status Updated", description: `Inquiry ${inq.id} marked as ${newStatus}.` });
  };

  const handleDuplicate = (inq: Inquiry) => {
    const duplicate: Inquiry = {
      ...inq,
      id: `INQ-${1000 + (store.inquiries?.length || 0) + 1}`,
      status: 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      convertedJobId: undefined,
      conversionDate: undefined
    };
    store.addInquiry(duplicate);
    toast({ title: "Lead Duplicated", description: `Created new lead from ${inq.customerName}.` });
  };

  const handleConvertToJob = (inq: Inquiry) => {
    if (inq.status === 'Converted') {
      toast({ variant: "destructive", title: "Already Converted", description: `This lead is already Job ID: ${inq.convertedJobId}` });
      return;
    }
    
    const nextJobId = `TV${1001 + (store.calls?.length || 0)}`;
    store.convertInquiryToJob(inq.id, nextJobId);
    toast({ title: "Conversion Successful", description: `Lead converted to Repair Job: ${nextJobId}` });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Leads', value: stats.total, icon: Target, color: 'bg-blue-600', filter: 'All' },
          { label: 'Today', value: stats.today, icon: Calendar, color: 'bg-emerald-600', filter: 'New' },
          { label: 'Conversion', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'bg-purple-600', filter: 'Converted' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-600', filter: 'Pending' },
          { label: 'High Priority', value: stats.highPriority, icon: AlertCircle, color: 'bg-rose-600', filter: 'All' },
          { label: 'Converted', value: stats.converted, icon: UserCheck, color: 'bg-cyan-600', filter: 'Converted' },
        ].map((s, i) => (
          <Card key={i} onClick={() => setActiveFilter(s.filter as any)} className="bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 cursor-pointer transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
               <div className={cn("p-2 rounded-xl text-white", s.color)}><s.icon className="w-4 h-4" /></div>
               <div>
                 <p className="text-slate-400 text-[10px] uppercase font-bold">{s.label}</p>
                 <h3 className="text-xl font-headline font-bold">{s.value}</h3>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search Leads, Mobile, Brand..." 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
             className="pl-10 bg-slate-950 border-slate-800 h-11" 
           />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-slate-800 h-11 font-bold uppercase text-[10px]">
              <FileDown className="w-4 h-4 mr-2" /> Export CRM
           </Button>
           <Button onClick={() => { setEditingInquiry(null); setModalOpen(true); }} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 rounded-xl font-bold uppercase text-[10px]">
              <UserPlus className="w-4 h-4 mr-2" /> New Lead
           </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800">
                <TableHead className="text-[10px] font-bold uppercase px-4">Lead Info</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Product/Brand</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Priority/Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Follow-up</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.map((inq: Inquiry) => {
                const followUpDateStr = inq.followUpDate || '';
                const followUpDateObj = followUpDateStr ? parseISO(followUpDateStr) : null;
                const isFollowUpDue = followUpDateObj && isValid(followUpDateObj) && isPast(followUpDateObj) && inq.status !== 'Converted';
                
                return (
                  <TableRow key={inq.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{inq.customerName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] text-blue-400 font-code">{inq.mobile}</span>
                           <Badge variant="outline" className="text-[8px] uppercase border-slate-800">{inq.source}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-300">{inq.brand}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{inq.productType}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <Badge className={cn("text-[9px] uppercase font-black px-1.5 h-4", 
                            inq.priority === 'High' ? "bg-rose-500/10 text-rose-500" : 
                            inq.priority === 'Medium' ? "bg-amber-500/10 text-amber-500" : 
                            "bg-slate-500/10 text-slate-400"
                          )}>
                            {inq.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <button className="outline-none">
                                  <Badge className={cn("text-[9px] uppercase cursor-pointer",
                                    inq.status === 'Converted' ? "bg-emerald-500/10 text-emerald-400" :
                                    inq.status === 'Rejected' ? "bg-rose-500/10 text-rose-400" :
                                    "bg-blue-500/10 text-blue-400"
                                  )}>
                                    {inq.status}
                                  </Badge>
                               </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100">
                               {['New', 'Pending', 'Follow-up', 'Rejected'].map(s => (
                                 <DropdownMenuItem key={s} onClick={() => handleStatusChange(inq, s as any)} className="text-[10px] uppercase font-bold">{s}</DropdownMenuItem>
                               ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                             <Calendar className={cn("w-3 h-3", isFollowUpDue ? "text-rose-500" : "text-slate-500")} />
                             <span className={cn("text-[10px] font-bold", isFollowUpDue ? "text-rose-500 animate-pulse" : "text-slate-400")}>
                                {followUpDateObj && isValid(followUpDateObj) ? format(followUpDateObj, 'dd MMM yyyy') : 'No Date'}
                             </span>
                          </div>
                          <span className="text-[9px] text-slate-600 uppercase font-black mt-0.5">Staff: {inq.assignedTechnician || 'Unassigned'}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right px-4">
                       <div className="flex justify-end gap-1">
                          {inq.status !== 'Converted' && (
                            <Button size="icon" variant="ghost" onClick={() => handleConvertToJob(inq)} title="Convert to Job" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10">
                               <ArrowRight className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => { setEditingInquiry(inq); setModalOpen(true); }} className="h-8 w-8 text-blue-400"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDuplicate(inq)} title="Duplicate Lead" className="h-8 w-8 text-amber-400"><Copy className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(inq.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">No inquiries matched your criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InquiryModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        editingInquiry={editingInquiry} 
        store={store} 
      />

      <DeleteJobModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        jobId={deleteId || ''} 
        onConfirm={() => { if (deleteId) store.deleteInquiry(deleteId); setDeleteId(null); }} 
      />
    </div>
  );
}
