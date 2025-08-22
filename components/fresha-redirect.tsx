"use client";

import { useEffect } from "react";

interface FreshaRedirectProps {
  children: React.ReactNode;
}

export function FreshaRedirectWrapper({ children }: FreshaRedirectProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_REDIRECT_TO_FRESHA === "true") {
      window.location.href =
        "https://www.fresha.com/book-now/alpha-omega-mens-grooming-nrnszoxt/all-offer?share=true&pId=2632101";
    }
  }, []);
 
  // If redirect is enabled, show loading screen
  if (process.env.NEXT_PUBLIC_REDIRECT_TO_FRESHA === "true") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirecting to Fresha...
          </h2>
          <p className="text-gray-600">Taking you to our booking platform</p>
        </div>
      </div>
    );
  }

  // Otherwise, render the original component
  return <>{children}</>;
}
