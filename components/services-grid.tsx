"use client";

// import { getServiceImageSafe } from "@/lib/service-images";
import Image from "next/image";

interface ServicesGridProps {
  className?: string;
}

// Sample services data for the grid
const SERVICES_DATA = [
  {
    id: "haircut",
    name: "Haircut",
    image: "/assets/cuts-11.png",
    description:
      "Expert scissor cuts tailored to your face shape and style preferences",
  },
  {
    id: "beard",
    name: "Beard Trim",
    image: "/assets/cuts-13.png",
    description: "Professional beard trimming and shaping with razor precision",
  },
  {
    id: "scissor cut",
    name: "Scissor Cut",
    image: "/assets/premium-haircut.jpg",
    description: "Refreshing hair washing with premium conditioning treatments",
  },
  {
    id: "long beard trim",
    name: "Long Beard Trim",
    image: "/assets/cuts-15.png",
    description: "Professional coloring and styling for the modern gentleman",
  },
  {
    id: "afro haircut",
    name: "Afro Haircut",
    image: "/assets/cuts-07.png",
    description: "Professional coloring and styling for the modern gentleman",
  },
  {
    id: "clean shave",
    name: "Clean Shave",
    description: "Complete grooming experience combining our best services",
  },
  {
    id: "styling",
    name: "Restyle",
    image: "/assets/cuts-14.png",
    description: "Professional styling for any occasion or event",
  },
  {
    id: "eyebrows",
    name: "Eyebrows",
    description: "Refreshing hair washing with premium conditioning treatments",
  },
];

export function ServicesGrid({ className }: ServicesGridProps) {
  const totalItems = SERVICES_DATA.length;
  const remainingDesktop = totalItems % 3;

  // Split items into complete rows and remaining items
  const completeItems =
    remainingDesktop === 0
      ? SERVICES_DATA
      : SERVICES_DATA.slice(0, totalItems - remainingDesktop);
  const remainingItems =
    remainingDesktop === 0
      ? []
      : SERVICES_DATA.slice(totalItems - remainingDesktop);

  return (
    <div className={className}>
      {/* Complete rows */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {completeItems.map((service) => (
          <div
            key={service.id}
            className="relative rounded-2xl overflow-hidden bg-gray-200 hover:scale-105 transition-transform duration-300 cursor-pointer group"
          >
            <Image
              // src={imageData.src}
              src={
                service.image ? service.image : `/assets/ao-pixelate-black.png`
              }
              width={400}
              height={300}
              alt={service.name}
              className="w-full h-48 md:h-56 object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
              <h3 className="text-white font-semibold text-sm md:text-base text-center drop-shadow-lg">
                {service.name}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Last row - centered */}
      {remainingItems.length > 0 && (
        <div
          className={`flex justify-center gap-4 md:gap-6 ${
            completeItems.length > 0 ? "mt-4 md:mt-6" : ""
          }`}
        >
          {remainingItems.map((service) => (
            <div
              key={service.id}
              className="relative rounded-2xl overflow-hidden bg-gray-200 hover:scale-105 transition-transform duration-300 cursor-pointer group w-full max-w-[calc(50%-0.5rem)] md:max-w-[calc(33.333%-1rem)]"
            >
              <Image
                // src={imageData.src}
                src={
                  service.image
                    ? service.image
                    : `/assets/ao-pixelate-black.png`
                }
                width={400}
                height={300}
                alt={service.name}
                className="w-full h-48 md:h-56 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-white font-semibold text-sm md:text-base text-center drop-shadow-lg">
                  {service.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
