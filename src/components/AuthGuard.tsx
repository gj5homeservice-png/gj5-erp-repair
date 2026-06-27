"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Local session check
    const token = localStorage.getItem('gj5_auth_token');
    const activeUser = localStorage.getItem('gj5_active_user');
    
    // Check if onboarding is completed for this user
    const hasOnboarding = activeUser ? localStorage.getItem(`gj5_company_${activeUser}`) : null;
    
    // Public routes that don't need auth
    const publicRoutes = ['/', '/login', '/register', '/attendance', '/plans', '/payment', '/onboarding'];
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || (route !== '/' && pathname.startsWith(route))
    );

    // Protected routes logic
    if (!token && !isPublicRoute) {
      router.push('/login');
    } else if (token && activeUser && !hasOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    } else if (token && (pathname === '/login' || pathname === '/register')) {
      // If already logged in and try to go to login, send to dashboard
      router.push('/dashboard');
    }
    
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Initializing Identity Node...</p>
      </div>
    );
  }

  return <>{children}</>;
}
