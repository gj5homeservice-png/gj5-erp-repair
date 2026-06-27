
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
    
    setLoading(false);
    
    // Public routes that don't need auth
    const publicRoutes = ['/', '/login', '/register', '/attendance'];
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || (route !== '/' && pathname.startsWith(route))
    );

    // Protected routes logic
    if (!token && !isPublicRoute) {
      router.push('/login');
    } else if (token && (pathname === '/login' || pathname === '/register')) {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-headline font-black italic text-white">G</div>
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Initializing Identity Node...</p>
      </div>
    );
  }

  return <>{children}</>;
}
