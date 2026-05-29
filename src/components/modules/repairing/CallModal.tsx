"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RepairCall, RepairStatus, Inquiry, RepairHistoryEntry } from '@/lib/types';
import { 
  PlusCircle, 
  ChevronRight,
  Notebook,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Search,
  History,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCall: RepairCall | null;
  onSave: (data: RepairCall) => void;
  store: any;
}

const BRANDS = ['GJ5 PLUS', 'Sony', 'Samsung', 'LG', 'MI', 'Xiaomi', 'Realme', 'OnePlus', 'TCL', 'Philips', 'Toshiba', 'Panasonic', 'Sansui', 'Lloyd', 'BPL', 'Videocon', 'Other'];
const TECH_TAGS = ['BONDING MACHINE', 'HARDWARE', 'SOFTWARE'];

export function CallModal({ isOpen, onClose, editingCall, onSave, store }: CallModalProps) {
  const [activeTab, setActiveTab] = useState('New Call');
  const [formData, setFormData] = useState<Partial<RepairCall>>({
    id: '',
    customerId: '',
    customerName: '',
    mobile: '',
    address: '',
    pincode: '',
    category: 'TV',
    brand: 'GJ5 PLUS',
    model: '',
    screenSize: '',
    techTags: [],
    intakeMode: 'Customer Walk-In',
    status: 'Pending' as RepairStatus,
    visitHistory: []
  });

  const [inquiryData, setInquiryData] = useState<Partial<Inquiry>>({
    customerName: '',
    mobile: '',
    address: '',
    pincode: '',
    notes: ''
  });

  const [repeatSearchId, setRepeatSearchId] = useState('');
  const [repeatFoundCall, setRepeatFoundCall] = useState<RepairCall | null>(null);

  const [selectedBrand, setSelectedBrand] = useState('GJ5 PLUS');
  const [customBrand, setCustomBrand] = useState('');
  const [currentVisitIssue, setCurrentVisitIssue] = useState('No Power / Dead');
  const [currentVisitTags, setCurrentVisitTags] = useState<string[]>([]);
  
  const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
  const [templates, setTemplates] = useState<string[]>([
    "Registration: Hello [CustomerName], your Job [JobID] is registered. Issue: [Issue]. Registered tags: [Tags].",
    "Quotation: Dear [CustomerName], estimate for Job [JobID] is ready. Parts required for [Issue].",
    "Delivery: Dear [CustomerName], your device [JobID] is repaired and out for delivery. Timestamp: [Timestamp]."
  ]);
  const [templateImages, setTemplateImages] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('gj5_modal_whatsapp_templates');
    if (savedTemplates) {
      try { setTemplates(JSON.parse(savedTemplates)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
      const latest = editingCall.visitHistory[editingCall.visitHistory.length - 1];
      setCurrentVisitIssue(latest?.issue || 'No Power / Dead');
      setCurrentVisitTags(editingCall.techTags || []);
      const isPredefined = BRANDS.includes(editingCall.brand);
      setSelectedBrand(isPredefined ? editingCall.brand : 'Other');
      setCustomBrand(isPredefined ? '' : editingCall.brand);
      setActiveTab('New Call');
    } else if (isOpen) {
      resetForm();
    }
  }, [editingCall, isOpen]);

  const resetForm = () => {
    const catPrefix = (formData.category || 'TV').toUpperCase();
    const catCount = store.calls.filter((c:any) => c.category === (formData.category || 'TV')).length;
    const nextJobId = `${catPrefix}${1001 + catCount}`;
    const nextCustId = `GJ5${1001 + store.calls.length}`;
    setFormData({
      id: nextJobId,
      customerId: nextCustId,
      customerName: '',
      mobile: '',
      address: '',
      pincode: '',
      category: 'TV',
      brand: 'GJ5 PLUS',
      model: '',
      screenSize: '',
      techTags: [],
      intakeMode: 'Customer Walk-In',
      status: 'Pending',
      visitHistory: []
    });
    setSelectedBrand('GJ5 PLUS');
    setCustomBrand('');
    setCurrentVisitIssue('No Power / Dead');
    setCurrentVisitTags([]);
    setRepeatSearchId('');
    setRepeatFoundCall(null);
  };

  const handleRepeatLookup = () => {
    const found = store.calls.find((c: RepairCall) => c.id.toLowerCase() === repeatSearchId.toLowerCase() || c.mobile === repeatSearchId);
    if (found) {
      setRepeatFoundCall(found);
      setFormData(found);
      setSelectedBrand(BRANDS.includes(found.brand) ? found.brand : 'Other');
      setCustomBrand(BRANDS.includes(found.brand) ? '' : found.brand);
    } else {
      alert("No active case found with this Job ID or Mobile Number.");
    }
  };

  const toggleTag = (tag: string) => {
    setCurrentVisitTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleTemplateChange = (idx: number, val: string) => {
    const newTemplates = [...templates];
    newTemplates[idx] = val;
    setTemplates(newTemplates);
    localStorage.setItem('gj5_modal_whatsapp_templates', JSON.stringify(newTemplates));
  };

  const handleImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...templateImages];
        newImages[idx] = reader.result as string;
        setTemplateImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (activeTab === 'Inquiry') {
      const newInquiry: Inquiry = {
        id: `INQ${Date.now()}`,
        customerName: inquiryData.customerName || '',
        mobile: inquiryData.mobile || '',
        address: inquiryData.address || '',
        pincode: inquiryData.pincode || '',
        notes: inquiryData.notes || '',
        createdAt: new Date().toISOString()
      };
      store.addInquiry(newInquiry);
      onClose();
      return;
    }

    const now = new Date().toISOString();
    const finalBrand = selectedBrand === 'Other' ? customBrand : selectedBrand;
    let finalData = { ...formData, brand: finalBrand, techTags: currentVisitTags, updatedAt: now } as RepairCall;

    const newVisit: RepairHistoryEntry = {
      visitNumber: (finalData.visitHistory?.length || 0) + 1,
      timestamp: now,
      issue: currentVisitIssue,
      techTags: currentVisitTags,
      notes: '',
      statusAtTime: 'Pending'
    };

    if (activeTab === 'Repeat Call' && repeatFoundCall) {
      // Logic for adding a repeat visit to existing job
      finalData.visitHistory = [...(repeatFoundCall.visitHistory || []), newVisit];
      finalData.status = 'Pending'; // Reset status to pending for new visit
    } else if (!editingCall) {
      // New case
      finalData.createdAt = now;
      finalData.visitHistory = [newVisit];
    }

    // Trigger WhatsApp
    let msg = templates[activeTemplateIdx];
    msg = msg.replace('[CustomerName]', finalData.customerName || '')
             .replace('[JobID]', finalData.id || '')
             .replace('[Issue]', currentVisitIssue)
             .replace('[Tags]', currentVisitTags.join(', '))
             .replace('[Timestamp]', format(new Date(), 'dd/MM/yyyy HH:mm'));

    const whatsappUrl = `https://web.whatsapp.com/send?phone=91${finalData.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                  {activeTab === 'Repeat Call' ? <RotateCcw className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {activeTab === 'Inquiry' ? 'Inquiry Capture Portal' : activeTab === 'Repeat Call' ? 'Repeat Call Registry' : 'Service Registry Portal'}
               </DialogTitle>
            </div>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-11">
              <TabsTrigger value="New Call" className="px-6">New Call</TabsTrigger>
              <TabsTrigger value="Repeat Call" className="px-6">Repeat Call</TabsTrigger>
              <TabsTrigger value="Inquiry" className="px-6">Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8">
                {activeTab === 'Repeat Call' && (
                  <div className="mb-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-end gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex-1 space-y-2">
                       <Label className="text-blue-400 text-[10px] font-bold uppercase">Lookup Existing Case</Label>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <Input 
                            value={repeatSearchId}
                            onChange={e => setRepeatSearchId(e.target.value)}
                            placeholder="Enter Job ID (e.g., TV1001) or Mobile Number" 
                            className="pl-10 bg-slate-950 border-slate-800 h-11"
                         />
                       </div>
                    </div>
                    <Button onClick={handleRepeatLookup} className="bg-[#0066FF] h-11 px-8 rounded-xl font-bold">Lookup Case</Button>
                  </div>
                )}

                <TabsContent value="New Call" className="space-y-8 mt-0 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Job ID</Label>
                          <Input readOnly value={formData.id} className="bg-slate-900/50 border-slate-800 font-code font-bold text-[#0066FF]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer ID</Label>
                          <Input readOnly value={formData.customerId} className="bg-slate-900/50 border-slate-800 font-code" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                              <SelectItem value="TV">TV</SelectItem>
                              <SelectItem value="AC">AC</SelectItem>
                              <SelectItem value="COMP">Computer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Customer Name</Label><Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Mobile Number</Label><Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                        <div className="space-y-2"><Label>Pincode</Label><Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                      </div>
                      <div className="space-y-2"><Label>Full Address</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                    </div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Brand Selection</Label>
                          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                              {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedBrand === 'Other' && (
                          <div className="space-y-2 animate-in slide-in-from-left-4"><Label>Enter Brand Name</Label><Input value={customBrand} onChange={e => setCustomBrand(e.target.value)} className="bg-slate-900 border-slate-800 h-11" /></div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Model Number</Label><Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                        <div className="space-y-2"><Label>Screen Size (Inch)</Label><Input value={formData.screenSize} onChange={e => setFormData({...formData, screenSize: e.target.value})} className="bg-slate-900 border-slate-800 h-11" /></div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician Field Tags</Label>
                        <div className="flex flex-row gap-2">
                           {TECH_TAGS.map(tag => (
                             <button 
                               key={tag} 
                               onClick={() => toggleTag(tag)} 
                               className={cn(
                                 "flex-1 px-3 py-3 rounded-xl text-[10px] font-bold transition-all border", 
                                 currentVisitTags.includes(tag) ? "bg-[#0066FF] text-white border-[#0066FF]" : "bg-slate-900 text-slate-500 border-slate-800"
                               )}
                             >
                               {tag}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Registered Issue</Label>
                        <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                          <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                            <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="Repeat Call" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  {repeatFoundCall ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                             <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Locked Identity</h3>
                               <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">VISITS: {repeatFoundCall.visitHistory.length}</Badge>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] uppercase text-slate-600 font-bold">Job ID</p><p className="font-code font-bold text-blue-400">{repeatFoundCall.id}</p></div>
                                <div><p className="text-[10px] uppercase text-slate-600 font-bold">Customer ID</p><p className="font-code text-slate-300">{repeatFoundCall.customerId}</p></div>
                                <div><p className="text-[10px] uppercase text-slate-600 font-bold">Customer</p><p className="font-bold">{repeatFoundCall.customerName}</p></div>
                                <div><p className="text-[10px] uppercase text-slate-600 font-bold">Mobile</p><p className="font-bold">{repeatFoundCall.mobile}</p></div>
                             </div>
                             <div className="pt-3 border-t border-slate-800">
                               <p className="text-[10px] uppercase text-slate-600 font-bold">Device</p>
                               <p className="text-sm">{repeatFoundCall.brand} {repeatFoundCall.model} ({repeatFoundCall.screenSize}")</p>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Visit Complaint Details</Label>
                             <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                               <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                               <SelectContent className="bg-slate-900 border-slate-800">
                                 <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                                 <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                                 <SelectItem value="Sound Issue">Sound Issue</SelectItem>
                                 <SelectItem value="Restart Problem">Restart Problem</SelectItem>
                                 <SelectItem value="Remote Not Working">Remote Not Working</SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                               </SelectContent>
                             </Select>
                             <Textarea 
                               placeholder="Detailed Technician Notes for this Repeat Visit..." 
                               className="bg-slate-900 border-slate-800 min-h-[120px]"
                             />
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col h-full">
                             <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                               <History className="w-4 h-4 text-[#0066FF]" />
                               Repeat Call History
                             </h3>
                             <ScrollArea className="flex-1 max-h-[350px]">
                               <div className="space-y-4 pr-4">
                                  {repeatFoundCall.visitHistory.map((visit, idx) => (
                                    <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 p-2 opacity-5">
                                          <span className="text-4xl font-black italic">#{idx + 1}</span>
                                       </div>
                                       <div className="flex justify-between items-center text-[10px]">
                                          <span className="font-bold text-blue-500 uppercase tracking-tighter">Visit #{visit.visitNumber}</span>
                                          <span className="text-slate-500">{format(new Date(visit.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                                       </div>
                                       <p className="text-xs font-bold text-slate-200">Issue: {visit.issue}</p>
                                       {visit.techTags && visit.techTags.length > 0 && (
                                         <div className="flex gap-1">
                                            {visit.techTags.map(tag => <Badge key={tag} className="text-[8px] bg-slate-800 h-4">{tag}</Badge>)}
                                         </div>
                                       )}
                                       {visit.notes && <p className="text-[10px] italic text-slate-500">Notes: {visit.notes}</p>}
                                    </div>
                                  ))}
                               </div>
                             </ScrollArea>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
                       <Search className="w-12 h-12 mb-4 opacity-20" />
                       <p className="font-headline text-lg">Lookup a case to register a repeat visit</p>
                       <p className="text-sm">Job ID and Customer Identity will be locked automatically.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="Inquiry" className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-8 bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                       <div className="p-3 bg-blue-600/10 rounded-2xl">
                          <Notebook className="w-8 h-8 text-[#0066FF]" />
                       </div>
                       <div>
                          <h3 className="text-2xl font-headline font-bold">New Walk-In Inquiry</h3>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <Label>Customer Name</Label>
                         <Input value={inquiryData.customerName} onChange={e => setInquiryData({...inquiryData, customerName: e.target.value})} className="bg-slate-950 border-slate-800 h-12" />
                      </div>
                      <div className="space-y-2">
                         <Label>Mobile Number</Label>
                         <Input value={inquiryData.mobile} onChange={e => setInquiryData({...inquiryData, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-12" />
                      </div>
                      <div className="space-y-2">
                         <Label>Full Address</Label>
                         <Input value={inquiryData.address} onChange={e => setInquiryData({...inquiryData, address: e.target.value})} className="bg-slate-950 border-slate-800 h-12" />
                      </div>
                      <div className="space-y-2">
                         <Label>Pincode</Label>
                         <Input value={inquiryData.pincode} onChange={e => setInquiryData({...inquiryData, pincode: e.target.value})} className="bg-slate-950 border-slate-800 h-12" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <Label>Inquiry Details</Label>
                       <Textarea value={inquiryData.notes} onChange={e => setInquiryData({...inquiryData, notes: e.target.value})} className="bg-slate-950 border-slate-800 min-h-[150px]" />
                    </div>
                  </div>
                </TabsContent>
              </div>
              <div className="lg:col-span-4 border-l border-slate-800 pl-8 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                   <MessageSquare className="w-5 h-5 text-emerald-500" />
                   <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">WhatsApp Template Suite</h3>
                </div>
                <div className="space-y-6">
                  {[0, 1, 2].map((idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all space-y-3", 
                        activeTemplateIdx === idx ? "bg-emerald-500/5 border-emerald-500/40" : "bg-slate-900/40 border-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <RadioGroup value={activeTemplateIdx.toString()} onValueChange={(v) => setActiveTemplateIdx(parseInt(v))}>
                               <RadioGroupItem value={idx.toString()} id={`tpl-${idx}`} />
                            </RadioGroup>
                            <Label htmlFor={`tpl-${idx}`} className="text-[10px] font-bold uppercase text-slate-500">Template {idx + 1}</Label>
                         </div>
                         <div className="flex items-center gap-2">
                            <input type="file" id={`img-${idx}`} className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                            <button 
                              onClick={() => document.getElementById(`img-${idx}`)?.click()} 
                              className={cn(
                                "p-1.5 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-1.5", 
                                templateImages[idx] ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 border-slate-700"
                              )}
                            >
                               <Paperclip className="w-3 h-3" /> {templateImages[idx] ? "Attached" : "Attach Image"}
                            </button>
                         </div>
                      </div>
                      <Textarea 
                        value={templates[idx]} 
                        onChange={(e) => handleTemplateChange(idx, e.target.value)} 
                        className="bg-transparent border-0 p-0 text-xs min-h-[80px] focus-visible:ring-0 resize-none" 
                        placeholder="Type message template..." 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button 
               onClick={handleSave} 
               disabled={activeTab === 'Repeat Call' && !repeatFoundCall}
               className="bg-[#0066FF] hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2"
             >
                {activeTab === 'Inquiry' ? 'Create Inquiry' : activeTab === 'Repeat Call' ? 'Commit Re-Repair' : editingCall ? 'Update Registry' : 'Create Registry'}
                <ChevronRight className="w-4 h-4" />
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
