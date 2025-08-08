"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  AvailabilityResponse,
  BookingService,
  TimeSlot,
  TeamMember,
  Service,
} from "@/lib/booking-service";
import {
  DateTimeSelector,
  BookingSummary,
  PaymentForm,
} from "@/components/pages/appointment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBarberImageSafe } from "@/lib/barber-images";
import Image from "next/image";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Square type definitions are added globally in types/square.d.ts

interface AdditionalService {
  service: Service;
  barber: TeamMember;
  timeSlot: TimeSlot;
}

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

  // Additional services state
  const [additionalServices, setAdditionalServices] = useState<
    AdditionalService[]
  >([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBarbers, setAllBarbers] = useState<Record<number, TeamMember[]>>(
    {},
  );

  // Dialog states for additional service flow
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showBarberDialog, setShowBarberDialog] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);

  // Temporary state for additional service selection
  const [tempAdditionalService, setTempAdditionalService] =
    useState<Service | null>(null);
  const [tempAdditionalBarber, setTempAdditionalBarber] =
    useState<TeamMember | null>(null);
  const [tempAdditionalDate, setTempAdditionalDate] = useState<Date>(
    new Date(),
  );
  const [tempAdditionalTime, setTempAdditionalTime] = useState<TimeSlot | null>(
    null,
  );
  const [tempAvailableTimes, setTempAvailableTimes] = useState<TimeSlot[]>([]);
  const [tempAvailableDates, setTempAvailableDates] = useState<string[]>([]);
  const [tempIsLoading, setTempIsLoading] = useState(false);

  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Square Payment SDK states
  const [squareCard, setSquareCard] = useState<Square.Card | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Initialize Square payment form
  useEffect(() => {
    if (!showPaymentForm || !selectedService || !selectedTime) return;

    const initializeSquarePayment = async () => {
      if (!window.Square) {
        console.error("Square.js failed to load");
        setPaymentError(
          "Payment system failed to load. Please try again later.",
        );
        return;
      }

      try {
        // Initialize Square payments with app ID and location ID from environment variables
        const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

        if (!appId || !locationId) {
          console.error("Missing Square credentials in environment variables");
          setPaymentError(
            "Payment system configuration error. Please contact support.",
          );
          return;
        }

        const payments = window.Square.payments(appId, locationId);

        // Create a card payment method
        const card = await payments.card();

        // Attach the card payment form to the DOM
        await card.attach("#card-container");

        // Store the card instance for later use
        setSquareCard(card);
      } catch (e: any) {
        console.error("Error initializing Square Payment:", e);
        setPaymentError("Failed to initialize payment form. Please try again.");
      }
    };

    initializeSquarePayment();

    // Cleanup function
    return () => {
      if (squareCard) {
        try {
          squareCard.destroy();
        } catch (e: any) {
          console.error("Error destroying Square payment form:", e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentForm, selectedService, selectedTime]);

  // Handle payment process
  const handlePayment = async () => {
    if (!squareCard || !selectedService) {
      setPaymentError("Payment form not initialized properly");
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

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      // Calculate total deposit amount including additional services
      // The deposit amount is the actual price in Square
      // This is 50% of the doubled price shown to customers
      const mainServiceDeposit = selectedService.price_amount;
      const additionalServicesDeposit = additionalServices.reduce(
        (total, additionalService) =>
          total + additionalService.service.price_amount,
        0,
      );
      const depositAmount = mainServiceDeposit + additionalServicesDeposit;
      const formattedAmount = (depositAmount / 100).toFixed(2);

      // Create a unique idempotency key for this transaction
      // This will be used for both payment and booking to ensure consistency
      const idempotencyKey = crypto.randomUUID();

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

      // Tokenize the payment method
      const tokenResult = await squareCard.tokenize(verificationDetails);

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

          // Immediately create the bookings using batch approach after successful payment
          await createBatchBookings(idempotencyKey, paymentInfo);
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
    }
  };

  // Create multiple bookings using batch approach
  const createBatchBookings = async (
    idempotencyKey: string,
    paymentInfo: any,
  ) => {
    if (!selectedService || !selectedTime || !user) {
      console.error("Missing required booking information");
      setError("Missing required booking information for booking");
      setProcessingPayment(false);
      setCreatingBooking(false);
      return;
    }

    setCreatingBooking(true);

    try {
      // Prepare all bookings (main + additional services)
      const bookingsToCreate = [];

      // Main booking
      const serviceVariationVersion =
        selectedTime.appointment_segments?.[0]?.service_variation_version;

      bookingsToCreate.push({
        service_variation_id: selectedService.service_variation_id,
        team_member_id:
          selectedTime.appointment_segments?.[0]?.team_member_id || "",
        start_at: selectedTime.start_at,
        service_variation_version: serviceVariationVersion,
        customer_note: `Main service: ${selectedService.name}`,
      });

      // Additional services bookings
      additionalServices.forEach((additionalService, index) => {
        bookingsToCreate.push({
          service_variation_id: additionalService.service.service_variation_id,
          team_member_id:
            additionalService.timeSlot.appointment_segments?.[0]
              ?.team_member_id || "",
          start_at: additionalService.timeSlot.start_at,
          service_variation_version:
            additionalService.timeSlot.appointment_segments?.[0]
              ?.service_variation_version,
          customer_note: `Additional service #${index + 1}: ${
            additionalService.service.name
          }`,
        });
      });

      // Create batch booking request
      const batchRequest = {
        bookings: bookingsToCreate,
        idempotencyKey: idempotencyKey,
        payment_info: {
          paymentId: paymentInfo.paymentId,
          amount: paymentInfo.amount,
          currency: paymentInfo.currency,
          receiptUrl: paymentInfo.receiptUrl,
        },
      };

      // Call batch booking API
      const batchResponse = await BookingService.createBatchBookings(
        batchRequest,
      );

      if (batchResponse.success && batchResponse.created_bookings.length > 0) {
        // Store the main booking ID
        const mainBooking = batchResponse.created_bookings[0]?.booking;
        if (mainBooking?.data?.square_booking_id) {
          setSquareBookingId(mainBooking.data.square_booking_id);
        }

        // Update payment receipt with booking IDs
        const receiptData = JSON.parse(
          localStorage.getItem("paymentReceipt") || "{}",
        );
        localStorage.setItem(
          "paymentReceipt",
          JSON.stringify({
            ...receiptData,
            bookings: batchResponse.created_bookings,
            mainBookingId: mainBooking?.data?.square_booking_id,
          }),
        );

        // Mark booking as confirmed and handle UI transitions
        setBookingConfirmed(true);
        setProcessingPayment(false);
        setCreatingBooking(false);

        // Save booking details for thank you page
        saveBatchBookingDetails(batchResponse);
      } else {
        throw new Error(
          batchResponse.errors?.length > 0
            ? `Failed to create bookings: ${batchResponse.errors
                .map((e) => e.error)
                .join(", ")}`
            : "Failed to create bookings",
        );
      }
    } catch (error: any) {
      console.error("Error creating batch bookings:", error);
      setProcessingPayment(false);
      setCreatingBooking(false);
      setPaymentError(error.message || "Failed to create bookings");
    }
  };

  // Save batch booking details for thank you page
  const saveBatchBookingDetails = (batchResponse: any) => {
    if (!selectedService || !selectedTime) return;

    try {
      // Calculate total amounts including additional services
      const mainServiceDeposit = selectedService.price_amount;
      const additionalServicesDeposit = additionalServices.reduce(
        (total, additionalService) =>
          total + additionalService.service.price_amount,
        0,
      );
      const totalDeposit = mainServiceDeposit + additionalServicesDeposit;
      const totalAmount =
        selectedService.price_amount * 2 +
        additionalServices.reduce(
          (total, additionalService) =>
            total + additionalService.service.price_amount * 2,
          0,
        );

      // Create service list including additional services
      const servicesList = [selectedService.name];
      if (additionalServices.length > 0) {
        servicesList.push(...additionalServices.map((add) => add.service.name));
      }

      // Get the main booking details
      const mainBooking = batchResponse.created_bookings?.[0]?.booking;

      localStorage.setItem(
        "lastBooking",
        JSON.stringify({
          id: mainBooking?.data?.id || "pending",
          square_booking_id: mainBooking?.data?.square_booking_id || "pending",
          service: servicesList.join(", "),
          date: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("YYYY-MM-DD"),
          time: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("h:mm A"),
          deposit: (totalDeposit / 100).toFixed(2),
          total: (totalAmount / 100).toFixed(2),
          status: mainBooking?.data?.status || "confirmed",
          square_confirmed: true,
          backend_synced: true, // Already synced through batch API
          additional_services: additionalServices.length,
          total_bookings_created: batchResponse.total_created,
          batch_booking_ids: batchResponse.created_bookings.map(
            (b: any) => b.booking.data.id,
          ),
        }),
      );
    } catch (error) {
      console.error("Error saving batch booking details:", error);
    }
  };

  // Load selected service from localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?returnUrl=/book/services");
      return;
    }

    const serviceData = localStorage.getItem("selectedService");
    if (!serviceData) {
      // No service selected, redirect back to services page
      router.push("/book/services");
      return;
    }

    try {
      const parsedService = JSON.parse(serviceData) as Service;
      setSelectedService(parsedService);
    } catch (err: any) {
      console.error("Error parsing selected service:", err);
      router.push("/book/services");
    }
  }, [isAuthenticated, router]);

  // Fetch all services and barbers for additional service selection
  useEffect(() => {
    const fetchAllServicesAndBarbers = async () => {
      try {
        const serviceList = await BookingService.getAllServices();
        setAllServices(serviceList);

        const barbersByService: Record<number, TeamMember[]> = {};
        for (const service of serviceList) {
          try {
            const serviceBarbers = await BookingService.getBarbersForService(
              service.id,
            );
            barbersByService[service.id] = serviceBarbers;
          } catch (err) {
            console.error(
              `Failed to fetch barbers for service ${service.id}:`,
              err,
            );
          }
        }

        setAllBarbers(barbersByService);
      } catch (err) {
        console.error("Error fetching services and barbers:", err);
      }
    };

    if (isAuthenticated) {
      fetchAllServicesAndBarbers();
    }
  }, [isAuthenticated]);

  // Handle redirect when booking is confirmed
  useEffect(() => {
    if (bookingConfirmed) {
      // Clean up localStorage
      localStorage.removeItem("selectedService");
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
        // Convert selected date to Melbourne timezone to match API response keys
        const melbourneDateKey = dayjs(selectedDate)
          .tz("Australia/Melbourne")
          .format("YYYY-MM-DD");
        const availabilities =
          cachedData?.availabilities_by_date?.[melbourneDateKey] || [];

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
        // Convert selected date to Melbourne timezone to match API response keys
        const melbourneDateKey = dayjs(selectedDate)
          .tz("Australia/Melbourne")
          .format("YYYY-MM-DD");
        const availabilities =
          response?.availabilities_by_date?.[melbourneDateKey] || [];

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
  // Use Melbourne timezone for consistency with API response keys
  const selectedDateString = dayjs(selectedDate)
    .tz("Australia/Melbourne")
    .format("YYYY-MM-DD");

  // Update available times when selected date changes
  useEffect(() => {
    if (!availabilityData) return;

    // Get the key for the selected date
    const dateKey = selectedDateString;

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
    setSelectedTime(null); // Reset selected time when date changes
    // Note: We use selectedDateString instead of selectedDate to avoid complex expression warning
  }, [availabilityData, selectedDateString]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset selected time when date changes
  };

  // Handle month changes from the calendar
  const handleMonthChange = (date: Date) => {
    console.log("Month changed to:", date);
    // Clear any previously selected time
    setSelectedTime(null);

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
    setShowPaymentForm(true);
  };

  // Additional service handlers
  const handleAddAdditionalService = () => {
    setShowServiceDialog(true);
  };

  const handleSelectAdditionalService = (service: Service) => {
    setTempAdditionalService(service);
    setShowServiceDialog(false);
    setShowBarberDialog(true);
  };

  const handleSelectAdditionalBarber = (barber: TeamMember) => {
    setTempAdditionalBarber(barber);
    setShowBarberDialog(false);
    setShowDateDialog(true);

    // Fetch availability for this service
    if (tempAdditionalService) {
      fetchAdditionalServiceAvailability(
        tempAdditionalService.service_variation_id,
      );
    }
  };

  const handleSelectRandomAdditionalBarber = () => {
    if (
      tempAdditionalService &&
      allBarbers[tempAdditionalService.id] &&
      allBarbers[tempAdditionalService.id].length > 0
    ) {
      // Randomly select a barber from available barbers for this service
      const availableBarbers = allBarbers[tempAdditionalService.id];
      const randomIndex = Math.floor(Math.random() * availableBarbers.length);
      const randomBarber = availableBarbers[randomIndex];

      setTempAdditionalBarber(randomBarber);
      setShowBarberDialog(false);
      setShowDateDialog(true);

      // Fetch availability for this service
      fetchAdditionalServiceAvailability(
        tempAdditionalService.service_variation_id,
      );
    }
  };

  const handleSelectAdditionalTime = (timeSlot: TimeSlot | null) => {
    setTempAdditionalTime(timeSlot);
  };

  const handleConfirmAdditionalService = () => {
    if (tempAdditionalService && tempAdditionalBarber && tempAdditionalTime) {
      const newAdditionalService: AdditionalService = {
        service: tempAdditionalService,
        barber: tempAdditionalBarber,
        timeSlot: tempAdditionalTime,
      };

      setAdditionalServices((prev) => [...prev, newAdditionalService]);

      // Reset temp state
      setTempAdditionalService(null);
      setTempAdditionalBarber(null);
      setTempAdditionalTime(null);
      setTempAvailableTimes([]);
      setTempAvailableDates([]);
      setShowDateDialog(false);
    }
  };

  const handleRemoveAdditionalService = (index: number) => {
    setAdditionalServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Check if a service/barber/time combination is already selected
  const isServiceTimeConflict = (
    serviceId: number,
    teamMemberId: string,
    startAt: string,
  ) => {
    // Check main booking - only conflict if it's the exact same time
    if (selectedTime?.start_at === startAt) {
      return true;
    }

    // Check additional services - only conflict if it's the exact same time slot
    return additionalServices.some(
      (additional) => additional.timeSlot.start_at === startAt,
    );
  };

  // Fetch availability for additional service
  const fetchAdditionalServiceAvailability = async (
    serviceVariationId: string,
    targetDate?: Date,
  ) => {
    setTempIsLoading(true);

    try {
      const now = new Date();
      // Square API has a max query range of 32 days, so let's use 30 days to be safe
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const response = await BookingService.searchAvailability(
        serviceVariationId,
        now,
        endDate,
      );

      const dates = Object.keys(response.availabilities_by_date);
      setTempAvailableDates(dates);

      // Set times for the specified date or current temp date
      const dateToUse = targetDate || tempAdditionalDate;
      const dateKey = dayjs(dateToUse)
        .tz("Australia/Melbourne")
        .format("YYYY-MM-DD");
      const availabilities = response.availabilities_by_date[dateKey] || [];

      console.log(
        `Additional service availability for ${dateKey}:`,
        availabilities.length,
        "slots",
      );

      // Filter out conflicting times
      const filteredAvailabilities = availabilities.filter((slot) => {
        const conflict = isServiceTimeConflict(
          tempAdditionalService?.id || 0,
          slot.appointment_segments?.[0]?.team_member_id || "",
          slot.start_at,
        );
        return !conflict;
      });

      console.log(
        `After filtering conflicts: ${filteredAvailabilities.length} available slots`,
      );

      // Sort times chronologically
      filteredAvailabilities.sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );

      setTempAvailableTimes(filteredAvailabilities);
    } catch (err) {
      console.error("Error fetching additional service availability:", err);
      setTempAvailableTimes([]);
    } finally {
      setTempIsLoading(false);
    }
  };

  // Handle additional service date changes
  const handleAdditionalDateChange = async (date: Date) => {
    setTempAdditionalDate(date);
    setTempAdditionalTime(null);

    if (tempAdditionalService) {
      setTempIsLoading(true);

      // Get the date key for the selected date
      const dateKey = dayjs(date)
        .tz("Australia/Melbourne")
        .format("YYYY-MM-DD");

      // Check if we already have availability data for this date
      if (tempAvailableDates.includes(dateKey)) {
        // We have data, just need to filter for this specific date
        try {
          const now = new Date();
          // Square API has a max query range of 32 days, so let's use 30 days to be safe
          const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

          const response = await BookingService.searchAvailability(
            tempAdditionalService.service_variation_id,
            now,
            endDate,
          );

          const availabilities = response.availabilities_by_date[dateKey] || [];

          // Filter out conflicting times
          const filteredAvailabilities = availabilities.filter((slot) => {
            return !isServiceTimeConflict(
              tempAdditionalService?.id || 0,
              slot.appointment_segments?.[0]?.team_member_id || "",
              slot.start_at,
            );
          });

          // Sort times chronologically
          filteredAvailabilities.sort(
            (a, b) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          );

          setTempAvailableTimes(filteredAvailabilities);
        } catch (err) {
          console.error("Error updating times for date:", err);
          setTempAvailableTimes([]);
        }
      } else {
        // No availability for this date
        setTempAvailableTimes([]);
      }

      setTempIsLoading(false);
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Calendar and time selection */}
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

          {/* Right column - Booking summary and payment */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">SUMMARY</h2>
            {renderBookingStatus()}

            {showPaymentForm ? (
              <PaymentForm
                squareCard={squareCard}
                selectedService={selectedService}
                selectedTime={selectedTime}
                processingPayment={processingPayment}
                creatingBooking={creatingBooking}
                paymentError={paymentError}
                handlePayment={handlePayment}
                onCancelPayment={() => setShowPaymentForm(false)}
                additionalServices={additionalServices}
              />
            ) : (
              <>
                <BookingSummary
                  selectedService={selectedService}
                  selectedTime={selectedTime}
                  error={error}
                  onProceedToPayment={handleShowPaymentForm}
                  showPaymentForm={showPaymentForm}
                  additionalServices={additionalServices}
                  onRemoveAdditionalService={handleRemoveAdditionalService}
                />

                {/* Add Additional Service Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleAddAdditionalService}
                    variant="outline"
                    className="w-full bg-black text-white hover:bg-gray-800 border-black"
                  >
                    Add Additional Service
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Service Selection Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent
          className="max-w-none w-[95vw] max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-50 to-white"
          style={{ width: "95vw", maxWidth: "1400px" }}
        >
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
              Select Additional Service
            </DialogTitle>
            <p className="text-gray-600 text-center mt-2">
              Choose from our available services to complete your grooming
              experience
            </p>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
            <div className="max-w-5xl mx-auto">
              <div className="grid gap-3 sm:gap-4">
                {allServices
                  .filter((service) => service.id !== selectedService?.id)
                  .filter(
                    (service) =>
                      allBarbers[service.id] &&
                      allBarbers[service.id].length > 0,
                  )
                  .map((service) => {
                    return (
                      <div
                        key={service.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group"
                        onClick={() => handleSelectAdditionalService(service)}
                      >
                        <div className="flex flex-col sm:flex-row items-center sm:items-center p-4 sm:p-6 gap-4 sm:gap-6">
                          {/* Service Info */}
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1 space-y-2 sm:space-y-3 text-center sm:text-left">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-black transition-colors">
                                  {service.name}
                                </h3>

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                      />
                                    </svg>
                                    <span className="font-bold text-gray-900">
                                      $
                                      {(
                                        (service.price_amount * 2) /
                                        100
                                      ).toFixed(2)}
                                    </span>
                                  </span>

                                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    {service.duration > 10000
                                      ? Math.round(service.duration / 60000)
                                      : service.duration}{" "}
                                    min
                                  </span>

                                  {allBarbers[service.id] && (
                                    <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                                      <span className="font-bold text-gray-900">
                                        {allBarbers[service.id].length} barber
                                        {allBarbers[service.id].length !== 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </span>
                                  )}
                                </div>

                                {service.description && (
                                  <p className="text-sm sm:text-base text-gray-600 line-clamp-2 leading-relaxed">
                                    {service.description}
                                  </p>
                                )}
                              </div>

                              {/* Action Button */}
                              <div className="flex-shrink-0 w-full sm:w-auto">
                                <Button
                                  className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 font-semibold transition-all duration-200 group-hover:bg-gray-800 shadow-sm"
                                  disabled={
                                    !allBarbers[service.id] ||
                                    allBarbers[service.id].length === 0
                                  }
                                >
                                  Select Service
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barber Selection Dialog */}
      <Dialog open={showBarberDialog} onOpenChange={setShowBarberDialog}>
        <DialogContent
          className="max-w-none w-[95vw] max-h-[90vh] overflow-hidden bg-gradient-to-b from-gray-50 to-white"
          style={{ width: "95vw", maxWidth: "1200px" }}
        >
          <DialogHeader className="border-b border-gray-200 pb-4 sm:pb-6">
            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center">
              Choose Your Barber
            </DialogTitle>
            {tempAdditionalService && (
              <div className="text-center mt-4">
                <div className="bg-white rounded-lg shadow-sm border p-4 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900">
                    {tempAdditionalService.name}
                  </h3>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      $
                      {((tempAdditionalService.price_amount * 2) / 100).toFixed(
                        2,
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      {tempAdditionalService.duration > 10000
                        ? Math.round(tempAdditionalService.duration / 60000)
                        : tempAdditionalService.duration}{" "}
                      min
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-3 sm:p-6">
            {tempAdditionalService && allBarbers[tempAdditionalService.id] ? (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-6 max-w-2xl mx-auto">
                  {/* <p className="text-xs text-gray-700 text-center">
                    🎯 <strong>Limited Availability</strong> - Book your preferred time slot today!
                  </p> */}
                </div>

                <div className="max-w-6xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Random Barber Card - First Position */}
                    {allBarbers[tempAdditionalService.id] &&
                      allBarbers[tempAdditionalService.id].length > 0 && (
                        <div
                          className="h-min bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group max-w-sm mx-auto border-2 border-dashed border-purple-300 hover:border-purple-500"
                          onClick={handleSelectRandomAdditionalBarber}
                        >
                          {/* Card Content */}
                          <div className="p-6 space-y-4">
                            {/* Review Text */}
                            <p className="text-purple-800 text-md leading-relaxed font-medium">
                              Let our expert team choose the perfect barber for
                              your style. Every one of our barbers delivers
                              exceptional results.
                            </p>

                            {/* Customer Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    ✨
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-purple-900">
                                    Random Selection
                                  </p>
                                </div>
                              </div>
                              <div className="text-purple-300 text-2xl">
                                &quot;
                              </div>
                            </div>
                          </div>

                          {/* Book Button */}
                          <div className="px-6 pt-16 pb-4">
                            <button className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-4 rounded-lg transition-all duration-200 group-hover:shadow-lg transform group-hover:scale-105">
                              Choose the next available Barber
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Regular Barber Cards */}
                    {allBarbers[tempAdditionalService.id].map((barber) => {
                      const barberImage = getBarberImageSafe(
                        barber.first_name,
                        barber.last_name,
                      );
                      return (
                        <div
                          key={barber.id}
                          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group max-w-sm mx-auto"
                          onClick={() => handleSelectAdditionalBarber(barber)}
                        >
                          {/* Barber Image */}
                          <div className="aspect-square bg-gray-100 relative overflow-hidden">
                            <Image
                              src={barberImage.src}
                              width={400}
                              height={400}
                              alt={barberImage.alt}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                  <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                                      <span class="text-gray-400 text-3xl font-bold">?</span>
                                    </div>
                                  </div>
                                `;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                            {/* Overlay Info */}
                            <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 text-white">
                              <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-wide">
                                {barber.first_name}
                              </h3>
                              <p className="text-sm sm:text-lg opacity-90 font-medium">
                                {barber.last_name}
                              </p>
                            </div>

                            {/* Professional Badge */}
                            <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                                <svg
                                  className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="p-6 space-y-4">
                            <div className="space-y-3 sm:space-y-4 mb-2 sm:mb-6">
                              {/* Languages */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 5h12l-4 4h8l-4 4H3z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                    Languages
                                  </p>
                                  <p className="text-sm sm:text-base lg:text-lg">
                                    🇦🇺 🇬🇷
                                  </p>
                                </div>
                              </div>

                              {/* Social Handle */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                    Social
                                  </p>
                                  <p className="text-sm sm:text-base font-mono text-gray-900">
                                    @{barber.first_name.toLowerCase()}.barber
                                  </p>
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                    Status
                                  </p>
                                  <p className="text-sm sm:text-base capitalize font-semibold text-green-700">
                                    {barber.status}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Book Button */}
                            <div className="px-6 pb-6">
                              <Button className="w-full bg-gradient-to-r from-gray-900 to-black text-white hover:from-gray-800 hover:to-gray-900 group-hover:from-black group-hover:to-gray-800 transition-all duration-300 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform sm:hover:scale-105">
                                <span className="flex items-center justify-center gap-2">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Select {barber.first_name}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Barbers Available
                </h3>
                <p className="text-gray-500">
                  No barbers are currently available for this service. Please
                  try another service or contact us directly.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Date/Time Selection Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Select Date & Time for {tempAdditionalService?.name} with{" "}
              {tempAdditionalBarber?.first_name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-4">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <DateTimeSelector
                  selectedDate={tempAdditionalDate}
                  onDateChange={handleAdditionalDateChange}
                  onMonthChange={handleAdditionalDateChange}
                  onTimeSelect={handleSelectAdditionalTime}
                  selectedTime={tempAdditionalTime}
                  availableTimes={tempAvailableTimes}
                  availableDates={tempAvailableDates}
                  isLoading={tempIsLoading}
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Selection Summary</h3>
                {tempAdditionalService && (
                  <div className="space-y-2">
                    <p>
                      <strong>Service:</strong> {tempAdditionalService.name}
                    </p>
                    {tempAdditionalBarber && (
                      <p>
                        <strong>Barber:</strong>{" "}
                        {tempAdditionalBarber.first_name}{" "}
                        {tempAdditionalBarber.last_name}
                      </p>
                    )}
                    {tempAdditionalTime && (
                      <p>
                        <strong>Time:</strong>{" "}
                        {dayjs(tempAdditionalTime.start_at)
                          .tz("Australia/Melbourne")
                          .format("h:mm A on dddd, MMM D")}
                      </p>
                    )}
                    <p>
                      <strong>Price:</strong> $
                      {((tempAdditionalService.price_amount * 2) / 100).toFixed(
                        2,
                      )}
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleConfirmAdditionalService}
                  disabled={!tempAdditionalTime}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                >
                  {tempAdditionalTime
                    ? "Confirm Additional Service"
                    : "Please Select a Time"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
