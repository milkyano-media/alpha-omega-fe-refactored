'use client';

import React, { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

function CheckoutForm({ amount, onSuccess, onError }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/book/thank-you` },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-lg border">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          Amount: <span className="font-semibold">${(amount / 100).toFixed(2)} AUD</span>
        </div>
        <Button type="submit" disabled={!stripe || isProcessing} className="min-w-[200px]">
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
          ) : (
            'Pay Deposit'
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Payments securely processed by Stripe. Card details never stored on our servers.
      </p>
    </form>
  );
}

export default function StripePaymentForm({ clientSecret, amount, onSuccess, onError }: PaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0F172A',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="w-full">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
