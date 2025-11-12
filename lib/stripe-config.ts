/**
 * Stripe Configuration
 *
 * This file initializes Stripe with the publishable key from environment variables.
 * The Stripe instance is used throughout the application for payment processing.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('L NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
  throw new Error('Stripe publishable key is required');
}

// Initialize Stripe instance (cached by @stripe/stripe-js)
let stripePromise: Promise<Stripe | null>;

/**
 * Get or create Stripe instance
 * The instance is cached after the first call
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

/**
 * Check if running in test mode
 */
export const isStripeTestMode = (): boolean => {
  return process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true' ||
         stripePublishableKey.startsWith('pk_test_');
};

/**
 * Stripe configuration options
 */
export const stripeConfig = {
  publishableKey: stripePublishableKey,
  testMode: isStripeTestMode(),
  currency: 'aud',
  country: 'AU'
};

// Log Stripe configuration (without exposing full key)
if (typeof window !== 'undefined') {
  console.log('=7 Stripe initialized:', {
    testMode: stripeConfig.testMode,
    currency: stripeConfig.currency,
    keyPrefix: stripePublishableKey.substring(0, 12) + '...'
  });
}

export default getStripe;
