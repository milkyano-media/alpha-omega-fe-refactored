import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";
import { FreshaRedirectWrapper } from "@/components/fresha-redirect";

function SignUpContent() {
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

export default function SignUp() {
  return (
    <FreshaRedirectWrapper>
      <SignUpContent />
    </FreshaRedirectWrapper>
  );
}
