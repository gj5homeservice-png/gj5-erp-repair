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
  KeyRound
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === 'admin@gj5.com' && password === '123456') {
      localStorage.setItem('gj5_auth_token', 'demo-admin-token-' + Date.now());
      localStorage.setItem('gj5_user_role', 'Admin');
      toast({ title: "Admin Access Granted", description: "Identity verified successfully." });
      router.push('/');
    } else {
      toast({ 
        variant: "destructive", 
        title: "Auth Failed", 
        description: "Invalid credentials. Use admin@gj5.com / 123456" 
      });
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
      return;
    }
    setLoading(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setShowOtp(true);
    toast({ title: "OTP Dispatched", description: `Verification code 123456 sent to ${phone}` });
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setLoading(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (otp === '123456') {
      localStorage.setItem('gj5_auth_token', 'demo-user-token-' + Date.now());
      localStorage.setItem('gj5_user_role', 'Associate');
      toast({ title: "Welcome Back", description: "Mobile identity confirmed." });
      router.push('/');
    } else {
      toast({ variant: "destructive", title: "Invalid OTP", description: "The code entered is incorrect. Use 123456" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#0066FF] to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <LogIn className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-headline font-bold tracking-tight text-white mb-1">GJ5 HOME SERVICE</h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black mb-8">Identity Control Node</p>

          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-950/50 border border-slate-800 h-11 p-1 rounded-xl mb-8">
              <TabsTrigger value="admin" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">Admin Terminal</TabsTrigger>
              <TabsTrigger value="associate" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">Associate Access</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="bg-slate-950 border-slate-800 pl-10 h-12 focus-visible:ring-blue-500" 
                      placeholder="admin@gj5.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Clearance Key</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="bg-slate-950 border-slate-800 pl-10 h-12 focus-visible:ring-blue-500" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold uppercase text-xs mt-4 shadow-lg shadow-blue-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Master Console"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="associate" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {!showOtp ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Registered Mobile</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <Input 
                        type="tel" 
                        value={phone} 
                        onChange={e => setMobile(e.target.value)}
                        className="bg-slate-950 border-slate-800 pl-10 h-12 font-code" 
                        placeholder="9876543210"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <Button 
                    id="send-otp-btn"
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="w-full h-12 bg-[#0066FF] hover:bg-blue-600 rounded-xl font-bold uppercase text-xs mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch Verification OTP"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Verification Node (OTP)</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <Input 
                        type="text" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)}
                        className="bg-slate-950 border-slate-800 pl-10 h-12 text-center text-xl tracking-[0.5em] font-code" 
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setShowOtp(false)} className="flex-1 text-slate-500 text-[10px] uppercase font-bold">Back</Button>
                    <Button 
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length < 6}
                      className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold uppercase text-xs"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate Node"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-12 text-[9px] text-slate-600 font-bold uppercase leading-relaxed text-center">
            Authorized Personnel Only.<br />Access logged via Security Protocol V2.9.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
