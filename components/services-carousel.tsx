"use client";

import { FanCarousel } from "@/components/ui/fan-carousel";
import { getServiceImageSafe } from "@/lib/service-images";

interface ServiceCarouselProps {
  className?: string;
}

// Sample services data for the carousel
const SERVICES_DATA = [
  {
    id: "haircut",
    name: "Precision Haircut",
    description: "Expert scissor cuts tailored to your face shape and style preferences",
  },
  {
    id: "beard",
    name: "Beard Styling",
    description: "Professional beard trimming and shaping with razor precision",
  },
  {
    id: "wash",
    name: "Hair Wash & Treatment",
    description: "Refreshing hair washing with premium conditioning treatments",
  },
  {
    id: "package",
    name: "Premium Package",
    description: "Complete grooming experience combining our best services",
  },
  {
    id: "color",
    name: "Color & Styling",
    description: "Professional coloring and styling for the modern gentleman",
  },
];

export function ServicesCarousel({ className }: ServiceCarouselProps) {
  const carouselItems = SERVICES_DATA.map((service) => {
    const imageData = getServiceImageSafe(service.name, service.description);
    
    return {
      id: service.id,
      title: service.name,
      image: imageData.src,
      gradient: imageData.gradient,
    };
  });

  return (
    <FanCarousel
      items={carouselItems}
      autoRotate={false}
      className={className}
    />
  );
}