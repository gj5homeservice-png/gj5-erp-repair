"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

export default function RootEntry() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('gj5_auth_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-5 h-5 text-blue-500 opacity-40" />
        </div>
      </div>
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Loading GJ5 Home Service Console...</p>
    </div>
  );
}
