"use client"

import { useCallback, useEffect, useState } from 'react';

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
const STORAGE_KEY = 'gj5_admin_theme';
export type AdminTheme = 'dark' | 'light';

function readStoredTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>('dark');

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  useEffect(() => {
    document.body.classList.add('gj5-admin-active');
    document.body.classList.toggle('dark', theme === 'dark');
    return () => {
      document.body.classList.remove('gj5-admin-active', 'dark');
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
