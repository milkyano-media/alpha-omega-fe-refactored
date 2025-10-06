"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import BookingService, { Service, TimeSlot, SelfManagedSegmentBookingRequest } from "@/lib/booking-service";
import { useAuth } from "@/lib/auth-context";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Image from "next/image";

dayjs.extend(utc);
dayjs.extend(timezone);

interface SimpleBookingFormProps {
  selectedService: Service | null;
  selectedTime: TimeSlot | null;
  selectedServices: Service[];
  onBookingComplete: () => void;
  onCancel: () => void;
  onAddAdditionalService?: () => void;
  isLoadingServices?: boolean;
  onBookingStateChange?: (creatingBooking: boolean) => void;
}

export const SimpleBookingForm: React.FC<SimpleBookingFormProps> = ({
  selectedService,
  selectedTime,
  selectedServices,
  onBookingComplete,
  onCancel,
  onAddAdditionalService,
  isLoadingServices = false,
  onBookingStateChange,
}) => {
  const { user } = useAuth();
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState("");

  // Calculate total price and duration
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + (service.base_price_cents ?? service.price_amount ?? 0),
    0
  );
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + (service.duration_minutes || service.duration || 0),
    0
  );

  const handleCreateBooking = async () => {
    if (!selectedTime || !user) {
      setBookingError("Missing booking information");
      return;
    }

    try {
      setCreatingBooking(true);
      setBookingError(null);
      onBookingStateChange?.(true);

      console.log("📝 Creating booking without payment...");
      console.log("🕐 Selected time details:");
      console.log("  - Raw start_at:", selectedTime.start_at);
      console.log("  - Local display time:", dayjs(selectedTime.start_at).tz("Australia/Melbourne").format("YYYY-MM-DD HH:mm:ss"));
      console.log("  - UTC time:", dayjs(selectedTime.start_at).utc().format("YYYY-MM-DD HH:mm:ss"));

      // Create appointment segments for each selected service
      const appointmentSegments = selectedServices.map((service, index) => {
        // Get the team member from the selected time slot
        const teamMemberId = selectedTime.appointment_segments[0]?.team_member_id;

        // Calculate start time for each segment (sequential booking)
        let segmentStartTime = selectedTime.start_at;
        if (index > 0) {
          // For subsequent services, add duration of previous services
          const previousDuration = selectedServices.slice(0, index)
            .reduce((total, prevService) => total + (prevService.duration_minutes || prevService.duration || 0), 0);
          const startDate = new Date(selectedTime.start_at);
          if (isNaN(startDate.getTime())) {
            console.error('Invalid date from selectedTime.start_at:', selectedTime.start_at);
            throw new Error('Invalid booking start time');
          }
          startDate.setMinutes(startDate.getMinutes() + previousDuration);
          segmentStartTime = startDate.toISOString();
        }

        return {
          service_id: service.id,
          team_member_id: parseInt(teamMemberId || "1"),
          duration_minutes: service.duration_minutes || service.duration,
          start_at: segmentStartTime,
        };
      });

      const bookingRequest: SelfManagedSegmentBookingRequest = {
        start_at: selectedTime.start_at,
        appointment_segments: appointmentSegments,
        customer_note: customerNote.trim() || undefined,
        idempotencyKey: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      console.log("📤 Sending booking request:", bookingRequest);

      const bookingResponse = await BookingService.createBookingWithSegments(bookingRequest);

      console.log("📨 Full booking response:", bookingResponse);
      console.log("📨 Response type:", typeof bookingResponse);
      console.log("📨 Response keys:", Object.keys(bookingResponse || {}));

      // Handle the actual response format from the backend
      if (bookingResponse && bookingResponse.success === true && !bookingResponse.error) {
        console.log("✅ Booking created successfully:", bookingResponse);

        // Save booking details to localStorage for thank-you page
        const bookingData = bookingResponse.booking;
        if (bookingData) {
          localStorage.setItem('lastBooking', JSON.stringify(bookingData));
          console.log("💾 Saved booking to localStorage:", bookingData);
        }

        onBookingComplete();
      } else {
        // Handle error cases - check multiple possible error message locations
        const errorMessage =
          bookingResponse?.error ||
          "Failed to create booking";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ Error creating booking:", error);
      setBookingError(error.message || "Failed to create booking");
    } finally {
      setCreatingBooking(false);
      onBookingStateChange?.(false);
    }
  };

  if (!selectedService || !selectedTime || selectedServices.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">
          Please select a service and time slot to continue.
        </p>
        <Button onClick={onCancel} variant="outline" className="mt-4">
          Back to Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Confirm Your Booking
        </h3>
        <p className="text-gray-600">
          Review your appointment details below
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        {/* Services */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Services</h4>
          {selectedServices.map((service, index) => (
            <div key={service.id} className="flex justify-between items-center py-2">
              <div>
                <span className="font-medium">{service.name}</span>
                <span className="text-sm text-gray-600 ml-2">
                  ({service.duration_minutes || service.duration} min)
                </span>
              </div>
              <span className="font-semibold">
                ${((service.base_price_cents ?? service.price_amount ?? 0) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Date & Time */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Appointment Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Date:</span>
              <div className="font-medium">
                {dayjs(selectedTime.start_at)
                  .tz("Australia/Melbourne")
                  .format("dddd, MMMM D, YYYY")}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <div className="font-medium">
                {dayjs(selectedTime.start_at)
                  .tz("Australia/Melbourne")
                  .format("h:mm A")}
              </div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total ({totalDuration} min)</span>
            <span>${(totalPrice / 100).toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Payment will be processed in-store
          </p>
        </div>
      </div>

      {/* Customer Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special requests or notes (optional)
        </label>
        <textarea
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="Any special requests or preferences..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          rows={3}
        />
      </div>

      {/* Add Additional Service Button */}
      {onAddAdditionalService && (
        <Button
          onClick={onAddAdditionalService}
          variant="outline"
          className="w-full"
          disabled={isLoadingServices || creatingBooking}
        >
          {isLoadingServices ? "Loading..." : "Add Another Service"}
        </Button>
      )}

      {/* Error Display */}
      {bookingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Booking Error
              </h3>
              <p className="text-sm text-red-700 mt-1">{bookingError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1"
          disabled={creatingBooking}
        >
          Back
        </Button>
        <Button
          onClick={handleCreateBooking}
          className="flex-1 bg-gray-900 hover:bg-gray-800"
          disabled={creatingBooking}
        >
          {creatingBooking ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating...
            </div>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </div>
    </div>
  );
};