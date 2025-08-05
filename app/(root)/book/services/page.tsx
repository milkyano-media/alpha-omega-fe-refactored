"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BookingService, TeamMember, Service } from "@/lib/booking-service";
import { getServiceImageSafe, preloadServiceImages } from "@/lib/service-images";
import { getBarberImageSafe, preloadBarberImages } from "@/lib/barber-images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function ServiceSelection() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Record<number, TeamMember[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
  const [showBarbersModal, setShowBarbersModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push("/login?returnUrl=/book/services");
      return;
    }

    // Fetch services and their barbers (reversed flow)
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const serviceList = await BookingService.getAllServices();
        setServices(serviceList);

        const barbersByService: Record<number, TeamMember[]> = {};
        for (const service of serviceList) {
          try {
            const serviceBarbers = await BookingService.getBarbersForService(
              service.id,
            );
            barbersByService[service.id] = serviceBarbers;
          } catch (barberErr) {
            console.error(
              `Failed to fetch barbers for service ${service.id}:`,
              barberErr,
            );
          }
        }

        setBarbers(barbersByService);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load services and barbers",
        );
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Preload service and barber images for better performance
    preloadServiceImages();
    preloadBarberImages();
  }, [isAuthenticated, router]);

  const handleViewBarbers = (service: Service) => {
    setSelectedService(service);
    setShowBarbersModal(true);
  };

  const handleSelectBarber = (barber: TeamMember) => {
    setSelectedBarber(barber);
    setShowBarbersModal(false);
    setShowTermsModal(true);
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
      <main className="flex flex-col gap-20 mt-40">
        <section className="container mx-auto text-center py-20">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Loading services and barbers...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col gap-20 mt-40">
        <section className="container mx-auto text-center py-20">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 mt-40 mb-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          Choose Your Service
        </h1>
        <p className="text-gray-600 text-base text-center">
          Select your preferred service and choose from available barbers
        </p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">
            No services available at the moment. Please check back later.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-3">
          {services
            .filter(
              (service) => barbers[service.id] && barbers[service.id].length > 0,
            )
            .map((service) => {
              const serviceImage = getServiceImageSafe(service.name, service.description);
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-lg shadow-md border hover:shadow-lg hover:border-black transition-all duration-200 cursor-pointer"
                  onClick={() => handleViewBarbers(service)}
                >
                  <div className="flex items-center p-4 gap-4">
                    {/* Service Image */}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${serviceImage.gradient} relative overflow-hidden flex-shrink-0`}>
                      <Image
                        src={serviceImage.src}
                        width={64}
                        height={64}
                        alt={serviceImage.alt}
                        className="object-cover w-full h-full opacity-80"
                        onError={(e) => {
                          // Fallback to gradient background if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Service Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <span className="text-lg font-bold text-black">
                                ${(service.price_amount / 100).toFixed(2)}
                              </span>
                            </span>
                            <span>
                              {service.duration > 10000
                                ? Math.round(service.duration / 60000)
                                : service.duration} min
                            </span>
                            {barbers[service.id] && (
                              <span className="text-gray-500">
                                {barbers[service.id].length} barber{barbers[service.id].length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <Button
                          className="ml-4 bg-black text-white hover:bg-gray-800 px-6"
                          disabled={
                            !barbers[service.id] || barbers[service.id].length === 0
                          }
                        >
                          Choose Barber
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Barbers Modal */}
      <Dialog open={showBarbersModal} onOpenChange={setShowBarbersModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold">
              {selectedService
                ? `Available Barbers for ${selectedService.name}`
                : "Available Barbers"}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {selectedService && barbers[selectedService.id] ? (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-700 text-center">
                    🎯 <strong>Limited Availability</strong> - Book your
                    preferred time slot today!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {barbers[selectedService.id].map((barber) => {
                    const barberImage = getBarberImageSafe(barber.first_name, barber.last_name);
                    return (
                      <div
                        key={barber.id}
                        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                        onClick={() => handleSelectBarber(barber)}
                      >
                        {/* Barber Image */}
                        <div className={`aspect-square bg-gradient-to-br ${barberImage.gradient} relative`}>
                          <Image
                            src={barberImage.src}
                            width={300}
                            height={300}
                            alt={barberImage.alt}
                            className="object-cover w-full h-full opacity-90"
                            onError={(e) => {
                              // Fallback to initials avatar
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br ${barberImage.gradient} flex items-center justify-center">
                                    <span class="text-white font-bold text-6xl">${barberImage.initials}</span>
                                  </div>
                                `;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-4 text-white">
                            <h3 className="text-xl font-bold">{barber.first_name}</h3>
                            <p className="text-sm opacity-90">{barber.last_name}</p>
                          </div>
                        </div>

                        {/* Barber Info */}
                        <div className="p-4">
                          <div className="space-y-2 mb-4">
                            <p className="text-gray-600 text-sm flex items-center gap-2">
                              <span className="text-base">
                                Languages <br />
                                🇦🇺🇬🇷
                              </span>
                            </p>
                            <p className="text-gray-600 text-sm">
                              @{barber.first_name.toLowerCase()}.barber
                            </p>
                            <p className="text-sm text-gray-500">
                              {barber.status}
                            </p>
                          </div>

                          <Button
                            className="w-full bg-black text-white hover:bg-gray-800 group-hover:bg-gray-800 transition-colors"
                          >
                            Select {barber.first_name}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No barbers available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
We pride ourselves in offering a high quality of service and that begins with appointment based bookings. Our online system allows you to pick a stylist and time that’s convenient for you, and if you can’t make it you can reschedule within 24 hours of your appointment.

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

Appointments may be rescheduled with a minimum of 24 hours’ notice. Your deposit will be transferred to the new appointment. Rescheduling within 24 hours will result in the deposit being forfeited.

⸻

Cancellations

To respect the time and preparation of our team, we do not accept cancellations within 24 hours of your appointment. Deposits are non-refundable in these cases.

⸻

No Shows

Clients who miss an appointment without notice will be charged 100% of the scheduled service. Repeat no-shows may be removed from our client list.

⸻

Late Arrivals
    •    A 10-minute grace period applies.
    •    Arrivals beyond this may lead to a shortened service or loss of your appointment and deposit.
    •    We always strive to run on time to respect every guest’s schedule.

⸻

Confirmation & Communication

You’ll receive a confirmation and reminder via SMS or email before your booking. Please confirm promptly to avoid any confusion or cancellation.

⸻

Studio Etiquette

To preserve the luxury atmosphere:
    •    Please arrive solo unless accompanying a minor.
    •    Phones on silent are appreciated.
    •    Kindness, respect, and professionalism are expected from both sides.

⸻

VIP Privileges

Clients with consistent attendance and respect for our policies may receive access to:
    •    Priority bookings
    •    Exclusive treatments
    •    Private events & launches

⸻

Legal Notice

By paying your deposit and booking an appointment, you agree to all terms listed. These policies are binding and in place to protect the integrity of our studio and ensure a premium experience for all clients.

⸻

Thank you for choosing Alpha Omega — where every detail is designed to elevate your confidence.

`;
