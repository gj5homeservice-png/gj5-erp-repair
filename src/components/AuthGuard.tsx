"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert, Zap, Lock } from 'lucide-react';
import { isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { db, doc, getDoc } from '@/firebase';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('gj5_auth_token');
        const activeUser = localStorage.getItem('gj5_active_user');
        
        const publicRoutes = ['/', '/login', '/register', '/attendance', '/plans', '/payment', '/onboarding'];
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || (route !== '/' && pathname.startsWith(route))
        );

        if (!token && !isPublicRoute) {
          router.push('/login');
          return;
        }

        // Subscription Integrity Verification (Cloud-First)
        if (token && !isPublicRoute && activeUser) {
          // Special path for Super Admin bypass
          if (pathname.startsWith('/super-admin')) {
             setLoading(false);
             return;
          }

          if (db) {
            const companyKey = `gj5_company_${activeUser}`;
            const cached = localStorage.getItem(companyKey);
            let companyId = '';
            if (cached) companyId = JSON.parse(cached).id;

            if (companyId) {
              const snap = await getDoc(doc(db, "companies", companyId));
              if (snap.exists()) {
                const data = snap.data();
                if (data.isBlocked) {
                  setIsBlocked(true);
                  setLoading(false);
                  return;
                }
                if (data.planExpiryDate && isBefore(parseISO(data.planExpiryDate), new Date())) {
                  setIsExpired(true);
                  setLoading(false);
                  return;
                }
              }
            }
          }
        }

        if (token && (pathname === '/login' || pathname === '/register')) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error("Auth Node: Verification Failure.", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Initializing Identity Node...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-16 h-16 text-rose-500 mb-8" />
        <h2 className="text-3xl font-headline font-black text-white uppercase">Access Restricted</h2>
        <p className="text-slate-400 text-sm max-w-sm mt-4">Your enterprise node has been blocked by system administration.</p>
        <Button variant="ghost" onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="mt-8 text-slate-500">Terminate Session</Button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-8" />
        <h2 className="text-3xl font-headline font-black text-white uppercase italic">License Expired</h2>
        <p className="text-slate-400 text-sm max-w-sm mt-4">Subscription node lifecycle end. Renewal mandatory.</p>
        <div className="grid grid-cols-1 gap-4 mt-12 w-full max-w-xs">
           <Button onClick={() => router.push('/plans')} className="h-14 bg-[#0066FF] hover:bg-blue-600 rounded-2xl font-black uppercase text-xs">
              <Zap className="w-4 h-4 mr-2" /> Renew License Node
           </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
