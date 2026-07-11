import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await request.json();

    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

    // Verify Signature Node
    const shasum = crypto.createHmac('sha256', key_secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: "Signature verification failure. Node compromised." }, { status: 400 });
    }

    // In a real app, you would perform Firestore updates here.
    // Since we are using client-side Firestore hooks, we will return success 
    // and let the client handle the persistence with the verified metadata.

    return NextResponse.json({ 
      success: true, 
      message: "Payment verified. Subscription authorized." 
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Internal security error." }, { status: 500 });
  }
}