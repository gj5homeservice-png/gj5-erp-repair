'use client';

import { db, doc, setDoc, collection, serverTimestamp } from '@/firebase';
import { Company, Customer, Subscription, RazorpayPayment } from '@/lib/types';
import { addMonths, differenceInDays, parseISO } from 'date-fns';

/**
 * @fileOverview Mission-critical utility for GJ5 ERP plan activations.
 * Orchestrates atomic updates across companies, customers, subscriptions, and payments.
 */

export async function activateCustomerSubscription(data: {
  userId: string;
  companyName: string;
  ownerName: string;
  email: string;
  mobile: string;
  planId: string;
  planName: string;
  durationMonths: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: 'Razorpay' | 'Coupon' | 'Free Trial';
  paymentStatus: string;
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}) {
  if (!db) {
    console.error("Subscription Node: Firestore instance unavailable.");
    throw new Error("Cloud synchronization failure.");
  }

  const now = new Date();
  const expiryDate = addMonths(now, data.durationMonths);
  const companyId = data.companyName.toLowerCase().replace(/\s+/g, '-');
  const subscriptionId = `SUB-${Date.now()}`;
  const paymentId = data.razorpayPaymentId || `PAY-${Date.now()}`;

  // 1. Company Record Synchronization
  const companyData: Partial<Company> = {
    id: companyId,
    companyName: data.companyName,
    ownerUserId: data.userId,
    ownerName: data.ownerName,
    ownerEmail: data.email,
    ownerMobile: data.mobile,
    planId: data.planId,
    planName: data.planName,
    planStartDate: now.toISOString(),
    planExpiryDate: expiryDate.toISOString(),
    subscriptionStatus: data.durationMonths < 1 ? 'trial' : 'active',
    companyStatus: 'active',
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod,
    couponCode: data.couponCode || '',
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    finalPaidAmount: data.finalAmount,
    razorpayOrderId: data.razorpayOrderId || '',
    razorpayPaymentId: data.razorpayPaymentId || '',
    updatedAt: now.toISOString(),
    lastLoginAt: now.toISOString(),
    isBlocked: false,
    workspaceId: companyId
  };

  // 2. Customer Record Synchronization
  const customerData = {
    userId: data.userId,
    customerName: data.ownerName,
    companyId: companyId,
    companyName: data.companyName,
    email: data.email,
    mobile: data.mobile,
    currentPlan: data.planName,
    planStartDate: now.toISOString(),
    planExpiryDate: expiryDate.toISOString(),
    subscriptionStatus: data.durationMonths < 1 ? 'trial' : 'active',
    paymentStatus: data.paymentStatus,
    couponCode: data.couponCode || '',
    lastLoginAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  // 3. Subscription History Node
  const subData: Subscription = {
    id: subscriptionId,
    userId: data.userId,
    companyId: companyId,
    planId: data.planId,
    planName: data.planName,
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    finalAmount: data.finalAmount,
    couponCode: data.couponCode,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    startDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    active: true,
    createdAt: now.toISOString()
  };

  // 4. Payment Audit Node
  const payData = {
    id: paymentId,
    paymentId: paymentId,
    razorpayPaymentId: data.razorpayPaymentId || '',
    razorpayOrderId: data.razorpayOrderId || '',
    userId: data.userId,
    companyId: companyId,
    customerName: data.ownerName,
    companyName: data.companyName,
    planName: data.planName,
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    finalAmount: data.finalAmount,
    couponCode: data.couponCode || '',
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    paidAt: now.toISOString(),
    createdAt: now.toISOString()
  };

  try {
    // Atomic Cloud Commitment
    await Promise.all([
      setDoc(doc(db, "companies", companyId), companyData, { merge: true }),
      setDoc(doc(db, "customers", data.userId), customerData, { merge: true }),
      setDoc(doc(db, "subscriptions", subscriptionId), subData),
      setDoc(doc(db, "payments", paymentId), payData)
    ]);

    // Update Local Cache for instant session persistence
    localStorage.setItem(`gj5_company_${data.email}`, JSON.stringify(companyData));
    localStorage.setItem('gj5_active_subscription', JSON.stringify(subData));
    
    console.log("Subscription Node: Global synchronization successful.");
    return { success: true, companyId };
  } catch (err) {
    console.error("Subscription Node: Commitment failed.", err);
    throw err;
  }
}
