"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import BookingService, {
  Service,
  TimeSlot,
  AvailabilityResponse,
  TeamMember,
} from "@/lib/booking-service";
import { calculateBookingPricing, getPaymentBreakdown } from "@/lib/pricing-utils";
import { SimpleBookingForm } from "@/components/pages/appointment/SimpleBookingForm";
import {
  BookingSummary,
  DateTimeSelector,
} from "@/components/pages/appointment";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { MarqueeItems } from "@/components/navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VerificationGuard } from "@/components/verification-guard";
import { FreshaRedirectWrapper } from "@/components/fresha-redirect";

// Note: BookingService.searchAvailability() already handles conversion from self-managed format to UI format
// No additional transformation is needed in the appointment page

// Additional service interface
interface AdditionalService {
  service: Service;
  barber: TeamMember;
  timeSlot: TimeSlot;
}

dayjs.extend(utc);
dayjs.extend(timezone);

function CleanAppointmentPageContent() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Core states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [timeAutoSelected, setTimeAutoSelected] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Availability states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availabilityData, setAvailabilityData] =
    useState<AvailabilityResponse | null>(null);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [monthCache, setMonthCache] = useState<
    Record<string, AvailabilityResponse>
  >({});
  const [showManualTimeSelection, setShowManualTimeSelection] = useState(false);

  // Additional services states
  const [additionalServices, setAdditionalServices] = useState<
    AdditionalService[]
  >([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBarbers, setAllBarbers] = useState<Record<number, TeamMember[]>>(
    {},
  );
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  // Load selected services from localStorage
  useEffect(() => {
    if (!isAuthenticated) return;

    // Load selected services
    const servicesData = localStorage.getItem("selectedServices");
    const selectedBarberId = localStorage.getItem("selectedBarberId");

    if (servicesData) {
      try {
        const services = JSON.parse(servicesData);
        console.log("Loading selected services:", services);

        // Fetch barber-specific pricing for each service
        if (selectedBarberId) {
          const barberId = parseInt(selectedBarberId);
          console.log(`🔍 Fetching pricing for barber ${barberId} and ${services.length} services`);

          Promise.all(
            services.map(async (service: Service) => {
              try {
                console.log(`📞 Fetching barbers for service ${service.id} (${service.name})`);
                // Fetch barbers for this service (includes pricing)
                const barbers = await BookingService.getBarbersForService(service.id);
                console.log(`📊 Got ${barbers.length} barbers for ${service.name}:`, barbers.map(b => ({
                  id: b.id,
                  name: `${b.first_name} ${b.last_name}`,
                  has_pricing: !!b.ServiceTeamMember?.price_amount,
                  price: b.ServiceTeamMember?.price_amount
                })));

                // Find the selected barber's pricing
                const selectedBarberData = barbers.find(b => b.id === barberId);

                if (selectedBarberData?.ServiceTeamMember?.price_amount) {
                  console.log(`💰 Found barber-specific pricing for ${service.name}:`, {
                    base_price_cents: service.base_price_cents,
                    barber_price_cents: selectedBarberData.ServiceTeamMember.price_amount,
                    barber_name: `${selectedBarberData.first_name} ${selectedBarberData.last_name}`
                  });

                  // Update service with barber-specific pricing
                  return {
                    ...service,
                    // Use barber-specific price if available, otherwise base price
                    price_amount: selectedBarberData.ServiceTeamMember.price_amount,
                    base_price_cents: selectedBarberData.ServiceTeamMember.price_amount
                  };
                } else {
                  console.log(`ℹ️ No custom pricing for ${service.name}, using base price ${service.base_price_cents}`);
                  return service;
                }
              } catch (error) {
                console.error(`❌ Error fetching barber pricing for service ${service.id} (${service.name}):`, error);
                return service; // Return original service if fetch fails
              }
            })
          ).then(servicesWithPricing => {
            console.log("✅ Services with barber-specific pricing:", servicesWithPricing);
            setSelectedServices(servicesWithPricing);
            setSelectedService(servicesWithPricing[0] || null);
          }).catch(error => {
            console.error("❌ Promise.all failed:", error);
            // Fallback: use original services
            setSelectedServices(services);
            setSelectedService(services[0] || null);
          });
        } else {
          console.log("⚠️ No barber selected, using base pricing");
          // No barber selected yet, use base pricing
          setSelectedServices(services);
          setSelectedService(services[0] || null);
        }
      } catch (err) {
        console.error("Error parsing selected services:", err);
        router.push("/book/services");
        return;
      }
    } else {
      console.log("No selected services found, redirecting to services");
      router.push("/book/services");
      return;
    }

    // Check for auto-selected time from closest-time barber selection
    const autoSelectedTimeFlag = localStorage.getItem("autoSelectedTime");
    const rescheduleBookingId = localStorage.getItem("rescheduleBookingId");

    // Load selected barber information
    if (selectedBarberId) {
      BookingService.getTeamMembers()
        .then(teamMembers => {
          const barber = teamMembers.find(tm => tm.id === parseInt(selectedBarberId));
          if (barber) {
            console.log("Loaded selected barber:", barber);
            setSelectedBarber(barber);
          }
        })
        .catch(err => {
          console.error("Error loading barber info:", err);
        });
    }

    if (autoSelectedTimeFlag === "true") {
      const savedTimeSlot = localStorage.getItem("selectedTimeSlot");
      if (savedTimeSlot) {
        try {
          const parsedTimeSlot = JSON.parse(savedTimeSlot);
          console.log("Loading auto-selected time slot:", parsedTimeSlot);

          setSelectedTime(parsedTimeSlot);
          setTimeAutoSelected(true);
          setShowPaymentForm(true);

          // Update selectedDate to match the auto-selected time's date
          if (parsedTimeSlot.start_at) {
            const autoSelectedDate = new Date(parsedTimeSlot.start_at);
            setSelectedDate(autoSelectedDate);
            console.log(
              "Updated selectedDate to match auto-selected time:",
              autoSelectedDate.toISOString(),
            );
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
    } else if (rescheduleBookingId) {
      // Reschedule scenario - always show manual time selection
      console.log(
        "Reschedule detected, enabling manual time selection",
        {
          rescheduleBookingId,
        },
      );
      setIsRescheduleMode(true);
      setShowManualTimeSelection(true);
    } else if (selectedBarberId && autoSelectedTimeFlag !== "true") {
      // Manual barber selection - show manual time selection immediately
      console.log(
        "Manual barber selection detected, enabling manual time selection",
        {
          selectedBarberId,
          autoSelectedTimeFlag,
        },
      );
      setShowManualTimeSelection(true);
    } else {
      console.log("🔧 ENABLING MANUAL TIME SELECTION BY DEFAULT", {
        hasSelectedBarberId: !!selectedBarberId,
        autoSelectedTimeFlag,
        hasRescheduleId: !!rescheduleBookingId,
      });
      // Enable manual time selection by default when no auto-selected time
      setShowManualTimeSelection(true);
      console.log("✅ Manual time selection enabled:", true);
    }
  }, [isAuthenticated, router]);

  // Handle booking confirmation
  useEffect(() => {
    if (bookingConfirmed) {
      // Check if this was a reschedule
      const wasReschedule = localStorage.getItem("rescheduleBookingId");

      // Clear localStorage
      localStorage.removeItem("selectedServices");
      localStorage.removeItem("selectedService");
      localStorage.removeItem("selectedBarberId");
      localStorage.removeItem("rescheduleBookingId");

      // Clear additional services
      setAdditionalServices([]);

      // Redirect based on whether it was a reschedule or new booking
      setTimeout(() => {
        if (wasReschedule) {
          // Redirect to My Bookings with success indicator
          router.push("/my-bookings?rescheduleSuccess=true");
        } else {
          // Redirect to thank you page for new bookings
          router.push("/book/thank-you");
        }
      }, 400);
    }
  }, [bookingConfirmed, router]);

  // Fetch availability when service changes or when manual selection is requested
  useEffect(() => {
    console.log("🔍 AVAILABILITY USEEFFECT TRIGGERED:", {
      selectedService: !!selectedService,
      selectedServiceId: selectedService?.id,
      showManualTimeSelection,
      selectedDate: selectedDate.toISOString(),
    });

    if (!selectedService || !showManualTimeSelection) {
      console.log("⏭️ Skipping availability fetch:", {
        noService: !selectedService,
        noManualSelection: !showManualTimeSelection,
      });
      return;
    }

    const fetchAvailabilityData = async () => {
      setIsLoadingAvailability(true);
      setError(null);

      try {
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        const selectedBarberId = localStorage.getItem("selectedBarberId");
        const cacheKey = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0",
        )}-barber-${selectedBarberId || 'all'}`;

        // Check cache first
        if (monthCache[cacheKey]) {
          console.log(`Using cached availability data for ${cacheKey}`);
          const cachedData = monthCache[cacheKey];
          setAvailabilityData(cachedData);

          // Extract available dates
          const dates = Object.keys(cachedData.availabilities_by_date || {});
          setAvailableDates(dates);

          // Update time slots for selected date
          const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
          const availabilities =
            cachedData.availabilities_by_date?.[dateKey] || [];
          availabilities.sort(
            (a, b) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          );
          setAvailableTimes(availabilities);
          return;
        }

        // Fetch new data - get full month range, but only future dates
        console.log("Raw date inputs:", { selectedYear, selectedMonth });

        // Create dates in UTC to avoid timezone conversion issues
        // But ensure startDate is not in the past - Square only allows future bookings
        const today = new Date();
        const todayUTC = new Date(
          Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0,
            0,
          ),
        );

        const monthStart = new Date(
          Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0),
        );
        const startDate = monthStart < todayUTC ? todayUTC : monthStart;
        const endDate = new Date(
          Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999),
        );

        console.log("UTC dates created:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        console.log("Date calculation debug:", {
          selectedDate: selectedDate.toISOString(),
          selectedMonth,
          selectedYear,
          today: today.toISOString(),
          todayUTC: todayUTC.toISOString(),
          monthStart: monthStart.toISOString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        console.log(
          `Fetching self-managed availability for service ${
            selectedService.id
          } from ${startDate.toISOString()} to ${endDate.toISOString()}`,
        );

        // Get selected barber ID for filtering (already retrieved above for cache key)
        const teamMemberIds = selectedBarberId ? [parseInt(selectedBarberId)] : undefined;

        console.log(`🔍 Fetching availability - Service: ${selectedService.id}, Barber: ${selectedBarberId || 'all'}`);

        const selfManagedData = await BookingService.searchAvailability({
          service_id: selectedService.id,
          start_date: startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          end_date: endDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          timezone: 'Australia/Melbourne',
          ...(teamMemberIds && { team_member_ids: teamMemberIds })
        });


        // BookingService.searchAvailability() already returns data in UI format, no need to transform again
        const data = selfManagedData;
        console.log('✅ Availability data from BookingService (already converted):', data);

        // Cache the result
        setMonthCache((prev) => ({ ...prev, [cacheKey]: data }));
        setAvailabilityData(data);

        // Extract available dates
        const dates = Object.keys(data.availabilities_by_date || {});
        setAvailableDates(dates);

        // Update time slots for selected date
        const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
        const availabilities = data.availabilities_by_date?.[dateKey] || [];
        console.log("📅 Selected date key:", dateKey);
        console.log("📅 Available availabilities for this date:", availabilities);
        console.log("📅 All available dates in data:", Object.keys(data.availabilities_by_date || {}));

        availabilities.sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );
        console.log("📅 Setting availableTimes to:", availabilities);
        setAvailableTimes(availabilities);
      } catch (err: any) {
        console.error("Error fetching availability:", err);
        setError("Failed to load available time slots. Please try again.");
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailabilityData();
  }, [selectedService, selectedDate, showManualTimeSelection, monthCache]);

  // Update available times when selected date changes
  useEffect(() => {
    console.log("🔄 Date change useEffect triggered", {
      availabilityData: !!availabilityData,
      showManualTimeSelection,
      selectedDate: selectedDate.toISOString()
    });

    if (!availabilityData || !showManualTimeSelection) {
      console.log("🔄 Date change useEffect early return - no data or manual selection disabled");
      return;
    }

    const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
    const availabilities =
      availabilityData.availabilities_by_date?.[dateKey] || [];
    console.log("🔄 Date change useEffect - setting availabilities:", {
      dateKey,
      availabilities,
      allAvailableDates: Object.keys(availabilityData.availabilities_by_date || {})
    });

    availabilities.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    setAvailableTimes(availabilities);
  }, [selectedDate, availabilityData, showManualTimeSelection]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setAdditionalServices([]); // Clear additional services when date changes
  };

  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelection = (time: TimeSlot | null) => {
    setSelectedTime(time);
    setTimeAutoSelected(false);
    // Note: Don't clear additional services here - they'll be recalculated by useEffect
  };

  const handleShowPaymentForm = () => {
    if (!selectedService || !selectedTime || !user) {
      setError("Please select a service and time first");
      return;
    }
    setShowPaymentForm(true);
  };

  const handleBookWithoutPayment = async () => {
    if (!selectedService || !selectedTime || !user) {
      setError("Please select a service and time first");
      return;
    }

    try {
      setError(null);
      console.log("📅 Creating booking without payment...");

      // Prepare all services (main + additional)
      const allServices = [
        selectedService,
        ...additionalServices.map((as) => as.service),
      ];

      // Calculate pricing with tax and deposit
      const pricing = calculateBookingPricing(allServices);
      const paymentBreakdown = getPaymentBreakdown(pricing);

      console.log("💰 Pricing breakdown:", {
        subtotal: `$${pricing.subtotal}`,
        tax: `$${pricing.tax}`,
        total: `$${pricing.total}`,
        deposit: `$${pricing.deposit}`,
        balance: `$${pricing.balance}`,
        breakdown: paymentBreakdown
      });

      // Build appointment segments for all services
      const appointment_segments = allServices.map((service, index) => {
        let segmentStartTime: Date;

        if (index === 0) {
          // Main service starts at selected time
          segmentStartTime = new Date(selectedTime.start_at);
        } else {
          // Additional services start after previous service ends
          const previousEndTime = new Date(selectedTime.start_at);
          let totalPreviousDuration = 0;

          // Calculate total duration of all previous services
          for (let i = 0; i < index; i++) {
            totalPreviousDuration += (allServices[i].duration_minutes || allServices[i].duration || 0);
          }

          previousEndTime.setMinutes(previousEndTime.getMinutes() + totalPreviousDuration);
          segmentStartTime = previousEndTime;
        }

        return {
          duration_minutes: service.duration_minutes || service.duration,
          service_id: service.id,
          team_member_id: parseInt(selectedTime.appointment_segments[0].team_member_id),
          service_variation_version: 1,
          start_at: segmentStartTime.toISOString()
        };
      });

      // Create booking request with pricing information
      const bookingRequest = {
        start_at: selectedTime.start_at,
        appointment_segments,
        customer_note: "Booking created without payment (test)",
        price_cents: pricing.totalCents,
        deposit_paid_cents: 0, // No payment made yet
        payment_status: 'unpaid' as const,
        payment_data: paymentBreakdown,
        idempotencyKey: crypto.randomUUID()
      };

      console.log("📋 Booking request:", bookingRequest);

      // Create the booking
      const response = await BookingService.createBookingWithSegments(bookingRequest);
      console.log("📨 Booking response:", response);

      if (response.success) {
        console.log("✅ Booking created successfully!");
        // Don't clear localStorage here - let the booking confirmation useEffect handle it
        // so it can detect reschedule mode and redirect appropriately
        setBookingConfirmed(true);
      } else {
        setError(response.error || "Failed to create booking");
      }
    } catch (error: any) {
      console.error("❌ Error creating booking:", error);
      setError(error.message || "Failed to create booking");
    }
  };

  // Recalculate additional service times when main service time changes
  useEffect(() => {
    if (!selectedTime || !selectedService) {
      return;
    }

    setAdditionalServices((currentServices) => {
      if (currentServices.length === 0) {
        return currentServices;
      }

      console.log(
        "Main service time changed, recalculating additional service times...",
      );

      const recalculatedServices = currentServices.map(
        (additionalService, index) => {
          let calculatedStartTime: Date;

          if (index === 0) {
            calculatedStartTime = new Date(selectedTime.start_at);
            const mainServiceDuration = selectedService.duration_minutes || selectedService.duration || 0;
            calculatedStartTime.setMinutes(
              calculatedStartTime.getMinutes() + mainServiceDuration,
            );
          } else {
            const previousService = currentServices[index - 1];
            calculatedStartTime = new Date(previousService.timeSlot.start_at);
            const previousDuration = previousService.service.duration_minutes || previousService.service.duration || 0;
            calculatedStartTime.setMinutes(
              calculatedStartTime.getMinutes() + previousDuration,
            );
          }

          // Apply 30-minute rounding
          const minutes = calculatedStartTime.getMinutes();
          const remainder = minutes % 30;
          if (remainder !== 0) {
            calculatedStartTime.setMinutes(minutes + (30 - remainder));
          }

          const newTimeSlot = {
            ...additionalService.timeSlot,
            start_at: calculatedStartTime.toISOString(),
          };

          console.log(
            `Recalculated ${additionalService.service.name} to: ${dayjs(
              calculatedStartTime,
            )
              .tz("Australia/Melbourne")
              .format("h:mm A")}`,
          );

          return {
            ...additionalService,
            timeSlot: newTimeSlot,
          };
        },
      );

      return recalculatedServices;
    });
  }, [selectedTime, selectedService]);

  // Additional service handlers
  const handleAddAdditionalService = async () => {
    if (!selectedTime || !selectedService) {
      setError("Please select a main service and time first");
      return;
    }

    const selectedBarberId = localStorage.getItem("selectedBarberId");
    if (!selectedBarberId) {
      setError("No barber selected. Please go back and select a barber.");
      return;
    }

    try {
      setIsLoadingServices(true);
      setError(null);
      console.log(
        `Fetching services for barber ${selectedBarberId} for additional service dialog...`,
      );

      const serviceList = await BookingService.getServicesByTeamMember(parseInt(selectedBarberId));
      console.log(
        `Fetched ${serviceList.length} services:`,
        serviceList.map((s) => s.name),
      );
      setAllServices(serviceList);

      const barbersByService: Record<number, TeamMember[]> = {};
      for (const service of serviceList) {
        try {
          const serviceBarbers = await BookingService.getBarbersForService(
            service.id,
          );
          const availableBarbers = serviceBarbers.filter(
            (barber) => !barber.is_owner,
          );
          barbersByService[service.id] = availableBarbers;
          console.log(
            `Service ${service.name}: ${availableBarbers.length} available barbers`,
          );
        } catch (err) {
          console.error(
            `Failed to fetch barbers for service ${service.id} (${service.name}):`,
            err,
          );
          barbersByService[service.id] = [];
        }
      }

      console.log(
        "All barbers by service:",
        Object.keys(barbersByService).map(
          (id) =>
            `${serviceList.find((s) => s.id === parseInt(id))?.name}: ${
              barbersByService[parseInt(id)].length
            } barbers`,
        ),
      );

      setAllBarbers(barbersByService);
      setShowServiceDialog(true);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Failed to load services. Please try again.");
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleSelectAdditionalService = async (service: Service) => {
    console.log(
      "🚀 handleSelectAdditionalService called with service:",
      service.name,
    );

    if (!selectedTime || !selectedService) {
      setError("Please select a main service and time first");
      return;
    }

    const mainBarber = selectedTime.appointment_segments?.[0]?.team_member_id;
    console.log("Main barber ID from selectedTime:", mainBarber);

    if (!mainBarber) {
      setError("Cannot determine main service barber");
      return;
    }

    console.log("allBarbers structure:", allBarbers);
    const flattenedBarbers = Object.values(allBarbers).flat();
    console.log("Flattened barbers count:", flattenedBarbers.length);

    let barberObj = flattenedBarbers.find(
      (barber) =>
        barber.id === parseInt(mainBarber) || barber.id == parseInt(mainBarber),
    );

    if (!barberObj) {
      try {
        console.log(
          `Main barber (${mainBarber}) not found in allBarbers, fetching all team members...`,
        );
        const allTeamMembers = await BookingService.getTeamMembers();
        console.log(`Fetched ${allTeamMembers.length} team members from API`);

        barberObj = allTeamMembers.find(
          (barber) =>
            barber.id === parseInt(mainBarber) ||
            barber.id == parseInt(mainBarber),
        );

        if (!barberObj) {
          console.error(
            `Main barber with ID ${mainBarber} not found in ${allTeamMembers.length} team members`,
          );
          setError("Main service barber not found");
          return;
        }
        console.log(
          `Found main barber: ${barberObj.first_name} (ID: ${barberObj.id})`,
        );
      } catch (error) {
        console.error("Error fetching team members:", error);
        setError("Failed to load barber information");
        return;
      }
    }

    try {
      // Calculate when the LAST added service ends
      let lastServiceEndTime;

      if (additionalServices.length === 0) {
        lastServiceEndTime = new Date(selectedTime.start_at);
        const mainServiceDuration = selectedService.duration_minutes || selectedService.duration || 0;
        lastServiceEndTime.setMinutes(
          lastServiceEndTime.getMinutes() + mainServiceDuration,
        );
      } else {
        const lastAddedService =
          additionalServices[additionalServices.length - 1];
        lastServiceEndTime = new Date(lastAddedService.timeSlot.start_at);
        const lastServiceDuration = lastAddedService.service.duration_minutes || lastAddedService.service.duration || 0;
        lastServiceEndTime.setMinutes(
          lastServiceEndTime.getMinutes() + lastServiceDuration,
        );
      }

      // Round up to next 30-minute increment
      const minutes = lastServiceEndTime.getMinutes();
      const remainder = minutes % 30;
      if (remainder !== 0) {
        lastServiceEndTime.setMinutes(minutes + (30 - remainder));
      }

      console.log(
        `Last service ends at: ${dayjs(lastServiceEndTime)
          .tz("Australia/Melbourne")
          .format("h:mm A")}`,
      );

      // Create the assigned time slot
      const assignedTimeSlot = {
        start_at: lastServiceEndTime.toISOString(),
        location_id: selectedTime.location_id,
        appointment_segments: [
          {
            team_member_id: mainBarber,
            service_id: service.id,
            duration_minutes: service.duration_minutes || service.duration,
            service_variation_version: 1,
          },
        ],
      };

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

  const handleBookingStateChange = (creatingBooking: boolean) => {
    setIsCreatingBooking(creatingBooking);
  };

  const renderBookingStatus = () => {
    if (timeAutoSelected && selectedTime) {
      return (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium text-green-800">
                Closest Available Time Selected
              </p>
              <p className="text-sm text-green-600 mt-1">
                Your appointment is automatically selected for the earliest
                available time
              </p>
              <div className="mt-2 p-2 bg-white rounded border">
                <p className="text-sm font-medium">
                  {dayjs(selectedTime.start_at).format("dddd, MMMM D, YYYY")} at{" "}
                  {dayjs(selectedTime.start_at).format("h:mm A")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setTimeAutoSelected(false);
                setShowManualTimeSelection(true);
                setShowPaymentForm(false);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Change Time/Date
            </button>
            <button
              onClick={() => {
                // Use the first service ID for the URL param (barbers page expects single serviceId)
                const serviceId = selectedServices.length > 0 ? selectedServices[0].id : selectedService?.id || '';
                router.push(`/book/barbers?serviceId=${serviceId}`);
              }}
              className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
            >
              Change Barber
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!selectedService || selectedServices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  return (
    <VerificationGuard requireVerification={true}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mt-28">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Book Your Appointment
          </h1>
          <p className="mt-2 text-gray-600">
            Complete your booking and payment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Time selection or selected time display */}
          <div className="space-y-6">
            {timeAutoSelected && !showManualTimeSelection ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Your Selected Time
                </h2>
                {renderBookingStatus()}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Select Your Preferred Time
                </h2>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">
                      Select your preferred date and time
                    </span>
                    <button
                      onClick={() => {
                        // Use the first service ID for the URL param (barbers page expects single serviceId)
                        const serviceId = selectedServices.length > 0 ? selectedServices[0].id : selectedService?.id || '';
                        router.push(`/book/barbers?serviceId=${serviceId}`);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Back to Barber Selection
                    </button>
                  </div>

                  <DateTimeSelector
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    onMonthChange={handleMonthChange}
                    onTimeSelect={handleTimeSelection}
                    selectedTime={selectedTime}
                    availableTimes={availableTimes}
                    availableDates={availableDates}
                    isLoading={isLoadingAvailability}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden whitespace-nowrap md:hidden -mx-6">
            <div className="flex animate-marquee">
              {/* First set of images */}
              <MarqueeItems />
              {/* Duplicate set for seamless loop */}
              <MarqueeItems />
            </div>
          </div>

          {/* Right column - Booking summary and payment */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-base font-semibold mb-3">BOOKING SUMMARY</h2>

            {/* Selected Barber Info */}
            {selectedBarber && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Your Barber
                </p>
                <div className="flex items-center gap-3">
                  {/* Barber image hidden per request */}
                  {/* {selectedBarber.profile_image_url && (
                    <img
                      src={selectedBarber.profile_image_url}
                      alt={`${selectedBarber.first_name} ${selectedBarber.last_name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )} */}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedBarber.first_name} {selectedBarber.last_name}
                    </p>
                    {selectedBarber.specialties && selectedBarber.specialties.length > 0 && (
                      <p className="text-xs text-gray-600">
                        {selectedBarber.specialties.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showPaymentForm ? (
              <SimpleBookingForm
                selectedService={selectedService}
                selectedTime={selectedTime}
                selectedServices={[
                  ...selectedServices,
                  ...additionalServices.map((as) => as.service),
                ]}
                onBookingComplete={() => {
                  console.log("✅ Booking completed successfully");
                  setBookingConfirmed(true);
                }}
                onCancel={() => {
                  console.log("❌ Booking cancelled");
                  setShowPaymentForm(false);
                }}
                onAddAdditionalService={handleAddAdditionalService}
                isLoadingServices={isLoadingServices}
                onBookingStateChange={handleBookingStateChange}
              />
            ) : (
              <>
                <BookingSummary
                  selectedService={selectedService}
                  selectedTime={selectedTime}
                  error={error}
                  onProceedToPayment={handleShowPaymentForm}
                  // onBookWithoutPayment={handleBookWithoutPayment} // Hidden per request - test button
                  showPaymentForm={showPaymentForm}
                  selectedServices={[
                    ...selectedServices,
                    ...additionalServices.map((as) => as.service),
                  ]}
                />

                {/* Additional Services Section */}
                {additionalServices.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-medium mb-2 text-blue-800">
                      Additional Services
                    </h3>
                    <div className="space-y-2">
                      {additionalServices.map((additionalService, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {additionalService.service.name}
                            </p>
                            <p className="text-gray-600">
                              {dayjs(additionalService.timeSlot.start_at)
                                .tz("Australia/Melbourne")
                                .format("h:mm A")}{" "}
                              -
                              {dayjs(additionalService.timeSlot.start_at)
                                .add(
                                  additionalService.service.duration_minutes || additionalService.service.duration || 0,
                                  "minute",
                                )
                                .tz("Australia/Melbourne")
                                .format("h:mm A")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              $
                              {(
                                (additionalService.service.base_price_cents || additionalService.service.price_amount) / 100
                              ).toFixed(2)}
                            </span>
                            <button
                              onClick={() =>
                                handleRemoveAdditionalService(index)
                              }
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Additional Service Button - Only show for new bookings */}
                {selectedTime && !showPaymentForm && !isRescheduleMode && (
                  <div className="mt-4">
                    <Button
                      onClick={handleAddAdditionalService}
                      variant="outline"
                      className="w-full bg-black text-white hover:bg-gray-800 border-black disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
                      disabled={!selectedTime || isLoadingServices}
                    >
                      {isLoadingServices ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Loading Services...
                        </div>
                      ) : selectedTime ? (
                        "Add Additional Service"
                      ) : (
                        "Select Time First"
                      )}
                    </Button>
                  </div>
                )}

                {/* Show info message during reschedule */}
                {isRescheduleMode && !showPaymentForm && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 To add or change services, please cancel this booking and create a new one with your preferred services.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden whitespace-nowrap hidden md:block mt-4">
          <div className="flex animate-marquee">
            {/* First set of images */}
            <MarqueeItems />
            {/* Duplicate set for seamless loop */}
            <MarqueeItems />
          </div>
        </div>
      </div>

      {/* Loading Screen Overlay */}
      {(isLoadingServices || isProcessingPayment || isCreatingBooking) && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center shadow-lg border">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isLoadingServices ? 'Loading Services' : 
               isProcessingPayment ? 'Processing Payment' :
               isCreatingBooking ? 'Creating Booking' : 'Loading'}
            </h3>
            <p className="text-gray-600">
              {isLoadingServices ? 'Please wait while we fetch available services...' :
               isProcessingPayment ? 'Please wait while we process your payment...' :
               isCreatingBooking ? 'Please wait while we create your booking...' : 'Please wait...'}
            </p>
          </div>
        </div>
      )}

      {/* Additional Service Selection Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
              Add Another Service
            </DialogTitle>
            <p className="text-gray-600 text-center mt-2">
              Select an additional service with your current barber. Services
              will be scheduled consecutively.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
            <div className="max-w-5xl mx-auto">
              <div className="grid gap-3 sm:gap-4">
                {allServices
                  .filter((service) => {
                    // Show all services - they'll be assigned to the same barber automatically
                    console.log(
                      `Showing service: ${service.name} (will use main barber for booking)`,
                    );
                    return true;
                  })
                  .map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleSelectAdditionalService(service)}
                      className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      {/* Service Info */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Service Details */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Duration:</span>
                            {service.duration_minutes || service.duration}{" "}
                            min
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Price:</span>$
                            {((service.base_price_cents || service.price_amount) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Hover indicator */}
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg pointer-events-none transition-colors"></div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </VerificationGuard>
  );
}

export default function CleanAppointmentPage() {
  return (
    <FreshaRedirectWrapper>
      <CleanAppointmentPageContent />
    </FreshaRedirectWrapper>
  );
}
