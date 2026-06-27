"use client"

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  signInWithEmailAndPassword, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  doc,
  setDoc,
  serverTimestamp,
  isFirebaseConfigured
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogIn, 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle,
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
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  // Initialize Recaptcha
  const setupRecaptcha = (buttonId: string) => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
        'size': 'invisible',
        'callback': () => {}
      });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfile(userCredential.user);
      toast({ title: "Admin Access Granted", description: "Identity verified successfully." });
      router.push('/');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Auth Failed", 
        description: "Invalid credentials or account suspended." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      setupRecaptcha('send-otp-btn');
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowOtp(true);
      toast({ title: "OTP Dispatched", description: `Verification code sent to ${phone}` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Gateway Error", description: "Failed to send OTP. Check mobile number." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      await syncUserProfile(result.user);
      toast({ title: "Welcome Back", description: "Mobile identity confirmed." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "The code entered is incorrect." });
    } finally {
      setLoading(false);
    }
  };

  const syncUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      phone: user.phoneNumber || '',
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/40 border-slate-800 backdrop-blur-xl p-8 text-center space-y-6">
           <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
              <AlertCircle className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-headline font-bold text-white uppercase">Cloud Node Disconnected</h2>
           <p className="text-sm text-slate-400 leading-relaxed">
              Firebase environment variables are missing. Please configure your <code className="text-blue-400">.env</code> file with valid API keys to initialize the GJ5 Security Matrix.
           </p>
           <div className="text-[10px] text-slate-600 font-mono text-left bg-black/40 p-4 rounded-lg overflow-x-auto">
              NEXT_PUBLIC_FIREBASE_API_KEY=...<br/>
              NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
           </div>
        </Card>
      </div>
    );
  }

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
      <div id="recaptcha-container"></div>
    </div>
  );
}
