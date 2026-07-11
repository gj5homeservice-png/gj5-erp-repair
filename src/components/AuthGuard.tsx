
"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert, Zap, Lock } from 'lucide-react';
import { isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("Auth Node: Verifying Identity Integrity...");
    
    // Fail-safe Timeout
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth Node: Security Handshake Timeout. Proceeding with Fallback...");
        setLoading(false);
      }
    }, 10000);

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('gj5_auth_token');
        const activeUser = localStorage.getItem('gj5_active_user');
        const hasOnboarding = activeUser ? localStorage.getItem(`gj5_company_${activeUser}`) : null;
        
        const publicRoutes = ['/', '/login', '/register', '/attendance', '/plans', '/payment', '/onboarding'];
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || (route !== '/' && pathname.startsWith(route))
        );

        console.log("Auth Node: Session status", token ? "ACTIVE" : "NONE", "| Path", pathname);

        // Subscription Validity Check
        if (token && !isPublicRoute) {
          const subData = localStorage.getItem('gj5_active_subscription');
          if (subData) {
            const sub = JSON.parse(subData);
            if (isBefore(parseISO(sub.expiryDate), new Date())) {
              console.warn("Auth Node: License Node Expired.");
              setIsExpired(true);
              setLoading(false);
              return;
            }
          } else {
            console.warn("Auth Node: No active subscription found for secure route.");
            router.push('/plans');
            return;
          }
        }

        if (!token && !isPublicRoute) {
          router.push('/login');
        } else if (token && activeUser && !hasOnboarding && pathname !== '/onboarding') {
          router.push('/onboarding');
        } else if (token && (pathname === '/login' || pathname === '/register')) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error("Auth Node: Critical Failure during Handshake.", err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Lock className="w-5 h-5 text-blue-500 opacity-40" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Initializing Identity Node...</p>
          <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest mt-1">Verifying Multi-Tenant Manifest</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-[2.5rem] bg-rose-600/10 border-2 border-rose-600/30 flex items-center justify-center mb-8">
           <ShieldAlert className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-3xl font-headline font-black text-white uppercase italic tracking-tighter">License Node Expired</h2>
        <p className="text-slate-400 text-sm max-w-sm mt-4 leading-relaxed font-medium uppercase tracking-widest">Your enterprise node subscription has reached its lifecycle end. Renewal is required to unlock the ERP matrix.</p>
        
        <div className="grid grid-cols-1 gap-4 mt-12 w-full max-w-xs">
           <Button onClick={() => router.push('/plans')} className="h-14 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/20">
              <Zap className="w-4 h-4 mr-2" /> Renew License Node
           </Button>
           <Button variant="ghost" onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="text-slate-500 font-bold uppercase text-[10px]">
              Terminate Session
           </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
