
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogIn, 
  Smartphone, 
  Mail, 
  Lock, 
  Loader2, 
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check against demo credentials or local registry
    const users = JSON.parse(localStorage.getItem('gj5_demo_users') || '[]');
    const localUser = users.find((u: any) => u.email === email && u.password === password);

    if ((email === 'admin@gj5.com' && password === '123456') || localUser) {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Could not start a session');
        localStorage.setItem('gj5_auth_token', json.token);
        localStorage.setItem('gj5_active_user', email);
        toast({ title: "Identity Verified", description: "Accessing GJ5 ERP Console..." });
        router.push('/dashboard');
      } catch (err: any) {
        toast({ variant: "destructive", title: "Server Unreachable", description: err?.message || "Could not connect to the ERP database." });
      }
    } else {
      // Not the owner account — try it as an employee login (their own
      // username/password, set up by an Admin in the Employees module).
      // This never touches or weakens the owner-login check above; it's
      // purely an additional path tried after that one fails.
      try {
        const res = await fetch('/api/auth/employee-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          localStorage.setItem('gj5_auth_token', json.token);
          localStorage.setItem('gj5_active_user', email);
          toast({
            title: "Identity Verified",
            description: json.forcePasswordChange ? "Please change your password after logging in." : "Accessing GJ5 ERP Console...",
          });
          router.push('/dashboard');
        } else {
          toast({
            variant: "destructive",
            title: "Auth Failed",
            description: json.error || "Invalid credentials."
          });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Server Unreachable", description: err?.message || "Could not connect to the ERP database." });
      }
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setShowOtp(true);
    toast({ title: "OTP Dispatched", description: `Verification code 123456 sent to ${phone}` });
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (otp === '123456') {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: phone }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Could not start a session');
        localStorage.setItem('gj5_auth_token', json.token);
        localStorage.setItem('gj5_active_user', phone);
        toast({ title: "Welcome Back", description: "Mobile identity confirmed." });
        router.push('/dashboard');
      } catch (err: any) {
        toast({ variant: "destructive", title: "Server Unreachable", description: err?.message || "Could not connect to the ERP database." });
      }
    } else {
      toast({ variant: "destructive", title: "Invalid OTP", description: "The code entered is incorrect. Use 123456" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden font-body">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#123C8C]/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#E53935]/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-8 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
             <Link href="/" className="p-2 rounded-xl bg-slate-800/50 text-slate-500 hover:text-white transition-colors">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-[#123C8C] uppercase tracking-widest">ERP CONSOLE V4.0</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">Secure Gateway</span>
             </div>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <img src="https://picsum.photos/seed/gj5-logo-official/400/400" className="w-full h-full object-contain" alt="GJ5 ERP Logo" data-ai-hint="official logo" />
          </div>

          <h1 className="text-2xl font-headline font-bold tracking-tight text-white mb-1 uppercase italic">GJ5 ERP</h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black mb-8">GOOD JOB 5 ERP</p>

          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-950/50 border border-slate-800 h-11 p-1 rounded-xl mb-8">
              <TabsTrigger value="admin" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Email Access</TabsTrigger>
              <TabsTrigger value="associate" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Mobile Access</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Account Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-slate-800 bg-white text-slate-900" 
                      placeholder="admin@gj5.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Access Key</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-slate-800 bg-white text-slate-900" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] rounded-xl font-bold uppercase text-xs mt-4 shadow-lg shadow-blue-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Dashboard"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="associate" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {!showOtp ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Registered Mobile</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                      <Input 
                        type="tel" 
                        value={phone} 
                        onChange={e => setMobile(e.target.value)}
                        className="pl-10 h-12 font-code rounded-xl border-slate-800 bg-white text-slate-900" 
                        placeholder="98765 43210"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <Button 
                    id="send-otp-btn"
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="w-full h-12 bg-[#123C8C] hover:bg-[#0D2E63] rounded-xl font-bold uppercase text-xs mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch Verification OTP"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Verification Code (OTP)</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                      <Input 
                        type="text" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)}
                        className="pl-10 h-12 text-center text-xl tracking-[0.5em] font-code rounded-xl border-slate-800 bg-white text-slate-900" 
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setShowOtp(false)} className="flex-1 text-slate-500 text-[10px] font-bold uppercase">Back</Button>
                    <Button 
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length < 6}
                      className="flex-[2] h-12 bg-[#10B981] hover:bg-emerald-700 rounded-xl font-bold uppercase text-xs text-white"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate Identity"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-12 text-[9px] text-slate-600 font-bold uppercase leading-relaxed text-center">
            Authorized Personnel Only.<br />Access logged via GJ5 Secure Protocol.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
