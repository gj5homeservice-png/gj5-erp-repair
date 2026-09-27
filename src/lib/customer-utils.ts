// Pure helpers shared by the customer backend and its UI — no DB, no React.

export const CUSTOMER_ID_PREFIX = 'CUST-';

export const formatCustomerId = (n: number) => `${CUSTOMER_ID_PREFIX}${n}`;

// Accepts "CUST-1001", "cust-1001", or bare "1001" typed into a quick-search
// box — every caller that resolves a typed value to an exact Customer ID
// goes through this so the behavior is identical everywhere (spec: "Customer
// ID should become the primary human-friendly identifier... resolve
// consistently throughout the application").
export function normalizeCustomerIdInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[0-9]+$/.test(trimmed)) return formatCustomerId(Number(trimmed));
  const m = trimmed.match(/^cust-?([0-9]+)$/i);
  if (m) return formatCustomerId(Number(m[1]));
  return null;
}

export const isNewFormatCustomerId = (id: string) => /^CUST-[0-9]+$/.test(id);

export const normalizeMobile = (v: string | null | undefined) => (v || '').replace(/\D/g, '');

// India-only (this app has no other-country customers today, matching the
// existing tel:/wa.me links already hardcoded to +91 elsewhere in the app —
// see RepairingModule.tsx / CustomerProfileModal.tsx). A 10-digit number
// gets +91 prepended; anything already carrying a country code is left as-is.
export function toE164India(mobile: string | null | undefined): string | null {
  const digits = normalizeMobile(mobile);
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export function buildTelLink(mobile: string | null | undefined): string | null {
  const e164 = toE164India(mobile);
  return e164 ? `tel:+${e164}` : null;
}

export function buildWhatsAppLink(mobile: string | null | undefined, message?: string): string | null {
  const e164 = toE164India(mobile);
  if (!e164) return null;
  const base = `https://wa.me/${e164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const WHATSAPP_TEMPLATES = (companyName: string, customerName: string) => [
  { label: 'Greeting', text: `Hello ${customerName}, this is ${companyName}.` },
  { label: 'Payment Reminder', text: `Hello ${customerName}, this is a reminder from ${companyName} regarding your pending payment. Please let us know a convenient time to settle it.` },
  { label: 'Service Update', text: `Hello ${customerName}, this is ${companyName} with an update on your service request.` },
  { label: 'Thank You', text: `Hello ${customerName}, thank you for choosing ${companyName}!` },
];

// "CUST-1001 / Jay Patel" — the one display format used everywhere a
// customer is shown (search results, pickers, tables, print/export).
export const formatCustomerLabel = (id: string, name?: string | null) => (name ? `${id} / ${name}` : id);
