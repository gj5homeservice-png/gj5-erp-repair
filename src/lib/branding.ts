// Centralized company-logo helpers. The single source of truth for the
// logo everywhere in the authenticated app is store.companyProfile.logoUrl
// (Settings > Business Profile > Company Logo — already persisted via the
// app's existing company-profile save path). Nothing here stores a second
// copy of "the logo" as business data; BRAND_LOGO_CACHE_KEY is a device-only
// display convenience for the pre-login screen, which has no session yet
// and therefore no companyProfile to read.

const BRAND_LOGO_CACHE_KEY = 'gj5_brand_logo';

// The file Next.js's App Router auto-serves at /favicon.ico from
// src/app/favicon.ico — the browser tab icon whenever no company logo has
// been saved yet. Never regenerated or replaced on disk; the dynamic
// override below only ever points the <link> at this or the real saved
// logo, nothing else.
const DEFAULT_FAVICON_HREF = '/favicon.ico';

// Called whenever the real company profile is saved, so this device's login
// screen can keep showing the current logo before anyone signs in.
export function setBrandLogoCache(logoUrl: string) {
  if (typeof window === 'undefined') return;
  try {
    if (logoUrl) localStorage.setItem(BRAND_LOGO_CACHE_KEY, logoUrl);
    else localStorage.removeItem(BRAND_LOGO_CACHE_KEY);
  } catch { /* localStorage unavailable — pre-login branding just falls back */ }
  applyFavicon(logoUrl || null);
}

export function getBrandLogoCache(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(BRAND_LOGO_CACHE_KEY) || null;
  } catch {
    return null;
  }
}

// Swaps the browser tab icon to the exact saved logo asset (a data: URL —
// no network fetch, no caching quirks, updates the instant it's set), or
// back to the real favicon.ico file when there's no logo. Uses whatever
// <link rel="icon"> Next.js already rendered from src/app/favicon.ico if
// present, or creates one — either way this is the one place in the app
// that ever touches it, so nothing else needs to know this exists.
function applyFavicon(logoUrl: string | null) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  const match = logoUrl ? /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(logoUrl) : null;
  if (match) {
    link.type = match[1];
    link.href = logoUrl as string;
  } else {
    link.removeAttribute('type');
    link.href = DEFAULT_FAVICON_HREF;
  }
}

// Applies whatever logo (if any) is already cached on this device — call
// once on initial load of any page so the tab icon is correct immediately,
// before any session/companyProfile has loaded (or on pages, like login,
// that never will).
export function applyFaviconFromCache() {
  applyFavicon(getBrandLogoCache());
}

// Parses a data: URL (what every logo upload in this app produces, via
// FileReader.readAsDataURL) into the format string jsPDF's addImage expects.
// Returns null for anything jsPDF can't embed (e.g. a remote http(s) URL, or
// an unsupported format like SVG/WEBP) so callers can skip the image rather
// than let jsPDF throw and abort the whole document.
function jsPdfImageFormat(dataUrl: string): 'PNG' | 'JPEG' | null {
  const match = /^data:image\/(png|jpe?g);base64,/i.exec(dataUrl);
  if (!match) return null;
  return match[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG';
}

// Draws the company logo into a jsPDF document at the given position/size.
// Silently does nothing (returns false) if there's no logo, or its format
// isn't one jsPDF can embed — every call site already renders correctly
// without a logo today, so this is purely additive and never throws.
export function addLogoToPdf(doc: any, logoUrl: string | null | undefined, x: number, y: number, w: number, h: number): boolean {
  if (!logoUrl) return false;
  const format = jsPdfImageFormat(logoUrl);
  if (!format) return false;
  try {
    doc.addImage(logoUrl, format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}
