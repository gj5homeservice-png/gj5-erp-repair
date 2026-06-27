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
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    category: 'Multi-Appliance Service',
    services: 'AC, Fridge, Washing Machine, TV',
    address: '',
    whatsapp: ''
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
    if (!formData.companyName || !formData.address) {
      toast({ variant: "destructive", title: "Missing Node", description: "Company Name and Address are essential for setup." });
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    // Commit company profile to local store
    const email = localStorage.getItem('gj5_temp_email');
    if (email) {
      const companyData = {
        ...formData,
        logo,
        ownerEmail: email,
        setupAt: new Date().toISOString()
      };
      localStorage.setItem(`gj5_company_${email}`, JSON.stringify(companyData));
      localStorage.setItem('gj5_auth_token', 'demo-token-' + Date.now());
      localStorage.setItem('gj5_active_user', email);
    }

    toast({ title: "Onboarding Complete", description: "Workspace initialized successfully." });
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full rounded-[2.5rem] border-0 shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-10">
          <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-8">
             <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                <Briefcase className="w-7 h-7" />
             </div>
             <div>
                <h1 className="text-2xl font-headline font-black text-slate-900 uppercase tracking-tight">Workspace Initialization</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Final Step: Configuring Home Appliance Matrix</p>
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
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={formData.companyName} 
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                      placeholder="e.g. Master Services"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Business Category</Label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Service Sectors</Label>
               <Input 
                 value={formData.services} 
                 onChange={e => setFormData({...formData, services: e.target.value})}
                 className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                 placeholder="e.g. AC, Washing Machine, Refrigerator"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Headquarters Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                      placeholder="Full Address"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">WhatsApp Support Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={formData.whatsapp} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 font-code font-bold" 
                      placeholder="91XXXXXXXXXX"
                    />
                  </div>
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
