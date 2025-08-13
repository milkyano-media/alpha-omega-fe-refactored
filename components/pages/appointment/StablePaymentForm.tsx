"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Service, TimeSlot, BookingService } from "@/lib/booking-service";
import { useAuth } from "@/lib/auth-context";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface StablePaymentFormProps {
  selectedService: Service | null;
  selectedTime: TimeSlot | null;
  selectedServices: Service[];
  onPaymentComplete: () => void;
  onCancel: () => void;
}

export const StablePaymentForm: React.FC<StablePaymentFormProps> = ({
  selectedService,
  selectedTime,
  selectedServices,
  onPaymentComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const [squareInitialized, setSquareInitialized] = useState(false);
  const [squareCard, setSquareCard] = useState<Square.Card | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [usedIdempotencyKeys, setUsedIdempotencyKeys] = useState<Set<string>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const initializationAttempted = useRef(false);
  const mountedRef = useRef(true);
  const [isMounted, setIsMounted] = useState(false);

  // Generate stable container ID once
  const containerId = useRef(`stable-square-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true);
    mountedRef.current = true;
    return () => {
      setIsMounted(false);
      mountedRef.current = false;
    };
  }, []);

  // Initialize Square payment form once and only once
  useEffect(() => {
    console.log('🔄 StablePaymentForm useEffect triggered', {
      initializationAttempted: initializationAttempted.current,
      mounted: mountedRef.current,
      isMounted,
      squareInitialized
    });
    
    if (!isMounted || initializationAttempted.current || squareInitialized) {
      console.log('⏭️ Skipping initialization:', { 
        isMounted,
        alreadyAttempted: initializationAttempted.current,
        alreadyInitialized: squareInitialized
      });
      return;
    }

    initializationAttempted.current = true;
    console.log('🚀 Starting Square initialization process');

    const initializeSquare = async () => {
      try {
        console.log('🔄 Starting Square initialization...');
        
        // Wait for Square SDK
        let retries = 0;
        while (!window.Square && retries < 10) {
          console.log(`⏳ Waiting for Square SDK... attempt ${retries + 1}/10`);
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }

        if (!window.Square) {
          console.error('❌ Square SDK not available after 10 retries');
          throw new Error('Square SDK failed to load');
        }
        
        console.log('✅ Square SDK detected, proceeding with initialization');

        const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

        if (!appId || !locationId) {
          console.error('❌ Missing Square credentials:', { appId: !!appId, locationId: !!locationId });
          throw new Error('Missing Square credentials');
        }

        console.log('🔄 Initializing stable Square payment form');
        console.log('📋 Square credentials:', { appId, locationId });
        
        const payments = window.Square.payments(appId, locationId);
        console.log('✅ Square payments instance created');
        
        const card = await payments.card();
        console.log('✅ Square card instance created');
        
        // Wait for DOM element
        let domRetries = 0;
        while (!containerRef.current && domRetries < 20) {
          console.log(`⏳ Waiting for DOM container... attempt ${domRetries + 1}/20`);
          await new Promise(resolve => setTimeout(resolve, 100));
          domRetries++;
        }

        if (!containerRef.current || !mountedRef.current) {
          console.error('❌ Container not found or component unmounted', {
            containerExists: !!containerRef.current,
            componentMounted: mountedRef.current
          });
          throw new Error('Container not found or component unmounted');
        }

        console.log(`🔗 Attaching Square card to container: #${containerId.current}`);
        await card.attach(`#${containerId.current}`);
        console.log('✅ Square card attached to DOM');
        
        setSquareCard(card);
        setSquareInitialized(true);
        setPaymentError(null);
        
        console.log('✅ Stable Square payment form initialized');
      } catch (error: any) {
        console.error('❌ Stable Square initialization failed:', error);
        setPaymentError(error.message);
      }
    };

    // Initialize after a brief delay for production compatibility
    const timer = setTimeout(initializeSquare, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [isMounted, squareInitialized]); // Depend on mounted state and initialization status

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (squareCard) {
        try {
          console.log('🧹 Cleaning up stable Square card');
          squareCard.destroy();
        } catch (e) {
          console.error('Error destroying stable Square card:', e);
        }
      }
    };
  }, [squareCard]);

  const createSingleBookingWithSegments = async (idempotencyKey: string, paymentInfo: any) => {
    setCreatingBooking(true);
    
    try {
      console.log('📅 Creating booking with segments...');
      
      if (!selectedTime?.appointment_segments?.[0]?.team_member_id) {
        throw new Error('No barber selected for the appointment');
      }

      // Prepare booking request for single booking with multiple segments
      const appointmentSegments = selectedServices.map((service, index) => {
        const segmentStartTime = index === 0 ? selectedTime.start_at : 
          dayjs(selectedTime.start_at).add(
            selectedServices.slice(0, index).reduce((total, s) => total + s.duration, 0), 
            'minute'
          ).toISOString();

        return {
          service_variation_id: service.service_variation_id,
          team_member_id: selectedTime.appointment_segments[0].team_member_id,
          duration_minutes: service.duration > 10000 ? service.duration / 60000 : service.duration,
          start_at: segmentStartTime,
          service_variation_version: 1,
        };
      });

      const bookingRequest = {
        start_at: selectedTime.start_at,
        appointment_segments: appointmentSegments,
        customerNote: `Payment ID: ${paymentInfo.paymentId} | Multi-service booking with segments`,
        idempotencyKey: idempotencyKey,
        payment_info: {
          paymentId: paymentInfo.paymentId,
          amount: paymentInfo.amount,
          currency: paymentInfo.currency,
          receiptUrl: paymentInfo.receiptUrl || "",
        },
      };

      console.log('Booking request:', bookingRequest);
      
      // Create the booking using segments API
      const response = await BookingService.createBookingWithSegments(bookingRequest);
      
      if (response.success) {
        console.log('✅ Booking created successfully');
        
        // Store successful booking information
        const bookingInfo = {
          bookingId: response.booking?.data?.id,
          squareBookingId: response.booking?.data?.square_booking_id,
          paymentInfo: paymentInfo,
          services: selectedServices,
          teamMemberId: selectedTime.appointment_segments[0].team_member_id,
          startAt: selectedTime.start_at,
        };
        
        localStorage.setItem("completedBooking", JSON.stringify(bookingInfo));
        localStorage.setItem("paymentReceipt", JSON.stringify(paymentInfo));
        
        onPaymentComplete();
      } else {
        throw new Error(response.error || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('❌ Booking creation failed:', error);
      throw error;
    } finally {
      setCreatingBooking(false);
    }
  };

  const handlePayment = async () => {
    if (!squareCard || processingPayment || creatingBooking || !selectedService || !selectedTime || !user) {
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      console.log('💳 Starting stable payment process');
      
      // Calculate amounts (same logic as old payment form)
      const subtotalAmount = selectedServices.reduce(
        (total, service) => total + service.price_amount,
        0,
      );
      
      const cardFee = Math.round(subtotalAmount * 0.022); // 2.2% fee on full subtotal
      const baseDepositAmount = Math.round(subtotalAmount * 0.5); // 50% deposit
      const depositAmount = baseDepositAmount + cardFee; // Deposit includes entire card fee
      const formattedAmount = (depositAmount / 100).toFixed(2);

      // Generate unique idempotency key
      let idempotencyKey: string;
      let attempts = 0;
      do {
        idempotencyKey = crypto.randomUUID();
        attempts++;
        if (attempts > 10) {
          throw new Error('Unable to generate unique idempotency key');
        }
      } while (usedIdempotencyKeys.has(idempotencyKey));
      
      // Add to used keys immediately to prevent reuse
      setUsedIdempotencyKeys(prev => new Set([...prev, idempotencyKey]));
      console.log('Generated idempotency key:', idempotencyKey);

      // Prepare verification details for tokenization
      const verificationDetails = {
        amount: formattedAmount,
        currencyCode: "AUD",
        intent: "CHARGE" as const,
        billingContact: {
          givenName: user.first_name || "",
          familyName: user.last_name || "",
          email: user.email || "",
          countryCode: "AU",
        },
        customerInitiated: true,
        sellerKeyedIn: false,
      };

      // Tokenize the card
      const tokenResult = await squareCard.tokenize(verificationDetails);

      if (tokenResult.status === 'OK' && tokenResult.token) {
        console.log('✅ Card tokenization successful');
        
        // Process payment
        const paymentResponse = await fetch("/api/process-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceId: tokenResult.token,
            amount: depositAmount,
            idempotencyKey: idempotencyKey,
            locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "",
            customerDetails: {
              squareCustomerId: user.square_up_id,
            },
          }),
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log('✅ Payment processed successfully');

          // Store payment details
          const paymentInfo = {
            receiptUrl: paymentData.payment?.receiptUrl,
            paymentId: paymentData.payment?.id,
            amount: formattedAmount,
            currency: "AUD",
            idempotencyKey: idempotencyKey,
          };

          // Create booking with the payment information
          await createSingleBookingWithSegments(idempotencyKey, paymentInfo);
        } else {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.message || 'Payment processing failed');
        }
      } else {
        throw new Error(tokenResult.errors?.[0]?.detail || 'Card tokenization failed');
      }
    } catch (error: any) {
      console.error('❌ Stable payment failed:', error);
      setPaymentError(error.message || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Calculate pricing (matching BookingSummary logic)
  const subtotalAmount = selectedServices.reduce((total, service) => {
    return total + (service.price_amount / 100);
  }, 0);
  const cardFee = subtotalAmount * 0.022; // 2.2% card fee on full subtotal
  const baseDepositAmount = subtotalAmount * 0.5; // 50% deposit of services
  const depositAmount = baseDepositAmount + cardFee; // Deposit + entire card fee
  const totalAmount = subtotalAmount + cardFee; // Total including card fee
  const balanceAmount = subtotalAmount - baseDepositAmount; // Balance due (exactly 50% of subtotal)

  // Debug logging for render state
  console.log('🎨 StablePaymentForm render state:', {
    squareInitialized,
    paymentError,
    processingPayment,
    creatingBooking,
    containerIdValue: containerId.current
  });

  return (
    <div className="space-y-4">
      {/* Services Summary */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Selected Services */}
        {selectedServices.map((service, index) => (
          <div key={service.id} className={`p-3 border-b border-gray-200 flex justify-between items-center ${
            index === 0 ? 'bg-gray-50' : 'bg-blue-50'
          }`}>
            <div className="flex-1">
              <p className="text-sm font-medium">{service.name}</p>
              {index === 0 && selectedServices.length > 1 && (
                <p className="text-xs text-gray-600">Primary service</p>
              )}
              {index > 0 && (
                <p className="text-xs text-gray-600">Additional service</p>
              )}
            </div>
            <div className="flex gap-3 text-xs text-gray-600">
              <span>${(service.price_amount / 100).toFixed(2)}</span>
              <span>
                {service.duration > 10000
                  ? Math.round(service.duration / 60000)
                  : service.duration}{" "}
                min
              </span>
            </div>
          </div>
        ))}

        {/* Pricing Breakdown */}
        <div className="p-3 flex justify-between items-center">
          <p className="text-sm">Subtotal</p>
          <p className="font-medium">${subtotalAmount.toFixed(2)}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm">Card Payment Fee (2.2%)</p>
          <p className="font-medium">${cardFee.toFixed(2)}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm font-semibold">Total</p>
          <p className="font-semibold">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm">Deposit (50%)</p>
          <p className="font-medium">${depositAmount.toFixed(2)}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center text-gray-500 text-sm">
          <p>Balance due at appointment</p>
          <p>${balanceAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Selected Time */}
      {selectedTime && (
        <div className="p-3 border border-green-500 rounded-lg bg-green-50">
          <p className="font-medium text-sm mb-1">Selected Time:</p>
          <p className="text-lg font-medium">
            {dayjs(selectedTime.start_at).tz("Australia/Melbourne").format("h:mm A")}
          </p>
          <p className="text-base font-bold">
            {dayjs(selectedTime.start_at).tz("Australia/Melbourne").format("dddd, MMM D")}
          </p>
        </div>
      )}

      {/* Payment Form */}
      <div className="space-y-4">
        {!squareInitialized && !paymentError && (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Loading payment form...</p>
          </div>
        )}

        {paymentError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{paymentError}</p>
            <button 
              onClick={() => {
                setPaymentError(null);
                initializationAttempted.current = false;
                // Trigger re-initialization
                window.location.reload();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Square Card Container */}
        <div 
          ref={containerRef}
          id={containerId.current}
          style={{ 
            minHeight: '56px',
            display: squareInitialized ? 'block' : 'none'
          }}
        />

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-gray-100 text-xs rounded text-gray-600">
            Debug: Container ID = {containerId.current}<br/>
            Initialized: {squareInitialized ? 'Yes' : 'No'}<br/>
            Error: {paymentError || 'None'}
          </div>
        )}

        {/* Payment Button */}
        {squareInitialized && (
          <Button
            onClick={handlePayment}
            disabled={processingPayment || creatingBooking}
            className="w-full py-3 text-base bg-black hover:bg-gray-800 transition-colors text-white rounded-md font-normal"
          >
            {processingPayment ? 'Processing Payment...' : 
             creatingBooking ? 'Creating Booking...' : 
             `Pay Deposit $${depositAmount.toFixed(2)}`}
          </Button>
        )}

        {/* Cancel Button */}
        <Button
          onClick={onCancel}
          disabled={processingPayment || creatingBooking}
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};