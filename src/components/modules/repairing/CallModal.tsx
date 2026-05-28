
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
import { Badge } from '@/components/ui/badge';
import { RepairCall, RepairHistoryEntry, RepairStatus, Inquiry } from '@/lib/types';
import { 
  History as HistoryIcon, 
  Search, 
  UserPlus, 
  PlusCircle, 
  ChevronRight,
  RefreshCw,
  Notebook
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
    pickupRequired: false,
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

  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairCall[]>([]);

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
        pickupRequired: false,
        intakeMode: 'Customer Walk-In',
        status: 'Pending',
        visitHistory: []
      });
      setSelectedBrand('GJ5 PLUS');
      setCustomBrand('');
      setCurrentVisitIssue('No Power / Dead');
      setCurrentVisitTags([]);
      
      setInquiryData({
        customerName: '',
        mobile: '',
        address: '',
        pincode: '',
        notes: ''
      });
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
    setCurrentVisitTags([]);
    setActiveTab('Repeat Call Form');
  };

  const toggleTag = (tag: string) => {
    setCurrentVisitTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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

    const isNew = !editingCall && activeTab === 'New Call';
    const isRepeat = activeTab === 'Repeat Call Form';
    
    const finalBrand = selectedBrand === 'Other' ? customBrand : selectedBrand;
    let finalData = { ...formData, brand: finalBrand, techTags: currentVisitTags } as RepairCall;
    const now = new Date().toISOString();

    const visitEntry: RepairHistoryEntry = {
      visitNumber: (finalData.visitHistory?.length || 0) + 1,
      timestamp: now,
      issue: currentVisitIssue,
      techTags: currentVisitTags,
      notes: '',
      statusAtTime: 'Pending'
    };

    if (isNew) {
      finalData = {
        ...finalData,
        createdAt: now,
        updatedAt: now,
        status: 'Pending',
        visitHistory: [visitEntry]
      };
    } else if (isRepeat) {
      finalData = {
        ...finalData,
        updatedAt: now,
        status: 'Pending',
        visitHistory: [...(finalData.visitHistory || []), visitEntry]
      };
    }

    onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {editingCall ? 'Update Repair Hub' : activeTab === 'Inquiry' ? 'Inquiry Capture Portal' : 'Service Registry Portal'}
               </DialogTitle>
            </div>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-11">
              <TabsTrigger value="New Call" className="px-6">New Call</TabsTrigger>
              <TabsTrigger value="Repeat Call" className="px-6">Repeat Search</TabsTrigger>
              <TabsTrigger value="Repeat Call Form" disabled={activeTab !== 'Repeat Call Form'} className="px-6">Re-Repair Log</TabsTrigger>
              <TabsTrigger value="Inquiry" className="px-6">Inquiry</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <TabsContent value="New Call" className="space-y-8 mt-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                      <Label>Customer Name</Label>
                      <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand Selection</Label>
                      <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                          <SelectValue placeholder="Select Brand..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedBrand === 'Other' && (
                      <div className="space-y-2 animate-in slide-in-from-left-4">
                        <Label>Enter Brand Name</Label>
                        <Input value={customBrand} onChange={e => setCustomBrand(e.target.value)} className="bg-slate-900 border-slate-800 h-11" placeholder="e.g. Sharp" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Model Number</Label>
                      <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Screen Size (Inch)</Label>
                      <Input value={formData.screenSize} onChange={e => setFormData({...formData, screenSize: e.target.value})} className="bg-slate-900 border-slate-800 h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician Assignments</Label>
                      <div className="flex flex-row gap-2">
                         {TECH_TAGS.map(tag => (
                           <button
                             key={tag}
                             onClick={() => toggleTag(tag)}
                             className={cn(
                               "flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                               currentVisitTags.includes(tag)
                                ? "bg-[#0066FF] text-white border-[#0066FF] scale-[1.02]"
                                : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
                             )}
                           >
                             {tag}
                           </button>
                         ))}
                      </div>
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
                          <SelectItem value="HDMI Not Working">HDMI Not Working</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Repeat Call" className="animate-in fade-in duration-300">
               <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                  <div className="space-y-2">
                     <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <RefreshCw className="w-8 h-8 text-[#0066FF]" />
                     </div>
                     <h3 className="text-2xl font-headline font-bold">Infinite Profile Retrieval</h3>
                  </div>
                  
                  <div className="flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input value={repeatSearchQuery} onChange={e => setRepeatSearchQuery(e.target.value)} className="pl-12 bg-slate-900 border-slate-800 h-14 text-lg rounded-2xl" placeholder="Search Mobile, Job ID or Customer ID..." />
                     </div>
                     <Button onClick={handleSearchRepeat} className="bg-[#0066FF] hover:bg-blue-700 h-14 px-10 rounded-2xl font-bold">Run Search</Button>
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
                             <Button onClick={() => selectProfileForRepeat(result)} className="bg-[#0066FF] hover:bg-blue-700 rounded-xl">
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
                       <HistoryIcon className="w-4 h-4" /> Infinite Repair History Ledger
                     </h3>
                     <Badge className="bg-[#0066FF] text-white font-black px-4 py-1">VISITS: {formData.visitHistory?.length || 0}</Badge>
                  </div>
                  
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
                     <div className="max-h-[250px] overflow-y-auto">
                        <table className="w-full text-[11px] text-left">
                           <thead className="bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-800">
                              <tr>
                                 <th className="p-4">Visit #</th>
                                 <th className="p-4">Timestamp</th>
                                 <th className="p-4">Registered Issue</th>
                                 <th className="p-4 text-right">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-800">
                              {formData.visitHistory?.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-800/20">
                                   <td className="p-4 font-bold text-slate-400">#{h.visitNumber}</td>
                                   <td className="p-4 font-code text-slate-300">{format(new Date(h.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                                   <td className="p-4 truncate max-w-[200px]">{h.issue}</td>
                                   <td className="p-4 text-right">
                                      <Badge variant="outline" className="text-[9px] uppercase">{h.statusAtTime}</Badge>
                                   </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locked Job ID</Label>
                     <Input readOnly value={formData.id} className="bg-slate-950 border-slate-800 font-code font-bold opacity-50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locked Customer ID</Label>
                     <Input readOnly value={formData.customerId} className="bg-slate-950 border-slate-800 font-code opacity-50 cursor-not-allowed" />
                  </div>
               </div>

               <div className="p-8 bg-blue-500/5 border border-dashed border-blue-500/20 rounded-3xl space-y-6">
                  <h3 className="text-lg font-headline font-bold text-blue-400 flex items-center gap-2">
                     <PlusCircle className="w-5 h-5" /> Append Current Re-Repair Visit
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <Label>Current Visit Issue</Label>
                           <Select value={currentVisitIssue} onValueChange={setCurrentVisitIssue}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-12">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                 <SelectItem value="No Power / Dead">No Power / Dead</SelectItem>
                                 <SelectItem value="Display Panel Damaged">Display Panel Damaged</SelectItem>
                                 <SelectItem value="Sound OK - No Video">Sound OK - No Video</SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Technician Assignment</Label>
                           <div className="flex flex-row gap-2">
                              {TECH_TAGS.map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => toggleTag(tag)}
                                  className={cn(
                                    "flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                                    currentVisitTags.includes(tag)
                                     ? "bg-[#0066FF] text-white border-[#0066FF] scale-[1.02]"
                                     : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
                                  )}
                                >
                                  {tag}
                                </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="Inquiry" className="animate-in fade-in zoom-in-95 duration-300">
              <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/40 p-10 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-2">
                  <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                    <Notebook className="w-8 h-8 text-[#0066FF]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-bold">New Walk-In Inquiry</h3>
                    <p className="text-slate-500 text-sm">Capture query details for visitors and walk-ins.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Customer Name</Label>
                      <Input 
                        value={inquiryData.customerName} 
                        onChange={e => setInquiryData({...inquiryData, customerName: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</Label>
                      <Input 
                        value={inquiryData.mobile} 
                        onChange={e => setInquiryData({...inquiryData, mobile: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Full Address</Label>
                      <Input 
                        value={inquiryData.address} 
                        onChange={e => setInquiryData({...inquiryData, address: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Pincode</Label>
                      <Input 
                        value={inquiryData.pincode} 
                        onChange={e => setInquiryData({...inquiryData, pincode: e.target.value})} 
                        className="bg-slate-950 border-slate-800 h-12" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Inquiry Details / Purpose of Visit</Label>
                  <Textarea 
                    value={inquiryData.notes} 
                    onChange={e => setInquiryData({...inquiryData, notes: e.target.value})} 
                    className="bg-slate-950 border-slate-800 min-h-[150px]" 
                  />
                </div>
              </div>
            </TabsContent>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4">
             <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
             <Button onClick={handleSave} className="bg-[#0066FF] hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2 shadow-lg shadow-blue-500/20">
               {activeTab === 'Inquiry' ? 'Create Inquiry' : activeTab === 'Repeat Call Form' ? 'Commit Re-Repair Visit' : editingCall ? 'Update Call Registry' : 'Create Registry'}
               <ChevronRight className="w-4 h-4" />
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
