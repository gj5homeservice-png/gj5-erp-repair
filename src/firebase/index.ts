'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, deleteDoc, setDoc, collection, updateDoc, query, where, getDocs } from "firebase/firestore";
import { firebaseConfig } from "./config";

// Initialize Firebase only if an app doesn't already exist to prevent redundant instances
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs
};

export function initializeFirebase() {
  return { app, auth, db };
}
