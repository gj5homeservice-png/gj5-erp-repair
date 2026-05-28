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
import { RepairCall, RepairHistoryEntry, RepairStatus } from '@/lib/types';
import { troubleshootingAssistant } from '@/ai/flows/troubleshooting-assistant-flow';
import { 
  Loader2, 
  Sparkles, 
  Search, 
  UserPlus, 
  History as HistoryIcon, 
  ShieldCheck, 
  ChevronRight,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
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
    technician: '',
    pickupRequired: false,
    pickupBy: 'Customer',
    runnerName: '',
    status: 'Pending' as RepairStatus,
    visitHistory: []
  });

  const [currentVisitIssue, setCurrentVisitIssue] = useState('No Power / Dead');
  const [currentVisitNotes, setCurrentVisitNotes] = useState('');
  const [currentVisitTechnician, setCurrentVisitTechnician] = useState('');

  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairCall[]>([]);
  const [isAiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [selectedMsgTemplate, setSelectedMsgTemplate] = useState('1');

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
      const latest = editingCall.visitHistory[editingCall.visitHistory.length - 1];
      setCurrentVisitIssue(latest?.issue || 'No Power / Dead');
      setCurrentVisitNotes(latest?.notes || '');
      setCurrentVisitTechnician(latest?.technician || '');
      setActiveTab('New Call');
    } else if (isOpen) {
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
        technician: '',
        pickupRequired: false,
        pickupBy: 'Customer',
        runnerName: '',
        status: 'Pending',
        visitHistory: []
      });
      setCurrentVisitIssue('No Power / Dead');
      setCurrentVisitNotes('');
      setCurrentVisitTechnician('');
    }
  }, [editingCall, isOpen]);

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

  const handleAiAssist = async () => {
    if (!formData.category || !currentVisitIssue) return;
    setAiLoading(true);
    try {
      const result = await troubleshootingAssistant({
        deviceCategory: formData.category || 'Electronic',
        deviceBrand: formData.brand || 'Generic',
        deviceModel: formData.model || 'Unknown',
        issueDescription: currentVisitIssue === 'Other / Custom Notes' ? currentVisitNotes : currentVisitIssue
      });
      setAiSuggestions(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
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
        updatedAt: now, // Reset aging counter
        status: 'Pending',
        visitHistory: [...(finalData.visitHistory || []), nextVisit]
      };
    } else if (editingCall) {
      // Direct Edit Logic - Update latest visit or whole call
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
    
    if (whatsappEnabled) {
      const templates = [
        `Dear ${formData.customerName}, your repair job ${formData.id} has been registered on ${format(new Date(), 'dd/MM/yyyy')} at GJ5 PLUS.`,
        `Dear ${formData.customerName}, the estimated repair cost for your ${formData.brand} device is Rs.____. Please confirm approval.`,
        `Dear ${formData.customerName}, your repaired device has been safely delivered. Thank you!`
      ];
      const msg = templates[parseInt(selectedMsgTemplate) - 1];
      const url = `${store.whatsappGateway}send?phone=91${formData.mobile}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {editingCall ? 'Update Call Entry' : 'Workshop Service Portal'}
               </DialogTitle>
            </div>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-11">
              <TabsTrigger value="New Call" className="px-6">New Call</TabsTrigger>
              <TabsTrigger value="Repeat Call" className="px-6">Repeat Search</TabsTrigger>
              <TabsTrigger value="Repeat Call Form" disabled={activeTab !== 'Repeat Call Form'} className="px-6">Re-Repair Log</TabsTrigger>
              <TabsTrigger value="Inquiry" className="px-6">Quick Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <TabsContent value="New Call" className="space-y-8 mt-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Job ID (Locked)</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                    <Input readOnly value={formData.id} className="pl-10 bg-slate-900/50 border-slate-800 font-code font-bold text-blue-400 cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Customer ID</Label>
                  <Input readOnly value={formData.customerId} className="bg-slate-900/50 border-slate-800 font-code cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Device Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="TV">Television (TV)</SelectItem>
                      <SelectItem value="AC">Air Conditioner (AC)</SelectItem>
                      <SelectItem value="COMP">Computer/Laptop</SelectItem>
                      <SelectItem value="FRIDGE">Refrigerator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Customer Name</Label>
                  <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="Full legal name..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Mobile Number</Label>
                  <Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="10-digit mobile..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Pincode Number</Label>
                  <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="6-digit area code..." />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-slate-400 font-medium">Full Service Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="House No, Society, Landmark..." />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Device Brand</Label>
                  <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="Sony, Samsung, LG..." />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Model Number</Label>
                  <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Screen Size (Inch)</Label>
                  <Input value={formData.screenSize} onChange={e => setFormData({...formData, screenSize: e.target.value})} className="bg-slate-900 border-slate-800 h-11" placeholder="e.g. 55" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Technician Selection</Label>
                  <Select value={currentVisitTechnician} onValueChange={setCurrentVisitTechnician}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                      <SelectValue placeholder="Assign Staff..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {store.employees.map((emp:any) => (
                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-medium">Common Issue Selector</Label>
                  <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                      <SelectItem value="Display Panel Damaged">Display Panel Damaged / Lines</SelectItem>
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
                <Label className="text-slate-400 font-medium">Issue Description / Fault Notes</Label>
                <Textarea value={currentVisitNotes} onChange={e => setCurrentVisitNotes(e.target.value)} className="bg-slate-900 border-slate-800 min-h-[100px] resize-none" placeholder="Describe context for Visit #1..." />
              </div>

              <div className="flex items-center gap-4 bg-[#0066FF]/5 p-4 rounded-xl border border-[#0066FF]/20 group transition-all hover:bg-[#0066FF]/10">
                <Sparkles className="text-[#0066FF] w-6 h-6 animate-pulse" />
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-[#0066FF]">AI Troubleshooting Logic</h4>
                  <p className="text-xs text-slate-400">Genkit Assistant is ready to suggest repair steps</p>
                </div>
                <Button onClick={handleAiAssist} disabled={isAiLoading} className="bg-[#0066FF] hover:bg-blue-600 shadow-lg shadow-blue-500/20">
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze with AI'}
                </Button>
              </div>

              {aiSuggestions && (
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 animate-in slide-in-from-top-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">Diagnostic Procedure</h5>
                      <ul className="text-sm space-y-3 text-slate-300">
                        {aiSuggestions.diagnosticSteps.map((s:string, i:number) => (
                          <li key={i} className="flex gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                            <span className="text-blue-500 font-bold">{i+1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">Technical Suggestions</h5>
                      <ul className="text-sm space-y-3 text-slate-300">
                        {aiSuggestions.repairSuggestions.map((s:string, i:number) => (
                          <li key={i} className="flex gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                            <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="Repeat Call" className="animate-in fade-in duration-300">
               <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                  <div className="space-y-2">
                     <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <RefreshCw className="w-8 h-8 text-blue-500" />
                     </div>
                     <h3 className="text-2xl font-headline font-bold">Load Existing Profile</h3>
                     <p className="text-slate-500 text-sm">Search via Customer ID, Job ID or Mobile Number</p>
                  </div>
                  
                  <div className="flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input value={repeatSearchQuery} onChange={e => setRepeatSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchRepeat()} className="pl-12 bg-slate-900 border-slate-800 h-14 text-lg rounded-2xl" placeholder="Search profile..." />
                     </div>
                     <Button onClick={handleSearchRepeat} className="bg-blue-600 hover:bg-blue-700 h-14 px-10 rounded-2xl font-bold">Search</Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-6 shadow-2xl">
                      <div className="bg-slate-800/50 p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left border-b border-slate-800">Matching Profiles Found</div>
                      <div className="divide-y divide-slate-800">
                        {searchResults.map(result => (
                          <div key={result.id} className="p-5 flex items-center justify-between group hover:bg-slate-800/30 transition-all">
                             <div className="text-left space-y-1">
                                <p className="font-bold text-slate-100 text-lg">{result.customerName}</p>
                                <div className="flex gap-4 text-xs text-slate-500 font-medium">
                                   <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-code">{result.id}</span>
                                   <span>{result.mobile}</span>
                                </div>
                             </div>
                             <Button onClick={() => selectProfileForRepeat(result)} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6 shadow-lg shadow-blue-500/10 flex gap-2">
                                <UserPlus className="w-4 h-4" /> Select & Re-Open
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
                     <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                       <HistoryIcon className="w-4 h-4" /> Infinite Repair Visit History Log Grid
                     </h3>
                     <Badge className="bg-blue-500 text-white font-bold px-3">VISITS: {formData.visitHistory?.length || 0}</Badge>
                  </div>
                  <div className="rounded-2xl border border-slate-800/50 bg-slate-900/80 overflow-hidden">
                     <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-800">
                           <tr>
                              <th className="p-3">Visit #</th>
                              <th className="p-3">Date & Time</th>
                              <th className="p-3">Logged Issue</th>
                              <th className="p-3">Technician</th>
                              <th className="p-3 text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                           {formData.visitHistory && formData.visitHistory.length > 0 ? (
                             [...formData.visitHistory].reverse().map((h, i) => (
                               <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                  <td className="p-3 font-bold text-slate-400">#{h.visitNumber}</td>
                                  <td className="p-3 font-code text-slate-300">{format(new Date(h.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                                  <td className="p-3 max-w-[200px] truncate">{h.issue}</td>
                                  <td className="p-3 font-bold text-blue-400">{h.technician}</td>
                                  <td className="p-3 text-right">
                                     <Badge variant="outline" className="text-[9px] h-5 px-1.5 uppercase">{h.statusAtTime}</Badge>
                                  </td>
                               </tr>
                             ))
                           ) : (
                             <tr><td colSpan={5} className="p-8 text-center text-slate-600 italic">No visit history found.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 pointer-events-none">
                  <div className="space-y-2">
                     <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Locked Job ID</Label>
                     <Input readOnly value={formData.id} className="bg-slate-950 border-slate-800 font-code font-bold" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Locked Customer ID</Label>
                     <Input readOnly value={formData.customerId} className="bg-slate-950 border-slate-800 font-code" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Customer Name</Label>
                     <Input readOnly value={formData.customerName} className="bg-slate-950 border-slate-800" />
                  </div>
               </div>

               <div className="p-8 bg-blue-500/5 border border-dashed border-blue-500/20 rounded-3xl space-y-6">
                  <h3 className="text-lg font-headline font-bold text-blue-400 flex items-center gap-2">
                     <PlusCircle className="w-5 h-5" /> Add Current Visit Re-Repair Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <Label className="text-slate-300 font-bold">Current Re-Repair Issue / complaint</Label>
                           <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-12">
                                 <SelectValue placeholder="Identify current problem..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                 <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                                 <SelectItem value="Display Panel Damaged">Display Panel Damaged / Lines</SelectItem>
                                 <SelectItem value="Sound OK - No Video">Sound OK - No Video</SelectItem>
                                 <SelectItem value="Video OK - No Sound">Video OK - No Sound</SelectItem>
                                 <SelectItem value="HDMI / Wi-Fi Not Working">HDMI / Wi-Fi Not Working</SelectItem>
                                 <SelectItem value="White Screen / Backlight Issue">White Screen / Backlight Issue</SelectItem>
                                 <SelectItem value="Other / Custom Notes">Other / Custom Notes</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-300 font-bold">New/Current Technician</Label>
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
                        <Label className="text-slate-300 font-bold">Current Visit Technical Notes</Label>
                        <Textarea value={currentVisitNotes} onChange={e => setCurrentVisitNotes(e.target.value)} className="bg-slate-900 border-slate-800 min-h-[120px] resize-none" placeholder="Describe context..." />
                     </div>
                  </div>
               </div>
            </TabsContent>
            
            <TabsContent value="Inquiry" className="space-y-6 animate-in slide-in-from-left-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label>Walk-in Customer Name</Label>
                     <Input className="bg-slate-900 border-slate-800 h-11" placeholder="Inquiry name..." />
                  </div>
                  <div className="space-y-2">
                     <Label>Mobile</Label>
                     <Input className="bg-slate-900 border-slate-800 h-11" placeholder="Mobile..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label>General Inquiry Notes</Label>
                     <Textarea className="bg-slate-900 border-slate-800 min-h-[200px] resize-none" />
                  </div>
               </div>
            </TabsContent>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4">
             <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800 order-2 sm:order-1">Dismiss Portal</Button>
             <div className="flex items-center gap-4 order-1 sm:order-2">
                <div className="flex items-center gap-2 px-4 h-12 bg-slate-800 rounded-xl border border-slate-700">
                   <Label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</Label>
                   <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-12 h-12 rounded-xl shadow-xl shadow-blue-500/20 font-bold flex gap-2">
                  {editingCall ? 'Update Entry' : activeTab === 'Repeat Call Form' ? 'Commit Re-Repair Visit' : 'Commit Registry Entry'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
             </div>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
