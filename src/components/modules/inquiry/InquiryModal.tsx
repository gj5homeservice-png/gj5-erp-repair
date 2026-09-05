"use client"

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  ChevronRight, 
  MessageSquare, 
  Calendar, 
  Target, 
  DollarSign, 
  Info,
  Smartphone,
  MapPin,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { Inquiry, InquirySource, InquiryPriority, InquiryStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const SOURCES: InquirySource[] = ['Walk-In', 'Call', 'WhatsApp', 'Facebook', 'Instagram', 'Referral'];
const PRIORITIES: InquiryPriority[] = ['Low', 'Medium', 'High'];
const STAFF = ['Unassigned', 'Rajesh Sharma', 'Amit Patel', 'Vikas Gupta', 'Owner'];

export function InquiryModal({ isOpen, onClose, editingInquiry, store }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Inquiry>>({
    customerName: '', mobile: '', alternateMobile: '', address: '', city: 'Surat', pincode: '',
    productType: 'TV Repair', brand: '', modelNumber: '', problemDescription: '',
    source: 'Walk-In', priority: 'Medium', expectedBudget: 0, assignedTechnician: 'Unassigned',
    followUpDate: format(new Date(), 'yyyy-MM-dd'), status: 'New', notes: ''
  });

  useEffect(() => {
    if (editingInquiry) {
      setFormData(editingInquiry);
    } else if (isOpen) {
      setFormData({
        customerName: '', mobile: '', alternateMobile: '', address: '', city: 'Surat', pincode: '',
        productType: 'TV Repair', brand: '', modelNumber: '', problemDescription: '',
        source: 'Walk-In', priority: 'Medium', expectedBudget: 0, assignedTechnician: 'Unassigned',
        followUpDate: format(new Date(), 'yyyy-MM-dd'), status: 'New', notes: ''
      });
    }
  }, [editingInquiry, isOpen]);

  const handleSave = () => {
    if (!formData.customerName || !formData.mobile) {
      toast({ variant: "destructive", title: "Missing Data", description: "Name and Mobile are required for CRM leads." });
      return;
    }

    const finalInquiry: Inquiry = {
      ...formData,
      id: editingInquiry?.id || `INQ-${1000 + store.inquiries.length + 1}`,
      createdAt: editingInquiry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Inquiry;

    if (editingInquiry) store.updateInquiry(finalInquiry);
    else store.addInquiry(finalInquiry);

    onClose();
    toast({ title: "Lead Committed", description: `Record for ${finalInquiry.customerName} has been saved.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
             </div>
             <DialogTitle className="text-xl font-headline font-bold">
               {editingInquiry ? 'Edit Lead Entry' : 'Register New CRM Lead'}
             </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Client Profile</h4>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Full Name</Label>
                       <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Mobile</Label>
                          <Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Alternate Mob</Label>
                          <Input value={formData.alternateMobile} onChange={e => setFormData({...formData, alternateMobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Address / Area</Label>
                       <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Pincode</Label>
                          <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Inquiry Source</Label>
                          <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v as any})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Product Context</h4>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Product Class</Label>
                          <Select value={formData.productType} onValueChange={v => setFormData({...formData, productType: v})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="TV Repair">TV Repair</SelectItem>
                                <SelectItem value="CCTV Installation">CCTV Installation</SelectItem>
                                <SelectItem value="Laptop/PC Service">Laptop/PC Service</SelectItem>
                                <SelectItem value="Smartphone Repair">Smartphone Repair</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Brand</Label>
                          <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Sony" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Problem Summary</Label>
                       <Input value={formData.problemDescription} onChange={e => setFormData({...formData, problemDescription: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Screen not working" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Priority</Label>
                          <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Exp. Budget (₹)</Label>
                          <Input type="number" value={formData.expectedBudget} onChange={e => setFormData({...formData, expectedBudget: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <Separator className="bg-slate-800" />

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><Calendar className="w-3 h-3 text-blue-500" /> Follow-up Date</Label>
                 <Input type="date" value={formData.followUpDate} onChange={e => setFormData({...formData, followUpDate: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><Tag className="w-3 h-3 text-emerald-500" /> Assigned Staff</Label>
                 <Select value={formData.assignedTechnician} onValueChange={v => setFormData({...formData, assignedTechnician: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                       {STAFF.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><Info className="w-3 h-3 text-purple-500" /> Lead Status</Label>
                 <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as InquiryStatus})}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                       <SelectItem value="New">New Lead</SelectItem>
                       <SelectItem value="Pending">Waiting Decision</SelectItem>
                       <SelectItem value="Follow-up">Follow-up Call</SelectItem>
                       <SelectItem value="Converted">Converted to Job</SelectItem>
                       <SelectItem value="Rejected">Lost / Rejected</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>

           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-400">Internal Notes & History</Label>
              <Textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Details of conversation, custom requests, etc."
                className="bg-slate-950 border-slate-800 min-h-[120px]" 
              />
           </div>
        </div>

        <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
           <Button variant="ghost" onClick={onClose}>Cancel</Button>
           <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2">
              {editingInquiry ? 'Update Lead' : 'Create Lead'}
              <ChevronRight className="w-4 h-4" />
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}