'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, firestore, auth } = useMemo(() => initializeFirebase(), []);

  // If Firebase is not yet configured, render children without the provider
  // to avoid crashing the app with invalid credentials.
  if (!app || !firestore || !auth) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider app={app} firestore={firestore} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
