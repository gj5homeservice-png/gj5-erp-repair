"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { 
  MessageSquare, 
  Paperclip, 
  ChevronRight, 
  Notebook, 
  History, 
  Search,
  X,
  Plus,
  Calendar,
  Clock,
  ChevronDown,
  Camera,
  Trash2,
  Wallet
} from 'lucide-react';
import { format, addMonths, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RepairCall, RepairStatus, VisitHistoryEntry, RepairJob, RepairJobPayment, RepairStatusHistoryEntry, RepairJobNotification } from '@/lib/types';
import { generateRepairJobId } from '@/lib/repair-utils';

const BRANDS = ['GJ5 HOME SERVICE', 'Sony', 'Samsung', 'LG', 'MI', 'Xiaomi', 'Realme', 'OnePlus', 'TCL', 'Philips', 'Toshiba', 'Panasonic', 'Sansui', 'Lloyd', 'BPL', 'Videocon', 'Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Canon', 'Epson', 'Hikvision', 'CP Plus', 'Dahua', 'Other'];

const TECH_TAGS = ['BONDING MACHINE', 'HARDWARE', 'SOFTWARE'];

const PRODUCT_CATEGORIES = [
  { id: 'TV Repair', name: 'TV Repair', prefix: 'TV' },
  { id: 'LED TV', name: 'LED TV', prefix: 'TV' },
  { id: 'LCD TV', name: 'LCD TV', prefix: 'TV' },
  { id: 'Smart TV', name: 'Smart TV', prefix: 'TV' },
  { id: 'Android TV', name: 'Android TV', prefix: 'TV' },
  { id: 'CCTV Camera', name: 'CCTV Camera', prefix: 'CCTV' },
  { id: 'DVR / NVR', name: 'DVR / NVR', prefix: 'CCTV' },
  { id: 'Computer', name: 'Computer', prefix: 'PC' },
  { id: 'Laptop', name: 'Laptop', prefix: 'PC' },
  { id: 'Printer', name: 'Printer', prefix: 'PRN' },
  { id: 'Monitor', name: 'Monitor', prefix: 'MON' },
  { id: 'Home Theatre', name: 'Home Theatre', prefix: 'HT' },
  { id: 'Speaker System', name: 'Speaker System', prefix: 'SPK' },
  { id: 'Amplifier', name: 'Amplifier', prefix: 'AMP' },
  { id: 'Set Top Box', name: 'Set Top Box', prefix: 'STB' },
  { id: 'Projector', name: 'Projector', prefix: 'PROJ' },
  { id: 'Gaming Console', name: 'Gaming Console', prefix: 'GAME' },
  { id: 'WiFi Router', name: 'WiFi Router', prefix: 'WIFI' },
  { id: 'Network Device', name: 'Network Device', prefix: 'NET' },
  { id: 'Mobile Phone', name: 'Mobile Phone', prefix: 'MOB' },
  { id: 'Tablet', name: 'Tablet', prefix: 'TAB' },
  { id: 'Power Supply', name: 'Power Supply', prefix: 'PWR' },
  { id: 'Motherboard Repair', name: 'Motherboard Repair', prefix: 'MB' },
  { id: 'Other Electronics', name: 'Other Electronics', prefix: 'OTH' },
];

const COMMON_PROBLEMS: Record<string, string[]> = {
  'TV': [
    'No Power', 'Dead', 'Panel Damage', 'Display Line', 'Backlight Issue', 
    'No Display', 'Sound Problem', 'HDMI Not Working', 'Remote Issue', 
    'Software Issue', 'Android Hang', 'WiFi Not Working', 'Restart Loop', 
    'Color Problem', 'Screen Flickering', 'Water Damage', 'Burn Issue', 
    'Motherboard Fault', 'Power Supply Fault', 'T-Con Fault'
  ],
  'CCTV': [
    'Camera Dead', 'No Video', 'DVR Not Recording', 'HDD Failure', 'Power Issue', 
    'Night Vision Not Working', 'Network Issue', 'Password Reset', 
    'Camera Blur', 'Cable Fault', 'Water Damage'
  ],
  'PC': [
    'Dead', 'No Display', 'Windows Issue', 'Software Installation', 'Slow Performance', 
    'SSD Upgrade', 'RAM Upgrade', 'Keyboard Fault', 'Battery Issue', 
    'Charging Problem', 'Motherboard Fault', 'Heating Issue', 'Fan Noise', 
    'Virus Problem', 'Data Recovery', 'Blue Screen Error'
  ],
  'PRN': [
    'Paper Jam', 'Cartridge Problem', 'Ink Issue', 'Print Quality Issue', 
    'Not Printing', 'Scanner Fault', 'USB Connection Issue'
  ],
  'MOB': [
    'Display Damage', 'Touch Issue', 'Battery Problem', 'Charging Issue', 
    'Speaker Fault', 'Mic Fault', 'Software Issue', 'Dead', 'Water Damage', 'Camera Fault'
  ],
  'OTH': [
    'No Power', 'Dead', 'Not Working', 'Water Damage', 'Physical Damage', 'Short Circuit'
  ]
};

const WARRANTY_OPTIONS = [
  'No Warranty',
  'Customer Warranty',
  '30 Days',
  '90 Days',
  '180 Days',
  '1 Year',
  'Custom Warranty'
];

