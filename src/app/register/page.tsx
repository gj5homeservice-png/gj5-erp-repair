"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Smartphone, 
  Mail, 
  Lock, 
  Loader2, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ownerName: '',
    mobile: '',
    email: '',
    password: ''
  });
  
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.ownerName) {
      toast({ variant: "destructive", title: "Missing Fields", description: "All fields are required for identity registry." });
      return;
    }
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const users = JSON.parse(localStorage.getItem('gj5_demo_users') || '[]');
    users.push(formData);
    localStorage.setItem('gj5_demo_users', JSON.stringify(users));
    
    localStorage.setItem('gj5_temp_email', formData.email);

    toast({ title: "Identity Registered", description: "Configuring your workspace now..." });
    router.push('/onboarding');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-body">
      <Card className="w-full max-w-md bg-white border-slate-100 shadow-2xl relative z-10 overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl p-1">
               <img src="https://picsum.photos/seed/gj5-logo-official/400/400" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-headline font-black text-slate-900 uppercase italic">GJ5 ERP</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Master Registration</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input 
                  value={formData.ownerName} 
                  onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  className="pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-bold border-slate-200" 
                  placeholder="Official Identity"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Mobile</Label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input 
                  type="tel"
                  value={formData.mobile} 
                  onChange={e => setFormData({...formData, mobile: e.target.value})}
                  className="pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-code font-bold border-slate-200" 
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Official Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-bold border-slate-200" 
                  placeholder="admin@service.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="pl-12 h-14 rounded-2xl focus-visible:ring-red-500 border-slate-200" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#123C8C] hover:bg-[#0D2E63] rounded-2xl font-headline font-black text-lg uppercase mt-6 shadow-xl shadow-blue-600/20 text-white"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Register Identity <ChevronRight className="ml-2 w-5 h-5" /></>}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 opacity-30 grayscale pointer-events-none">
             <ShieldCheck className="w-4 h-4" />
             <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Encrypted Registry</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
