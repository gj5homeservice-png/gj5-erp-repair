
"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// There is now exactly one login page for the whole site
// (/customer/login — the same "Track My Repair" form tries customer, then
// owner, then employee credentials in turn). This route is kept as a thin
// redirect rather than deleted outright: AuthGuard.tsx and
// onboarding/page.tsx both still send visitors to "/login" by URL, and
// anyone with this page bookmarked should land on the real form instead of
// a 404.
export default function LoginRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customer/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#123C8C] animate-spin" />
    </div>
  );
}
