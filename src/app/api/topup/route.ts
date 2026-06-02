
import { NextResponse } from 'next/server';

/**
 * Demo API Route for Wallet Top-Up
 * In production, this would integrate with Razorpay, Stripe, or PayTM.
 */
export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid top-up amount" },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      transactionId: `DEMO-PAY-${Date.now()}`,
      message: "Payment processed successfully (Demo Mode)"
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
