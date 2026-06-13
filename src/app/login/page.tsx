"use client"

import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn, ShieldCheck, Zap, Globe, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Welcome Back", description: "Authentication successful." });
      router.push('/');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Auth Failed", 
        description: error.message || "Could not sign in with Google." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
        <CardContent className="p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-[#0066FF] to-blue-700 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
            <LogIn className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-headline font-bold tracking-tight text-white mb-2">GJ5 HOME SERVICE</h1>
          <p className="text-slate-400 text-sm uppercase tracking-[0.2em] font-black mb-10">Enterprise Console</p>

          <div className="w-full space-y-6">
            <Button 
              onClick={handleLogin} 
              disabled={loading}
              className="w-full h-14 bg-white text-black hover:bg-slate-100 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
            >
              {loading ? (
                <Zap className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <>
                  <img src="https://placehold.co/24x24/white/black?text=G" className="w-6 h-6 rounded-full" alt="Google" />
                  Sign In with Google
                </>
              )}
            </Button>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="flex flex-col items-center gap-2">
                 <div className="p-2 bg-slate-800/50 rounded-lg text-blue-400"><ShieldCheck className="w-5 h-5" /></div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="p-2 bg-slate-800/50 rounded-lg text-emerald-400"><Globe className="w-5 h-5" /></div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Cloud</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="p-2 bg-slate-800/50 rounded-lg text-purple-400"><Cpu className="w-5 h-5" /></div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Edge</span>
              </div>
            </div>
          </div>

          <p className="mt-12 text-[10px] text-slate-600 font-medium uppercase leading-relaxed">
            Authorized Personnel Only.<br />Access logged and monitored via Security Matrix V2.8.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
