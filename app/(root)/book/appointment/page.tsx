"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  AvailabilityResponse,
  BookingService,
  TimeSlot,
  Service,
} from "@/lib/booking-service";
import {
  DateTimeSelector,
  BookingSummary,
  PaymentForm,
} from "@/components/pages/appointment";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { MarqueeItems } from "@/components/navbar";

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Square type definitions are added globally in types/square.d.ts


export default function AppointmentBooking() {
  // State related to availability and dates
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availabilityData, setAvailabilityData] =
    useState<AvailabilityResponse | null>(null);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cache for already fetched months - key is 'YYYY-MM'
  const [monthCache, setMonthCache] = useState<
    Record<string, AvailabilityResponse>
  >({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [, setPaymentCompleted] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [, setSquareBookingId] = useState<string | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Multiple services from selection page
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [timeAutoSelected, setTimeAutoSelected] = useState(false);

  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Square Payment SDK states
  const [squareCard, setSquareCard] = useState<Square.Card | null>(null);
  const [_showPaymentForm, _setShowPaymentForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Wrapper to track all direct calls to setShowPaymentForm
  const setShowPaymentForm = useCallback((show: boolean) => {
    const stack = new Error().stack;
    console.log('🔍 DIRECT setShowPaymentForm called:', { 
      show, 
      currentValue: _showPaymentForm,
      caller: stack?.split('\n')[2]?.trim() || 'unknown'
    });
    _setShowPaymentForm(show);
  }, [_showPaymentForm]);

  // Use the internal state value
  const showPaymentForm = _showPaymentForm;

  // Handle Square card ready callback from PaymentForm
  const handleSquareCardReady = useCallback((card: Square.Card) => {
    // Don't update Square card during payment processing
    if (processingPayment || creatingBooking) {
      console.log('Prevented Square card update during payment processing');
      return;
    }
    
    setSquareCard(card);
    setPaymentError(null); // Clear any previous errors
  }, [processingPayment, creatingBooking]);

  // Handle Square card error callback from PaymentForm
  const handleSquareCardError = useCallback((error: string) => {
    setPaymentError(error);
    
    // Don't clear Square card during payment processing
    if (processingPayment || creatingBooking) {
      console.log('Prevented Square card clearing during payment processing');
      return;
    }
    
    setSquareCard(null);
  }, [processingPayment, creatingBooking]);

  // Track if payment is in progress to prevent double submissions
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  
  // Track used idempotency keys to prevent reuse within session
  const [usedIdempotencyKeys, setUsedIdempotencyKeys] = useState<Set<string>>(new Set());

  // Protected function to prevent hiding payment form during payment processing
  const setShowPaymentFormSafely = useCallback((show: boolean) => {
    // Get stack trace to see who's calling this
    const stack = new Error().stack;
    console.log('💡 setShowPaymentFormSafely called:', { 
      show, 
      processingPayment, 
      creatingBooking, 
      paymentInProgress,
      caller: stack?.split('\n')[2]?.trim() || 'unknown'
    });
    
    // If trying to hide payment form during payment, prevent it
    if (!show && (processingPayment || creatingBooking || paymentInProgress)) {
      console.error('🚨 BLOCKED: Attempted to hide payment form during payment processing');
      console.error('Payment states:', { processingPayment, creatingBooking, paymentInProgress });
      console.error('Call stack:', stack);
      return;
    }
    
    setShowPaymentForm(show);
  }, [processingPayment, creatingBooking, paymentInProgress, setShowPaymentForm]);

  // Monitor payment form state changes during payment
  useEffect(() => {
    if ((processingPayment || creatingBooking || paymentInProgress) && !showPaymentForm) {
      console.error('CRITICAL: Payment form hidden during payment processing - restoring');
      console.log('🔧 Restoring payment form during payment processing');
      setShowPaymentForm(true);
    }
  }, [showPaymentForm, processingPayment, creatingBooking, paymentInProgress, setShowPaymentForm]);

  // Debug: Monitor showPaymentForm changes
  useEffect(() => {
    console.log('🔍 showPaymentForm changed to:', showPaymentForm, {
      processingPayment,
      creatingBooking,
      paymentInProgress,
      timeAutoSelected,
      selectedTime: !!selectedTime,
      selectedService: !!selectedService
    });
  }, [showPaymentForm, processingPayment, creatingBooking, paymentInProgress, timeAutoSelected, selectedTime, selectedService]);

  // Handle payment process
  const handlePayment = async () => {
    // Immediate check to prevent double clicks
    if (paymentInProgress || processingPayment || creatingBooking) {
      console.log('Payment already in progress, ignoring click');
      return;
    }

    if (!selectedService) {
      setPaymentError("Service not selected");
      return;
    }

    if (!squareCard) {
      console.error('❌ Square card not available. Payment form initialization status:', {
        squareCard: !!squareCard,
        windowSquare: typeof window !== 'undefined' ? !!window.Square : 'unknown',
        environment: process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT,
        appId: process.env.NEXT_PUBLIC_SQUARE_APP_ID ? 'set' : 'missing',
        locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ? 'set' : 'missing'
      });
      setPaymentError(
        "Payment form is not ready. Please wait a moment and try again, or refresh the page if the issue persists."
      );
      return;
    }

    if (!user) {
      setPaymentError(
        "User information is not available. Please log in again.",
      );
      return;
    }

    if (!user.square_up_id) {
      console.warn("User does not have a Square customer ID");
      // We'll continue without it, but log a warning
    }

    // Set all blocking states immediately
    setPaymentInProgress(true);
    setProcessingPayment(true);
    setPaymentError(null);

    try {
      // Check if Square card is still valid before proceeding
      if (!squareCard || typeof squareCard.tokenize !== 'function') {
        throw new Error('Square payment form is not available. Please refresh the page and try again.');
      }
      // Calculate total amount and 50% deposit for all selected services
      const subtotalAmount = selectedServices.reduce(
        (total, service) => total + service.price_amount,
        0,
      );
      
      // Calculate 2.2% card fee from full subtotal
      const cardFee = Math.round(subtotalAmount * 0.022); // 2.2% fee on full subtotal
      
      // Deposit = 50% of subtotal + entire card fee
      const baseDepositAmount = Math.round(subtotalAmount * 0.5); // 50% deposit of services
      const depositAmount = baseDepositAmount + cardFee; // Deposit includes entire card fee
      
      // Total amount is subtotal + card fee (used for display in components)
      // const totalAmount = subtotalAmount + cardFee;
      const formattedAmount = (depositAmount / 100).toFixed(2);

      // Create a unique idempotency key for this transaction - generate once at start
      // This will be used for both payment and booking to ensure consistency
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

      // Prepare verification details
      const verificationDetails = {
        amount: formattedAmount,
        currencyCode: "AUD",
        intent: "CHARGE" as const, // Use type assertion to fix TypeScript error
        billingContact: {
          givenName: user.first_name || "",
          familyName: user.last_name || "",
          email: user.email || "",
          countryCode: "AU",
        },
        customerInitiated: true,
        sellerKeyedIn: false, // Adding the missing required field
      };

      // Tokenize the payment method with additional error handling
      let tokenResult;
      try {
        // Double-check card is still valid right before tokenization
        if (!squareCard || typeof squareCard.tokenize !== 'function') {
          throw new Error('Square card became invalid before tokenization');
        }
        
        console.log('Starting Square card tokenization...');
        tokenResult = await squareCard.tokenize(verificationDetails);
        console.log('Square tokenization completed:', tokenResult.status);
      } catch (tokenizeError: any) {
        if (tokenizeError.message?.includes('destroyed') || tokenizeError.name?.includes('Destroyed')) {
          throw new Error('Payment form was reset during processing. Please try again.');
        }
        throw tokenizeError;
      }

      if (tokenResult.status === "OK") {
        // Process the payment with the token
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
            // Pass customer details for the payment
            customerDetails: {
              squareCustomerId: user.square_up_id,
            },
          }),
        });

        if (paymentResponse.ok) {
          // Payment successful
          const paymentData = await paymentResponse.json();

          // Store payment details for booking notes and receipt
          const paymentInfo = {
            receiptUrl: paymentData.payment?.receiptUrl,
            paymentId: paymentData.payment?.id,
            amount: formattedAmount,
            currency: "AUD",
            idempotencyKey: idempotencyKey,
          };

          localStorage.setItem("paymentReceipt", JSON.stringify(paymentInfo));

          setPaymentCompleted(true);

          // Immediately create the booking with segments after successful payment
          await createSingleBookingWithSegments(idempotencyKey, paymentInfo);
        } else {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.message || "Payment processing failed");
        }
      } else {
        console.log("tokenResult.errors", tokenResult);
        throw new Error(
          `Tokenization failed: ${
            tokenResult.errors?.[0]?.detail || tokenResult.status
          }`,
        );
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(
        error instanceof Error ? error.message : "Payment processing failed",
      );
      setProcessingPayment(false);
      setPaymentInProgress(false);
    }
  };

  // Create single booking with multiple appointment segments
  const createSingleBookingWithSegments = async (
    idempotencyKey: string,
    paymentInfo: any,
  ) => {
    if (!selectedService || !selectedTime || !user) {
      console.error("Missing required booking information");
      setError("Missing required booking information for booking");
      setProcessingPayment(false);
      setPaymentInProgress(false);
      setCreatingBooking(false);
      return;
    }

    setCreatingBooking(true);

    try {
      // Prepare appointment segments for all selected services
      const appointmentSegments: any[] = [];
      const currentStartTime = new Date(selectedTime.start_at);

      selectedServices.forEach((service, index) => {
        const serviceVariationVersion =
          selectedTime.appointment_segments?.[0]?.service_variation_version;

        // For the first service, use the selected time slot
        // For subsequent services, calculate start time based on previous service duration
        if (index > 0) {
          const previousService = selectedServices[index - 1];
          const previousDuration = previousService.duration > 10000 
            ? previousService.duration / 60000 
            : previousService.duration;
          currentStartTime.setMinutes(currentStartTime.getMinutes() + previousDuration);
          
          // Round to next 30-minute increment
          const minutes = currentStartTime.getMinutes();
          const remainder = minutes % 30;
          if (remainder !== 0) {
            currentStartTime.setMinutes(minutes + (30 - remainder));
          }
        }

        appointmentSegments.push({
          service_variation_id: String(service.service_variation_id),
          team_member_id: String(selectedTime.appointment_segments?.[0]?.team_member_id || ""),
          duration_minutes: service.duration > 10000 ? 
            service.duration / 60000 : service.duration,
          start_at: currentStartTime.toISOString(),
          service_variation_version: serviceVariationVersion ? Number(serviceVariationVersion) : 1,
        });
      });

      // Create customer note with service details
      const serviceNames = selectedServices.map(service => service.name);
      const customerNote = `Appointment for: ${serviceNames.join(", ")}`;

      // Create single booking request with multiple segments
      const singleBookingRequest = {
        start_at: selectedTime.start_at,
        appointment_segments: appointmentSegments,
        customer_note: customerNote,
        idempotencyKey: idempotencyKey,
        payment_info: {
          paymentId: paymentInfo.paymentId,
          amount: paymentInfo.amount,
          currency: paymentInfo.currency,
          receiptUrl: paymentInfo.receiptUrl,
        },
      };

      // Call single booking with segments API
      const bookingResponse = await BookingService.createBookingWithSegments(
        singleBookingRequest,
      );

      if (bookingResponse.success && bookingResponse.booking) {
        // Store the booking ID
        if (bookingResponse.booking.data?.square_booking_id) {
          setSquareBookingId(bookingResponse.booking.data.square_booking_id);
        }

        // Update payment receipt with booking details
        const receiptData = JSON.parse(
          localStorage.getItem("paymentReceipt") || "{}",
        );
        localStorage.setItem(
          "paymentReceipt",
          JSON.stringify({
            ...receiptData,
            booking: bookingResponse.booking,
            totalSegments: appointmentSegments.length,
          }),
        );

        // Mark booking as confirmed and handle UI transitions
        setBookingConfirmed(true);
        setProcessingPayment(false);
        setPaymentInProgress(false);
        setCreatingBooking(false);

        // Save booking details for thank you page
        saveSingleBookingDetails(bookingResponse);
      } else {
        throw new Error(
          bookingResponse.error || "Failed to create booking with segments",
        );
      }
    } catch (error: any) {
      console.error("Error creating booking with segments:", error);
      setProcessingPayment(false);
      setPaymentInProgress(false);
      setCreatingBooking(false);
      setPaymentError(error.message || "Failed to create booking");
    }
  };


  // Save single booking details for thank you page  
  const saveSingleBookingDetails = (bookingResponse: any) => {
    if (!selectedService || !selectedTime) return;

    try {
      // Calculate total amounts for all selected services and card fee
      const subtotalAmount = selectedServices.reduce(
        (total, service) => total + service.price_amount,
        0,
      );
      
      // Calculate 2.2% card fee from full subtotal
      const cardFee = Math.round(subtotalAmount * 0.022); // 2.2% fee on full subtotal
      
      // Deposit = 50% of subtotal + entire card fee
      const baseDepositAmount = Math.round(subtotalAmount * 0.5); // 50% deposit of services
      const totalDeposit = baseDepositAmount + cardFee; // Deposit includes entire card fee
      
      // Total amount is subtotal + card fee
      const totalAmount = subtotalAmount + cardFee;

      // Create service list for all selected services
      const servicesList = selectedServices.map(service => service.name);

      // Get the single booking details
      const booking = bookingResponse.booking;

      localStorage.setItem(
        "lastBooking",
        JSON.stringify({
          id: booking?.data?.id || "pending",
          square_booking_id: booking?.data?.square_booking_id || "pending",
          service: servicesList.join(", "),
          date: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("YYYY-MM-DD"),
          time: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("h:mm A"),
          deposit: (totalDeposit / 100).toFixed(2),
          total: (totalAmount / 100).toFixed(2),
          status: booking?.data?.status || "confirmed",
          square_confirmed: true,
          backend_synced: true,
          total_services: selectedServices.length,
          total_segments: (booking?.data?.booking_data?.totalSegments || selectedServices.length), // Total segments in single booking
          booking_id: booking?.data?.id,
        }),
      );
    } catch (error) {
      console.error("Error saving single booking details:", error);
    }
  };

  // Load selected services from localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?returnUrl=/book/services");
      return;
    }

    // Check for multiple services first (new flow)
    const servicesData = localStorage.getItem("selectedServices");
    if (servicesData) {
      try {
        const parsedServices = JSON.parse(servicesData) as Service[];
        setSelectedServices(parsedServices);
        // Set the first service as the main service for compatibility
        setSelectedService(parsedServices[0]);
      } catch (err: any) {
        console.error("Error parsing selected services:", err);
        router.push("/book/services");
      }
    } else {
      // Fallback to single service (old flow)
      const serviceData = localStorage.getItem("selectedService");
      if (!serviceData) {
        // No service selected, redirect back to services page
        router.push("/book/services");
        return;
      }

      try {
        const parsedService = JSON.parse(serviceData) as Service;
        setSelectedService(parsedService);
        setSelectedServices([parsedService]);
      } catch (err: any) {
        console.error("Error parsing selected service:", err);
        router.push("/book/services");
      }
    }

    // Check if there's a pre-selected time slot from closest-time barber selection
    const autoSelectedTimeFlag = localStorage.getItem("autoSelectedTime");
    if (autoSelectedTimeFlag === "true") {
      const savedTimeSlot = localStorage.getItem("selectedTimeSlot");
      if (savedTimeSlot) {
        try {
          const parsedTimeSlot = JSON.parse(savedTimeSlot);
          console.log("Loading auto-selected time slot:", parsedTimeSlot);
          setSelectedTime(parsedTimeSlot);
          
          // Set the date to match the time slot
          const slotDate = new Date(parsedTimeSlot.start_at);
          setSelectedDate(slotDate);
          
          // Mark that time was auto-selected
          setTimeAutoSelected(true);
          
          // Auto-show payment form since time is already selected (only if not processing payment)
          if (!processingPayment && !creatingBooking && !paymentInProgress) {
            setShowPaymentFormSafely(true);
          }
          
          // Clean up the auto-selection flags
          localStorage.removeItem("selectedTimeSlot");
          localStorage.removeItem("autoSelectedTime");
        } catch (err) {
          console.error("Error parsing auto-selected time slot:", err);
          localStorage.removeItem("selectedTimeSlot");
          localStorage.removeItem("autoSelectedTime");
        }
      }
    }
  }, [isAuthenticated, router, processingPayment, creatingBooking, paymentInProgress, setShowPaymentFormSafely]);

  // Services and barbers are now fetched when "Add Additional Service" button is clicked

  // Handle redirect when booking is confirmed
  useEffect(() => {
    if (bookingConfirmed) {
      // Clean up localStorage
      localStorage.removeItem("selectedService");
      localStorage.removeItem("selectedServices");
      localStorage.removeItem("selectedBarberId");

      // Redirect to thank you page
      const timer = setTimeout(() => {
        router.push("/book/thank-you");
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [bookingConfirmed, router]);

  // Extract date parts to avoid complex expressions in dependency array
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  // Fetch available times when date changes
  // Fetch availability data when month changes or service changes
  useEffect(() => {
    if (!selectedService) return;

    // Extract month and year for dependency tracking and caching
    const currentMonth = selectedMonth;
    const currentYear = selectedYear;
    const cacheKey = `${currentYear}-${currentMonth}`;

    const fetchAvailabilityData = async () => {
      // Check if we already have this month in cache
      if (monthCache[cacheKey]) {
        console.log(`Using cached data for ${cacheKey}`);
        // Use cached data
        const cachedData = monthCache[cacheKey];
        setAvailabilityData(cachedData);

        // Extract available dates from cached data
        const dates = cachedData?.availabilities_by_date
          ? Object.keys(cachedData.availabilities_by_date)
          : [];
        setAvailableDates(dates);

        // Update time slots for selected date
        // Use consistent date formatting
        const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
        const availabilities =
          cachedData?.availabilities_by_date?.[dateKey] || [];

        // Sort times chronologically
        availabilities.sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );

        setAvailableTimes(availabilities);
        return;
      }

      // If not in cache, fetch new data
      setIsLoading(true);
      setError(null);

      try {
        // Calculate date range
        // If we're in the current month, start from today
        // Otherwise, start from the 1st of the month
        const now = new Date();
        const isCurrentMonth =
          now.getMonth() === currentMonth && now.getFullYear() === currentYear;

        // Start date - either today or 1st of month
        const startDate = isCurrentMonth
          ? new Date(now.setHours(0, 0, 0, 0))
          : new Date(currentYear, currentMonth, 1);

        // End date - last day of the month
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        console.log(
          `Fetching availability for ${cacheKey} from`,
          startDate.toISOString(),
          "to",
          endDate.toISOString(),
        );

        // Make a single request for the entire date range
        const response = await BookingService.searchAvailability(
          selectedService.service_variation_id,
          startDate,
          endDate,
        );

        // Store the response in cache
        setMonthCache((prev) => ({
          ...prev,
          [cacheKey]: response,
        }));

        // Update state with response data
        setAvailabilityData(response);

        // Extract available dates
        const dates = response?.availabilities_by_date
          ? Object.keys(response.availabilities_by_date)
          : [];
        console.log(`${cacheKey} available dates:`, dates);
        setAvailableDates(dates);

        // If the selected date has available times, set them
        // Use consistent date formatting
        const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
        const availabilities =
          response?.availabilities_by_date?.[dateKey] || [];

        // Sort times chronologically
        availabilities.sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );

        setAvailableTimes(availabilities);
      } catch (err: any) {
        console.error("Error fetching availability:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load availability",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailabilityData();
  }, [selectedMonth, selectedYear, selectedService, selectedDate, monthCache]);

  // Extract date string to avoid complex expression in dependency array
  // Use local date formatting to prevent timezone conversion issues
  const selectedDateString = dayjs(selectedDate).format("YYYY-MM-DD");

  // Debug: Track selectedDateString changes
  useEffect(() => {
    console.log('📅 selectedDateString changed to:', selectedDateString, {
      showPaymentForm,
      timeAutoSelected,
      selectedTime: !!selectedTime
    });
  }, [selectedDateString, showPaymentForm, timeAutoSelected, selectedTime]);

  // Debug: Log the selected date conversion
  console.log("Selected date (local):", selectedDate);
  console.log("Selected date string:", selectedDateString);

  // Update available times when selected date changes
  useEffect(() => {
    if (!availabilityData) return;

    // CRITICAL: Don't modify times when payment form is active to prevent component unmounting
    if (showPaymentForm) {
      console.log('⚠️ Skipping date change processing - payment form is active');
      return;
    }

    // Get the key for the selected date
    const dateKey = selectedDateString;

    console.log('📅 Processing date change for:', dateKey, {
      timeAutoSelected,
      showPaymentForm,
      selectedTime: !!selectedTime
    });

    // Get available times for this date from the existing data
    const availabilities =
      availabilityData?.availabilities_by_date?.[dateKey] || [];

    // Sort times chronologically
    availabilities.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );

    console.log(
      `Found ${availabilities.length} available slots for ${dateKey}`,
    );
    setAvailableTimes(availabilities);
    
    // Only reset selected time if it's not auto-selected from closest-time barber
    if (!timeAutoSelected) {
      console.log('🔄 Resetting selectedTime due to date change');
      setSelectedTime(null); // Reset selected time when date changes
    }
    // Note: We use selectedDateString instead of selectedDate to avoid complex expression warning
  }, [availabilityData, selectedDateString, timeAutoSelected, showPaymentForm, selectedTime]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Only reset selected time if user manually changes date (not auto-selected)
    if (!timeAutoSelected) {
      setSelectedTime(null); // Reset selected time when date changes
    }
  };

  // Handle month changes from the calendar
  const handleMonthChange = (date: Date) => {
    console.log("Month changed to:", date);
    // Clear any previously selected time (unless it's auto-selected)
    if (!timeAutoSelected) {
      setSelectedTime(null);
    }

    // Create cache key for the target month
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    const cacheKey = `${targetYear}-${targetMonth}`;

    // Check if month data is already in cache
    const isCached = !!monthCache[cacheKey];

    // Only show loading state if we need to fetch
    if (!isCached) {
      // Reset available times until we get new data
      setAvailableTimes([]);
      console.log(`No cached data for ${cacheKey}, will fetch`);
    } else {
      console.log(`Found cached data for ${cacheKey}, no need to fetch`);
    }

    // Update selectedDate to the first day of the new month
    const newMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    setSelectedDate(newMonthDate);
  };

  const handleTimeSelection = (time: any) => {
    setSelectedTime(time);
  };


  // Show payment form
  const handleShowPaymentForm = () => {
    if (!selectedService || !selectedTime || !user) {
      setError("Please select a service and time first");
      return;
    }
    
    // Don't allow showing payment form during payment processing
    if (processingPayment || creatingBooking || paymentInProgress) {
      console.log('Cannot show payment form during payment processing');
      return;
    }
    
    setShowPaymentFormSafely(true);
  };



  if (!selectedService) {
    return (
      <main className="flex flex-col gap-3 mt-20">
        <section className="container mx-auto text-center py-16">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Loading service information...</p>
        </section>
      </main>
    );
  }

  // Rendering different states based on booking flow
  const renderBookingStatus = () => {
    if (bookingConfirmed) {
      return (
        <div className="p-3 bg-green-100 border border-green-300 rounded-lg mb-3 text-sm">
          <p className="text-green-800 font-medium">
            <svg
              className="inline-block w-5 h-5 mr-1 -mt-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Booking confirmed successfully! You&apos;ll be redirected to your
            confirmation details.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="flex flex-col gap-6 mt-30 mb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 md:mt-10">
          {/* Left column - Calendar and time selection or confirmation */}
          {timeAutoSelected && selectedTime ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Perfect! We found your next available appointment
                </h2>
                <p className="text-gray-600">
                  Your appointment has been automatically scheduled for the earliest available time.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Your Appointment Details:</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Date:</span> {dayjs(selectedTime.start_at).tz("Australia/Melbourne").format("dddd, MMMM D, YYYY")}</p>
                  <p><span className="font-medium">Time:</span> {dayjs(selectedTime.start_at).tz("Australia/Melbourne").format("h:mm A")}</p>
                  <p><span className="font-medium">Duration:</span> {selectedServices.reduce((total, service) => {
                    const duration = service.duration > 10000 ? Math.round(service.duration / 60000) : service.duration;
                    return total + duration;
                  }, 0)} minutes</p>
                </div>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={() => {
                    // Don't allow changing time during payment processing
                    if (processingPayment || creatingBooking) {
                      console.log('Cannot change time during payment processing');
                      return;
                    }
                    
                    setTimeAutoSelected(false);
                    setShowPaymentFormSafely(false);
                    setSelectedTime(null);
                    // Clear any payment form errors
                    setPaymentError(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={processingPayment || creatingBooking}
                >
                  Choose a different time instead
                </button>
              </div>
            </div>
          ) : (
            <DateTimeSelector
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onMonthChange={handleMonthChange}
              onTimeSelect={handleTimeSelection}
              selectedTime={selectedTime}
              availableTimes={availableTimes}
              availableDates={availableDates}
              isLoading={isLoading}
            />
          )}

          <div className="overflow-hidden whitespace-nowrap md:hidden block">
            <div className="flex animate-marquee">
              {/* First set of images */}
              <MarqueeItems />
              {/* Duplicate set for seamless loop */}
              <MarqueeItems />
            </div>
          </div>

          {/* Right column - Booking summary and payment */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">SUMMARY</h2>
            {renderBookingStatus()}

            {showPaymentForm ? (
              <PaymentForm
                key="payment-form-stable"
                squareCard={squareCard}
                selectedService={selectedService}
                selectedTime={selectedTime}
                processingPayment={processingPayment}
                creatingBooking={creatingBooking}
                paymentError={paymentError}
                handlePayment={handlePayment}
                onCancelPayment={() => {
                  // Don't allow canceling during payment processing
                  if (processingPayment || creatingBooking) {
                    console.log('Cannot cancel during payment processing');
                    return;
                  }
                  setShowPaymentFormSafely(false);
                }}
                selectedServices={selectedServices}
                onSquareCardReady={handleSquareCardReady}
                onSquareCardError={handleSquareCardError}
              />
            ) : (
              <>
                <BookingSummary
                  selectedService={selectedService}
                  selectedTime={selectedTime}
                  error={error}
                  onProceedToPayment={handleShowPaymentForm}
                  showPaymentForm={showPaymentForm}
                  selectedServices={selectedServices}
                />

              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden whitespace-nowrap mt-4 md:block hidden">
          <div className="flex animate-marquee">
            {/* First set of images */}
            <MarqueeItems />
            {/* Duplicate set for seamless loop */}
            <MarqueeItems />
          </div>
        </div>
      </div>

    </main>
  );
}
