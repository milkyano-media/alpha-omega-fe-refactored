"use client";

import { useEffect } from "react";

export default function Login() {
  // Temporary redirect to Fresha
  useEffect(() => {
    window.location.href = "https://www.fresha.com/el/a/alpha-omega-mens-grooming-prahran-104-greville-street-hmdf1dt5?pId=2632101#gallery-section";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to Fresha...</h2>
        <p className="text-gray-600">Taking you to our booking platform</p>
      </div>
    </div>
  );
}
