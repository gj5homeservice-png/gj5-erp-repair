"use client"

import { useCallback, useEffect, useRef, useState } from 'react';

// Admin-only light/dark theme toggle. Deliberately does NOT touch <html> —
// the public customer-facing site (book-repair, customer/login, etc.) is
// already its own consistently light design and never uses a `dark:`
// variant or any of the overrides in globals.css, so a global class would
// do nothing there but would be one more thing that could leak between the
// two apps that happen to live in one Next.js project. Instead this scopes
// both the `dark` class AND a `gj5-admin-active` marker onto <body> only
// while the admin dashboard is actually mounted, and removes both on
// unmount — see the `body.gj5-admin-active` rules in globals.css. Scoping
// on <body> (not a wrapper div) is required so Radix's portaled content
// (Select/Dialog/Toast, which render outside the dashboard's own DOM
// subtree, appended directly to <body>) is still reached by the theme.
//
// The same body classes are also applied before first paint by the inline
// script in src/app/layout.tsx (it reads THEME_STORAGE_KEY), so a
// Light-mode user never sees a dark flash while React hydrates.
export const THEME_STORAGE_KEY = 'gj5_admin_theme';
// Holds the chosen theme while that choice has NOT yet been confirmed saved
// on the server, and is cleared once it is. While it is set, a server value
// that disagrees is a stale one and must not override what the user just
// picked — that override is what used to snap the toggle straight back to
// dark within ~40 ms whenever the settings save failed or lost a race with
// an in-flight refresh.
const PENDING_KEY = 'gj5_admin_theme_pending';
export type AdminTheme = 'dark' | 'light';

function readTheme(key: string): AdminTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(key);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function writeTheme(key: string, value: AdminTheme | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked — in-memory state still works for this session */ }
}

// `serverTheme` is the account's saved preference from MySQL. Pass null until
// it has actually been loaded — NOT a placeholder default: a default arriving
// before the real value used to overwrite the stored local choice on every
// page load. `onPersist` saves a toggle server-side and should resolve true
// on success (false / a rejection = not saved).
export function useAdminTheme(
  serverTheme?: AdminTheme | null,
  onPersist?: (theme: AdminTheme) => Promise<boolean> | void,
) {
  const [theme, setThemeState] = useState<AdminTheme>('dark');
  const themeRef = useRef<AdminTheme>('dark');
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;

  const applyTheme = useCallback((next: AdminTheme) => {
    themeRef.current = next;
    setThemeState(next);
    writeTheme(THEME_STORAGE_KEY, next);
  }, []);

  const persist = useCallback((next: AdminTheme) => {
    const save = onPersistRef.current;
    if (!save) return;
    writeTheme(PENDING_KEY, next);
    Promise.resolve(save(next))
      .then((ok) => {
        if (ok === true && readTheme(PENDING_KEY) === next) writeTheme(PENDING_KEY, null);
      })
      .catch(() => { /* stays pending; retried on the next load */ });
  }, []);

  // First client render: adopt this device's own last choice.
  useEffect(() => {
    const stored = readTheme(THEME_STORAGE_KEY);
    if (stored) applyTheme(stored);
  }, [applyTheme]);

  // Once the real server value has loaded, reconcile it with the local one.
  // "Confirmed" is decided ONLY by persist() below (the save resolving true) —
  // never by serverTheme merely equalling the pending value, since an
  // optimistic local update makes the store's value change before the server
  // has actually agreed to anything.
  const retriedPendingRef = useRef(false);
  useEffect(() => {
    if (!serverTheme) return;
    const pending = readTheme(PENDING_KEY);
    if (pending) {
      // The user's own choice hasn't been confirmed saved yet (the save failed,
      // or its refresh is still in flight): it wins over whatever the server
      // currently says. Retry the save once per page load.
      if (themeRef.current !== pending) applyTheme(pending);
      if (!retriedPendingRef.current) {
        retriedPendingRef.current = true;
        persist(pending);
      }
      return;
    }
    if (themeRef.current !== serverTheme) applyTheme(serverTheme);
  }, [serverTheme, applyTheme, persist]);

  useEffect(() => {
    document.body.classList.add('gj5-admin-active');
    document.body.classList.toggle('dark', theme === 'dark');
    return () => {
      document.body.classList.remove('gj5-admin-active', 'dark');
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: AdminTheme = themeRef.current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    persist(next);
  }, [applyTheme, persist]);

  return { theme, toggleTheme };
}
