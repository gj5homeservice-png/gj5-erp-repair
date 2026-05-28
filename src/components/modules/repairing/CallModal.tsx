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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { RepairCall } from '@/lib/types';
import { troubleshootingAssistant } from '@/ai/flows/troubleshooting-assistant-flow';
import { Loader2, Sparkles, Send } from 'lucide-react';
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
    issue: 'No Power / Dead',
    notes: '',
    technician: '',
    pickupRequired: false,
    pickupBy: 'Customer',
    runnerName: '',
    status: 'Pending'
  });

  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isAiLoading, setAiLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [selectedMsgTemplate, setSelectedMsgTemplate] = useState('1');

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
    } else {
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
        createdAt: new Date().toISOString()
      });
    }
  }, [editingCall, isOpen, formData.category]);

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

  const handleWhatsappSend = () => {
    const templates = [
      `Dear ${formData.customerName}, your repair job ${formData.id} has been registered on ${new Date().toLocaleDateString()} at GJ5 PLUS.`,
      `Dear ${formData.customerName}, the estimated repair cost for your ${formData.brand} device is pending. Please confirm approval.`,
      `Dear ${formData.customerName}, your repaired device has been safely delivered. Thank you!`
    ];
    const msg = templates[parseInt(selectedMsgTemplate) - 1];
    const url = `${store.whatsappGateway}send?phone=91${formData.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSave = () => {
    onSave(formData as RepairCall);
    if (whatsappEnabled) {
      handleWhatsappSend();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <DialogTitle className="text-2xl font-headline font-bold">
              {editingCall ? 'Edit Service Call' : 'Internal Service Registry'}
            </DialogTitle>
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="New Call">New Call</TabsTrigger>
              <TabsTrigger value="Repeat Call">Repeat Call</TabsTrigger>
              <TabsTrigger value="Inquiry">Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <TabsContent value="New Call" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-400">Job ID (Sequential)</Label>
                  <Input readOnly value={formData.id} className="bg-slate-900 border-slate-800 font-code font-bold text-blue-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Customer ID</Label>
                  <Input readOnly value={formData.customerId} className="bg-slate-900 border-slate-800 font-code" />
                </div>
                <div className="space-y-2">
                  <Label>Device Category</Label>
                  <Select 
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
                      <SelectItem value="WASHING">Washing Machine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    value={formData.customerName} 
                    onChange={e => setFormData({...formData, customerName: e.target.value})} 
                    placeholder="Enter full name"
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number (10 Digit)</Label>
                  <Input 
                    value={formData.mobile} 
                    onChange={e => setFormData({...formData, mobile: e.target.value})} 
                    placeholder="9988XXXXXX"
                    maxLength={10}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode Number</Label>
                  <Input 
                    value={formData.pincode} 
                    onChange={e => setFormData({...formData, pincode: e.target.value})} 
                    placeholder="3950XX"
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Full Address (For Maps)</Label>
                  <Input 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    placeholder="Plot, Society, Area..."
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Device Brand</Label>
                  <Input 
                    value={formData.brand} 
                    onChange={e => setFormData({...formData, brand: e.target.value})} 
                    placeholder="Samsung, LG, Sony..."
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Model Number</Label>
                  <Input 
                    value={formData.model} 
                    onChange={e => setFormData({...formData, model: e.target.value})} 
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Screen Size (Inch)</Label>
                  <Input 
                    type="text"
                    value={formData.screenSize} 
                    onChange={e => setFormData({...formData, screenSize: e.target.value})} 
                    placeholder="e.g. 55"
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Smart Common Issue Selector</Label>
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
                      <SelectItem value="White Screen Issue">White Screen Issue</SelectItem>
                      <SelectItem value="Other / Custom Notes">Other / Custom Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.issue === 'Other / Custom Notes' && (
                <div className="space-y-2">
                  <Label>Custom Problem Description</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="bg-slate-900 border-slate-800 min-h-[100px]"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 bg-[#0066FF]/5 p-4 rounded-xl border border-[#0066FF]/20">
                <Sparkles className="text-[#0066FF] w-6 h-6" />
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-[#0066FF]">AI Service Assistant</h4>
                  <p className="text-xs text-slate-400">Automated troubleshooting & diagnosis check</p>
                </div>
                <Button 
                  onClick={handleAiAssist} 
                  disabled={isAiLoading}
                  className="bg-[#0066FF] hover:bg-[#0052CC]"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Diagnosis'}
                </Button>
              </div>

              {aiSuggestions && (
                <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 space-y-4 animate-in slide-in-from-top-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Diagnostic Procedure</h5>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {aiSuggestions.diagnosticSteps.map((s:string, i:number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Technical Suggestions</h5>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {aiSuggestions.repairSuggestions.map((s:string, i:number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                  <Badge variant={aiSuggestions.estimatedComplexity === 'High' ? 'destructive' : 'default'} className="mt-2">
                    Repair Complexity: {aiSuggestions.estimatedComplexity}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-headline font-bold">Log Pickup Service</Label>
                    <Switch 
                      checked={formData.pickupRequired} 
                      onCheckedChange={v => setFormData({...formData, pickupRequired: v})} 
                    />
                  </div>
                  
                  {formData.pickupRequired && (
                    <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700 animate-in fade-in">
                      <RadioGroup 
                        value={formData.pickupBy || 'Customer'} 
                        onValueChange={(v:any) => setFormData({...formData, pickupBy: v})}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Customer" id="pickup-cust" />
                          <Label htmlFor="pickup-cust">Customer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Amaro Boy" id="pickup-amaro" />
                          <Label htmlFor="pickup-amaro">Amaro Boy (Lavayo)</Label>
                        </div>
                      </RadioGroup>

                      {formData.pickupBy === 'Amaro Boy' && (
                        <div className="space-y-2">
                          <Label>Runner / Staff Name</Label>
                          <Input 
                            value={formData.runnerName || ''} 
                            onChange={e => setFormData({...formData, runnerName: e.target.value})} 
                            className="bg-slate-900 border-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-headline font-bold">WhatsApp Automation</Label>
                    <Switch 
                      checked={whatsappEnabled} 
                      onCheckedChange={setWhatsappEnabled} 
                    />
                  </div>

                  {whatsappEnabled && (
                    <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700 animate-in fade-in">
                      <RadioGroup value={selectedMsgTemplate} onValueChange={setSelectedMsgTemplate} className="space-y-3">
                        <div className={cn("flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors", selectedMsgTemplate === '1' ? 'bg-[#0066FF]/20' : 'hover:bg-slate-800/50')}>
                          <RadioGroupItem value="1" id="msg-1" />
                          <div className="flex-1 text-xs">
                            <Label htmlFor="msg-1" className="font-bold block mb-1">Call Registered Message</Label>
                            <p className="text-slate-500">Dear Customer, your repair job {formData.id} has been registered...</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors", selectedMsgTemplate === '2' ? 'bg-[#0066FF]/20' : 'hover:bg-slate-800/50')}>
                          <RadioGroupItem value="2" id="msg-2" />
                          <div className="flex-1 text-xs">
                            <Label htmlFor="msg-2" className="font-bold block mb-1">Quotation Approval Alert</Label>
                            <p className="text-slate-500">Dear Customer, the estimated repair cost for your device is...</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors", selectedMsgTemplate === '3' ? 'bg-[#0066FF]/20' : 'hover:bg-slate-800/50')}>
                          <RadioGroupItem value="3" id="msg-3" />
                          <div className="flex-1 text-xs">
                            <Label htmlFor="msg-3" className="font-bold block mb-1">Delivered / Pickup Message</Label>
                            <p className="text-slate-500">Dear Customer, your repaired device has been safely delivered...</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Repeat Call" className="py-12 flex flex-col items-center justify-center space-y-6">
                 <div className="text-center space-y-2">
                    <h3 className="text-xl font-headline font-bold">Load Existing Profile</h3>
                    <p className="text-slate-500 text-sm">Search by Customer ID (GJ51XXX) or Registered Mobile</p>
                 </div>
                 <div className="flex gap-2 w-full max-w-sm">
                    <Input className="bg-slate-900 border-slate-800" placeholder="e.g. GJ51001" />
                    <Button className="bg-[#0066FF]">Search</Button>
                 </div>
            </TabsContent>
            
            <TabsContent value="Inquiry" className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label>Walk-in Customer Name</Label>
                     <Input className="bg-slate-900 border-slate-800" />
                  </div>
                  <div className="space-y-2">
                     <Label>Mobile</Label>
                     <Input className="bg-slate-900 border-slate-800" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label>Address / Locality</Label>
                     <Input className="bg-slate-900 border-slate-800" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label>General Inquiry Notes</Label>
                     <Textarea className="bg-slate-900 border-slate-800 min-h-[150px]" placeholder="Type inquiry details here..." />
                  </div>
               </div>
            </TabsContent>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
             <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">Close</Button>
             <Button 
               onClick={handleSave}
               className="bg-[#0066FF] hover:bg-[#0052CC] px-10 shadow-lg shadow-blue-500/20 font-bold"
             >
               {editingCall ? 'Update Job Details' : '+ Create Service Entry'}
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
