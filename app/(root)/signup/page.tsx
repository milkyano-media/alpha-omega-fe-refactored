"use client";

import { Suspense, useEffect } from "react";
import { SignUpForm } from "@/components/sign-up-form";

export default function SignUp() {
  // Check for Fresha redirect environment variable
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_REDIRECT_TO_FRESHA === 'true') {
      window.location.href = "https://www.fresha.com/el/a/alpha-omega-mens-grooming-prahran-104-greville-street-hmdf1dt5?pId=2632101#gallery-section";
      return;
    }
  }, []);

  // Show redirect loading if redirect is enabled
  if (process.env.NEXT_PUBLIC_REDIRECT_TO_FRESHA === 'true') {
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

  return (
    <main className="flex flex-col gap-8 mt-5">
      <section className="flex flex-col gap-8 min-h-[calc(100vh-100px)] justify-center items-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
            <SignUpForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