export function CallModal({ isOpen, onClose, editingCall, store, renderAsPage }: any) {
  const [activeTab, setActiveTab] = useState('Registry');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const remainingAmount = Math.max(0, (Number(estimatedCost) || 0) - (Number(advancePayment) || 0));
  const [selectedBrand, setSelectedBrand] = useState('GJ5 HOME SERVICE');
  const [activeTpl, setActiveTpl] = useState<number | null>(null);
  const [repeatSearchQuery, setRepeatSearchQuery] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [isOldEntry, setIsOldEntry] = useState(false);
  const [photos, setPhotos] = useState<string[]>(['', '']);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const whatsappEnabledGlobally = store.settings?.whatsappNotifications !== false;

  const [sendWhatsApp, setSendWhatsApp] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gj5_whatsapp_enabled') === 'true';
    }
    return false;
  });

  const [formData, setFormData] = useState<Partial<RepairCall>>({
    id: '', customerId: '', customerName: '', mobile: '', address: '', pincode: '',
    category: 'TV Repair', brand: 'GJ5 HOME SERVICE', model: '', screenSize: '', techTags: [],
    status: 'Pending', problemDescription: '', storeLocation: 'GODOWN', warrantyDuration: 'No Warranty',
    visitHistory: [], repeatCount: 0, intakeMode: 'Customer Visit', isOldEntry: false,
    entryDate: format(new Date(), 'yyyy-MM-dd'), receivedDate: format(new Date(), 'yyyy-MM-dd'),
    warrantyExpiry: ''
  });

  const [inqData, setInqData] = useState({ name: '', mobile: '', address: '', notes: '' });
  const [templates, setTemplates] = useState<string[]>([
    "Registry: Hello [Name], Job [JobID] logged for [Brand].",
    "Estimate: Dear [Name], your repair quote for [JobID] is ready.",
    "Ready: [Name], your [Brand] device is ready for pickup."
  ]);

  useEffect(() => {
    sessionStorage.setItem('gj5_whatsapp_enabled', sendWhatsApp.toString());
  }, [sendWhatsApp]);

  useEffect(() => {
    if (editingCall) {
      setFormData(editingCall);
      setSelectedBrand(BRANDS.includes(editingCall.brand) ? editingCall.brand : 'Other');
      setIsOldEntry(editingCall.isOldEntry || false);
      if (editingCall.problemDescription) {
        setSelectedProblems(editingCall.problemDescription.split(', ').filter((p: string) => p));
      }
      const existingPhotos = [...(editingCall.photos || [])];
      while (existingPhotos.length < 2) existingPhotos.push('');
      setPhotos(existingPhotos);
    } else if (isOpen) {
      generateNewId('TV Repair');
      setActiveTpl(null);
      setSelectedProblems([]);
      setProblemSearch('');
      setIsOldEntry(false);
      setPhotos(['', '']);
    }
  }, [editingCall, isOpen]);

  const handlePhotoSlotClick = (index: number) => {
    setActivePhotoIndex(index);
    photoInputRef.current?.click();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = activePhotoIndex;
    e.target.value = '';
    if (!file || index === null) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos(prev => {
        const next = [...prev];
        next[index] = reader.result as string;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhotoSlot = () => {
    setPhotos(prev => [...prev, '']);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      if (index < 2) {
        const next = [...prev];
        next[index] = '';
        return next;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getProblemCategory = (cat: string) => {
    if (cat.includes('TV')) return 'TV';
    if (cat.includes('CCTV') || cat.includes('DVR')) return 'CCTV';
    if (cat.includes('Computer') || cat.includes('Laptop') || cat.includes('Motherboard')) return 'PC';
    if (cat.includes('Printer')) return 'PRN';
    if (cat.includes('Mobile') || cat.includes('Tablet')) return 'MOB';
    return 'OTH';
  };

  const currentSuggestedProblems = useMemo(() => {
    const key = getProblemCategory(formData.category || 'TV Repair');
    return COMMON_PROBLEMS[key] || COMMON_PROBLEMS['OTH'];
  }, [formData.category]);

  const filteredSuggestions = currentSuggestedProblems.filter(p => 
    p.toLowerCase().includes(problemSearch.toLowerCase()) && !selectedProblems.includes(p)
  );

  const generateNewId = (category: string) => {
    const catConfig = PRODUCT_CATEGORIES.find(c => c.id === category) || PRODUCT_CATEGORIES[0];
    const categoryCalls = store.calls.filter((c: any) => c.category === category);
    const nextNum = 1001 + categoryCalls.length;
    const nextId = renderAsPage ? generateRepairJobId(store.repairJobs || []) : `${catConfig.prefix}${nextNum}`;

    setFormData(prev => ({
      ...prev,
      category: category,
      id: nextId,
      customerId: prev.customerId || `${store.settings?.customerIdPrefix || 'GJ5'}${1001 + store.calls.length}`,
      techTags: [],
      status: 'Pending',
      warrantyDuration: store.settings?.defaultWarrantyDuration || 'No Warranty',
      storeLocation: 'GODOWN',
      visitHistory: [],
      repeatCount: 0,
      customerName: '',
      mobile: '',
      address: '',
      pincode: '',
      model: '',
      screenSize: '',
      problemDescription: '',
      intakeMode: store.settings?.defaultPickupRequired ? 'Pickup Required' : 'Customer Visit',
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      receivedDate: format(new Date(), 'yyyy-MM-dd'),
      warrantyExpiry: ''
    }));
    setSelectedProblems([]);
  };

  const toggleTag = (tag: string) => {
    const tags = formData.techTags || [];
    setFormData({...formData, techTags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]});
  };

  const handleProblemToggle = (prob: string) => {
    setSelectedProblems(prev => 
      prev.includes(prob) ? prev.filter(p => p !== prob) : [...prev, prob]
    );
  };

  const handleAddCustomProblem = () => {
    if (problemSearch.trim() && !selectedProblems.includes(problemSearch.trim())) {
      setSelectedProblems(prev => [...prev, problemSearch.trim()]);
      setProblemSearch('');
    }
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
      if (found.problemDescription) {
        setSelectedProblems(found.problemDescription.split(', ').filter((p: string) => p));
      }
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
    const problemStr = selectedProblems.join(', ');

    if (activeTab === 'Registry' && whatsappEnabledGlobally && sendWhatsApp && activeTpl !== null) {
      let msg = templates[activeTpl];
      msg = msg.replace('[Name]', formData.customerName || 'Customer')
               .replace('[JobID]', formData.id || 'Job')
               .replace('[Brand]', finalBrand || 'Device');
      
      const whatsappUrl = `https://web.whatsapp.com/send?phone=91${formData.mobile}&text=${encodeURIComponent(msg)}`;
      
      try {
        window.open(whatsappUrl, '_blank');
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Pop-up Blocked",
          description: "Please allow pop-ups to open WhatsApp for notifications."
        });
      }
    }

    let warrantyExpiry = formData.warrantyExpiry;
    if (formData.status === 'Completed') {
      if (formData.warrantyDuration === '30 Days') {
        warrantyExpiry = addMonths(new Date(), 1).toISOString();
      } else if (formData.warrantyDuration === '90 Days') {
        warrantyExpiry = addMonths(new Date(), 3).toISOString();
      } else if (formData.warrantyDuration === '180 Days') {
        warrantyExpiry = addMonths(new Date(), 6).toISOString();
      } else if (formData.warrantyDuration === '1 Year') {
        warrantyExpiry = addMonths(new Date(), 12).toISOString();
      }
    }

    if (renderAsPage) {
      const now = new Date().toISOString();
      const jobId = formData.id || generateRepairJobId(store.repairJobs || []);
      const advance = Number(advancePayment) || 0;
      const initialPayments: RepairJobPayment[] = [];
      if (advance > 0) {
        initialPayments.push({
          id: `PMT-${jobId}-1`,
          date: formData.receivedDate || format(new Date(), 'yyyy-MM-dd'),
          amount: advance,
          method: 'Cash',
          notes: 'Advance payment at intake'
        });
      }
      const newJob: RepairJob = {
        id: jobId,
        customerName: formData.customerName || '',
        mobile: formData.mobile || '',
        address: formData.address || undefined,
        customerId: formData.customerId || undefined,
        pincode: formData.pincode || undefined,
        techTags: formData.techTags || undefined,
        photos: photos.filter(p => !!p),
        storeLocation: formData.storeLocation || undefined,
        warrantyDuration: formData.warrantyDuration || undefined,
        warrantyExpiry: warrantyExpiry || undefined,
        productType: formData.category || '',
        brand: finalBrand || '',
        model: formData.model || '',
        productSize: formData.screenSize || undefined,
        problemDescription: problemStr,
        receivedDate: formData.receivedDate || format(new Date(), 'yyyy-MM-dd'),
        estimatedCost: Number(estimatedCost) || 0,
        advancePayment: advance,
        status: 'Received',
        parts: [],
        labourCharges: 0,
        otherCharges: 0,
        discount: 0,
        payments: initialPayments,
        notesLog: [],
        statusHistory: [{ id: `SH-${jobId}-1`, status: 'Received', changedAt: now, note: 'Repair job created' } as RepairStatusHistoryEntry],
        notifications: [{ id: `NT-${jobId}-1`, trigger: 'Repair Received', message: `Your repair job ${jobId} has been received.`, sentAt: null } as RepairJobNotification],
        createdAt: now,
        updatedAt: now
      };
      store.addRepairJob(newJob)
        .then(() => toast({ title: 'Repair Job Created', description: `${newJob.id} saved successfully.` }))
        .catch((err: any) => toast({ variant: 'destructive', title: 'Save Failed', description: err?.message || `Could not save ${newJob.id} to the server. Please try again.` }));
      onClose();
      return;
    }

    let updatedHistory = [...(formData.visitHistory || [])];
    let finalRepeatCount = formData.repeatCount || 0;

    const isExisting = store.calls.some((c: any) => c.id === formData.id);

    if (isExisting) {
      const newHistoryEntry: VisitHistoryEntry = {
        id: `VST${Date.now()}`,
        date: format(new Date(), 'dd/MM/yyyy'),
        time: format(new Date(), 'hh:mm a'),
        complaintDescription: problemStr,
        technicianNotes: '',
        status: formData.status as RepairStatus
      };
      updatedHistory.push(newHistoryEntry);
      finalRepeatCount = updatedHistory.length - 1;
    }

    const finalData = {
      ...formData,
      brand: finalBrand,
      problemDescription: problemStr,
      warrantyExpiry,
      visitHistory: updatedHistory,
      repeatCount: finalRepeatCount,
      isOldEntry,
      photos: photos.filter(p => !!p),
      updatedAt: new Date().toISOString(),
      createdAt: isOldEntry && formData.entryDate ? new Date(formData.entryDate).toISOString() : (formData.createdAt || new Date().toISOString())
    } as RepairCall;

    if (isExisting) store.updateCall(finalData);
    else store.addCall(finalData);

    onClose();
  };

  const showCustomWarrantyPicker = formData.warrantyDuration === 'Custom Warranty' || formData.warrantyDuration === 'Customer Warranty';

  if (renderAsPage) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 gj5-registry-form">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">New Repair</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Repair Module</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 h-9 md:h-10">
            <TabsTrigger value="Registry" className="text-xs md:text-sm">Registry</TabsTrigger>
            <TabsTrigger value="Repeat" className="text-xs md:text-sm">Repeat</TabsTrigger>
            <TabsTrigger value="Inquiry" className="text-xs md:text-sm">Inquiry</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {activeTab === 'Registry' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs font-bold text-slate-100">Old Entry Mode</Label>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Manual History Archive</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={cn("text-[10px] font-black uppercase transition-colors", !isOldEntry ? "text-blue-500" : "text-slate-600")}>New</span>
                         <Switch checked={isOldEntry} onCheckedChange={setIsOldEntry} />
                         <span className={cn("text-[10px] font-black uppercase transition-colors", isOldEntry ? "text-amber-500" : "text-slate-600")}>Old</span>
                      </div>
                    </div>

                    {isOldEntry && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-2">
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Entry Date</Label>
                            <Input
                              type="date"
                              value={formData.entryDate}
                              onChange={e => setFormData({...formData, entryDate: e.target.value})}
                              className="bg-slate-950 border-amber-500/20 h-10 text-xs text-[#F8FAFC]"
                            />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Received Date</Label>
                            <Input
                              type="date"
                              value={formData.receivedDate}
                              onChange={e => setFormData({...formData, receivedDate: e.target.value})}
                              className="bg-slate-950 border-amber-500/20 h-10 text-xs text-[#F8FAFC]"
                            />
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Service Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(v) => generateNewId(v)}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11 text-blue-400 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 h-[300px] overflow-y-auto">
                            {PRODUCT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Job ID</Label>
                        <Input readOnly value={formData.id || ''} className="bg-slate-900 border-slate-800 font-code font-bold text-blue-400 h-10 md:h-11" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Customer Name</Label>
                        <Input
                          value={formData.customerName || ''}
                          onChange={e => setFormData({...formData, customerName: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Cust ID</Label>
                        <Input readOnly value={formData.customerId || ''} className="bg-slate-900 border-slate-800 font-code h-10 md:h-11 text-[#F8FAFC]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Mobile</Label>
                        <Input
                          value={formData.mobile || ''}
                          onChange={e => setFormData({...formData, mobile: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Pincode</Label>
                        <Input
                          value={formData.pincode || ''}
                          onChange={e => setFormData({...formData, pincode: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Input
                        value={formData.address || ''}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                      />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] uppercase font-bold text-slate-500">Technician Tags</Label>
                       <div className="flex gap-2">
                          {TECH_TAGS.map(tag => (
                            <button
                              type="button"
                              key={`tag-${tag}`}
                              onClick={() => toggleTag(tag)}
                              className={cn("flex-1 py-2.5 md:py-3 rounded-xl text-[10px] font-bold border transition-all", formData.techTags?.includes(tag) ? "bg-[#0066FF] text-white border-[#0066FF]" : "bg-slate-900 text-slate-400 border-slate-800")}
                            >
                              {tag}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] uppercase font-bold text-slate-500">Repair Condition Photos</Label>
                       <div className="flex flex-wrap gap-3">
                          {photos.map((photo, i) => (
                            <div key={`photo-slot-${i}`} className="flex flex-col items-center gap-1.5">
                               <div
                                 onClick={() => handlePhotoSlotClick(i)}
                                 className={cn(
                                   "relative w-20 h-20 rounded-xl border overflow-hidden cursor-pointer transition-all group",
                                   photo ? "border-slate-800 bg-slate-900" : "border-dashed border-slate-700 bg-slate-900/50 hover:border-blue-500/50 flex items-center justify-center"
                                 )}
                               >
                                  {photo ? (
                                    <>
                                      <img src={photo} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/90 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <Camera className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                                  )}
                               </div>
                               <span className="text-[9px] font-bold text-slate-500 uppercase">Photo {i + 1}</span>
                            </div>
                          ))}
                          <div className="flex flex-col items-center gap-1.5">
                             <button
                               type="button"
                               onClick={handleAddPhotoSlot}
                               className="w-20 h-20 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 hover:border-blue-500/50 flex items-center justify-center transition-all group"
                             >
                                <Plus className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                             </button>
                             <span className="text-[9px] font-bold text-slate-500 uppercase">Add Photo</span>
                          </div>
                          <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoFileChange} />
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label>Brand</Label>
                          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 max-h-[300px]">
                               {BRANDS.map(b => <SelectItem key={`brand-opt-${b}`} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                       </div>
                       {selectedBrand === 'Other' && (
                         <div className="space-y-1 animate-in slide-in-from-left-2">
                           <Label>Enter Brand Name</Label>
                           <Input
                             value={formData.brand || ''}
                             onChange={e => setFormData({...formData, brand: e.target.value})}
                             className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                           />
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Model No</Label>
                        <Input
                          value={formData.model || ''}
                          onChange={e => setFormData({...formData, model: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Size (Inch)</Label>
                        <Input
                          value={formData.screenSize || ''}
                          onChange={e => setFormData({...formData, screenSize: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase">
                        Smart Problem Selector
                        {(formData.repeatCount || 0) > 0 && <span className="text-[10px] text-purple-400 font-bold uppercase">Repeat Entry</span>}
                      </Label>
                      <div className="p-3 md:p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                           {selectedProblems.map(p => (
                             <Badge key={`sel-prob-${p}`} className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1.5 py-1 md:py-1.5">
                               {p}
                               <X className="w-3 h-3 cursor-pointer" onClick={() => handleProblemToggle(p)} />
                             </Badge>
                           ))}
                           {selectedProblems.length === 0 && <span className="text-[10px] md:text-xs text-slate-600 italic">No problems selected...</span>}
                        </div>

                        <div className="flex gap-2">
                           <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                              <Input
                                placeholder="Search or Add..."
                                value={problemSearch}
                                onChange={e => setProblemSearch(e.target.value)}
                                className="pl-9 h-8 md:h-9 bg-slate-950 border-slate-800 text-[10px] md:text-xs text-[#F8FAFC]"
                              />
                           </div>
                           <Button size="sm" type="button" onClick={handleAddCustomProblem} className="bg-emerald-600 hover:bg-emerald-700 h-8 md:h-9">
                              <Plus className="w-3 h-3 md:w-4 h-4" />
                           </Button>
                        </div>

                        {problemSearch && filteredSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 animate-in fade-in duration-300">
                             {filteredSuggestions.slice(0, 8).map(p => (
                               <button
                                 type="button"
                                 key={`suggest-${p}`}
                                 onClick={() => handleProblemToggle(p)}
                                 className="px-2 md:px-3 py-0.5 md:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] md:text-[10px] font-bold rounded-full transition-colors border border-slate-700"
                               >
                                 + {p}
                               </button>
                             ))}
                          </div>
                        )}

                        {!problemSearch && (
                          <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2">
                             <span className="w-full text-[8px] md:text-[9px] font-bold text-slate-600 uppercase mb-1">Common Issues</span>
                             {currentSuggestedProblems.slice(0, 10).map(p => (
                               <button
                                 type="button"
                                 key={`suggest-default-${p}`}
                                 onClick={() => handleProblemToggle(p)}
                                 className={cn(
                                   "px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold rounded-full transition-all border",
                                   selectedProblems.includes(p)
                                     ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                     : "bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300"
                                 )}
                               >
                                 {p}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <Label>Store Location</Label>
                         <Select value={formData.storeLocation} onValueChange={v => setFormData({...formData, storeLocation: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
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
                            <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                               {WARRANTY_OPTIONS.map(opt => <SelectItem key={`warranty-opt-${opt}`} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                         </Select>
                      </div>
                    </div>

                    {showCustomWarrantyPicker && (
                       <div className="space-y-1 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-in slide-in-from-top-2">
                          <Label className="text-[10px] uppercase font-bold text-blue-400">Manual Warranty Expiry Date</Label>
                          <Input
                            type="date"
                            value={formData.warrantyExpiry?.split('T')[0] || ''}
                            onChange={e => setFormData({...formData, warrantyExpiry: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                            className="bg-slate-950 border-blue-500/20 h-11 text-sm font-code text-[#F8FAFC]"
                          />
                       </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'Repeat' ? (
                <div className="space-y-6">
                  <div className="p-4 md:p-8 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-6">
                    <div className="space-y-2">
                       <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Search Existing Job / Mobile</Label>
                       <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={repeatSearchQuery}
                            onChange={e => setRepeatSearchQuery(e.target.value)}
                            placeholder="Job ID or Mobile..."
                            className="bg-slate-950 border-slate-800 h-11 md:h-12 text-base md:text-lg text-[#F8FAFC]"
                          />
                          <Button type="button" onClick={handleRepeatLookup} className="bg-[#0066FF] px-8 h-11 md:h-12"><Search className="w-4 h-4 mr-2" /> Search</Button>
                       </div>
                    </div>
                    <div className="p-4 md:p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                       <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2"><History className="w-4 h-4" /> Repeat Logic</h4>
                       <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed">Loading an existing record will lock the Job ID and Customer ID. New visit details will be appended chronologically to the history ledger.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 bg-slate-900/40 p-4 md:p-8 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                      <Label>Visitor Name</Label>
                      <Input
                        value={inqData.name}
                        onChange={e => setInqData({...inqData, name: e.target.value})}
                        className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Mobile</Label>
                      <Input
                        value={inqData.mobile}
                        onChange={e => setInqData({...inqData, mobile: e.target.value})}
                        className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input
                      value={inqData.address}
                      onChange={e => setInqData({...inqData, address: e.target.value})}
                      className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Inquiry Details</Label>
                    <Textarea
                      value={inqData.notes}
                      onChange={e => setInqData({...inqData, notes: e.target.value})}
                      className="bg-slate-950 border-slate-800 min-h-[150px] md:min-h-[200px] text-[#F8FAFC]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 lg:border-l border-slate-800 lg:pl-8 space-y-6">
               <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <div className="space-y-1">
                     <Label className="text-xs font-bold">WhatsApp Notice</Label>
                     <div className="flex items-center gap-2">
                        <Badge className={cn("text-[8px] md:text-[9px] uppercase px-1.5 h-4", whatsappEnabledGlobally && sendWhatsApp ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                           {whatsappEnabledGlobally ? (sendWhatsApp ? "Active" : "Disabled") : "Off in Settings"}
                        </Badge>
                     </div>
                  </div>
                  <Switch checked={whatsappEnabledGlobally && sendWhatsApp} disabled={!whatsappEnabledGlobally} onCheckedChange={setSendWhatsApp} />
               </div>

               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-emerald-500" /> Templates
               </h3>
               {[0, 1, 2].map(idx => (
                 <div key={`whatsapp-tpl-pane-${idx}`} className={cn("p-3 md:p-4 rounded-xl border transition-all space-y-3", activeTpl === idx ? "bg-emerald-500/5 border-emerald-500/40" : "bg-slate-900/40 border-slate-800")}>
                    <div className="flex justify-between items-center">
                       <Label className="text-[10px] font-bold text-slate-500 uppercase">Option {idx + 1}</Label>
                       <button type="button" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"><Paperclip className="w-3 h-3" /></button>
                    </div>
                    <Textarea
                      value={templates[idx]}
                      onChange={e => { const t = [...templates]; t[idx] = e.target.value; setTemplates(t); }}
                      className="bg-transparent border-0 p-0 text-[10px] md:text-xs min-h-[60px] md:min-h-[70px] focus-visible:ring-0 resize-none leading-relaxed text-[#F8FAFC]"
                    />
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                       <Checkbox
                         id={`tpl-check-${idx}`}
                         checked={activeTpl === idx}
                         onCheckedChange={() => setActiveTpl(idx)}
                       />
                       <label htmlFor={`tpl-check-${idx}`} className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">Select This</label>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </Tabs>

        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-500" /> Estimate
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Estimated Cost</Label>
              <Input type="number" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value) || 0)} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Advance Payment</Label>
              <Input type="number" value={advancePayment} onChange={e => setAdvancePayment(Number(e.target.value) || 0)} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-2.5 max-w-md ml-auto">
            <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Estimated Cost</span><span className="font-code font-bold text-slate-200">₹{(Number(estimatedCost) || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Advance Paid</span><span className="font-code font-bold text-emerald-400">₹{(Number(advancePayment) || 0).toLocaleString()}</span></div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-xs font-black uppercase text-slate-100">Remaining Amount</span>
              <span className="text-2xl font-headline font-black text-rose-400">₹{remainingAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
          <Button type="button" onClick={handleSave} className="w-full sm:w-auto bg-[#0066FF] hover:bg-blue-600 px-8 md:px-12 h-11 md:h-12 rounded-xl font-bold flex gap-2 items-center justify-center order-1 sm:order-2">
             {activeTab === 'Inquiry' ? 'Commit Inquiry' : 'Save Repair Job'}
             <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <style jsx global>{`
          .gj5-registry-form input:-webkit-autofill,
          .gj5-registry-form input:-webkit-autofill:hover,
          .gj5-registry-form input:-webkit-autofill:focus,
          .gj5-registry-form textarea:-webkit-autofill {
            -webkit-text-fill-color: #F8FAFC !important;
            -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important;
            box-shadow: 0 0 0px 1000px #0f172a inset !important;
            caret-color: #F8FAFC !important;
            transition: background-color 9999s ease-in-out 0s;
          }
        `}</style>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gj5-registry-form max-w-6xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="px-4 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 space-y-0">
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold flex items-center gap-3">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                  {activeTab === 'Inquiry' ? <Notebook className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />}
               </div>
               <span className="truncate">{activeTab === 'Inquiry' ? 'Walk-In Inquiry' : 'Service Registry'}</span>
            </DialogTitle>
            <TabsList className="bg-slate-800/50 border border-slate-700 h-9 md:h-10">
              <TabsTrigger value="Registry" className="text-xs md:text-sm">Registry</TabsTrigger>
              <TabsTrigger value="Repeat" className="text-xs md:text-sm">Repeat</TabsTrigger>
              <TabsTrigger value="Inquiry" className="text-xs md:text-sm">Inquiry</TabsTrigger>
            </TabsList>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                {activeTab === 'Registry' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                        <div className="flex flex-col gap-0.5">
                          <Label className="text-xs font-bold text-slate-100">Old Entry Mode</Label>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Manual History Archive</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={cn("text-[10px] font-black uppercase transition-colors", !isOldEntry ? "text-blue-500" : "text-slate-600")}>New</span>
                           <Switch checked={isOldEntry} onCheckedChange={setIsOldEntry} />
                           <span className={cn("text-[10px] font-black uppercase transition-colors", isOldEntry ? "text-amber-500" : "text-slate-600")}>Old</span>
                        </div>
                      </div>

                      {isOldEntry && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-2">
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-amber-500/80 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Entry Date</Label>
                              <Input 
                                type="date" 
                                value={formData.entryDate} 
                                onChange={e => setFormData({...formData, entryDate: e.target.value})}
                                className="bg-slate-950 border-amber-500/20 h-10 text-xs text-[#F8FAFC]"
                              />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-amber-500/80 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Received Date</Label>
                              <Input
                                type="date"
                                value={formData.receivedDate}
                                onChange={e => setFormData({...formData, receivedDate: e.target.value})}
                                className="bg-slate-950 border-amber-500/20 h-10 text-xs text-[#F8FAFC]"
                              />
                           </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Service Category</Label>
                          <Select 
                            value={formData.category} 
                            onValueChange={(v) => generateNewId(v)}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11 text-blue-400 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 h-[300px] overflow-y-auto">
                              {PRODUCT_CATEGORIES.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Job ID</Label>
                          <Input readOnly value={formData.id || ''} className="bg-slate-900 border-slate-800 font-code font-bold text-blue-400 h-10 md:h-11" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Customer Name</Label>
                          <Input 
                            value={formData.customerName || ''} 
                            onChange={e => setFormData({...formData, customerName: e.target.value})} 
                            className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Cust ID</Label>
                          <Input readOnly value={formData.customerId || ''} className="bg-slate-900 border-slate-800 font-code h-10 md:h-11 text-[#F8FAFC]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Mobile</Label>
                          <Input 
                            value={formData.mobile || ''} 
                            onChange={e => setFormData({...formData, mobile: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Pincode</Label>
                          <Input 
                            value={formData.pincode || ''} 
                            onChange={e => setFormData({...formData, pincode: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Address</Label>
                        <Input 
                          value={formData.address || ''} 
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                        />
                      </div>
                      <div className="space-y-3">
                         <Label className="text-[10px] uppercase font-bold text-slate-500">Technician Tags</Label>
                         <div className="flex gap-2">
                            {TECH_TAGS.map(tag => (
                              <button 
                                type="button"
                                key={`tag-${tag}`} 
                                onClick={() => toggleTag(tag)} 
                                className={cn("flex-1 py-2.5 md:py-3 rounded-xl text-[10px] font-bold border transition-all", formData.techTags?.includes(tag) ? "bg-[#0066FF] text-white border-[#0066FF]" : "bg-slate-900 text-slate-400 border-slate-800")}
                              >
                                {tag}
                              </button>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-3">
                         <Label className="text-[10px] uppercase font-bold text-slate-500">Repair Condition Photos</Label>
                         <div className="flex flex-wrap gap-3">
                            {photos.map((photo, i) => (
                              <div key={`photo-slot-${i}`} className="flex flex-col items-center gap-1.5">
                                 <div
                                   onClick={() => handlePhotoSlotClick(i)}
                                   className={cn(
                                     "relative w-20 h-20 rounded-xl border overflow-hidden cursor-pointer transition-all group",
                                     photo ? "border-slate-800 bg-slate-900" : "border-dashed border-slate-700 bg-slate-900/50 hover:border-blue-500/50 flex items-center justify-center"
                                   )}
                                 >
                                    {photo ? (
                                      <>
                                        <img src={photo} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }}
                                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/90 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <Camera className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                                    )}
                                 </div>
                                 <span className="text-[9px] font-bold text-slate-500 uppercase">Photo {i + 1}</span>
                              </div>
                            ))}
                            <div className="flex flex-col items-center gap-1.5">
                               <button
                                 type="button"
                                 onClick={handleAddPhotoSlot}
                                 className="w-20 h-20 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 hover:border-blue-500/50 flex items-center justify-center transition-all group"
                               >
                                  <Plus className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                               </button>
                               <span className="text-[9px] font-bold text-slate-500 uppercase">Add Photo</span>
                            </div>
                            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoFileChange} />
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <Label>Brand</Label>
                            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 max-h-[300px]">
                                 {BRANDS.map(b => <SelectItem key={`brand-opt-${b}`} value={b}>{b}</SelectItem>)}
                              </SelectContent>
                            </Select>
                         </div>
                         {selectedBrand === 'Other' && (
                           <div className="space-y-1 animate-in slide-in-from-left-2">
                             <Label>Enter Brand Name</Label>
                             <Input 
                               value={formData.brand || ''} 
                               onChange={e => setFormData({...formData, brand: e.target.value})}
                               className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                             />
                           </div>
                         )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Model No</Label>
                          <Input 
                            value={formData.model || ''} 
                            onChange={e => setFormData({...formData, model: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Size (Inch)</Label>
                          <Input 
                            value={formData.screenSize || ''} 
                            onChange={e => setFormData({...formData, screenSize: e.target.value})}
                            className="bg-slate-900 border-slate-800 h-10 md:h-11 text-[#F8FAFC]"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase">
                          Smart Problem Selector
                          {(formData.repeatCount || 0) > 0 && <span className="text-[10px] text-purple-400 font-bold uppercase">Repeat Entry</span>}
                        </Label>
                        <div className="p-3 md:p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                             {selectedProblems.map(p => (
                               <Badge key={`sel-prob-${p}`} className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1.5 py-1 md:py-1.5">
                                 {p}
                                 <X className="w-3 h-3 cursor-pointer" onClick={() => handleProblemToggle(p)} />
                               </Badge>
                             ))}
                             {selectedProblems.length === 0 && <span className="text-[10px] md:text-xs text-slate-600 italic">No problems selected...</span>}
                          </div>
                          
                          <div className="flex gap-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <Input 
                                  placeholder="Search or Add..."
                                  value={problemSearch}
                                  onChange={e => setProblemSearch(e.target.value)}
                                  className="pl-9 h-8 md:h-9 bg-slate-950 border-slate-800 text-[10px] md:text-xs text-[#F8FAFC]"
                                />
                             </div>
                             <Button size="sm" type="button" onClick={handleAddCustomProblem} className="bg-emerald-600 hover:bg-emerald-700 h-8 md:h-9">
                                <Plus className="w-3 h-3 md:w-4 h-4" />
                             </Button>
                          </div>

                          {problemSearch && filteredSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 animate-in fade-in duration-300">
                               {filteredSuggestions.slice(0, 8).map(p => (
                                 <button 
                                   type="button"
                                   key={`suggest-${p}`} 
                                   onClick={() => handleProblemToggle(p)}
                                   className="px-2 md:px-3 py-0.5 md:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] md:text-[10px] font-bold rounded-full transition-colors border border-slate-700"
                                 >
                                   + {p}
                                 </button>
                               ))}
                            </div>
                          )}
                          
                          {!problemSearch && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2">
                               <span className="w-full text-[8px] md:text-[9px] font-bold text-slate-600 uppercase mb-1">Common Issues</span>
                               {currentSuggestedProblems.slice(0, 10).map(p => (
                                 <button 
                                   type="button"
                                   key={`suggest-default-${p}`} 
                                   onClick={() => handleProblemToggle(p)}
                                   className={cn(
                                     "px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold rounded-full transition-all border",
                                     selectedProblems.includes(p) 
                                       ? "bg-blue-500/10 border-blue-500 text-blue-400" 
                                       : "bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300"
                                   )}
                                 >
                                   {p}
                                 </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <Label>Store Location</Label>
                           <Select value={formData.storeLocation} onValueChange={v => setFormData({...formData, storeLocation: v})}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
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
                              <SelectTrigger className="bg-slate-900 border-slate-800 h-10 md:h-11"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                 {WARRANTY_OPTIONS.map(opt => <SelectItem key={`warranty-opt-${opt}`} value={opt}>{opt}</SelectItem>)}
                              </SelectContent>
                           </Select>
                        </div>
                      </div>

                      {showCustomWarrantyPicker && (
                         <div className="space-y-1 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-in slide-in-from-top-2">
                            <Label className="text-[10px] uppercase font-bold text-blue-400">Manual Warranty Expiry Date</Label>
                            <Input 
                              type="date" 
                              value={formData.warrantyExpiry?.split('T')[0] || ''} 
                              onChange={e => setFormData({...formData, warrantyExpiry: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                              className="bg-slate-950 border-blue-500/20 h-11 text-sm font-code text-[#F8FAFC]"
                            />
                         </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'Repeat' ? (
                  <div className="space-y-6">
                    <div className="p-4 md:p-8 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-6">
                      <div className="space-y-2">
                         <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Search Existing Job / Mobile</Label>
                         <div className="flex flex-col sm:flex-row gap-2">
                            <Input 
                              value={repeatSearchQuery} 
                              onChange={e => setRepeatSearchQuery(e.target.value)} 
                              placeholder="Job ID or Mobile..." 
                              className="bg-slate-950 border-slate-800 h-11 md:h-12 text-base md:text-lg text-[#F8FAFC]"
                            />
                            <Button type="button" onClick={handleRepeatLookup} className="bg-[#0066FF] px-8 h-11 md:h-12"><Search className="w-4 h-4 mr-2" /> Search</Button>
                         </div>
                      </div>
                      <div className="p-4 md:p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                         <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2"><History className="w-4 h-4" /> Repeat Logic</h4>
                         <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed">Loading an existing record will lock the Job ID and Customer ID. New visit details will be appended chronologically to the history ledger.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 bg-slate-900/40 p-4 md:p-8 rounded-2xl border border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1">
                        <Label>Visitor Name</Label>
                        <Input 
                          value={inqData.name} 
                          onChange={e => setInqData({...inqData, name: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Mobile</Label>
                        <Input 
                          value={inqData.mobile} 
                          onChange={e => setInqData({...inqData, mobile: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Input 
                        value={inqData.address} 
                        onChange={e => setInqData({...inqData, address: e.target.value})}
                        className="bg-slate-950 border-slate-800 h-10 md:h-12 text-[#F8FAFC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Inquiry Details</Label>
                      <Textarea 
                        value={inqData.notes} 
                        onChange={e => setInqData({...inqData, notes: e.target.value})} 
                        className="bg-slate-950 border-slate-800 min-h-[150px] md:min-h-[200px] text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="lg:col-span-4 lg:border-l border-slate-800 lg:pl-8 space-y-6">
                 <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <div className="space-y-1">
                       <Label className="text-xs font-bold">WhatsApp Notice</Label>
                       <div className="flex items-center gap-2">
                          <Badge className={cn("text-[8px] md:text-[9px] uppercase px-1.5 h-4", whatsappEnabledGlobally && sendWhatsApp ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                             {whatsappEnabledGlobally ? (sendWhatsApp ? "Active" : "Disabled") : "Off in Settings"}
                          </Badge>
                       </div>
                    </div>
                    <Switch checked={whatsappEnabledGlobally && sendWhatsApp} disabled={!whatsappEnabledGlobally} onCheckedChange={setSendWhatsApp} />
                 </div>

                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <MessageSquare className="w-4 h-4 text-emerald-500" /> Templates
                 </h3>
                 {[0, 1, 2].map(idx => (
                   <div key={`whatsapp-tpl-pane-${idx}`} className={cn("p-3 md:p-4 rounded-xl border transition-all space-y-3", activeTpl === idx ? "bg-emerald-500/5 border-emerald-500/40" : "bg-slate-900/40 border-slate-800")}>
                      <div className="flex justify-between items-center">
                         <Label className="text-[10px] font-bold text-slate-500 uppercase">Option {idx + 1}</Label>
                         <button type="button" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"><Paperclip className="w-3 h-3" /></button>
                      </div>
                      <Textarea 
                        value={templates[idx]} 
                        onChange={e => { const t = [...templates]; t[idx] = e.target.value; setTemplates(t); }} 
                        className="bg-transparent border-0 p-0 text-[10px] md:text-xs min-h-[60px] md:min-h-[70px] focus-visible:ring-0 resize-none leading-relaxed text-[#F8FAFC]"
                      />
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                         <Checkbox 
                           id={`tpl-check-${idx}`} 
                           checked={activeTpl === idx}
                           onCheckedChange={() => setActiveTpl(idx)}
                         />
                         <label htmlFor={`tpl-check-${idx}`} className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">Select This</label>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 md:p-8 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-3 shrink-0">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="w-full sm:w-auto bg-[#0066FF] hover:bg-blue-600 px-8 md:px-12 h-11 md:h-12 rounded-xl font-bold flex gap-2 order-1 sm:order-2">
               {activeTab === 'Inquiry' ? 'Commit Inquiry' : (formData.id && store.calls.some((c: any) => c.id === formData.id) ? 'Update Job' : 'Commit Registry')}
               <ChevronRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
      <style jsx global>{`
        .gj5-registry-form input:-webkit-autofill,
        .gj5-registry-form input:-webkit-autofill:hover,
        .gj5-registry-form input:-webkit-autofill:focus,
        .gj5-registry-form textarea:-webkit-autofill {
          -webkit-text-fill-color: #F8FAFC !important;
          -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important;
          box-shadow: 0 0 0px 1000px #0f172a inset !important;
          caret-color: #F8FAFC !important;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </Dialog>
  );
}
