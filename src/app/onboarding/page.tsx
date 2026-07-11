"use client"

import React, { useState, useRef, useEffect } from 'react';
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
import { db, doc, updateDoc, getDoc } from '@/firebase';
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

  useEffect(() => {
    const activeUser = localStorage.getItem('gj5_active_user');
    if (!activeUser) {
      router.push('/login');
      return;
    }
    setFormData(prev => ({ ...prev, email: activeUser }));

    // Pre-fill from existing cloud record if available
    const fetchExisting = async () => {
      if (!db) return;
      const q = localStorage.getItem(`gj5_company_${activeUser}`);
      if (q) {
        const data = JSON.parse(q);
        setFormData(prev => ({ ...prev, ...data }));
        if (data.logoUrl) setLogo(data.logoUrl);
      }
    };
    fetchExisting();
  }, [router]);

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
      toast({ variant: "destructive", title: "Missing Data", description: "All fields are essential for setup." });
      return;
    }

    setLoading(true);

    const email = localStorage.getItem('gj5_active_user');
    const companyId = formData.companyName.toLowerCase().replace(/\s+/g, '-');
    
    try {
      if (db) {
        // Update the central registry node created during payment
        await updateDoc(doc(db, "companies", companyId), {
          ...formData,
          logoUrl: logo || '',
          updatedAt: new Date().toISOString(),
          companyStatus: 'active'
        });
      }

      toast({ title: "Workspace Operational", description: "Node configured and synchronized." });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not configure cloud workspace." });
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
                <h1 className="text-2xl font-headline font-black text-slate-900 uppercase tracking-tight">Workspace Configuration</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Calibrating Enterprise Matrix</p>
             </div>
          </div>

          <form onSubmit={handleFinish} className="space-y-8">
            <div className="flex flex-col items-center gap-4 py-4">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition-all overflow-hidden group"
               >
                 {logo ? <img src={logo} className="w-full h-full object-cover" alt="Logo" /> : <Camera className="w-8 h-8 text-slate-300" />}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase">Business Identity Visual</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Owner Name</Label>
                  <Input value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Company Name</Label>
                  <Input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Business Email</Label>
                  <Input readOnly value={formData.email} className="h-14 rounded-2xl border-slate-100 bg-slate-50" />
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">WhatsApp Node</Label>
                  <Input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
               </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] uppercase font-bold text-slate-500">Service Address Node</Label>
               <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-16 bg-[#0066FF] hover:bg-blue-700 rounded-2xl font-headline font-black text-lg uppercase text-white shadow-xl">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Commit Configuration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
