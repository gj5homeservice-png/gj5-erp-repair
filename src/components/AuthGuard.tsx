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
    
    // Protected routes logic
    if (!token && !pathname.includes('/login/')) {
      router.push('/login/');
    } else if (token && pathname.includes('/login/')) {
      router.push('/');
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin" />
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Initializing Identity Node...</p>
      </div>
    );
  }

  return <>{children}</>;
}
