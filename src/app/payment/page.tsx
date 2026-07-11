"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  CreditCard,
  TicketPercent,
  Gift,
  Zap,
  Info,
  ChevronRight,
  X,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addMonths, parseISO, isBefore } from 'date-fns';
import { Coupon, Subscription } from '@/lib/types';

const PLANS_PRICES: Record<string, number> = {
  'free': 0,
  '3months': 2999,
  '6months': 5999,
  '12months': 8999
};

const PLAN_LABELS: Record<string, string> = {
  'free': 'Free Trial (7 Days)',
  '3months': 'Starter Plan (3 Months)',
  '6months': 'Growth Plan (6 Months)',
  '12months': 'Master Plan (12 Months)'
};

export default function CheckoutPage() {
  const [status, setStatus] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');
  const [planId, setPlanId] = useState<string>('');
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const savedPlan = localStorage.getItem('gj5_selected_plan');
    if (!savedPlan) {
      router.push('/plans');
      return;
    }
    setPlanId(savedPlan);
  }, [router]);

  const originalPrice = PLANS_PRICES[planId] || 0;

  const calculations = useMemo(() => {
    if (!appliedCoupon) return { originalPrice, discount: 0, finalPrice: originalPrice };

    let discount = 0;
    if (appliedCoupon.discountType === 'Percentage') {
      discount = (originalPrice * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }

    const finalPrice = Math.max(0, originalPrice - discount);
    return { originalPrice, discount, finalPrice };
  }, [appliedCoupon, originalPrice]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplying(true);
    setError('');

    // Simulate Secure Backend Validation
    await new Promise(r => setTimeout(r, 800));

    const savedCoupons: Coupon[] = JSON.parse(localStorage.getItem('gj5_saas_coupons') || '[]');
    const coupon = savedCoupons.find(c => c.code === couponCode.toUpperCase());

    if (!coupon) {
      setError('Invalid promotion code. Node not found.');
      setIsApplying(false);
      return;
    }

    if (!coupon.active || isBefore(parseISO(coupon.expiresAt), new Date())) {
      setError('This coupon node has expired or is deactivated.');
      setIsApplying(false);
      return;
    }

    if (coupon.usedCount >= coupon.maxUses) {
      setError('Coupon usage limit reached for this campaign.');
      setIsApplying(false);
      return;
    }

    if (originalPrice < coupon.minimumOrderAmount) {
      setError(`Minimum order of ₹${coupon.minimumOrderAmount} required for this node.`);
      setIsApplying(false);
      return;
    }

    const planLabel = PLAN_LABELS[planId];
    if (!coupon.applicablePlans.includes('All Plans') && !coupon.applicablePlans.includes(planLabel)) {
      setError('This coupon is not applicable to your selected plan node.');
      setIsApplying(false);
      return;
    }

    setAppliedCoupon(coupon);
    setIsApplying(false);
    toast({ title: "Node Synchronized", description: `${coupon.code} applied successfully.` });
  };

  const handleProcessPayment = async () => {
    setStatus('processing');
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 2000));

    // Plan Activation Logic
    const now = new Date();
    let expiry = now;
    if (planId === 'free') expiry = addMonths(now, 0.23); // ~7 days
    else if (planId === '3months') expiry = addMonths(now, 3);
    else if (planId === '6months') expiry = addMonths(now, 6);
    else if (planId === '12months') expiry = addMonths(now, 12);

    const subscription: Subscription = {
      id: `SUB-${Date.now()}`,
      userId: 'DEMO-USER',
      companyId: 'DEMO-COMPANY',
      planName: PLAN_LABELS[planId],
      originalAmount: calculations.originalPrice,
      discountAmount: calculations.discount,
      finalAmount: calculations.finalPrice,
      couponCode: appliedCoupon?.code,
      paymentMethod: calculations.finalPrice === 0 ? 'Coupon' : 'Razorpay',
      paymentStatus: calculations.finalPrice === 0 ? 'Fully Discounted' : 'Paid',
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      active: true,
      createdAt: now.toISOString()
    };

    // Update coupon usage if applicable
    if (appliedCoupon) {
      const savedCoupons: Coupon[] = JSON.parse(localStorage.getItem('gj5_saas_coupons') || '[]');
      const updatedCoupons = savedCoupons.map(c => 
        c.code === appliedCoupon.code ? { ...c, usedCount: c.usedCount + 1 } : c
      );
      localStorage.setItem('gj5_saas_coupons', JSON.stringify(updatedCoupons));
    }

    localStorage.setItem('gj5_active_subscription', JSON.stringify(subscription));
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2.5rem] border-0 shadow-2xl overflow-hidden bg-slate-900/40 backdrop-blur-xl">
          <CardContent className="p-10 flex flex-col items-center text-center">
            <div className="space-y-8 animate-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/20">
                 <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-black text-white uppercase italic tracking-tighter">Commit Success</h2>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Enterprise Node Verified • License Issued</p>
              </div>
              <div className="p-5 bg-slate-950/50 rounded-3xl border border-slate-800 w-full space-y-3">
                 <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Transaction ID</span>
                    <span className="text-blue-400 font-code">TXN-{Date.now().toString().slice(-8)}</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>License Type</span>
                    <span className="text-white">{PLAN_LABELS[planId]}</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Node Status</span>
                    <span className="text-emerald-500">Authorized</span>
                 </div>
              </div>
              <Button 
                onClick={() => router.push('/register')} 
                className="w-full h-14 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-headline font-bold text-lg text-white shadow-xl shadow-blue-900/20"
              >
                Launch Workspace <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 justify-center opacity-30">
                 <ShieldCheck className="w-4 h-4 text-blue-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
             <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-400" />
             </div>
           </div>
           <div className="text-center space-y-2">
              <h2 className="text-2xl font-headline font-black text-white uppercase italic tracking-tighter">Syncing Enterprise Matrix</h2>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Initializing Security Handshake...</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 py-12">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Summary */}
        <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
           <div className="space-y-1">
              <h1 className="text-4xl font-headline font-black text-white uppercase italic tracking-tighter">Finalize <span className="text-blue-500">License Node</span></h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Configure Deployment & Fiscal Settlement</p>
           </div>

           <Card className="bg-slate-900/40 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardContent className="p-8 space-y-8">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg">
                       <Zap className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className="text-xl font-headline font-black text-white uppercase">{PLAN_LABELS[planId]}</h3>
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Annual Subscription Lifecycle</p>
                    </div>
                    <div className="ml-auto text-right">
                       <span className="text-2xl font-headline font-black text-white">₹{calculations.originalPrice.toLocaleString()}</span>
                       <p className="text-[10px] text-slate-500 font-bold uppercase">Base Price</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <TicketPercent className="w-4 h-4 text-blue-500" /> Promotion Node
                    </h4>
                    <div className="flex gap-3">
                       <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter Code (e.g. GJ5OFF25)"
                            className="pl-10 h-12 bg-slate-950 border-slate-800 rounded-xl font-code font-black tracking-widest text-blue-400"
                            disabled={!!appliedCoupon}
                          />
                       </div>
                       {appliedCoupon ? (
                         <Button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 bg-rose-500/5 border border-rose-500/20">
                            <X className="w-5 h-5" />
                         </Button>
                       ) : (
                         <Button 
                           onClick={handleApplyCoupon} 
                           disabled={isApplying || !couponCode}
                           className="h-12 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase"
                         >
                            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Node"}
                         </Button>
                       )}
                    </div>
                    {error && <p className="text-[10px] text-rose-500 font-bold uppercase italic flex items-center gap-2"><Info className="w-3 h-3" /> {error}</p>}
                    
                    {appliedCoupon && (
                      <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 flex items-center justify-between animate-in zoom-in duration-300">
                         <div className="flex items-center gap-3">
                            <Gift className="w-5 h-5 text-emerald-500" />
                            <div>
                               <p className="text-[10px] font-black text-emerald-500 uppercase">{appliedCoupon.name}</p>
                               <p className="text-[9px] text-slate-500 font-medium italic">{appliedCoupon.description}</p>
                            </div>
                         </div>
                         <Badge className="bg-emerald-500/10 text-emerald-400 border-0 uppercase font-black text-[10px]">
                            -{appliedCoupon.discountType === 'Percentage' ? `${appliedCoupon.discountValue}%` : `₹${appliedCoupon.discountValue}`}
                         </Badge>
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Right: Settlement */}
        <div className="lg:col-span-5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
           <Card className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-800 bg-slate-950/50">
                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Settlement Ledger</h4>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                 <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-400 font-bold uppercase tracking-widest">Base Assessment</span>
                       <span className="font-code font-bold">₹{calculations.originalPrice.toLocaleString()}</span>
                    </div>
                    {calculations.discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-400">
                         <span className="font-bold uppercase tracking-widest">Promotion Yield</span>
                         <span className="font-code font-bold">-₹{calculations.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-slate-400">
                       <span className="font-bold uppercase tracking-widest">Tax Provision (GST 0%)</span>
                       <span className="font-code font-bold">₹0</span>
                    </div>
                    <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                       <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest">Net Payable</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase italic mt-0.5">Industrial Node License</p>
                       </div>
                       <span className="text-4xl font-headline font-black text-blue-500 tracking-tighter">
                          ₹{calculations.finalPrice.toLocaleString()}
                       </span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Button 
                      onClick={handleProcessPayment}
                      className="w-full h-16 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-headline font-black text-lg uppercase tracking-tighter shadow-xl shadow-blue-900/40 group"
                    >
                       {calculations.finalPrice === 0 ? "Activate License Now" : "Authorize Settlement"} 
                       <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    <div className="flex flex-col items-center gap-3">
                       <div className="flex items-center gap-4 grayscale opacity-30 hover:opacity-100 hover:grayscale-0 transition-all cursor-not-allowed">
                          <CreditCard className="w-5 h-5" />
                          <div className="w-8 h-8 rounded bg-slate-800" />
                          <div className="w-8 h-8 rounded bg-slate-800" />
                          <div className="w-8 h-8 rounded bg-slate-800" />
                       </div>
                       <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Secure Node Transit Protected
                       </p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-600/20 space-y-3">
              <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Global License Sync</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Upon settlement, your enterprise node will be provisioned instantly. The Master ERP terminal will authorize all modules based on your selected plan tier.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
