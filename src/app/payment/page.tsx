"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DemoPaymentPage() {
  const [status, setStatus] = useState<'processing' | 'success'>('processing');
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setStatus('success'), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full rounded-[2.5rem] border-0 shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-10 flex flex-col items-center text-center">
          {status === 'processing' ? (
            <div className="space-y-6">
              <div className="relative">
                <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <CreditCard className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-headline font-black text-slate-900 uppercase">Processing Node</h2>
                <p className="text-sm text-slate-500 font-medium">Securing your industrial license...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                 <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-black text-slate-900 uppercase">Commit Success</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Transaction Verified • License Issued</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full space-y-2">
                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Transaction ID</span>
                    <span className="text-slate-900 font-code">TXN-{Date.now().toString().slice(-8)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Node Status</span>
                    <span className="text-emerald-600">Verified</span>
                 </div>
              </div>
              <Button 
                onClick={() => router.push('/register')} 
                className="w-full h-14 bg-[#DC2626] hover:bg-[#B91C1C] rounded-2xl font-headline font-bold text-lg text-white"
              >
                Create Workspace <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 justify-center opacity-30">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase">V2.9 Encryption Node</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
