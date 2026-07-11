
'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./config";

// Initialize only if config is present
let app;
let auth: any;
let db: any;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase Initialization Critical Failure:", error);
  }
}

export { 
  app, 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
  writeBatch,
  isFirebaseConfigured
};
