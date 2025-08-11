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
      // Calculate total amount and 50% deposit including additional services
      const mainServicePrice = selectedService.price_amount;
      const additionalServicesPrice = additionalServices.reduce(
        (total, additionalService) =>
          total + additionalService.service.price_amount,
        0,
      );
      const totalAmount = mainServicePrice + additionalServicesPrice;
      const depositAmount = Math.round(totalAmount * 0.5); // 50% deposit, rounded to avoid decimal cents
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

  // Create multiple separate bookings
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

      // Main service booking
      const mainServiceVariationVersion =
        selectedTime.appointment_segments?.[0]?.service_variation_version;

      bookingsToCreate.push({
        service_variation_id: selectedService.service_variation_id,
        team_member_id: selectedTime.appointment_segments?.[0]?.team_member_id || "",
        start_at: selectedTime.start_at,
        customer_note: `Main service: ${selectedService.name}`,
        service_variation_version: mainServiceVariationVersion,
      });

      // Additional services bookings
      additionalServices.forEach((additionalService, index) => {
        bookingsToCreate.push({
          service_variation_id: additionalService.service.service_variation_id,
          team_member_id: additionalService.timeSlot.appointment_segments?.[0]?.team_member_id || "",
          start_at: additionalService.timeSlot.start_at,
          customer_note: `Additional service ${index + 1}: ${additionalService.service.name}`,
          service_variation_version: additionalService.timeSlot.appointment_segments?.[0]?.service_variation_version,
        });
      });

      // Create batch booking request
      const batchBookingRequest = {
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
      const bookingResponse = await BookingService.createBatchBookings(
        batchBookingRequest,
      );

      if (bookingResponse.success) {
        // Store the first booking ID
        const firstBooking = bookingResponse.created_bookings?.[0]?.booking;
        if (firstBooking?.data?.square_booking_id) {
          setSquareBookingId(firstBooking.data.square_booking_id);
        }

        // Update payment receipt with booking IDs
        const receiptData = JSON.parse(
          localStorage.getItem("paymentReceipt") || "{}",
        );
        localStorage.setItem(
          "paymentReceipt",
          JSON.stringify({
            ...receiptData,
            bookings: bookingResponse.created_bookings,
            totalBookings: bookingResponse.total_created,
          }),
        );

        // Mark booking as confirmed and handle UI transitions
        setBookingConfirmed(true);
        setProcessingPayment(false);
        setCreatingBooking(false);

        // Save booking details for thank you page
        saveBookingDetails(bookingResponse);
      } else {
        throw new Error(
          bookingResponse.errors?.length > 0
            ? `Failed to create bookings: ${bookingResponse.errors.map(e => e.error).join(", ")}`
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

  // Save booking details for thank you page
  const saveBookingDetails = (bookingResponse: any) => {
    if (!selectedService || !selectedTime) return;

    try {
      // Calculate total amounts including additional services
      const mainServicePrice = selectedService.price_amount;
      const additionalServicesPrice = additionalServices.reduce(
        (total, additionalService) =>
          total + additionalService.service.price_amount,
        0,
      );
      const totalAmount = mainServicePrice + additionalServicesPrice;
      const totalDeposit = Math.round(totalAmount * 0.5); // 50% deposit

      // Create service list including additional services
      const servicesList = [selectedService.name];
      if (additionalServices.length > 0) {
        servicesList.push(...additionalServices.map((add) => add.service.name));
      }

      // Get the first booking details (main booking)
      const firstBooking = bookingResponse.created_bookings?.[0]?.booking;

      localStorage.setItem(
        "lastBooking",
        JSON.stringify({
          id: firstBooking?.data?.id || "pending",
          square_booking_id: firstBooking?.data?.square_booking_id || "pending",
          service: servicesList.join(", "),
          date: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("YYYY-MM-DD"),
          time: dayjs(selectedTime.start_at)
            .tz("Australia/Melbourne")
            .format("h:mm A"),
          deposit: (totalDeposit / 100).toFixed(2),
          total: (totalAmount / 100).toFixed(2),
          status: firstBooking?.data?.status || "confirmed",
          square_confirmed: true,
          backend_synced: true, 
          additional_services: additionalServices.length,
          total_bookings: bookingResponse.total_created || 1, // Total separate bookings created
          booking_ids: bookingResponse.created_bookings?.map((b: {booking: any}) => b.booking?.data?.id) || [],
        }),
      );
    } catch (error) {
      console.error("Error saving booking details:", error);
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

  // Services and barbers are now fetched when "Add Additional Service" button is clicked

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
  
  // Debug: Log the selected date conversion
  console.log("Selected date (local):", selectedDate);
  console.log("Selected date string:", selectedDateString);

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
    setAdditionalServices([]); // Clear additional services when date changes
    // Note: We use selectedDateString instead of selectedDate to avoid complex expression warning
  }, [availabilityData, selectedDateString]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset selected time when date changes
    setAdditionalServices([]); // Clear additional services when date changes
  };

  // Handle month changes from the calendar
  const handleMonthChange = (date: Date) => {
    console.log("Month changed to:", date);
    // Clear any previously selected time and additional services
    setSelectedTime(null);
    setAdditionalServices([]);

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

  // Recalculate additional service times when main service time changes
  useEffect(() => {
    if (!selectedTime || !selectedService) {
      return;
    }

    // Use callback to access current additionalServices without adding to dependencies
    setAdditionalServices(currentServices => {
      if (currentServices.length === 0) {
        return currentServices; // No change if no additional services
      }

      console.log("Main service time changed, recalculating additional service times...");
      
      // Recalculate times for all additional services sequentially
      const recalculatedServices = currentServices.map((additionalService, index) => {
        // Calculate the start time based on previous services
        let calculatedStartTime: Date;
        
        if (index === 0) {
          // First additional service starts after main service
          calculatedStartTime = new Date(selectedTime.start_at);
          const mainServiceDuration = selectedService.duration > 10000 
            ? selectedService.duration / 60000 
            : selectedService.duration;
          calculatedStartTime.setMinutes(calculatedStartTime.getMinutes() + mainServiceDuration);
        } else {
          // Subsequent services start after previous additional service
          const previousService = currentServices[index - 1];
          calculatedStartTime = new Date(previousService.timeSlot.start_at);
          const previousDuration = previousService.service.duration > 10000 
            ? previousService.service.duration / 60000 
            : previousService.service.duration;
          calculatedStartTime.setMinutes(calculatedStartTime.getMinutes() + previousDuration);
        }

        // Apply 30-minute rounding
        const minutes = calculatedStartTime.getMinutes();
        const remainder = minutes % 30;
        if (remainder !== 0) {
          calculatedStartTime.setMinutes(minutes + (30 - remainder));
        }

        // Create new time slot with recalculated time
        const newTimeSlot = {
          ...additionalService.timeSlot,
          start_at: calculatedStartTime.toISOString()
        };

        console.log(`Recalculated ${additionalService.service.name} to: ${dayjs(calculatedStartTime).tz("Australia/Melbourne").format("h:mm A")}`);

        return {
          ...additionalService,
          timeSlot: newTimeSlot
        };
      });

      return recalculatedServices;
    });
  }, [selectedTime, selectedService]); // Only depend on selectedTime and selectedService

  // Show payment form
  const handleShowPaymentForm = () => {
    if (!selectedService || !selectedTime || !user) {
      setError("Please select a service and time first");
      return;
    }
    setShowPaymentForm(true);
  };

  // Additional service handlers
  const handleAddAdditionalService = async () => {
    // Check if main service time is selected
    if (!selectedTime || !selectedService) {
      setError("Please select a main service and time first");
      return;
    }

    // Fetch fresh services and barbers when dialog opens
    try {
      setError(null); // Clear any existing errors
      console.log("Fetching services and barbers for additional service dialog...");
      
      const serviceList = await BookingService.getAllServices();
      console.log(`Fetched ${serviceList.length} services:`, serviceList.map(s => s.name));
      setAllServices(serviceList);

      const barbersByService: Record<number, TeamMember[]> = {};
      for (const service of serviceList) {
        try {
          const serviceBarbers = await BookingService.getBarbersForService(
            service.id,
          );
          // Filter out barbers with is_owner=true
          const availableBarbers = serviceBarbers.filter(barber => !barber.is_owner);
          barbersByService[service.id] = availableBarbers;
          console.log(`Service ${service.name}: ${availableBarbers.length} available barbers`);
        } catch (err) {
          console.error(
            `Failed to fetch barbers for service ${service.id} (${service.name}):`,
            err,
          );
          // Set empty array instead of leaving undefined
          barbersByService[service.id] = [];
        }
      }

      console.log("All barbers by service:", Object.keys(barbersByService).map(id => 
        `${serviceList.find(s => s.id === parseInt(id))?.name}: ${barbersByService[parseInt(id)].length} barbers`
      ));
      
      setAllBarbers(barbersByService);
      setShowServiceDialog(true);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Failed to load services. Please try again.");
    }
  };

  const handleSelectAdditionalService = async (service: Service) => {
    console.log("🚀 handleSelectAdditionalService called with service:", service.name);
    
    if (!selectedTime || !selectedService) {
      setError("Please select a main service and time first");
      return;
    }

    // Get the barber from the main booking
    const mainBarber = selectedTime.appointment_segments?.[0]?.team_member_id;
    console.log("Main barber ID from selectedTime:", mainBarber);
    console.log("selectedTime structure:", selectedTime);
    
    if (!mainBarber) {
      setError("Cannot determine main service barber");
      return;
    }

    // Debug allBarbers structure
    console.log("allBarbers structure:", allBarbers);
    console.log("allBarbers keys:", Object.keys(allBarbers));
    const flattenedBarbers = Object.values(allBarbers).flat();
    console.log("Flattened barbers count:", flattenedBarbers.length);
    console.log("Flattened barbers IDs:", flattenedBarbers.map(b => b.square_up_id));
    
    // Debug data types
    console.log("mainBarber type and value:", typeof mainBarber, mainBarber);
    flattenedBarbers.forEach(barber => {
      console.log(`Barber ${barber.first_name} ${barber.last_name}: type=${typeof barber.square_up_id}, value="${barber.square_up_id}"`);
    });

    // Find the barber object - first check in allBarbers, then fetch from API if needed
    // Try both strict and loose equality comparisons
    let barberObj = flattenedBarbers.find(
      barber => barber.square_up_id === mainBarber || barber.square_up_id == mainBarber
    );
    
    if (!barberObj) {
      try {
        // Fetch all team members to find the main barber
        console.log(`Main barber (${mainBarber}) not found in allBarbers, fetching all team members...`);
        const allTeamMembers = await BookingService.getTeamMembers();
        console.log(`Fetched ${allTeamMembers.length} team members from API`);
        console.log("All team members:", allTeamMembers.map(tm => ({ 
          id: tm.id, 
          square_up_id: tm.square_up_id, 
          name: `${tm.first_name} ${tm.last_name}`,
          is_owner: tm.is_owner 
        })));
        
        // Debug data types in API response
        console.log("From API - mainBarber type and value:", typeof mainBarber, mainBarber);
        allTeamMembers.forEach(barber => {
          console.log(`API Barber ${barber.first_name} ${barber.last_name}: type=${typeof barber.square_up_id}, value="${barber.square_up_id}"`);
        });
        
        // Try both strict and loose equality comparisons
        barberObj = allTeamMembers.find(barber => barber.square_up_id === mainBarber || barber.square_up_id == mainBarber);
        
        if (!barberObj) {
          console.error(`Main barber with ID ${mainBarber} not found in ${allTeamMembers.length} team members`);
          console.error("Available team member IDs:", allTeamMembers.map(tm => tm.square_up_id));
          setError("Main service barber not found");
          return;
        }
        console.log(`Found main barber: ${barberObj.first_name} ${barberObj.last_name} (${barberObj.square_up_id})`);
      } catch (error) {
        console.error("Error fetching team members:", error);
        setError("Failed to load barber information");
        return;
      }
    } else {
      console.log(`Found main barber in allBarbers: ${barberObj.first_name} ${barberObj.last_name} (${barberObj.square_up_id})`);
    }

    try {
      // Calculate when the LAST added service ends (sequential logic for all services)
      let lastServiceEndTime;
      
      if (additionalServices.length === 0) {
        // No additional services yet, schedule after main service
        lastServiceEndTime = new Date(selectedTime.start_at);
        const mainServiceDuration = selectedService.duration > 10000 
          ? selectedService.duration / 60000 
          : selectedService.duration;
        lastServiceEndTime.setMinutes(lastServiceEndTime.getMinutes() + mainServiceDuration);
      } else {
        // Schedule after the last added service (most recent in the array)
        const lastAddedService = additionalServices[additionalServices.length - 1];
        lastServiceEndTime = new Date(lastAddedService.timeSlot.start_at);
        const lastServiceDuration = lastAddedService.service.duration > 10000 
          ? lastAddedService.service.duration / 60000 
          : lastAddedService.service.duration;
        lastServiceEndTime.setMinutes(lastServiceEndTime.getMinutes() + lastServiceDuration);
      }
      
      // Round up to next 30-minute increment if not already on one
      const minutes = lastServiceEndTime.getMinutes();
      const remainder = minutes % 30;
      if (remainder !== 0) {
        lastServiceEndTime.setMinutes(minutes + (30 - remainder));
      }
      
      const endTimeFormatted = dayjs(lastServiceEndTime).tz("Australia/Melbourne").format("h:mm A");
      console.log(`Last service ends at: ${lastServiceEndTime.toISOString()} (${endTimeFormatted})`);

      // Check if this is the same service as main service
      const isSameService = service.id === selectedService.id;
      let assignedTimeSlot;

      if (isSameService) {
        // Same service - use cached availability data for same date
        const selectedTimeDate = dayjs(selectedTime.start_at).format("YYYY-MM-DD");
        const availableTimesForDate = availabilityData?.availabilities_by_date?.[selectedTimeDate] || [];
        
        console.log("Same service - using cached data for date:", selectedTimeDate);
        console.log("Available times:", availableTimesForDate.map(slot => ({
          time: slot.start_at,
          formatted: dayjs(slot.start_at).tz("Australia/Melbourne").format("h:mm A")
        })));
        
        // Check if the exact rounded time slot is available and valid
        const exactMatchSlot = availableTimesForDate.find(slot => {
          const slotTime = new Date(slot.start_at);
          const isExactTime = Math.abs(slotTime.getTime() - lastServiceEndTime.getTime()) < 60000; // Within 1 minute
          const isSameBarber = slot.appointment_segments?.[0]?.team_member_id === mainBarber;
          const noConflict = !isServiceTimeConflict(service.id, mainBarber, slot.start_at);
          
          return isExactTime && isSameBarber && noConflict;
        });

        if (exactMatchSlot) {
          assignedTimeSlot = exactMatchSlot;
          console.log(`Using exact match slot at ${dayjs(exactMatchSlot.start_at).tz("Australia/Melbourne").format("h:mm A")}`);
        } else {
          // Always use the calculated rounded time, create custom slot
          console.log(`No exact match found, creating slot at calculated time ${dayjs(lastServiceEndTime).tz("Australia/Melbourne").format("h:mm A")}`);
          assignedTimeSlot = {
            start_at: lastServiceEndTime.toISOString(),
            location_id: selectedTime.location_id, // Use the same location as the main service
            appointment_segments: [{
              team_member_id: mainBarber,
              service_variation_id: service.service_variation_id,
              duration_minutes: service.duration > 10000 
                ? Math.round(service.duration / 60000) 
                : service.duration,
              service_variation_version: 1 // Add required field
            }]
          };
        }
      } else {
        // Different service - fetch fresh availability and find slot after last service end time
        console.log("Different service - fetching fresh availability");
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1); // Only fetch selected day + 1 day

        const response = await BookingService.searchAvailability(
          service.service_variation_id,
          startDate,
          endDate,
        );

        // Get all available slots and filter for same barber and after last service end time
        const allAvailableSlots = Object.values(response.availabilities_by_date).flat();
        console.log("All available slots for different service:", allAvailableSlots.map(slot => ({
          time: slot.start_at,
          formatted: dayjs(slot.start_at).tz("Australia/Melbourne").format("h:mm A")
        })));

        // Check if the exact rounded time slot is available and valid
        const exactMatchSlot = allAvailableSlots.find(slot => {
          const slotTime = new Date(slot.start_at);
          const slotDay = dayjs(slot.start_at).tz("Australia/Melbourne").format("YYYY-MM-DD");
          const selectedDay = dayjs(selectedDate).format("YYYY-MM-DD");
          
          const isExactTime = Math.abs(slotTime.getTime() - lastServiceEndTime.getTime()) < 60000; // Within 1 minute
          const isSameBarber = slot.appointment_segments?.[0]?.team_member_id === mainBarber;
          const noConflict = !isServiceTimeConflict(service.id, mainBarber, slot.start_at);
          const isSameDay = slotDay === selectedDay;
          
          return isExactTime && isSameBarber && noConflict && isSameDay;
        });

        if (exactMatchSlot) {
          assignedTimeSlot = exactMatchSlot;
          console.log(`Using exact match slot at ${dayjs(exactMatchSlot.start_at).tz("Australia/Melbourne").format("h:mm A")}`);
        } else {
          // Always use the calculated rounded time, create custom slot
          console.log(`No exact match found, creating slot at calculated time ${dayjs(lastServiceEndTime).tz("Australia/Melbourne").format("h:mm A")}`);
          assignedTimeSlot = {
            start_at: lastServiceEndTime.toISOString(),
            location_id: selectedTime.location_id, // Use the same location as the main service
            appointment_segments: [{
              team_member_id: mainBarber,
              service_variation_id: service.service_variation_id,
              duration_minutes: service.duration > 10000 
                ? Math.round(service.duration / 60000) 
                : service.duration,
              service_variation_version: 1 // Add required field
            }]
          };
        }
      }

      if (assignedTimeSlot) {
        const selectedFormatted = dayjs(assignedTimeSlot.start_at).tz("Australia/Melbourne").format("h:mm A");
        const selectedDay = dayjs(assignedTimeSlot.start_at).tz("Australia/Melbourne").format("dddd, MMM D");
        console.log(`Selected next slot: ${selectedFormatted} on ${selectedDay} (${assignedTimeSlot.start_at})`);
      } else {
        console.log("No available slot found, using fallback time");
        // Check if the fallback time is still on the same day
        const fallbackDay = dayjs(lastServiceEndTime).tz("Australia/Melbourne").format("YYYY-MM-DD");
        const selectedDay = dayjs(selectedDate).format("YYYY-MM-DD");
        
        if (fallbackDay !== selectedDay) {
          console.log("Fallback time would be on different day, rejecting");
          // Show error or handle appropriately - for now, let's try to find the last possible slot of the day
          const endOfDay = dayjs(selectedDate).endOf('day').toDate();
          const lastPossibleTime = new Date(Math.min(endOfDay.getTime() - (service.duration > 10000 ? service.duration / 1000 : service.duration * 60 * 1000), endOfDay.getTime()));
          assignedTimeSlot = {
            start_at: lastPossibleTime.toISOString(),
            location_id: selectedTime.location_id, // Use the same location as the main service
            appointment_segments: [{
              team_member_id: mainBarber,
              service_variation_id: service.service_variation_id,
              duration_minutes: service.duration > 10000 
                ? Math.round(service.duration / 60000) 
                : service.duration,
              service_variation_version: 1 // Add required field
            }]
          };
        } else {
          // Fallback to calculated end time if no slots available
          assignedTimeSlot = {
            start_at: lastServiceEndTime.toISOString(),
            location_id: selectedTime.location_id, // Use the same location as the main service
            appointment_segments: [{
              team_member_id: mainBarber,
              service_variation_id: service.service_variation_id,
              duration_minutes: service.duration > 10000 
                ? Math.round(service.duration / 60000) 
                : service.duration,
              service_variation_version: 1 // Add required field
            }]
          };
        }
      }

      // Create the additional service with automatic assignment
      const newAdditionalService: AdditionalService = {
        service: service,
        barber: barberObj,
        timeSlot: assignedTimeSlot,
      };

      setAdditionalServices((prev) => [...prev, newAdditionalService]);
      setShowServiceDialog(false);

    } catch (error) {
      console.error("Error adding additional service:", error);
      setError("Failed to add additional service. Please try again.");
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
                    className="w-full bg-black text-white hover:bg-gray-800 border-black disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
                    disabled={!selectedTime}
                  >
                    {selectedTime ? "Add Additional Service" : "Select Time First"}
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
              Add Another Service
            </DialogTitle>
            <p className="text-gray-600 text-center mt-2">
              Select an additional service with your current barber. Same services will be scheduled consecutively.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
            <div className="max-w-5xl mx-auto">
              <div className="grid gap-3 sm:gap-4">
                {allServices
                  .filter((service) => {
                    // Show all services - we'll assign them to the same barber automatically
                    // The barber matching will be handled in the booking creation logic
                    console.log(`Showing service: ${service.name} (will use main barber for booking)`);
                    return true;
                  })
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
                                      ${(service.price_amount / 100).toFixed(2)}
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

    </main>
  );
}
