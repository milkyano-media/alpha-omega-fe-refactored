"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Service, TimeSlot, BookingService, AvailabilityResponse } from "@/lib/booking-service";
import { StablePaymentForm } from "@/components/pages/appointment/StablePaymentForm";
import { BookingSummary, DateTimeSelector } from "@/components/pages/appointment";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function CleanAppointmentPage() {
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
  const [availabilityData, setAvailabilityData] = useState<AvailabilityResponse | null>(null);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [monthCache, setMonthCache] = useState<Record<string, AvailabilityResponse>>({});
  const [showManualTimeSelection, setShowManualTimeSelection] = useState(false);

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
    if (servicesData) {
      try {
        const services = JSON.parse(servicesData);
        console.log("Loading selected services:", services);
        setSelectedServices(services);
        setSelectedService(services[0] || null);
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
    const selectedBarberId = localStorage.getItem("selectedBarberId");
    
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
            console.log("Updated selectedDate to match auto-selected time:", autoSelectedDate.toISOString());
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
    } else if (selectedBarberId && autoSelectedTimeFlag !== "true") {
      // Manual barber selection - show manual time selection immediately
      console.log("Manual barber selection detected, enabling manual time selection", {
        selectedBarberId,
        autoSelectedTimeFlag
      });
      setShowManualTimeSelection(true);
    } else {
      console.log("No manual selection triggered", {
        hasSelectedBarberId: !!selectedBarberId,
        autoSelectedTimeFlag
      });
    }
  }, [isAuthenticated, router]);

  // Handle booking confirmation
  useEffect(() => {
    if (bookingConfirmed) {
      // Clear localStorage
      localStorage.removeItem("selectedServices");
      localStorage.removeItem("selectedService");
      localStorage.removeItem("selectedBarberId");

      // Redirect to thank you page
      setTimeout(() => {
        router.push("/book/thank-you");
      }, 500);
    }
  }, [bookingConfirmed, router]);

  // Fetch availability when service changes or when manual selection is requested
  useEffect(() => {
    console.log('🔍 Availability useEffect check:', {
      selectedService: !!selectedService,
      showManualTimeSelection,
      serviceVariationId: selectedService?.service_variation_id
    });
    
    if (!selectedService || !showManualTimeSelection) {
      console.log('⏭️ Skipping availability fetch:', {
        noService: !selectedService,
        noManualSelection: !showManualTimeSelection
      });
      return;
    }

    const fetchAvailabilityData = async () => {
      setIsLoadingAvailability(true);
      setError(null);

      try {
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        const cacheKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

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
          const availabilities = cachedData.availabilities_by_date?.[dateKey] || [];
          availabilities.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
          setAvailableTimes(availabilities);
          return;
        }

        // Fetch new data - get full month range, but only future dates
        console.log('Raw date inputs:', { selectedYear, selectedMonth });
        
        // Create dates in UTC to avoid timezone conversion issues
        // But ensure startDate is not in the past - Square only allows future bookings
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
        
        const monthStart = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0));
        const startDate = monthStart < todayUTC ? todayUTC : monthStart;
        const endDate = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999));
        
        console.log('UTC dates created:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        console.log('Date calculation debug:', {
          selectedDate: selectedDate.toISOString(),
          selectedMonth,
          selectedYear,
          today: today.toISOString(),
          todayUTC: todayUTC.toISOString(),
          monthStart: monthStart.toISOString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        console.log(`Fetching availability for ${selectedService.service_variation_id} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const data = await BookingService.searchAvailability(
          selectedService.service_variation_id,
          startDate,
          endDate
        );

        // Cache the result
        setMonthCache(prev => ({ ...prev, [cacheKey]: data }));
        setAvailabilityData(data);

        // Extract available dates
        const dates = Object.keys(data.availabilities_by_date || {});
        setAvailableDates(dates);

        // Update time slots for selected date
        const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
        const availabilities = data.availabilities_by_date?.[dateKey] || [];
        availabilities.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
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
    if (!availabilityData || !showManualTimeSelection) return;

    const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
    const availabilities = availabilityData.availabilities_by_date?.[dateKey] || [];
    availabilities.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    setAvailableTimes(availabilities);
  }, [selectedDate, availabilityData, showManualTimeSelection]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelection = (time: TimeSlot | null) => {
    setSelectedTime(time);
    setTimeAutoSelected(false);
  };


  const handleShowPaymentForm = () => {
    if (!selectedService || !selectedTime || !user) {
      setError("Please select a service and time first");
      return;
    }
    setShowPaymentForm(true);
  };

  const renderBookingStatus = () => {
    if (timeAutoSelected && selectedTime) {
      return (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-green-800">Closest Available Time Selected</p>
              <p className="text-sm text-green-600 mt-1">
                Your appointment is automatically selected for the earliest available time
              </p>
              <div className="mt-2 p-2 bg-white rounded border">
                <p className="text-sm font-medium">
                  {dayjs(selectedTime.start_at).format("dddd, MMMM D, YYYY")} at{" "}
                  {dayjs(selectedTime.start_at).format("h:mm A")}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-3">
            <button 
              onClick={() => router.push("/book/barbers")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Choose a different barber/time
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Appointment</h1>
          <p className="mt-2 text-gray-600">Complete your booking and payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Time selection or selected time display */}
          <div className="space-y-6">
            {timeAutoSelected && !showManualTimeSelection ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Your Selected Time</h2>
                {renderBookingStatus()}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Select Your Preferred Time</h2>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">Select your preferred date and time</span>
                    <button
                      onClick={() => router.push("/book/barbers")}
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

          {/* Right column - Booking summary and payment */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-base font-semibold mb-3">BOOKING SUMMARY</h2>
            
            {showPaymentForm ? (
              <StablePaymentForm
                selectedService={selectedService}
                selectedTime={selectedTime}
                selectedServices={selectedServices}
                onPaymentComplete={() => {
                  console.log('✅ Payment completed successfully');
                  setBookingConfirmed(true);
                }}
                onCancel={() => {
                  console.log('❌ Payment cancelled');
                  setShowPaymentForm(false);
                }}
              />
            ) : (
              <BookingSummary
                selectedService={selectedService}
                selectedTime={selectedTime}
                error={error}
                onProceedToPayment={handleShowPaymentForm}
                showPaymentForm={showPaymentForm}
                selectedServices={selectedServices}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}