import { Suspense } from "react";
import { VerificationForm } from "@/components/verification-form";

export default function Verify() {
  return (
    <main className="flex flex-col gap-20 mt-20">
      <section className="flex flex-col gap-8 h-screen justify-center items-center px-4">
        <Suspense fallback={<div>Loading...</div>}>
          <VerificationForm />
        </Suspense>
      </section>
    </main>
  );
}
