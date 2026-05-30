
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RepairCall, RepairStatus, VisitHistoryEntry } from '@/lib/types';
import { MessageSquare, Paperclip, ChevronRight, Notebook, History, Search, Truck } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const BRANDS = ['GJ5 PLUS', 'Sony', 'Samsung', 'LG', 'MI', 'Xiaomi', 'Realme', 'OnePlus', 'TCL', 'Philips', 'Toshiba', 'Panasonic', 'Sansui', 'Lloyd', 'BPL', 'Videocon', 'Other'];
const TECH_TAGS = ['BONDING MACHINE', 'HARDWARE', 'SOFTWARE'];

export function CallModal({ isOpen, onClose, editingCall, store }: any) {
  const [activeTab, setActiveTab] = useState('Registry');
  const [selectedBrand, setSelectedBrand] = useState('GJ5 PLUS');
  const [activeTpl, setActiveTpl] = useState<number | null>(null);
  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  
  const [sendWhatsApp, setSendWhatsApp] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gj5_whatsapp_enabled') === 'true';
    }
    return false;
  });

  const [formData, setFormData] = useState<Partial<RepairCall>>({
    id: '', customerId: '', customerName: '', mobile: '', address: '', pincode: '',
    category: 'TV', brand: 'GJ5 PLUS', model: '', screenSize: '', techTags: [],
    status: 'Pending', problemDescription: '', storeLocation: 'GODOWN', warrantyDuration: 'No Warranty',
    visitHistory: [], repeatCount: 0, intakeMode: 'Customer Visit'
  });

  const [inqData, setInqData] = useState({ name: '', mobile: '', address: '', notes: '' });
  const [templates, setTemplates] = useState<string[]>([
    "Registry: Hello [Name], Job [JobID] logged for [Brand].",
    "Estimate: Dear [Name], your repair quote for [JobID] is ready.",
    "Ready: [Name], your [Brand] TV is ready for pickup."
  ]);

  const isExisting = store.calls.some((c: any) => c.id === formData.id);
  const isLocked = isExisting && !editingCall;

  useEffect(() => {
    sessionStorage.setItem('gj5_whatsapp_enabled', sendWhatsApp.toString());
  }, [sendWhatsApp]);

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
      setSelectedBrand(BRANDS.includes(editingCall.brand) ? editingCall.brand : 'Other');
    } else if (isOpen) {
      const nextId = `TV${1001 + store.calls.length}`;
      setFormData({
        id: nextId, customerId: `GJ5${1001 + store.calls.length}`,
        category: 'TV', brand: 'GJ5 PLUS', techTags: [], status: 'Pending',
        warrantyDuration: 'No Warranty', storeLocation: 'GODOWN',
        visitHistory: [], repeatCount: 0, customerName: '', mobile: '', address: '', pincode: '', model: '', screenSize: '', problemDescription: '',
        intakeMode: 'Customer Visit'
      });
      setActiveTpl(null);
    }
  }, [editingCall, isOpen, store.calls.length]);

  const toggleTag = (tag: string) => {
    const tags = formData.techTags || [];
    setFormData({...formData, techTags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]});
  };

  const handleRepeatLookup = () => {
    const found = store.calls.find((c: any) => c.id.toLowerCase() === repeatSearchQuery.toLowerCase() || c.mobile === repeatSearchQuery);
    if (found) {
      setFormData({
        ...found,
        status: 'Pending',
        problemDescription: '',
      });
      setSelectedBrand(BRANDS.includes(found.brand) ? found.brand : 'Other');
      setActiveTab('Registry');
    }
  };

  const handleSave = () => {
    if (activeTab === 'Inquiry') {
      store.addInquiry({
        id: `INQ${Date.now()}`,
        customerName: inqData.name,
        mobile: inqData.mobile,
        address: inqData.address,
        notes: inqData.notes,
        createdAt: new Date().toISOString()
      });
      onClose();
      return;
    }

    const finalBrand = selectedBrand === 'Other' ? (formData.brand === 'Other' ? 'Unknown' : formData.brand) : selectedBrand;
    
    if (activeTab === 'Registry' && sendWhatsApp && activeTpl !== null) {
      let msg = templates[activeTpl];
      msg = msg.replace('[Name]', formData.customerName || 'Customer')
               .replace('[JobID]', formData.id || 'Job')
               .replace('[Brand]', finalBrand || 'Device');
      
      const whatsappUrl = `https://web.whatsapp.com/send?phone=91${formData.mobile}&text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
    }

    let warrantyExpiry = undefined;
    if (formData.status === 'Completed' && formData.warrantyDuration !== 'No Warranty') {
      const months = parseInt(formData.warrantyDuration || '0');
      warrantyExpiry = addMonths(new Date(), months).toISOString();
    }

    let updatedHistory = [...(formData.visitHistory || [])];
    let finalRepeatCount = formData.repeatCount || 0;

    if (isExisting) {
      const newHistoryEntry: VisitHistoryEntry = {
        id: `VST${Date.now()}`,
        date: format(new Date(), 'dd/MM/yyyy'),
        time: format(new Date(), 'hh:mm a'),
        complaintDescription: formData.problemDescription || '',
        technicianNotes: '',
        status: formData.status as RepairStatus
      };
      updatedHistory.push(newHistoryEntry);
      finalRepeatCount = updatedHistory.length - 1;
    }

    const finalData = {
      ...formData,
      brand: finalBrand,
      warrantyExpiry,
      visitHistory: updatedHistory,
      repeatCount: finalRepeatCount,
      updatedAt: new Date().toISOString(),
      createdAt: formData.createdAt || new Date().toISOString()
    } as RepairCall;

    if (isExisting) store.updateCall(finalData);
    else store.addCall(finalData);

    if (formData.intakeMode === 'Pickup Required' && !isExisting) {
      store.addTransportLog({
        id: `LOG${Date.now()}`,
        runnerName: 'Unassigned',
        runnerMobile: '',
        jobId: finalData.id,
        customerName: finalData.customerName,
        customerMobile: finalData.mobile,
        address: finalData.address,
        dispatchTime: new Date().toISOString(),
        status: 'Pending Pickup'
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                  {activeTab === 'Inquiry' ? <Notebook className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
               </div>
               {activeTab === 'Inquiry' ? 'Walk-In Inquiry' : 'Service Registry Portal'}
            </DialogTitle>
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="Registry">Main Registry</TabsTrigger>
              <TabsTrigger value="Repeat">Repeat Search</TabsTrigger>
              <TabsTrigger value="Inquiry">Quick Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 grid grid-cols-12 gap-8">
            <div className="col-span-8">
              {activeTab === 'Registry' ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Job ID</Label>
                        <Input readOnly value={formData.id || ''} className="bg-slate-900 border-slate-800 font-code font-bold text-blue-400 h-11" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Cust ID</Label>
                        <Input readOnly value={formData.customerId || ''} className="bg-slate-900 border-slate-800 font-code h-11" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Customer Name</Label>
                      <Input 
                        readOnly={isLocked} 
                        value={formData.customerName || ''} 
                        onChange={e => setFormData({...formData, customerName: e.target.value})} 
                        className="bg-slate-900 border-slate-800 h-11" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Mobile</Label>
                        <Input 
                          readOnly={isLocked} 
                          value={formData.mobile || ''} 
                          onChange={e => setFormData({...formData, mobile: e.target.value})} 
                          className="bg-slate-900 border-slate-800 h-11" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Pincode</Label>
                        <Input 
                          readOnly={isLocked} 
                          value={formData.pincode || ''} 
                          onChange={e => setFormData({...formData, pincode: e.target.value})} 
                          className="bg-slate-900 border-slate-800 h-11" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Input 
                        readOnly={isLocked} 
                        value={formData.address || ''} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                        className="bg-slate-900 border-slate-800 h-11" 
                      />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] uppercase font-bold text-slate-500">Technician Tags</Label>
                       <div className="flex gap-2">
                          {TECH_TAGS.map(tag => (
                            <button 
                              key={`tag-${tag}`} 
                              disabled={isLocked}
                              onClick={() => toggleTag(tag)} 
                              className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold border transition-all", formData.techTags?.includes(tag) ? "bg-[#0066FF] text-white border-[#0066FF]" : "bg-slate-900 text-slate-400 border-slate-800")}
                            >
                              {tag}
                            </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-800/50">
                       <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                          <Truck className="w-3 h-3 text-blue-400" /> Transportation Mode
                       </Label>
                       <RadioGroup 
                         value={formData.intakeMode || 'Customer Visit'} 
                         onValueChange={(v: any) => setFormData({...formData, intakeMode: v})}
                         className="flex gap-4"
                       >
                         <div className="flex items-center space-x-2 bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 flex-1 cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <RadioGroupItem value="Customer Visit" id="mode-visit" />
                            <Label htmlFor="mode-visit" className="cursor-pointer font-medium">Customer Visit</Label>
                         </div>
                         <div className="flex items-center space-x-2 bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 flex-1 cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <RadioGroupItem value="Pickup Required" id="mode-pickup" />
                            <Label htmlFor="mode-pickup" className="cursor-pointer font-medium">Pickup Required</Label>
                         </div>
                       </RadioGroup>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label>Brand</Label>
                          <Select disabled={isLocked} value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                               {BRANDS.map(b => <SelectItem key={`brand-opt-${b}`} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                       </div>
                       {selectedBrand === 'Other' && (
                         <div className="space-y-1 animate-in slide-in-from-left-2">
                           <Label>Enter Brand Name</Label>
                           <Input 
                             readOnly={isLocked} 
                             value={formData.brand || ''} 
                             onChange={e => setFormData({...formData, brand: e.target.value})} 
                             className="bg-slate-900 border-slate-800 h-11" 
                           />
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Model No</Label>
                        <Input 
                          readOnly={isLocked} 
                          value={formData.model || ''} 
                          onChange={e => setFormData({...formData, model: e.target.value})} 
                          className="bg-slate-900 border-slate-800 h-11" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Size (Inch)</Label>
                        <Input 
                          readOnly={isLocked} 
                          value={formData.screenSize || ''} 
                          onChange={e => setFormData({...formData, screenSize: e.target.value})} 
                          className="bg-slate-900 border-slate-800 h-11" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex justify-between items-center">
                        Problem Statement
                        {(formData.repeatCount || 0) > 0 && <span className="text-[10px] text-purple-400 font-bold uppercase">Repeat Entry</span>}
                      </Label>
                      <Textarea 
                        value={formData.problemDescription || ''} 
                        onChange={e => setFormData({...formData, problemDescription: e.target.value})} 
                        className="bg-slate-900 border-slate-800 min-h-[120px]" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <Label>Store Location</Label>
                         <Select value={formData.storeLocation} onValueChange={v => setFormData({...formData, storeLocation: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                               <SelectItem value="SHOWROOM">SHOWROOM</SelectItem>
                               <SelectItem value="SERVICE CENTER">SERVICE CENTER</SelectItem>
                               <SelectItem value="GODOWN">GODOWN</SelectItem>
                               <SelectItem value="OTHER">OTHER</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-1">
                         <Label>Warranty Duration</Label>
                         <Select value={formData.warrantyDuration} onValueChange={v => setFormData({...formData, warrantyDuration: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                               <SelectItem value="No Warranty">No Warranty</SelectItem>
                               <SelectItem value="1 Month">1 Month</SelectItem>
                               <SelectItem value="3 Months">3 Months</SelectItem>
                               <SelectItem value="6 Months">6 Months</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'Repeat' ? (
                <div className="space-y-6">
                  <div className="p-8 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-6">
                    <div className="space-y-2">
                       <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Search Existing Job / Mobile</Label>
                       <div className="flex gap-2">
                          <Input 
                            value={repeatSearchQuery} 
                            onChange={e => setRepeatSearchQuery(e.target.value)} 
                            placeholder="Enter Job ID (e.g. TV1001) or Mobile..." 
                            className="bg-slate-950 border-slate-800 h-12 text-lg" 
                          />
                          <Button onClick={handleRepeatLookup} className="bg-[#0066FF] px-8 h-12"><Search className="w-5 h-5 mr-2" /> Search</Button>
                       </div>
                    </div>
                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                       <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2"><History className="w-4 h-4" /> Repeat Call Logic</h4>
                       <p className="text-xs text-slate-400 leading-relaxed">Loading an existing record will lock the Job ID and Customer ID. New visit details will be appended chronologically to the history ledger.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label>Visitor Name</Label>
                      <Input 
                        value={inqData.name} 
                        onChange={e => setInqData({...inqData, name: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Mobile</Label>
                      <Input 
                        value={inqData.mobile} 
                        onChange={e => setInqData({...inqData, mobile: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input 
                      value={inqData.address} 
                      onChange={e => setInqData({...inqData, address: e.target.value})} 
                      className="bg-slate-950 border-slate-800 h-12" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Inquiry Details</Label>
                    <Textarea 
                      value={inqData.notes} 
                      onChange={e => setInqData({...inqData, notes: e.target.value})} 
                      className="bg-slate-950 border-slate-800 min-h-[200px]" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="col-span-4 border-l border-slate-800 pl-8 space-y-6">
               <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <div className="space-y-1">
                     <Label className="text-xs font-bold">Send WhatsApp Notification</Label>
                     <div className="flex items-center gap-2">
                        <Badge className={cn("text-[9px] uppercase px-1.5 h-4", sendWhatsApp ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                           {sendWhatsApp ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                        </Badge>
                     </div>
                  </div>
                  <Switch checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
               </div>

               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp Templates
               </h3>
               {[0, 1, 2].map(idx => (
                 <div key={`whatsapp-tpl-pane-${idx}`} className={cn("p-4 rounded-xl border transition-all space-y-3", activeTpl === idx ? "bg-emerald-500/5 border-emerald-500/40" : "bg-slate-900/40 border-slate-800")}>
                    <div className="flex justify-between items-center">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Option {idx + 1}</Label>
                       <button className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"><Paperclip className="w-3 h-3" /></button>
                    </div>
                    <Textarea 
                      value={templates[idx]} 
                      onChange={e => { const t = [...templates]; t[idx] = e.target.value; setTemplates(t); }} 
                      className="bg-transparent border-0 p-0 text-xs min-h-[70px] focus-visible:ring-0 resize-none leading-relaxed" 
                    />
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                       <Checkbox 
                         id={`tpl-check-${idx}`} 
                         checked={activeTpl === idx}
                         onCheckedChange={() => setActiveTpl(idx)}
                       />
                       <label htmlFor={`tpl-check-${idx}`} className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">Use This Template</label>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-600 px-12 h-12 rounded-xl font-bold flex gap-2">
               {activeTab === 'Inquiry' ? 'Commit Inquiry' : (isExisting ? 'Update Job' : 'Commit Registry')}
               <ChevronRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
