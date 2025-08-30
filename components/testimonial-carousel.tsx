"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface TestimonialCarouselProps {
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  className?: string;
}

export function TestimonialCarousel({ images, className = "" }: TestimonialCarouselProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Create extended array with duplicates for infinite scroll
  const extendedImages = [
    ...images, // Original set
    ...images, // First duplicate
    ...images, // Second duplicate  
    ...images, // Third duplicate (for smoother scrolling)
  ];

  // Initialize scroll position to middle set
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const itemWidth = window.innerWidth < 768 ? 336 : 400;
      container.scrollLeft = images.length * itemWidth; // Start at first duplicate set
    }
  }, [images.length]);

  // Handle infinite scroll reset
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const itemWidth = window.innerWidth < 768 ? 336 : 400;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const singleSetWidth = images.length * itemWidth;
    
    // Reset when reaching boundaries
    if (container.scrollLeft <= 0) {
      // Reached beginning, jump to end of second duplicate set
      container.scrollLeft = singleSetWidth * 2;
    } else if (container.scrollLeft >= maxScroll) {
      // Reached end, jump to beginning of first duplicate set  
      container.scrollLeft = singleSetWidth;
    }
  };

  // Arrow navigation
  const scrollBy = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollAmount = window.innerWidth < 768 ? 336 : 400; // One image width
    
    container.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  // Touch/Mouse drag handlers
  const handleDragStart = (clientX: number) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(clientX);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const x = clientX;
    const walk = (x - startX) * 2; // Multiply for faster scroll
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Touch events - simplified without preventDefault to avoid passive listener issues
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      handleDragMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.pageX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleDragMove(e.pageX);
    }
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd();
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
        style={{
          scrollBehavior: isDragging ? 'auto' : 'smooth'
        }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex gap-4 pb-4 md:justify-start justify-center" style={{ minWidth: 'max-content', paddingLeft: 'max(1rem, calc(50vw - 160px))', paddingRight: 'max(1rem, calc(50vw - 160px))' }}>
          {extendedImages.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className="flex-shrink-0 w-80 md:w-96"
              style={{ userSelect: 'none' }}
            >
              <Image
                src={image.src}
                width={500}
                height={500}
                alt={image.alt}
                className="w-full h-auto rounded-lg"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => scrollBy('left')}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110 z-10 hidden md:block"
        aria-label="Previous testimonial"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={() => scrollBy('right')}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110 z-10 hidden md:block"
        aria-label="Next testimonial"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}