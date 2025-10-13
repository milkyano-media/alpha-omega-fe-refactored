"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Circular3DCarouselItem {
  id: string;
  image: string;
  alt?: string;
}

interface Circular3DCarouselProps {
  items: Circular3DCarouselItem[];
  autoRotate?: boolean;
  radius?: number;
  className?: string;
}

export function Circular3DCarousel({
  items,
  autoRotate = true,
  radius = 550,
  className,
}: Circular3DCarouselProps) {
  const [rotation, setRotation] = useState(0);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set initial width on mount
    setWindowWidth(window.innerWidth);
    setMounted(true);

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!autoRotate || items.length === 0) return;

    const interval = setInterval(() => {
      setRotation((prev) => prev + 0.2);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [autoRotate, items.length]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted || !items.length) return null;

  // Responsive radius based on screen size
  const responsiveRadius =
    windowWidth === null
      ? radius
      : windowWidth < 640
      ? 250
      : windowWidth < 768
      ? 450
      : radius;

  return (
    <motion.div
      className={cn(
        "relative w-full h-[300px] sm:h-[450px] md:h-[550px] flex justify-center items-center",
        className
      )}
      style={{
        perspective: "1000px",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* 3D Rotating Container */}
      <motion.div
        className="relative w-[90px] h-[120px] sm:w-[140px] sm:h-[180px] md:w-[160px] md:h-[200px]"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(-16deg) rotateY(${rotation}deg)`,
        }}
      >
        {items.map((item, index) => {
          const angle = (index / items.length) * 360;

          return (
            <div
              key={item.id}
              className="absolute w-full h-full left-0 top-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg) translateZ(${responsiveRadius}px)`,
              }}
            >
              <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border-2 md:border-4 border-white">
                <Image
                  src={item.image}
                  fill
                  alt={item.alt || `Gallery image ${index + 1}`}
                  className="object-cover"
                  sizes="(max-width: 640px) 90px, (max-width: 768px) 140px, 160px"
                />
              </div>
            </div>
          );
        })}
      </motion.div>

    </motion.div>
  );
}
