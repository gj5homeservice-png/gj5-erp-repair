// Centralized company-logo helpers. The single source of truth for the
// logo everywhere in the authenticated app is store.companyProfile.logoUrl
// (Settings > Business Profile > Company Logo — already persisted via the
// app's existing company-profile save path). Nothing here stores a second
// copy of "the logo" as business data; BRAND_LOGO_CACHE_KEY is a device-only
// display convenience for the pre-login screen, which has no session yet
// and therefore no companyProfile to read.

const BRAND_LOGO_CACHE_KEY = 'gj5_brand_logo';

// Called whenever the real company profile is saved, so this device's login
// screen can keep showing the current logo before anyone signs in.
export function setBrandLogoCache(logoUrl: string) {
  if (typeof window === 'undefined') return;
  try {
    if (logoUrl) localStorage.setItem(BRAND_LOGO_CACHE_KEY, logoUrl);
    else localStorage.removeItem(BRAND_LOGO_CACHE_KEY);
  } catch { /* localStorage unavailable — pre-login branding just falls back */ }
}

export function getBrandLogoCache(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(BRAND_LOGO_CACHE_KEY) || null;
  } catch {
    return null;
  }
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
