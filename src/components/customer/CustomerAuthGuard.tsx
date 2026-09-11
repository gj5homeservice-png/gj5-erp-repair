"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCustomerToken } from '@/lib/customer-client';

// The customer-portal mirror of src/components/AuthGuard.tsx, checking the
// customer-only localStorage key rather than the ERP's gj5_auth_token — the
// two are never the same value, so being logged in as one never implies
// anything about the other.
export function CustomerAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      router.replace('/customer/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#123C8C] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
