'use client';

import { db, doc, setDoc, collection, runTransaction, getDoc, getDocs, query, where, Timestamp } from '@/firebase';
import { Company, Subscription } from '@/lib/types';
import { addMonths } from 'date-fns';

/**
 * @fileOverview Secure activation service for GJ5 ERP.
 * Handles both paid (Razorpay) and free (100% Coupon/Trial) plan logic atomically.
 */

export async function activateCustomerSubscription(data: any) {
  const requiredFields = [
    'userId', 'companyId', 'companyName', 'ownerName', 'email', 'planId', 
    'planName', 'durationMonths'
  ];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Activation Node Error: ${field} is missing.`);
    }
  }

  if (!db) {
    throw new Error("Cloud Registry Node Offline. Initialization failure.");
  }

  const now = new Date();
  const expiryDate = addMonths(now, data.durationMonths);
  const companyId = data.companyId;
  const subscriptionId = `SUB-${Date.now()}`;
  const paymentId = data.razorpayPaymentId || `PAY-${Date.now()}`;

  const companyData: any = {
    id: companyId,
    companyName: data.companyName,
    ownerName: data.ownerName,
    ownerEmail: data.email,
    ownerMobile: data.mobile || '',
    planId: data.planId,
    planName: data.planName,
    planStartDate: now.toISOString(),
    planExpiryDate: expiryDate.toISOString(),
    subscriptionStatus: 'active',
    companyStatus: 'active',
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod,
    couponCode: data.couponCode || '',
    originalAmount: Number(data.originalAmount),
    discountAmount: Number(data.discountAmount),
    finalPaidAmount: Number(data.finalAmount),
    updatedAt: now.toISOString(),
    lastLoginAt: now.toISOString(),
    isBlocked: false,
    workspaceId: companyId,
    userId: data.userId
  };

  const subData: any = {
    id: subscriptionId,
    userId: data.userId,
    companyId: companyId,
    planId: data.planId,
    planName: data.planName,
    originalAmount: Number(data.originalAmount),
    discountAmount: Number(data.discountAmount),
    finalAmount: Number(data.finalAmount),
    couponCode: data.couponCode,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    startDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    active: true,
    createdAt: now.toISOString()
  };

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(doc(db, "companies", companyId), companyData, { merge: true });
      transaction.set(doc(db, "subscriptions", subscriptionId), subData);
      transaction.set(doc(db, "payments", paymentId), {
        id: paymentId,
        userId: data.userId,
        companyId,
        planName: data.planName,
        amount: Number(data.finalAmount) * 100,
        status: 'Captured',
        createdAt: now.toISOString(),
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode || ''
      });
    });

    localStorage.setItem(`gj5_company_${data.email}`, JSON.stringify(companyData));
    return { success: true, companyId };
  } catch (err: any) {
    console.error("Cloud Node Transaction Fault:", err);
    throw new Error(`Registry Commitment Failure: ${err.message}`);
  }
}

export async function activateFreeCouponSubscription(data: any) {
  if (!db) throw new Error("Firebase Service Node Offline.");

  const requiredFields = ['userId', 'companyId', 'companyName', 'ownerName', 'email', 'planId', 'couponCode'];
  for (const field of requiredFields) {
    if (!data[field]) throw new Error(`Handshake Fault: ${field} required.`);
  }

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Coupon Node Validation
      const q = query(collection(db, "coupons"), where("code", "==", data.couponCode.toUpperCase().trim()));
      const couponSnap = await getDocs(q);
      
      if (!couponSnap.empty) {
        const couponDoc = couponSnap.docs[0];
        const couponData = couponDoc.data();
        
        if (couponData.usedCount >= couponData.maxUses) {
          throw new Error("Promotion Identity has reached its usage limit.");
        }
        
        transaction.update(couponDoc.ref, { usedCount: (couponData.usedCount || 0) + 1 });
        
        const redemptionId = `RED-${Date.now()}`;
        transaction.set(doc(db, "couponRedemptions", redemptionId), {
          id: redemptionId,
          couponCode: data.couponCode,
          userId: data.userId,
          companyId: data.companyId,
          email: data.email,
          planName: data.planName,
          originalAmount: Number(data.originalAmount),
          discountAmount: Number(data.discountAmount),
          finalAmount: 0,
          redeemedAt: new Date().toISOString(),
          status: 'success'
        });
      }

      // 2. Identity & License Provisioning
      const now = new Date();
      const expiryDate = addMonths(now, data.durationMonths);
      const companyId = data.companyId;
      const subscriptionId = `SUB-${Date.now()}`;
      const paymentId = `PAY-FREE-${Date.now()}`;

      const companyData = {
        id: companyId,
        companyName: data.companyName,
        ownerName: data.ownerName,
        ownerEmail: data.email,
        ownerMobile: data.mobile || '',
        planId: data.planId,
        planName: data.planName,
        planStartDate: now.toISOString(),
        planExpiryDate: expiryDate.toISOString(),
        subscriptionStatus: 'active',
        companyStatus: 'active',
        paymentMethod: 'Coupon',
        paymentStatus: 'Fully Discounted',
        originalAmount: Number(data.originalAmount),
        discountAmount: Number(data.discountAmount),
        finalPaidAmount: 0,
        couponCode: data.couponCode,
        updatedAt: now.toISOString(),
        lastLoginAt: now.toISOString(),
        isBlocked: false,
        workspaceId: companyId,
        userId: data.userId,
        createdAt: now.toISOString()
      };

      const subData = {
        id: subscriptionId,
        userId: data.userId,
        companyId: companyId,
        planId: data.planId,
        planName: data.planName,
        durationMonths: data.durationMonths,
        originalAmount: Number(data.originalAmount),
        discountAmount: Number(data.discountAmount),
        finalAmount: 0,
        couponCode: data.couponCode,
        paymentMethod: 'Coupon',
        paymentStatus: 'Fully Discounted',
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        active: true,
        createdAt: now.toISOString()
      };

      transaction.set(doc(db, "companies", companyId), companyData, { merge: true });
      transaction.set(doc(db, "subscriptions", subscriptionId), subData);
      transaction.set(doc(db, "payments", paymentId), {
        id: paymentId,
        userId: data.userId,
        companyId,
        planName: data.planName,
        amount: 0,
        status: 'Captured',
        createdAt: now.toISOString(),
        paymentMethod: 'Coupon',
        couponCode: data.couponCode
      });

      return { success: true, companyId };
    });
  } catch (err: any) {
    console.error("Free Activation Atomic Fault:", err);
    throw new Error(err.message || "Failed to commit atomic license node.");
  }
}
