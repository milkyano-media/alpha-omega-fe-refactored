"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryCarouselProps {
  className?: string;
}

// Gallery images data
const GALLERY_IMAGES = [
  {
    id: 1,
    src: "/assets/main-8.png",
    alt: "Gallery showcase 1",
  },
  {
    id: 2,
    src: "/assets/main-client-1.png", 
    alt: "Gallery showcase 2",
  },
  {
    id: 3,
    src: "/assets/main-client-2.png",
    alt: "Gallery showcase 3",
  },
  {
    id: 4,
    src: "/assets/main-client-3.png",
    alt: "Gallery showcase 4",
  },
  {
    id: 5,
    src: "/assets/main-client-4.png",
    alt: "Gallery showcase 5",
  },
];

export function GalleryCarousel({ className }: GalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % GALLERY_IMAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % GALLERY_IMAGES.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative w-full max-w-[500px] ${className}`}>
      {/* Main carousel container */}
      <div className="relative aspect-square overflow-hidden rounded-4xl shadow-lg bg-gray-200">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {GALLERY_IMAGES.map((image) => (
            <div key={image.id} className="relative w-full flex-shrink-0">
              <Image
                src={image.src}
                fill
                alt={image.alt}
                className="object-cover"
                sizes="500px"
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {GALLERY_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? "bg-white shadow-lg scale-110"
                  : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}