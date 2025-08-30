"use client";

import React, { useState, useRef, forwardRef } from "react";

interface SwipeableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const SwipeableContainer = forwardRef<HTMLDivElement, SwipeableContainerProps>(
  function SwipeableContainer({ children, className = "" }, forwardedRef) {
  // const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = forwardedRef || internalRef;

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    if (containerRef && 'current' in containerRef && containerRef.current) {
      setScrollLeft(containerRef.current.scrollLeft);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef || !('current' in containerRef) || !containerRef.current) return;
    
    const x = clientX;
    const walk = (x - startX) * 2; // Multiply for faster scroll
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.pageX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.pageX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  return (
    <div 
      ref={containerRef}
      className={`overflow-x-auto scrollbar-hide ${className}`}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        scrollBehavior: isDragging ? 'auto' : 'smooth'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
  }
);