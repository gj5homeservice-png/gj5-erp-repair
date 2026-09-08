"use client"

import { useEffect } from 'react';
import { applyFaviconFromCache } from '@/lib/branding';

// Applies the device's cached company logo (see branding.ts) as the browser
// tab icon on first paint of any page — including login, before a session
// exists. Once inside the authenticated app, useErpStore keeps the cache
// (and therefore the favicon) in sync with the live companyProfile.logoUrl
// as it loads or changes; this component only handles the initial apply.
export function DynamicFavicon() {
  useEffect(() => {
    applyFaviconFromCache();
  }, []);

  return null;
}
