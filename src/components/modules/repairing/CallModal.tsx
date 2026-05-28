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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RepairCall, RepairHistoryEntry, RepairStatus } from '@/lib/types';
import { 
  ShieldCheck, 
  History as HistoryIcon, 
  Search, 
  UserPlus, 
  PlusCircle, 
  ChevronRight,
  RefreshCw,
  Truck,
  MessageSquare,
  LayoutGrid
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
    brand: '',
    model: '',
    screenSize: '',
    technician: '',
    pickupRequired: false,
    intakeMode: 'Customer Walk-In',
    runnerName: '',
    runnerMobile: '',
    status: 'Pending' as RepairStatus,
    visitHistory: []
  });

  const [currentVisitIssue, setCurrentVisitIssue] = useState('No Power / Dead');
  const [currentVisitNotes, setCurrentVisitNotes] = useState('');
  const [currentVisitTechnician, setCurrentVisitTechnician] = useState('');

  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairCall[]>([]);
  
  // WhatsApp Template Suite State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [templates, setTemplates] = useState([
    "Dear Customer, your repair job [JobID] has been registered on [DateTime] at GJ5 PLUS.",
    "Dear Customer, the estimated repair cost for your device is Rs.____. Please confirm approval.",
    "Dear Customer, your repaired device has been safely delivered. Thank you!"
  ]);

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
      const latest = editingCall.visitHistory[editingCall.visitHistory.length - 1];
      setCurrentVisitIssue(latest?.issue || 'No Power / Dead');
      setCurrentVisitNotes(latest?.notes || '');
      setCurrentVisitTechnician(latest?.technician || '');
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
        brand: '',
        model: '',
        screenSize: '',
        technician: '',
        pickupRequired: false,
        intakeMode: 'Customer Walk-In',
        runnerName: '',
        runnerMobile: '',
        status: 'Pending',
        visitHistory: []
      });
      setCurrentVisitIssue('No Power / Dead');
      setCurrentVisitNotes('');
      setCurrentVisitTechnician('');
    }
  }, [editingCall, isOpen, store.calls]);

  const handleSearchRepeat = () => {
    if (!repeatSearchQuery) return;
    const results = store.calls.filter((c: RepairCall) => 
      c.customerId.toLowerCase().includes(repeatSearchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(repeatSearchQuery.toLowerCase()) ||
      c.mobile.includes(repeatSearchQuery)
    );
    setSearchResults(results);
  };

  const selectProfileForRepeat = (call: RepairCall) => {
    setFormData(call);
    setCurrentVisitTechnician('');
    setCurrentVisitNotes('');
    setActiveTab('Repeat Call Form');
  };

  const handleTemplateChange = (index: number, value: string) => {
    const newTemplates = [...templates];
    newTemplates[index] = value;
    setTemplates(newTemplates);
  };

  const handleSave = () => {
    const isNew = !editingCall && activeTab === 'New Call';
    const isRepeat = activeTab === 'Repeat Call Form';
    
    let finalData = { ...formData } as RepairCall;
    const now = new Date().toISOString();

    if (isNew) {
      const firstVisit: RepairHistoryEntry = {
        visitNumber: 1,
        timestamp: now,
        issue: currentVisitIssue,
        technician: currentVisitTechnician,
        notes: currentVisitNotes,
        statusAtTime: 'Pending'
      };
      finalData = {
        ...finalData,
        createdAt: now,
        updatedAt: now,
        status: 'Pending',
        visitHistory: [firstVisit]
      };
    } else if (isRepeat) {
      const nextVisitNum = (finalData.visitHistory?.length || 0) + 1;
      const nextVisit: RepairHistoryEntry = {
        visitNumber: nextVisitNum,
        timestamp: now,
        issue: currentVisitIssue,
        technician: currentVisitTechnician,
        notes: currentVisitNotes,
        statusAtTime: 'Pending'
      };
      finalData = {
        ...finalData,
        updatedAt: now,
        status: 'Pending',
        visitHistory: [...(finalData.visitHistory || []), nextVisit]
      };
    } else if (editingCall) {
      const latestIdx = finalData.visitHistory.length - 1;
      const updatedHistory = [...finalData.visitHistory];
      updatedHistory[latestIdx] = {
        ...updatedHistory[latestIdx],
        issue: currentVisitIssue,
        technician: currentVisitTechnician,
        notes: currentVisitNotes
      };
      finalData = {
        ...finalData,
        visitHistory: updatedHistory
      };
    }

    onSave(finalData);

    // Automated Logistics Redirection
    if (whatsappEnabled) {
      let targetMobile = formData.mobile;
      if (formData.intakeMode === 'Logistics Dispatch' && formData.runnerMobile) {
        targetMobile = formData.runnerMobile;
      }

      if (targetMobile) {
        let msg = templates[selectedTemplateIndex];
        msg = msg.replace('[JobID]', finalData.id)
                 .replace('[CustomerID]', finalData.customerId)
                 .replace('[CustomerName]', finalData.customerName || 'Customer')
                 .replace('[Address]', finalData.address || 'Address')
                 .replace('[RegisteredIssue]', currentVisitIssue)
                 .replace('[DateTime]', format(new Date(), 'dd/MM/yyyy HH:mm'));

        const url = `https://web.whatsapp.com/send?phone=91${targetMobile}&text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {editingCall ? 'Edit Service Call' : 'Repair Registry Portal'}
               </DialogTitle>
            </div>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-11">
              <TabsTrigger value="New Call" className="px-6">New Call</TabsTrigger>
              <TabsTrigger value="Repeat Call" className="px-6">Repeat Search</TabsTrigger>
              <TabsTrigger value="Repeat Call Form" disabled={activeTab !== 'Repeat Call Form'} className="px-6">Re-Repair Log</TabsTrigger>
              <TabsTrigger value="Inquiry" className="px-6">Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[80vh] overflow-y-auto">
            <TabsContent value="New Call" className="space-y-8 mt-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left Column: Core Data */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Job ID</Label>
                      <Input readOnly value={formData.id} className="bg-slate-900/50 border-slate-800 font-code font-bold text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Customer ID</Label>
                      <Input readOnly value={formData.customerId} className="bg-slate-900/50 border-slate-800 font-code" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="TV">TV</SelectItem>
                          <SelectItem value="AC">AC</SelectItem>
                          <SelectItem value="COMP">Computer</SelectItem>
                          <SelectItem value="FRIDGE">Fridge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mobile</Label>
                      <Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Size (Inch)</Label>
                      <Input value={formData.screenSize} onChange={e => setFormData({...formData, screenSize: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Technician</Label>
                      <Select value={currentVisitTechnician} onValueChange={setCurrentVisitTechnician}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                          <SelectValue placeholder="Select Staff..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          {store.employees.map((emp:any) => (
                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Common Issue</Label>
                      <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                          <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                          <SelectItem value="Sound OK - No Video">Sound OK - No Video</SelectItem>
                          <SelectItem value="Video OK - No Sound">Video OK - No Sound</SelectItem>
                          <SelectItem value="Other / Custom Notes">Other / Custom Notes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea value={currentVisitNotes} onChange={e => setCurrentVisitNotes(e.target.value)} className="bg-slate-900 border-slate-800 min-h-[80px]" />
                  </div>
                </div>

                {/* Right Column: Intake & Logistics Dispatch */}
                <div className="space-y-8">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Truck className="w-5 h-5 text-blue-500" />
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Intake Mode</h3>
                    </div>
                    <RadioGroup 
                      value={formData.intakeMode} 
                      onValueChange={(v: any) => setFormData({...formData, intakeMode: v})}
                      className="flex gap-8"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Customer Walk-In" id="mode-walkin" />
                        <Label htmlFor="mode-walkin">Customer Walk-In</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Logistics Dispatch" id="mode-dispatch" />
                        <Label htmlFor="mode-dispatch">Logistics Dispatch</Label>
                      </div>
                    </RadioGroup>

                    {formData.intakeMode === 'Logistics Dispatch' && (
                      <div className="grid grid-cols-2 gap-4 pt-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Runner Name</Label>
                          <Input 
                            placeholder="e.g. Rahul Kumar" 
                            value={formData.runnerName || ''}
                            onChange={e => setFormData({...formData, runnerName: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Runner Mobile (10-Digit)</Label>
                          <Input 
                            placeholder="Mobile No." 
                            value={formData.runnerMobile || ''}
                            onChange={e => setFormData({...formData, runnerMobile: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <MessageSquare className="w-5 h-5 text-emerald-500" /> WhatsApp Custom Templates
                       </h3>
                       <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                    </div>

                    <div className={cn("space-y-4 transition-all duration-300", !whatsappEnabled && "opacity-40 pointer-events-none grayscale")}>
                       {[0, 1, 2].map((idx) => (
                         <div key={idx} className="flex gap-4 items-start bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                            <div className="pt-2">
                               <RadioGroup value={selectedTemplateIndex.toString()} onValueChange={(v) => setSelectedTemplateIndex(parseInt(v))}>
                                  <RadioGroupItem value={idx.toString()} id={`tpl-${idx}`} />
                               </RadioGroup>
                            </div>
                            <div className="flex-1 space-y-1">
                               <Label className="text-[10px] text-slate-500 font-bold uppercase">Template {idx + 1}</Label>
                               <Textarea 
                                 value={templates[idx]}
                                 onChange={e => handleTemplateChange(idx, e.target.value)}
                                 className="bg-transparent border-0 p-0 text-xs min-h-[60px] focus-visible:ring-0 resize-none leading-relaxed"
                               />
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Repeat Call" className="animate-in fade-in duration-300">
               <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                  <div className="space-y-2">
                     <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <RefreshCw className="w-8 h-8 text-blue-500" />
                     </div>
                     <h3 className="text-2xl font-headline font-bold">Search Existing Profile</h3>
                     <p className="text-slate-500 text-sm">Retrieve via Mobile or ID</p>
                  </div>
                  
                  <div className="flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input value={repeatSearchQuery} onChange={e => setRepeatSearchQuery(e.target.value)} className="pl-12 bg-slate-900 border-slate-800 h-14 text-lg rounded-2xl" placeholder="Enter details..." />
                     </div>
                     <Button onClick={handleSearchRepeat} className="bg-blue-600 hover:bg-blue-700 h-14 px-10 rounded-2xl font-bold">Search</Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-6">
                      <div className="divide-y divide-slate-800">
                        {searchResults.map(result => (
                          <div key={result.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30">
                             <div className="text-left">
                                <p className="font-bold text-slate-100">{result.customerName}</p>
                                <p className="text-xs text-slate-500 font-code">{result.id} • {result.mobile}</p>
                             </div>
                             <Button onClick={() => selectProfileForRepeat(result)} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                                <UserPlus className="w-4 h-4 mr-2" /> Select & Re-Open
                             </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </TabsContent>

            <TabsContent value="Repeat Call Form" className="space-y-8 mt-0 animate-in zoom-in-95">
               <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <HistoryIcon className="w-4 h-4" /> Infinite Repair History Log
                     </h3>
                     <Badge className="bg-[#0066FF] text-white font-black px-4 py-1">VISITS: {formData.visitHistory?.length || 0}</Badge>
                  </div>
                  
                  <div className="rounded-2xl border border-slate-800/50 bg-slate-900/80 overflow-hidden">
                     <div className="max-h-[250px] overflow-y-auto">
                        <table className="w-full text-[11px] text-left">
                           <thead className="bg-slate-950 text-slate-500 sticky top-0 uppercase font-bold border-b border-slate-800">
                              <tr>
                                 <th className="p-4">Visit #</th>
                                 <th className="p-4">Date & Time</th>
                                 <th className="p-4">Logged Issue</th>
                                 <th className="p-4">Technician</th>
                                 <th className="p-4 text-right">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-800">
                              {formData.visitHistory && formData.visitHistory.length > 0 ? (
                                [...formData.visitHistory].map((h, i) => (
                                  <tr key={i} className="hover:bg-slate-800/20">
                                     <td className="p-4 font-bold text-slate-400">#{h.visitNumber}</td>
                                     <td className="p-4 font-code text-slate-300">{format(new Date(h.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                                     <td className="p-4 truncate max-w-[200px]">{h.issue}</td>
                                     <td className="p-4 font-bold text-blue-400">{h.technician}</td>
                                     <td className="p-4 text-right">
                                        <Badge variant="outline" className="text-[9px] uppercase">{h.statusAtTime}</Badge>
                                     </td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-600">No logs found.</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-500 uppercase">Locked Job ID</Label>
                     <Input readOnly value={formData.id} className="bg-slate-950 border-slate-800 font-code font-bold opacity-50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-500 uppercase">Locked Customer ID</Label>
                     <Input readOnly value={formData.customerId} className="bg-slate-950 border-slate-800 font-code opacity-50 cursor-not-allowed" />
                  </div>
               </div>

               <div className="p-8 bg-blue-500/5 border border-dashed border-blue-500/20 rounded-3xl space-y-6">
                  <h3 className="text-lg font-headline font-bold text-blue-400 flex items-center gap-2">
                     <PlusCircle className="w-5 h-5" /> Add Current Visit Re-Repair Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <Label>Current Re-Repair Issue</Label>
                           <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-12">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                 <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                                 <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                                 <SelectItem value="Lines on Screen">Lines on Screen</SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label>New Assigned Technician</Label>
                           <Select value={currentVisitTechnician} onValueChange={setCurrentVisitTechnician}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-12">
                                 <SelectValue placeholder="Select Staff..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                 {store.employees.map((emp:any) => (
                                    <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label>Technical Notes</Label>
                        <Textarea value={currentVisitNotes} onChange={e => setCurrentVisitNotes(e.target.value)} className="bg-slate-900 border-slate-800 min-h-[120px]" />
                     </div>
                  </div>
               </div>
            </TabsContent>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <div className="flex items-center gap-4">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2 shadow-lg shadow-blue-500/20">
                  {activeTab === 'Repeat Call Form' ? 'Commit Re-Repair Visit' : editingCall ? 'Update Call' : 'Create Registry'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
             </div>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
