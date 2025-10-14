"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { TimeSlot, Service } from "@/lib/booking-service";
import { calculateBookingPricing } from "@/lib/pricing-utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

interface BookingSummaryProps {
  selectedService: Service | null;
  selectedTime: TimeSlot | null;
  error: string | null;
  onProceedToPayment: () => void;
  onBookWithoutPayment?: () => void;
  showPaymentForm: boolean;
  selectedServices?: Service[];
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedService,
  selectedTime,
  error,
  onProceedToPayment,
  onBookWithoutPayment,
  showPaymentForm,
  selectedServices = [],
}) => {
  if (!selectedService) return null;

  // Calculate total pricing for all selected services using pricing utility
  const pricing = calculateBookingPricing(selectedServices);

  // Format time for display in Melbourne timezone (for Australian users)
  const formatTime = (isoTime: string) => {
    // Convert UTC time to Melbourne time
    const melbourneTime = dayjs(isoTime).tz("Australia/Melbourne");
    return melbourneTime.format("h:mm A");
  };

  // Format date for display in Melbourne timezone (for Australian users)
  const formatDate = (isoTime: string) => {
    // Convert UTC time to Melbourne time
    const melbourneDate = dayjs(isoTime).tz("Australia/Melbourne");
    return melbourneDate.format("dddd, MMM D");
  };

  return (
    <div className="mb-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Selected Services */}
        {selectedServices.map((service, index) => (
          <div key={`${service.id}-${index}`} className={`p-3 border-b border-gray-200 flex justify-between items-center ${
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
              <span>${((service.base_price_cents ?? service.price_amount ?? 0) / 100).toFixed(2)}</span>
              <span>
                {service.duration_minutes || service.duration}{" "}
                min
              </span>
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="p-3 flex justify-between items-center">
          <p className="text-sm">Subtotal</p>
          <p className="font-medium">${pricing.subtotal}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm">Tax (GST 10%)</p>
          <p className="font-medium">${pricing.tax}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm font-semibold">Total</p>
          <p className="font-semibold">${pricing.total}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-blue-50">
          <div>
            <p className="text-sm font-medium">Deposit (50% + Tax)</p>
            <p className="text-xs text-gray-600">Pay now to secure booking</p>
          </div>
          <p className="font-semibold text-blue-700">${pricing.deposit}</p>
        </div>
        <div className="p-3 border-t border-gray-100 flex justify-between items-center text-gray-500 text-sm">
          <p>Balance due at appointment</p>
          <p className="font-medium">${pricing.balance}</p>
        </div>
      </div>

      {selectedTime && (
        <div className="mt-3 p-3 border border-green-500 rounded-lg bg-green-50">
          <p className="font-medium text-sm mb-1">Selected Time:</p>
          <div className="flex justify-between items-center">
            <p className="text-lg font-medium">
              {formatTime(selectedTime.start_at)}
            </p>
            <p className="text-base font-bold">
              {formatDate(selectedTime.start_at)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 border border-red-400 bg-red-50 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!showPaymentForm && (
        <div className="space-y-2 mt-4">
          <Button
            onClick={onProceedToPayment}
            className="w-full py-3 text-base bg-black hover:bg-gray-800 transition-colors text-white rounded-md font-normal"
            disabled={!selectedTime}
          >
            {selectedTime ? "Confirm and Pay Deposit" : "Please Select a Time"}
          </Button>
          {onBookWithoutPayment && (
            <Button
              onClick={onBookWithoutPayment}
              variant="outline"
              className="w-full py-3 text-base border-black text-black hover:bg-gray-100 transition-colors rounded-md font-normal"
              disabled={!selectedTime}
            >
              {selectedTime ? "Book Without Payment (Test)" : "Please Select a Time"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
