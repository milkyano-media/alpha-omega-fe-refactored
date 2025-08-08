"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BookingService, TeamMember, Service } from "@/lib/booking-service";
import { getBarberImageSafe, preloadBarberImages } from "@/lib/barber-images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

function BarberSelectionContent() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [barbers, setBarbers] = useState<TeamMember[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push("/login?returnUrl=/book/barbers");
      return;
    }

    // Get service from URL params or localStorage
    const serviceIdParam = searchParams.get("serviceId");
    let serviceData: Service | null = null;

    if (serviceIdParam) {
      // Try to get service from localStorage first
      const storedService = localStorage.getItem("selectedService");
      if (storedService) {
        try {
          const parsed = JSON.parse(storedService);
          if (parsed.id.toString() === serviceIdParam) {
            serviceData = parsed;
          }
        } catch (e) {
          console.error("Error parsing stored service:", e);
        }
      }
    }

    if (!serviceData) {
      // Redirect back to services if no service selected
      router.push("/book/services");
      return;
    }

    setSelectedService(serviceData);

    // Fetch barbers for the selected service
    const fetchBarbers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const serviceBarbers = await BookingService.getBarbersForService(
          serviceData.id,
        );
        setBarbers(serviceBarbers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load barbers");
        console.error("Error fetching barbers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarbers();
    preloadBarberImages();
  }, [isAuthenticated, router, searchParams]);

  const handleSelectBarber = (barber: TeamMember) => {
    setSelectedBarber(barber);
    setShowTermsModal(true);
  };

  const handleSelectRandomBarber = () => {
    if (barbers.length > 0) {
      // Randomly select a barber from available barbers
      const randomIndex = Math.floor(Math.random() * barbers.length);
      const randomBarber = barbers[randomIndex];
      setSelectedBarber(randomBarber);
      setShowTermsModal(true);
    }
  };

  const handleBookService = () => {
    if (selectedService && selectedBarber && agreed) {
      localStorage.setItem("selectedService", JSON.stringify(selectedService));
      localStorage.setItem("selectedBarberId", selectedBarber.id.toString());
      router.push("/book/appointment");
    }
  };

  const resetSelection = () => {
    setSelectedBarber(null);
    setAgreed(false);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900">
            Loading Barbers
          </h2>
          <p className="mt-2 text-gray-600">
            Finding the best barbers for you...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Barbers
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.push("/book/services")}
            className="w-full bg-gray-900 hover:bg-gray-800"
          >
            Back to Services
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pt-20 sm:pt-32 lg:pt-40">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <Button
            variant="ghost"
            onClick={() => router.push("/book/services")}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            ← Back to Services
          </Button>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Choose Your Barber
          </h1>

          {selectedService && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4 max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 text-base md:text-2xl">
                {selectedService.name}
              </h3>
              <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
                <span>${(selectedService.price_amount / 100).toFixed(2)}</span>
                <span>•</span>
                <span>
                  {selectedService.duration > 10000
                    ? Math.round(selectedService.duration / 60000)
                    : selectedService.duration}{" "}
                  min
                </span>
              </div>
            </div>
          )}
        </div>

        {barbers.length === 0 ? (
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
            <p className="text-gray-500 mb-6">
              No barbers are currently available for this service. Please try
              another service or contact us directly.
            </p>
            <Button
              onClick={() => router.push("/book/services")}
              className="bg-gray-900 hover:bg-gray-800"
            >
              Choose Different Service
            </Button>
          </div>
        ) : (
          <>
            {/* <div className="bg-gray-50 rounded-lg p-3 mb-6 max-w-2xl mx-auto">
              <p className="text-xs text-gray-700 text-center">
                🎯 <strong>Limited Availability</strong> - Book your preferred time slot today!
              </p>
            </div> */}

            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 gap-6">
                {/* Random Barber Card - First Position */}
                {barbers.length > 0 && (
                  <div
                    className="h-min bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group max-w-sm mx-auto border-2 border-dashed border-purple-300 hover:border-purple-500"
                    onClick={handleSelectRandomBarber}
                  >
                    {/* Random Barber Image */}
                    {/* <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 relative overflow-hidden"> */}
                    {/* <Image
                        src="/assets/random-barber.png"
                        width={400}
                        height={400}
                        alt="Random Barber Selection"
                        className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div> */}

                    {/* Floating Icons */}
                    {/* <div className="absolute top-4 right-4">
                        <div className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2h10a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m-3-3l3-3 3 3" />
                          </svg>
                        </div>
                      </div> */}
                    {/* </div> */}

                    {/* Card Content */}
                    <div className="p-2 md:p-6 space-y-4">
                      {/* Review Text */}
                      <p className="text-purple-800 text-xs md:text-xl leading-relaxed font-medium">
                        Let our expert team choose the perfect barber for your
                        style. Every one of our barbers delivers exceptional
                        results.
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
                              Next Available
                            </p>
                          </div>
                        </div>
                        <div className="text-purple-300 text-2xl">&quot;</div>
                      </div>
                    </div>

                    {/* Book Button */}
                    <div className="px-2 md:px-6 pt-6 md:pt-16 pb-4">
                      <button className="w-full text-xs md:text-lg bg-black hover:bg-gray-800 text-white font-semibold py-4 rounded-lg transition-all duration-200 group-hover:shadow-lg transform group-hover:scale-105">
                        Choose the next available Barber
                      </button>
                    </div>
                  </div>
                )}

                {/* Regular Barber Cards */}
                {barbers.map((barber) => {
                  const barberImage = getBarberImageSafe(
                    barber.first_name,
                    barber.last_name,
                  );
                  return (
                    <div
                      key={barber.id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group max-w-sm w-full mx-auto"
                      onClick={() => handleSelectBarber(barber)}
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
                            // Fallback to placeholder with question mark
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
                          {/* <p className="text-sm sm:text-lg opacity-90 font-medium">{barber.last_name}</p> */}
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
                      <div className="p-2 md:p-6 space-y-4">
                        <div className="space-y-3 sm:space-y-4 mb-2 sm:mb-6">
                          {/* Languages */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-5 text-black"
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
                                Languages Spoken
                              </p>
                              <p className="text-sm sm:text-base lg:text-lg">
                                🇦🇺 🇬🇷
                              </p>
                            </div>
                          </div>

                          {/* Social Handle */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-5 text-black"
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
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-5 text-black"
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
                              <p className="text-sm sm:text-base capitalize font-semibold">
                                {barber.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Book Button */}
                      <div className="p-2 md:px-6 md:pb-6">
                        {/* <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-4 rounded-lg transition-colors duration-200 group-hover:bg-gray-200">
                          BOOK BARBER
                        </button> */}
                        {/* Selection Button */}
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
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Terms Modal */}
      <Dialog
        open={showTermsModal}
        onOpenChange={(open) => {
          setShowTermsModal(open);
          if (!open) resetSelection();
        }}
      >
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Book Your Appointment
            </DialogTitle>
          </DialogHeader>

          {selectedService && selectedBarber && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold">{selectedService.name}</h4>
              <p className="text-sm text-gray-600 mb-1">
                with {selectedBarber.first_name} {selectedBarber.last_name}
              </p>
              <p className="text-2xl font-bold mt-1">
                ${(selectedService.price_amount / 100).toFixed(2)}
              </p>
            </div>
          )}

          <div
            style={{ whiteSpace: "pre-line" }}
            className="p-4 border rounded-md space-y-4 text-sm text-gray-800 max-h-96 overflow-y-auto"
          >
            {policy}
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label
              htmlFor="agree"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              I agree to the terms and conditions
            </label>
          </div>

          <Button
            disabled={!agreed}
            onClick={handleBookService}
            className="w-full mt-4"
          >
            Proceed to Booking
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const policy = `
We pride ourselves in offering a high quality of service and that begins with appointment based bookings. Our online system allows you to pick a stylist and time that's convenient for you, and if you can't make it you can reschedule within 24 hours of your appointment.

Secure transactions
Transactions are handled with bank-grade security

Alpha Omega Mens Grooming
Booking Policy & Client Experience Standards
Where your confidence is crafted with precision.

⸻

Booking Deposit

To confirm your appointment, a 50% non-refundable deposit is required at the time of booking. This guarantees your time with our artist and will be deducted from the total cost of your service.

By proceeding with the deposit, you acknowledge and agree to the full terms and policies outlined below.

⸻

Rescheduling

Appointments may be rescheduled with a minimum of 24 hours' notice. Your deposit will be transferred to the new appointment. Rescheduling within 24 hours will result in the deposit being forfeited.

⸻

Cancellations

To respect the time and preparation of our team, we do not accept cancellations within 24 hours of your appointment. Deposits are non-refundable in these cases.

⸻

No Shows

Clients who miss an appointment without notice will be charged 100% of the scheduled service. Repeat no-shows may be removed from our client list.

⸻

Late Arrivals
    •    A 10-minute grace period applies.
    •    Arrivals beyond this may lead to a shortened service or loss of your appointment and deposit.
    •    We always strive to run on time to respect every guest's schedule.

⸻

Confirmation & Communication

You'll receive a confirmation and reminder via SMS or email before your booking. Please confirm promptly to avoid any confusion or cancellation.

⸻

Studio Etiquette

To preserve the luxury atmosphere:
    •    Please arrive solo unless accompanying a minor.
    •    Phones on silent are appreciated.
    •    Kindness, respect, and professionalism are expected from both sides.

⸻

VIP Privileges

Clients with consistent attendance and respect for our policies may receive access to:
    •    Priority bookings
    •    Exclusive treatments
    •    Private events & launches

⸻

Legal Notice

By paying your deposit and booking an appointment, you agree to all terms listed. These policies are binding and in place to protect the integrity of our studio and ensure a premium experience for all clients.

⸻

Thank you for choosing Alpha Omega — where every detail is designed to elevate your confidence.

`;

export default function BarberSelection() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              Loading Barbers
            </h2>
            <p className="mt-2 text-gray-600">
              Finding the best barbers for you...
            </p>
          </div>
        </main>
      }
    >
      <BarberSelectionContent />
    </Suspense>
  );
}
