"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Coupon } from '@/lib/types';
import { activateCustomerSubscription } from '@/lib/subscription-service';

const PLANS_DATA: Record<string, { price: number; label: string; months: number }> = {
  'free': { price: 0, label: 'Free Trial (7 Days)', months: 0.23 },
  '3months': { price: 2999, label: 'Starter Plan (3 Months)', months: 3 },
  '6months': { price: 5999, label: 'Growth Plan (6 Months)', months: 6 },
  '12months': { price: 8999, label: 'Master Plan (12 Months)', months: 12 }
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

  const currentPlan = PLANS_DATA[planId] || { price: 0, label: 'Invalid Plan', months: 0 };

  const calculations = useMemo(() => {
    const originalPrice = currentPlan.price;
    if (!appliedCoupon) return { originalPrice, discount: 0, finalPrice: originalPrice };

    let discount = 0;
    if (appliedCoupon.discountType === 'Percentage') {
      discount = (originalPrice * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }

    const finalPrice = Math.max(0, originalPrice - discount);
    return { originalPrice, discount, finalPrice };
  }, [appliedCoupon, currentPlan]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplying(true);
    setError('');

    // Demo / Static lookup - In production this would query Firestore 'coupons'
    const savedCoupons: Coupon[] = JSON.parse(localStorage.getItem('gj5_saas_coupons') || '[]');
    const coupon = savedCoupons.find(c => c.code === couponCode.toUpperCase());

    if (!coupon) {
      setError('Invalid promotion code.');
      setIsApplying(false);
      return;
    }

    setAppliedCoupon(coupon);
    setIsApplying(false);
    toast({ title: "Node Synchronized", description: `${coupon.code} applied.` });
  };

  const handleProcessPayment = async () => {
    setStatus('processing');

    const activeUser = localStorage.getItem('gj5_active_user') || 'DEMO-USER';
    const tempName = localStorage.getItem('gj5_temp_name') || 'Enterprise Owner';

    // 1. Check for Zero-Amount Settlement (100% Coupon or Free Trial)
    if (calculations.finalPrice === 0) {
      try {
        await activateCustomerSubscription({
          userId: activeUser,
          companyName: localStorage.getItem('gj5_temp_company_name') || 'New Company',
          ownerName: tempName,
          email: activeUser,
          mobile: localStorage.getItem('gj5_temp_mobile') || '',
          planId: planId,
          planName: currentPlan.label,
          durationMonths: currentPlan.months,
          originalAmount: calculations.originalPrice,
          discountAmount: calculations.discount,
          finalAmount: 0,
          paymentMethod: planId === 'free' ? 'Free Trial' : 'Coupon',
          paymentStatus: planId === 'free' ? 'No Payment Required' : 'Fully Discounted',
          couponCode: appliedCoupon?.code
        });
        setStatus('success');
      } catch (err) {
        toast({ variant: "destructive", title: "Activation Failed", description: "Node registry error." });
        setStatus('checkout');
      }
      return;
    }

    // 2. Razorpay Flow for Paid Plans
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          finalAmount: calculations.finalPrice,
          userId: activeUser
        })
      });

      const orderData = await res.json();
      if (orderData.error) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "GJ5 ERP",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              await activateCustomerSubscription({
                userId: activeUser,
                companyName: localStorage.getItem('gj5_temp_company_name') || 'New Company',
                ownerName: tempName,
                email: activeUser,
                mobile: localStorage.getItem('gj5_temp_mobile') || '',
                planId: planId,
                planName: currentPlan.label,
                durationMonths: currentPlan.months,
                originalAmount: calculations.originalPrice,
                discountAmount: calculations.discount,
                finalAmount: calculations.finalPrice,
                paymentMethod: 'Razorpay',
                paymentStatus: 'Paid',
                couponCode: appliedCoupon?.code,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id
              });
              setStatus('success');
            } else {
              throw new Error("Security verification failed.");
            }
          } catch (e: any) {
            toast({ variant: "destructive", title: "Auth Error", description: e.message });
            setStatus('checkout');
          }
        },
        theme: { color: "#123C8C" },
        modal: { ondismiss: () => setStatus('checkout') }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gateway Error", description: err.message });
      setStatus('checkout');
    }
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
              <Button 
                onClick={() => router.push('/onboarding')} 
                className="w-full h-14 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-headline font-bold text-lg text-white shadow-xl shadow-blue-900/20"
              >
                Configure Workspace <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                       <h3 className="text-xl font-headline font-black text-white uppercase">{currentPlan.label}</h3>
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Plan Lifecycle Entry</p>
                    </div>
                    <div className="ml-auto text-right">
                       <span className="text-2xl font-headline font-black text-white">₹{calculations.originalPrice.toLocaleString()}</span>
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
                    {appliedCoupon && (
                      <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Gift className="w-5 h-5 text-emerald-500" />
                            <div>
                               <p className="text-[10px] font-black text-emerald-500 uppercase">{appliedCoupon.name}</p>
                            </div>
                         </div>
                         <Badge className="bg-emerald-500/10 text-emerald-400">-{appliedCoupon.discountValue}{appliedCoupon.discountType === 'Percentage' ? '%' : '₹'}</Badge>
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
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
                    <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                       <p className="text-xs font-black text-white uppercase tracking-widest">Net Payable</p>
                       <span className="text-4xl font-headline font-black text-blue-500">₹{calculations.finalPrice.toLocaleString()}</span>
                    </div>
                 </div>

                 <Button 
                   onClick={handleProcessPayment}
                   className="w-full h-16 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-headline font-bold text-lg uppercase shadow-xl"
                 >
                    Authorize Settlement <ChevronRight className="w-6 h-6 ml-2" />
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
