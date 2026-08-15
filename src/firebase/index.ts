'use client';

/**
 * @fileOverview Firebase Initialization.
 * Exports the initialization function and all specialized hooks for Firestore and Auth.
 */

import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

export function initializeFirebase() {
  if (!isFirebaseConfigured) {
    return { app: null, firestore: null, auth: null };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig as FirebaseOptions);
    } else {
      app = getApps()[0];
    }
    
    firestore = getFirestore(app);
    auth = getAuth(app);

    return { app, firestore, auth };
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    return { app: null, firestore: null, auth: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export { Timestamp, serverTimestamp, doc, setDoc, updateDoc, getDoc, runTransaction, collection, query, where, getDocs, onSnapshot, orderBy, writeBatch } from 'firebase/firestore';
