
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
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
    companyName: '',
    ownerName: '',
    mobile: '',
    email: '',
    password: ''
  });
  
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Missing Fields", description: "All fields are mandatory for business registry." });
      return;
    }
    
    setLoading(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Store account locally for demo
    const users = JSON.parse(localStorage.getItem('gj5_demo_users') || '[]');
    users.push(formData);
    localStorage.setItem('gj5_demo_users', JSON.stringify(users));

    toast({ title: "Account Initialized", description: "Welcome to GJ5 ERP. Redirecting to login terminal." });
    router.push('/login');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-xl bg-white border-slate-100 shadow-2xl relative z-10 overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-10">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-red-600/20">G</div>
                <div className="flex flex-col">
                  <span className="text-base font-headline font-black tracking-tighter leading-none text-slate-900">GJ5 HOME SERVICE</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Enterprise Registration</span>
                </div>
             </div>
             <Link href="/" className="text-[10px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors">Home Portal</Link>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Company Name</Label>
                 <div className="relative">
                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                     value={formData.companyName} 
                     onChange={e => setFormData({...formData, companyName: e.target.value})}
                     className="bg-slate-50 border-slate-100 pl-12 h-14 rounded-2xl focus-visible:ring-red-500 transition-all font-bold" 
                     placeholder="e.g. GJ5 Solutions"
                   />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Owner Name</Label>
                 <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                     value={formData.ownerName} 
                     onChange={e => setFormData({...formData, ownerName: e.target.value})}
                     className="bg-slate-50 border-slate-100 pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-bold" 
                     placeholder="Official Identity"
                   />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Business Mobile</Label>
                 <div className="relative">
                   <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                     type="tel"
                     value={formData.mobile} 
                     onChange={e => setFormData({...formData, mobile: e.target.value})}
                     className="bg-slate-50 border-slate-100 pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-code font-bold" 
                     placeholder="98765 43210"
                   />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Official Email</Label>
                 <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                     type="email"
                     value={formData.email} 
                     onChange={e => setFormData({...formData, email: e.target.value})}
                     className="bg-slate-50 border-slate-100 pl-12 h-14 rounded-2xl focus-visible:ring-red-500 font-bold" 
                     placeholder="admin@company.com"
                   />
                 </div>
               </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Security Key (Password)</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="bg-slate-50 border-slate-100 pl-12 h-14 rounded-2xl focus-visible:ring-red-500" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#DC2626] hover:bg-[#B91C1C] rounded-2xl font-headline font-black text-lg uppercase mt-6 shadow-xl shadow-red-600/20 flex gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Register Organization <ChevronRight className="w-5 h-5" /></>}
            </Button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-50 flex flex-col items-center gap-4">
             <p className="text-xs font-bold text-slate-500">Already have an active license?</p>
             <Button variant="outline" onClick={() => router.push('/login')} className="rounded-full px-8 h-10 text-[10px] font-black uppercase tracking-widest">Access Software Terminal</Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3 opacity-30 grayscale pointer-events-none">
             <ShieldCheck className="w-4 h-4" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em]">Encrypted Data Transmission • V2.9 Security</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
