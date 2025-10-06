import { NextRequest, NextResponse } from 'next/server';
// NOTE: Square SDK removed during Phase 4 cleanup
// TODO: Implement alternative payment processing (Stripe, PayPal, etc.)
// import { Client, Environment } from 'square';

// NOTE: Square payment processing temporarily disabled during Phase 4 cleanup
// The booking system now works without payment processing
// Payment integration will be re-implemented with alternative provider

export async function POST(request: NextRequest) {
  try {
    // Parse request body for future payment implementation
    const body = await request.json();
    const { sourceId, amount, idempotencyKey, locationId } = body;

    // Return temporary response indicating payment processing is disabled
    return NextResponse.json(
      {
        success: false,
        message: 'Payment processing temporarily disabled during Square removal phase',
        details: 'Booking system operational without payment. Payment integration will be re-implemented soon.'
      },
      { status: 503 } // Service Temporarily Unavailable
    );

  } catch (error: any) {
    console.error('Payment processing error (disabled):', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Payment processing temporarily disabled during Square removal phase',
        details: 'System ready for alternative payment provider integration'
      },
      { status: 503 }
    );
  }
}
