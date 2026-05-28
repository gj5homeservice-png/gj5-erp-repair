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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { RepairCall, RepairHistoryEntry } from '@/lib/types';
import { troubleshootingAssistant } from '@/ai/flows/troubleshooting-assistant-flow';
import { Loader2, Sparkles, Send, Search, UserPlus, History as HistoryIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    issue: 'No Power / Dead',
    notes: '',
    technician: '',
    pickupRequired: false,
    pickupBy: 'Customer',
    runnerName: '',
    status: 'Pending',
    history: []
  });

  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairCall[]>([]);
  const [isAiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [selectedMsgTemplate, setSelectedMsgTemplate] = useState('1');

  // Handle initialization/editing
  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
    } else if (activeTab === 'New Call') {
      const nextCustIdNum = 1001 + store.calls.length;
      const nextCustId = `GJ5${nextCustIdNum}`;
      const prefix = formData.category?.toUpperCase() || 'JOB';
      const catCallsCount = store.calls.filter((c:any) => c.category === formData.category).length;
      const nextJobId = `${prefix}${1001 + catCallsCount}`;
      
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
        issue: 'No Power / Dead',
        notes: '',
        technician: '',
        pickupRequired: false,
        pickupBy: 'Customer',
        runnerName: '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: []
      });
    }
  }, [editingCall, isOpen, formData.category, activeTab]);

  const handleSearchRepeat = () => {
    const results = store.calls.filter((c: RepairCall) => 
      c.customerId.toLowerCase().includes(repeatSearchQuery.toLowerCase()) ||
      c.mobile.includes(repeatSearchQuery)
    );
    setSearchResults(results);
  };

  const selectProfileForRepeat = (call: RepairCall) => {
    setFormData({
      ...call,
      updatedAt: new Date().toISOString(),
      status: 'Pending',
      // We don't overwrite history yet, we'll append to it on save
    });
    setActiveTab('New Call');
  };

  const handleAiAssist = async () => {
    if (!formData.category || !formData.issue) return;
    setAiLoading(true);
    try {
      const result = await troubleshootingAssistant({
        deviceCategory: formData.category || 'Electronic',
        deviceBrand: formData.brand || 'Generic',
        deviceModel: formData.model || 'Unknown',
        issueDescription: formData.issue === 'Other / Custom Notes' ? formData.notes || '' : formData.issue || ''
      });
      setAiSuggestions(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    const isRepeat = store.calls.some((c:any) => c.id === formData.id && !editingCall);
    
    let finalData = { ...formData };
    
    if (isRepeat) {
      // It's a re-repair of an existing Job ID
      const originalCall = store.calls.find((c:any) => c.id === formData.id);
      const newHistoryEntry: RepairHistoryEntry = {
        timestamp: new Date().toISOString(),
        issue: formData.issue || 'Repeat Visit',
        technician: formData.technician || 'Unassigned',
        notes: formData.notes || ''
      };
      
      finalData = {
        ...formData,
        updatedAt: new Date().toISOString(), // Reset aging tracker
        status: 'Pending',
        history: [...(originalCall?.history || []), newHistoryEntry]
      } as RepairCall;
    }

    onSave(finalData as RepairCall);
    if (whatsappEnabled) {
      const templates = [
        `Dear ${formData.customerName}, your repair job ${formData.id} has been registered on ${format(new Date(), 'dd/MM/yyyy')} at GJ5 PLUS.`,
        `Dear ${formData.customerName}, the estimated repair cost for your ${formData.brand} device is pending. Please confirm approval.`,
        `Dear ${formData.customerName}, your repaired device has been safely delivered. Thank you!`
      ];
      const msg = templates[parseInt(selectedMsgTemplate) - 1];
      const url = `${store.whatsappGateway}send?phone=91${formData.mobile}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <DialogTitle className="text-2xl font-headline font-bold">
              {editingCall ? 'Update Job Registry' : 'Internal Service Portal'}
            </DialogTitle>
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="New Call">Service Form</TabsTrigger>
              <TabsTrigger value="Repeat Call">Repeat Call Search</TabsTrigger>
              <TabsTrigger value="Inquiry">Quick Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[75vh] overflow-y-auto">
            <TabsContent value="New Call" className="space-y-8 mt-0">
              {/* History Canvas for Repeat Calls */}
              {formData.history && formData.history.length > 0 && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#0066FF] flex items-center gap-2 uppercase tracking-widest">
                    <HistoryIcon className="w-4 h-4" /> Previous Repair History Logs
                  </h3>
                  <div className="space-y-3">
                    {formData.history.map((h, i) => (
                      <div key={i} className="flex gap-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 text-xs">
                        <div className="flex-1">
                          <p className="font-bold text-slate-300">Issue: {h.issue}</p>
                          <p className="text-slate-500 mt-1">{h.notes}</p>
                        </div>
                        <div className="text-right flex flex-col justify-between">
                          <span className="text-[10px] text-slate-500">{format(new Date(h.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                          <span className="font-bold text-blue-400">@{h.technician}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-400">Job ID (LOCKED)</Label>
                  <Input readOnly value={formData.id} className="bg-slate-900/50 border-slate-800 font-code font-bold text-blue-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Customer ID</Label>
                  <Input readOnly value={formData.customerId} className="bg-slate-900/50 border-slate-800 font-code" />
                </div>
                <div className="space-y-2">
                  <Label>Device Category</Label>
                  <Select 
                    disabled={!!formData.history?.length}
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TV">Television (TV)</SelectItem>
                      <SelectItem value="AC">Air Conditioner (AC)</SelectItem>
                      <SelectItem value="COMP">Computer/Laptop</SelectItem>
                      <SelectItem value="FRIDGE">Refrigerator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.customerName} 
                    onChange={e => setFormData({...formData, customerName: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.mobile} 
                    onChange={e => setFormData({...formData, mobile: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.pincode} 
                    onChange={e => setFormData({...formData, pincode: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Full Address</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Device Brand</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.brand} 
                    onChange={e => setFormData({...formData, brand: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Model Number</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.model} 
                    onChange={e => setFormData({...formData, model: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Screen Size (Inch)</Label>
                  <Input 
                    disabled={!!formData.history?.length}
                    value={formData.screenSize} 
                    onChange={e => setFormData({...formData, screenSize: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn(formData.history && formData.history.length > 0 ? "text-yellow-400 font-bold" : "")}>
                    {formData.history && formData.history.length > 0 ? "Current Visit Re-Repair Issue" : "Smart Issue Selector"}
                  </Label>
                  <Select 
                    value={formData.issue} 
                    onValueChange={(v) => setFormData({...formData, issue: v})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                      <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                      <SelectItem value="Sound OK - No Video">Sound OK - No Video</SelectItem>
                      <SelectItem value="Video OK - No Sound">Video OK - No Sound</SelectItem>
                      <SelectItem value="HDMI / Wi-Fi Not Working">HDMI / Wi-Fi Not Working</SelectItem>
                      <SelectItem value="White Screen / Backlight Issue">White Screen / Backlight Issue</SelectItem>
                      <SelectItem value="Other / Custom Notes">Other / Custom Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Technical Notes / Re-Repair Details</Label>
                <Textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="bg-slate-900 border-slate-800 min-h-[100px]"
                  placeholder="Describe current issues or technician instructions..."
                />
              </div>

              <div className="flex items-center gap-4 bg-[#0066FF]/5 p-4 rounded-xl border border-[#0066FF]/20">
                <Sparkles className="text-[#0066FF] w-6 h-6" />
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-[#0066FF]">AI Troubleshooting Logic</h4>
                  <p className="text-xs text-slate-400">Generate diagnostic steps for this device</p>
                </div>
                <Button onClick={handleAiAssist} disabled={isAiLoading} className="bg-[#0066FF]">
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Assistant'}
                </Button>
              </div>

              {aiSuggestions && (
                <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 animate-in slide-in-from-top-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Diagnostic Procedure</h5>
                      <ul className="text-sm space-y-2 text-slate-300">
                        {aiSuggestions.diagnosticSteps.map((s:string, i:number) => <li key={i} className="flex gap-2"><span className="text-[#0066FF]">•</span>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Technical Suggestions</h5>
                      <ul className="text-sm space-y-2 text-slate-300">
                        {aiSuggestions.repairSuggestions.map((s:string, i:number) => <li key={i} className="flex gap-2"><span className="text-emerald-400">•</span>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-headline font-bold">Pickup Service Registry</Label>
                    <Switch 
                      checked={formData.pickupRequired} 
                      onCheckedChange={v => setFormData({...formData, pickupRequired: v})} 
                    />
                  </div>
                  {formData.pickupRequired && (
                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 animate-in zoom-in-95">
                      <RadioGroup 
                        value={formData.pickupBy || 'Customer'} 
                        onValueChange={(v:any) => setFormData({...formData, pickupBy: v})}
                        className="flex gap-6 mb-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Customer" id="pickup-cust" />
                          <Label htmlFor="pickup-cust">Customer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Amaro Boy" id="pickup-amaro" />
                          <Label htmlFor="pickup-amaro">Amaro Boy</Label>
                        </div>
                      </RadioGroup>
                      {formData.pickupBy === 'Amaro Boy' && (
                        <Input 
                          placeholder="Runner / Staff Name" 
                          value={formData.runnerName || ''} 
                          onChange={e => setFormData({...formData, runnerName: e.target.value})} 
                          className="bg-slate-900 border-slate-800"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-headline font-bold">WhatsApp Automation</Label>
                    <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                  </div>
                  {whatsappEnabled && (
                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 space-y-3">
                      <RadioGroup value={selectedMsgTemplate} onValueChange={setSelectedMsgTemplate} className="space-y-2">
                         <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="1" id="m1" />
                            <Label htmlFor="m1" className="text-xs cursor-pointer">Call Registered Notification</Label>
                         </div>
                         <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="2" id="m2" />
                            <Label htmlFor="m2" className="text-xs cursor-pointer">Quotation Approval Alert</Label>
                         </div>
                         <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <RadioGroupItem value="3" id="m3" />
                            <Label htmlFor="m3" className="text-xs cursor-pointer">Delivery Success Message</Label>
                         </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Repeat Call" className="space-y-8 mt-0">
                 <div className="max-w-xl mx-auto text-center space-y-6 py-10">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-headline font-bold">Load Existing Profile</h3>
                       <p className="text-slate-500 text-sm">Search by Customer ID (GJ51XXX) or Registered Mobile</p>
                    </div>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            value={repeatSearchQuery}
                            onChange={e => setRepeatSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-900 border-slate-800 h-12" 
                            placeholder="e.g. GJ51001 or 9988XXXXXX" 
                          />
                       </div>
                       <Button onClick={handleSearchRepeat} className="bg-[#0066FF] h-12 px-8">Search</Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="bg-slate-800/50 p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Match Results</div>
                        <div className="divide-y divide-slate-800">
                          {searchResults.map(result => (
                            <div key={result.id} className="p-4 flex items-center justify-between group hover:bg-slate-800/50 transition-colors">
                               <div className="text-left">
                                  <p className="font-bold text-slate-100">{result.customerName}</p>
                                  <p className="text-xs text-slate-500">{result.customerId} • {result.mobile}</p>
                                  <p className="text-[10px] text-blue-400 font-code mt-1">Device: {result.brand} {result.model}</p>
                               </div>
                               <Button 
                                 onClick={() => selectProfileForRepeat(result)}
                                 className="bg-[#0066FF] hover:bg-blue-600 rounded-xl"
                               >
                                  <UserPlus className="w-4 h-4 mr-2" /> Select & Add Entry
                               </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {repeatSearchQuery && searchResults.length === 0 && (
                      <p className="text-rose-400 text-sm italic">No profile found with these details.</p>
                    )}
                 </div>
            </TabsContent>
            
            <TabsContent value="Inquiry" className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label>Walk-in Customer Name</Label>
                     <Input className="bg-slate-900 border-slate-800 h-11" />
                  </div>
                  <div className="space-y-2">
                     <Label>Mobile</Label>
                     <Input className="bg-slate-900 border-slate-800 h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label>Address / Locality</Label>
                     <Input className="bg-slate-900 border-slate-800 h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label>General Inquiry Notes</Label>
                     <Textarea className="bg-slate-900 border-slate-800 min-h-[200px]" placeholder="Record casual query details..." />
                  </div>
               </div>
            </TabsContent>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
             <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">Dismiss</Button>
             <Button 
               onClick={handleSave}
               className="bg-[#0066FF] hover:bg-[#0052CC] px-10 shadow-lg shadow-blue-500/20 font-bold"
             >
               {editingCall ? 'Update Job Details' : '+ Commit Registry Entry'}
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
