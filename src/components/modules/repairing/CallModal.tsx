"use client"

import React, { useState, useEffect } from 'react';
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
import { RepairCall, RepairStatus, Inquiry } from '@/lib/types';
import { 
  PlusCircle, 
  ChevronRight,
  Notebook,
  MessageSquare,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
        category: formData.category || 'TV',
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
    }
  }, [editingCall, isOpen]);

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

    const finalBrand = selectedBrand === 'Other' ? customBrand : selectedBrand;
    let finalData = { ...formData, brand: finalBrand, techTags: currentVisitTags } as RepairCall;
    const now = new Date().toISOString();

    const visitEntry = {
      visitNumber: 1,
      timestamp: now,
      issue: currentVisitIssue,
      techTags: currentVisitTags,
      notes: '',
      statusAtTime: 'Pending'
    };

    if (!editingCall) {
      finalData = { ...finalData, createdAt: now, updatedAt: now, status: 'Pending', visitHistory: [visitEntry] };
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
                  <PlusCircle className="w-6 h-6" />
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {activeTab === 'Inquiry' ? 'Inquiry Capture Portal' : 'Service Registry Portal'}
               </DialogTitle>
            </div>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-11">
              <TabsTrigger value="New Call" className="px-6">New Call</TabsTrigger>
              <TabsTrigger value="Inquiry" className="px-6">Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8">
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
               className="bg-[#0066FF] hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2"
             >
                {activeTab === 'Inquiry' ? 'Create Inquiry' : editingCall ? 'Update Registry' : 'Create Registry'}
                <ChevronRight className="w-4 h-4" />
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
