
"use client"

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Camera, 
  MapPin, 
  Smartphone, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  Briefcase,
  Layers,
  User,
  Mail,
  ShieldCheck,
  Globe,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db, doc, setDoc } from '@/firebase';
import { Company } from '@/lib/types';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ownerName: '',
    companyName: '',
    category: 'Home Appliance Service',
    services: 'AC, Fridge, Washing Machine, TV',
    address: '',
    whatsapp: '',
    email: '',
    gstNumber: '',
    city: '',
    state: '',
    pincode: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.address || !formData.ownerName) {
      toast({ variant: "destructive", title: "Missing Node", description: "Owner Name, Company Name and Address are essential for setup." });
      return;
    }

    setLoading(true);

    const email = localStorage.getItem('gj5_temp_email');
    if (!email) {
      setLoading(false);
      return;
    }

    const companyId = formData.companyName.toLowerCase().replace(/\s+/g, '-');
    
    const companyData: Company = {
      id: companyId,
      companyName: formData.companyName,
      ownerName: formData.ownerName,
      ownerEmail: email,
      ownerMobile: formData.whatsapp,
      logoUrl: logo || undefined,
      planName: 'Master Plan',
      planStartDate: new Date().toISOString(),
      planExpiryDate: new Date(Date.now() + 31536000000).toISOString(), // 1 year default
      subscriptionStatus: 'active',
      companyStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: email,
      workspaceId: companyId,
      paymentStatus: 'Paid',
      isBlocked: false,
      lastLoginAt: new Date().toISOString(),
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      category: formData.category,
      services: formData.services,
      gstNumber: formData.gstNumber
    };

    try {
      // 1. Save to Firestore
      if (db) {
        await setDoc(doc(db, "companies", companyId), companyData);
      }

      // 2. Save to localStorage for immediate session persistence
      localStorage.setItem(`gj5_company_${email}`, JSON.stringify(companyData));
      localStorage.setItem('gj5_auth_token', 'demo-token-' + Date.now());
      localStorage.setItem('gj5_active_user', email);

      toast({ title: "Onboarding Complete", description: "Workspace initialized and synchronized." });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not provision cloud workspace." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 py-12">
      <Card className="max-w-3xl w-full rounded-[2.5rem] border-0 shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-10">
          <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-8">
             <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                <Briefcase className="w-7 h-7" />
             </div>
             <div>
                <h1 className="text-2xl font-headline font-black text-slate-900 uppercase tracking-tight">Workspace Initialization</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Final Step: Configuring Enterprise Matrix</p>
             </div>
          </div>

          <form onSubmit={handleFinish} className="space-y-8">
            <div className="flex flex-col items-center gap-4 py-4">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition-all overflow-hidden group"
               >
                 {logo ? (
                   <img src={logo} className="w-full h-full object-cover" alt="Logo" />
                 ) : (
                   <>
                    <Camera className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    <span className="text-[9px] font-black uppercase text-slate-400">Upload Logo</span>
                   </>
                 )}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase">Company Identity Visual</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Owner Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      value={formData.ownerName} 
                      onChange={e => setFormData({...formData, ownerName: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold" 
                      placeholder="Software owner full name"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      value={formData.companyName} 
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold" 
                      placeholder="e.g. Master Services"
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Business Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold" 
                      placeholder="business email"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">WhatsApp Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      value={formData.whatsapp} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-code font-bold" 
                      placeholder="91XXXXXXXXXX"
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Business Category</Label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">GST Number (Optional)</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      value={formData.gstNumber} 
                      onChange={e => setFormData({...formData, gstNumber: e.target.value})}
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold uppercase" 
                      placeholder="24XXXXX..."
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Service Sectors</Label>
               <Input 
                 value={formData.services} 
                 onChange={e => setFormData({...formData, services: e.target.value})}
                 className="h-14 rounded-2xl border-slate-200 font-bold" 
                 placeholder="e.g. AC, Washing Machine, Refrigerator"
               />
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Headquarters Address</Label>
               <div className="relative">
                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                 <Input 
                   value={formData.address} 
                   onChange={e => setFormData({...formData, address: e.target.value})}
                   className="pl-12 h-14 rounded-2xl border-slate-200 font-bold" 
                   placeholder="Street, Area"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">City</Label>
                  <Input 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="h-14 rounded-2xl border-slate-200 font-bold" 
                    placeholder="City"
                  />
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">State</Label>
                  <Input 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    className="h-14 rounded-2xl border-slate-200 font-bold" 
                    placeholder="State"
                  />
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Pincode</Label>
                  <Input 
                    value={formData.pincode} 
                    onChange={e => setFormData({...formData, pincode: e.target.value})}
                    className="h-14 rounded-2xl border-slate-200 font-bold font-code" 
                    placeholder="6 Digits"
                    maxLength={6}
                  />
               </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#0066FF] hover:bg-blue-700 rounded-2xl font-headline font-black text-lg uppercase text-white shadow-xl shadow-blue-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Initialize Enterprise ERP <CheckCircle2 className="ml-2 w-6 h-6" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
