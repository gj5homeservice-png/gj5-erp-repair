"use client"

import React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// The one place that decides what renders when a company logo is present vs
// absent, so every header/sidebar/label/print preview in the app shows the
// exact same thing instead of each hardcoding its own fallback image. Never
// resolves the logo itself — callers pass whatever they already read from
// store.companyProfile.logoUrl (or, pre-login, the device brand-logo cache).
export function CompanyLogo({
  src,
  alt = 'Company Logo',
  className,
  iconClassName,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={cn('object-contain', className)} />;
  }
  return (
    <div className={cn('flex items-center justify-center bg-slate-100', className)}>
      <Building2 className={cn('text-slate-400 w-1/2 h-1/2', iconClassName)} />
    </div>
  );
}
