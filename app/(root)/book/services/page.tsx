"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BookingService, TeamMember, Service } from "@/lib/booking-service";
import { preloadBarberImages } from "@/lib/barber-images";

export default function ServiceSelection() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Record<number, TeamMember[]>>({});
  const [isLoading, setIsLoading] = useState(true);
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
    
    // Preload barber images for better performance
    preloadBarberImages();
  }, [isAuthenticated, router]);

  const handleViewBarbers = (service: Service) => {
    // Store selected service and navigate to barbers page
    localStorage.setItem("selectedService", JSON.stringify(service));
    router.push(`/book/barbers?serviceId=${service.id}`);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900">Loading Services</h2>
          <p className="mt-2 text-gray-600">Finding the best barbers for you...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Services</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-gray-900 hover:bg-gray-800"
          >
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pt-24 sm:pt-32 lg:pt-40">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Choose Your Service
          </h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            Select your preferred service and choose from our available professional barbers
          </p>
        </div>

        {services.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Available</h3>
            <p className="text-gray-500">
              No services are currently available. Please check back later or contact us directly.
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-3 sm:gap-4">
              {services
                .filter(
                  (service) => barbers[service.id] && barbers[service.id].length > 0,
                )
                .map((service) => {
                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group"
                      onClick={() => handleViewBarbers(service)}
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
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  <span className="font-bold text-gray-900">
                                    ${(service.price_amount / 100).toFixed(2)}
                                  </span>
                                </span>
                                
                                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {service.duration > 10000
                                    ? Math.round(service.duration / 60000)
                                    : service.duration} min
                                </span>
                                
                                {barbers[service.id] && (
                                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                                    {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg> */}
                                    <span className="font-bold text-gray-900">
                                     {barbers[service.id].length} barber{barbers[service.id].length !== 1 ? 's' : ''}
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
                              {typeof window !== 'undefined' && window.innerWidth <= 768 ? (
                                <Button
                                  className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 px-3 py-2 text-sm font-semibold transition-all duration-200 group-hover:bg-gray-800 shadow-sm"
                                  disabled={
                                    !barbers[service.id] || barbers[service.id].length === 0
                                  }
                                >
                                  Choose Barber
                                </Button>
                              ) : (
                                <Button
                                  className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 font-semibold transition-all duration-200 group-hover:bg-gray-800 shadow-sm"
                                  disabled={
                                    !barbers[service.id] || barbers[service.id].length === 0
                                  }
                                >
                                  Choose Barber
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}