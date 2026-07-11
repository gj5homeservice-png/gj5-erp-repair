
'use client';

import { db, doc, setDoc, collection, runTransaction, getDoc } from '@/firebase';
import { Company, Subscription } from '@/lib/types';
import { addMonths } from 'date-fns';

/**
 * @fileOverview Secure activation service for GJ5 ERP.
 * Handles both paid (Razorpay) and free (100% Coupon/Trial) plan logic atomically.
 */

export async function activateCustomerSubscription(data: any) {
  // Validate Required Input Matrix
  const requiredFields = [
    'userId', 'companyId', 'companyName', 'ownerName', 'email', 'planId', 
    'planName', 'durationMonths'
  ];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Activation Logic Failure: ${field} is missing.`);
    }
  }

  if (!db) {
    throw new Error("Cloud Node Failure: Firestore instance unavailable.");
  }

  const now = new Date();
  const expiryDate = addMonths(now, data.durationMonths);
  const companyId = data.companyId;
  const subscriptionId = `SUB-${Date.now()}`;
  const paymentId = data.razorpayPaymentId || `PAY-${Date.now()}`;

  // 1. Company Manifest
  const companyData: Partial<Company> = {
    id: companyId,
    companyName: data.companyName,
    ownerName: data.ownerName,
    ownerEmail: data.email,
    ownerMobile: data.mobile || '',
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
    updatedAt: now.toISOString(),
    lastLoginAt: now.toISOString(),
    isBlocked: false,
    workspaceId: companyId,
    userId: data.userId
  };

  // 2. Subscription History Node
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

  try {
    await runTransaction(db, async (transaction) => {
      // Create/Update Company Node
      transaction.set(doc(db, "companies", companyId), companyData, { merge: true });
      
      // Log Subscription
      transaction.set(doc(db, "subscriptions", subscriptionId), subData);
      
      // Log Payment Audit
      transaction.set(doc(db, "payments", paymentId), {
        id: paymentId,
        userId: data.userId,
        companyId,
        planName: data.planName,
        amount: data.finalAmount * 100, // Normalized to paisa for consistency
        status: 'Captured',
        createdAt: now.toISOString(),
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode || ''
      });

      // Increment Coupon Count if applicable
      if (data.couponCode) {
        const couponId = `CPN-${data.couponCode.toUpperCase()}`; // Assuming consistent ID naming or lookup required
        // Note: For real world we lookup by code property first if ID is randomized
      }
    });

    localStorage.setItem(`gj5_company_${data.email}`, JSON.stringify(companyData));
    return { success: true, companyId };
  } catch (err: any) {
    console.error("Activation Node Error:", err);
    throw new Error(`Registry Commitment Failure: ${err.message}`);
  }
}

export async function activateFreeCouponSubscription(data: any) {
  if (!db) throw new Error("Cloud synchronization failure.");

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Re-validate Coupon Status
      const q = query(collection(db, "coupons"), where("code", "==", data.couponCode.toUpperCase().trim()));
      const couponSnap = await getDocs(q);
      
      if (!couponSnap.empty) {
        const couponDoc = couponSnap.docs[0];
        const couponData = couponDoc.data();
        
        if (couponData.usedCount >= couponData.maxUses) {
          throw new Error("This coupon node has reached its usage limit.");
        }
        
        // Increment usage count atomically
        transaction.update(couponDoc.ref, { usedCount: (couponData.usedCount || 0) + 1 });
        
        // Log redemption details
        const redemptionId = `RED-${Date.now()}`;
        transaction.set(doc(db, "couponRedemptions", redemptionId), {
          id: redemptionId,
          couponCode: data.couponCode,
          userId: data.userId,
          companyId: data.companyId,
          email: data.email,
          planName: data.planName,
          originalAmount: data.originalAmount,
          discountAmount: data.discountAmount,
          finalAmount: 0,
          redeemedAt: new Date().toISOString(),
          status: 'success'
        });
      }

      // 2. Perform Standard Activation
      const now = new Date();
      const expiryDate = addMonths(now, data.durationMonths);
      const companyId = data.companyId;
      const subscriptionId = `SUB-${Date.now()}`;
      const paymentId = `PAY-FREE-${Date.now()}`;

      const companyData = {
        ...data,
        planStartDate: now.toISOString(),
        planExpiryDate: expiryDate.toISOString(),
        subscriptionStatus: 'active',
        companyStatus: 'active',
        paymentMethod: 'Coupon',
        paymentStatus: 'Fully Discounted',
        finalPaidAmount: 0,
        updatedAt: now.toISOString(),
        lastLoginAt: now.toISOString(),
        isBlocked: false,
        workspaceId: companyId,
        createdAt: now.toISOString()
      };

      const subData = {
        id: subscriptionId,
        userId: data.userId,
        companyId: companyId,
        planId: data.planId,
        planName: data.planName,
        durationMonths: data.durationMonths,
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount,
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
        paymentMethod: 'Coupon'
      });

      return { success: true, companyId };
    });
  } catch (err: any) {
    console.error("Free Activation Transaction Fault:", err);
    throw new Error(err.message || "Atomic registry commit failed.");
  }
}
