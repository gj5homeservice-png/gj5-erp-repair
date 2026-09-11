"use client"

// Client-side customer-session helpers for the public repair-booking
// website. Deliberately uses DIFFERENT localStorage keys from the ERP's own
// (`gj5_auth_token` / `gj5_active_user`, checked by AuthGuard.tsx) so a
// customer being logged in in the same browser can never be mistaken for a
// staff session, or vice versa — the two coexist independently.
const TOKEN_KEY = 'gj5_customer_token';
const ID_KEY = 'gj5_customer_id';
const NAME_KEY = 'gj5_customer_name';

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setCustomerSession(token: string, id: string, name: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ID_KEY, id);
  localStorage.setItem(NAME_KEY, name);
}

export function clearCustomerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getCustomerName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

export async function customerApiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getCustomerToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.error || `Request to ${path} failed`);
  }
  return json;
}
