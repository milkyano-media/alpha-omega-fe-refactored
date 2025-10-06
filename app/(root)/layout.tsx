"use client"

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { VerificationRequired } from "@/components/verification-required";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <>
      {/* Show navbar on all pages, but hide on mobile for admin pages */}
      <div className={isAdminPage ? "hidden lg:block" : ""}>
        <Navbar />
      </div>
      <div className={isAdminPage ? "lg:pt-8" : "pt-8"}>
        <VerificationRequired>{children}</VerificationRequired>
      </div>
      {!isAdminPage && <Footer />}
    </>
  );
}
