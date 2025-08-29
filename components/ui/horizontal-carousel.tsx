"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HorizontalCarouselItem {
  id: string;
  title: string;
  image: string;
  gradient: string;
}

interface HorizontalCarouselProps {
  items: HorizontalCarouselItem[];
  autoRotate?: boolean;
  autoRotateInterval?: number;
  className?: string;
}

export function HorizontalCarousel({
  items,
  autoRotate = true,
  autoRotateInterval = 3000,
  className,
}: HorizontalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoRotate || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, autoRotateInterval, items.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (!items.length) return null;

  return (
    <motion.div 
      className={cn("relative w-full h-[600px] md:h-[768px] flex justify-center items-center overflow-hidden", className)}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        const threshold = 50;
        if (info.offset.x > threshold) {
          handlePrev();
        } else if (info.offset.x < -threshold) {
          handleNext();
        }
      }}
    >
      <div className="relative w-full h-full flex justify-center items-center">
        {items.map((item, index) => {
          // const isActive = index === currentIndex;
          // Calculate relative position for horizontal layout
          let relativeIndex = index - currentIndex;
          
          // Handle infinite wraparound
          if (relativeIndex > items.length / 2) {
            relativeIndex -= items.length;
          } else if (relativeIndex < -items.length / 2) {
            relativeIndex += items.length;
          }
          
          // The centered image is the one with relativeIndex = 0
          const isCentered = relativeIndex === 0;
          
          // Calculate position for horizontal layout with center focus
          const translateX = relativeIndex * 300; // horizontal spacing
          const scale = isCentered ? 1 : 0.75 - Math.abs(relativeIndex) * 0.05; // center is largest
          const zIndex = items.length - Math.abs(relativeIndex);
          const opacity = Math.max(0.3, 1 - Math.abs(relativeIndex) * 0.2);

          return (
            <motion.div
              key={`${item.id}-${index}`}
              className={cn(
                "absolute w-96 h-96 md:w-[500px] md:h-[500px] cursor-pointer",
                isCentered && "z-10"
              )}
              animate={{
                opacity,
                scale,
                x: translateX,
                y: 0,
                zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 30,
                mass: 1,
              }}
              whileHover={{
                scale: scale * 1.05,
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }
              }}
              whileTap={{
                scale: scale * 0.95,
                transition: { duration: 0.1 }
              }}
              onClick={() => handleCardClick(index)}
            >
              <motion.div
                className={cn(
                  "relative w-full h-full rounded-2xl overflow-hidden",
                  "bg-gradient-to-br",
                  item.gradient
                )}
                whileHover={{
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <Image
                    src={item.image}
                    fill
                    alt={item.title}
                    className="object-cover"
                    sizes="500px"
                  />
                </motion.div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                  initial={{ opacity: 0.3 }}
                  whileHover={{ opacity: 0.7 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <motion.h3 
                    className={cn(
                      "text-white font-bold text-center drop-shadow-lg",
                      isCentered ? "text-lg" : "text-base"
                    )}
                    whileHover={{
                      scale: 1.1,
                      textShadow: "0 0 20px rgba(255,255,255,0.8)"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.title}
                  </motion.h3>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation dots */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {items.map((_, index) => (
          <motion.button
            key={index}
            className={cn(
              "w-3 h-3 rounded-full",
              index === currentIndex
                ? "bg-white shadow-lg"
                : "bg-white/50"
            )}
            whileHover={{ 
              scale: 1.2,
              backgroundColor: "rgba(255,255,255,0.8)"
            }}
            whileTap={{ scale: 0.9 }}
            animate={{
              scale: index === currentIndex ? 1.25 : 1,
              boxShadow: index === currentIndex 
                ? "0 4px 12px rgba(255,255,255,0.4)" 
                : "0 2px 4px rgba(0,0,0,0.1)"
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
            onClick={() => handleCardClick(index)}
          />
        ))}
      </motion.div>

      {/* Navigation arrows for mobile */}
      <motion.div 
        className="md:hidden absolute inset-y-0 left-0 right-0 flex justify-between items-center px-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <motion.button
          className="w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center pointer-events-auto"
          whileHover={{ 
            backgroundColor: "rgba(255,255,255,1)",
            scale: 1.1,
            boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
          }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={handlePrev}
        >
          <motion.svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ x: -2 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </motion.svg>
        </motion.button>
        <motion.button
          className="w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center pointer-events-auto"
          whileHover={{ 
            backgroundColor: "rgba(255,255,255,1)",
            scale: 1.1,
            boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
          }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={handleNext}
        >
          <motion.svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </motion.svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}