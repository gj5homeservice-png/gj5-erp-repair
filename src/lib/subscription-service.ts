
'use client';

import { db, doc, setDoc, collection, runTransaction } from '@/firebase';
import { Company, Subscription } from '@/lib/types';
import { addMonths } from 'date-fns';

/**
 * @fileOverview Secure activation service for GJ5 ERP.
 * Handles both paid (Razorpay) and free (100% Coupon/Trial) plan logic atomically.
 */

export async function activateCustomerSubscription(data: any) {
  // Validate Required Input Matrix
  const requiredFields = [
    'userId', 'companyName', 'ownerName', 'email', 'planId', 
    'planName', 'durationMonths'
  ];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field} is missing in activation request.`);
    }
  }

  if (!db) {
    throw new Error("Cloud Node Failure: Firestore instance unavailable. Verify environment config.");
  }

  const now = new Date();
  const expiryDate = addMonths(now, data.durationMonths);
  const companyId = data.companyId || data.companyName.toLowerCase().replace(/\s+/g, '-');
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

  // 2. Customer Profile
  const customerData = {
    userId: data.userId,
    customerName: data.ownerName,
    companyId: companyId,
    companyName: data.companyName,
    email: data.email,
    mobile: data.mobile || '',
    currentPlan: data.planName,
    planStartDate: now.toISOString(),
    planExpiryDate: expiryDate.toISOString(),
    subscriptionStatus: data.durationMonths < 1 ? 'trial' : 'active',
    paymentStatus: data.paymentStatus,
    couponCode: data.couponCode || '',
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

  try {
    await runTransaction(db, async (transaction) => {
      // Create/Update Company Node
      transaction.set(doc(db, "companies", companyId), companyData, { merge: true });
      
      // Create/Update Customer Profile
      transaction.set(doc(db, "customers", data.userId), customerData, { merge: true });
      
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

      // If coupon used, increment its usage node
      if (data.couponCode) {
        const couponQuery = query(collection(db, "coupons"), where("code", "==", data.couponCode.toUpperCase()));
        const couponSnap = await getDocs(couponQuery);
        if (!couponSnap.empty) {
          const couponDoc = couponSnap.docs[0];
          const currentCount = couponDoc.data().usedCount || 0;
          transaction.update(couponDoc.ref, { usedCount: currentCount + 1 });
        }
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
  return activateCustomerSubscription({
    ...data,
    paymentMethod: 'Coupon',
    paymentStatus: 'Fully Discounted',
    finalAmount: 0
  });
}
