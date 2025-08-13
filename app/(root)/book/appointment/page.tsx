"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Service, TimeSlot } from "@/lib/booking-service";
import { StablePaymentForm } from "@/components/pages/appointment/StablePaymentForm";
import { BookingSummary } from "@/components/pages/appointment";
import dayjs from "dayjs";

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
    if (autoSelectedTimeFlag === "true") {
      const savedTimeSlot = localStorage.getItem("selectedTimeSlot");
      if (savedTimeSlot) {
        try {
          const parsedTimeSlot = JSON.parse(savedTimeSlot);
          console.log("Loading auto-selected time slot:", parsedTimeSlot);
          
          setSelectedTime(parsedTimeSlot);
          setTimeAutoSelected(true);
          setShowPaymentForm(true);
          
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
              onClick={() => {
                setTimeAutoSelected(false);
                setShowPaymentForm(false);
                setSelectedTime(null);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Choose a different time instead
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
            {timeAutoSelected ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Your Selected Time</h2>
                {renderBookingStatus()}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Select Time</h2>
                <p className="text-gray-600">
                  Manual time selection is not implemented in this simplified version.
                  Please use the closest-time barber selection from the barbers page.
                </p>
                <button
                  onClick={() => router.push("/book/barbers")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go Back to Select Barber
                </button>
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