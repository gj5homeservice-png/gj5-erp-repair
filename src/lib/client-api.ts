// Shared client-side fetch helper for calling authenticated API routes
// outside of useErpStore's own SWR-backed data layer (e.g. the Login &
// Security settings screen, which manages its own auth/session/passkey
// state rather than ERP business data). Mirrors the identical token +
// Authorization header pattern already used internally by
// src/hooks/use-erp-store.ts's own apiFetch.

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
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
