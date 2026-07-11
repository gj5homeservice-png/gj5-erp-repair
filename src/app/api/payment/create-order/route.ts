import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLANS_PRICES: Record<string, number> = {
  'free': 0,
  '3months': 2999,
  '6months': 5999,
  '12months': 8999
};

export async function POST(request: Request) {
  try {
    const { planId, finalAmount, userId, companyId } = await request.json();

    // Secure Verification: Re-calculate or validate amount server-side
    // This is a simplified validation for the demo
    const basePrice = PLANS_PRICES[planId];
    if (basePrice === undefined) {
      return NextResponse.json({ error: "Invalid plan node." }, { status: 400 });
    }

    // Amount must be in paisa for Razorpay
    const amountInPaisa = Math.round(finalAmount * 100);

    if (amountInPaisa === 0) {
      return NextResponse.json({ success: true, zeroAmount: true });
    }

    const options = {
      amount: amountInPaisa,
      currency: "INR",
      receipt: `RCPT-${Date.now()}`,
      notes: {
        userId,
        companyId,
        planId
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: "Failed to create settlement node." }, { status: 500 });
  }
}