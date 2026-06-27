
"use client"

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Protect /admin routes
      if (!currentUser && pathname.startsWith('/admin')) {
        router.push('/login/');
      } else if (currentUser && pathname === '/login/') {
        router.push('/admin/');
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin" />
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Initializing Identity Node...</p>
      </div>
    );
  }

  // If not logged in and trying to access a protected page, show nothing (redirect handles it)
  if (!user && pathname.startsWith('/admin')) {
    return null;
  }

  return <>{children}</>;
}
