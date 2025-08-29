"use client";

import { ServicesCarousel } from "@/components/services-carousel";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HaircutsGallery() {
  const router = useRouter();

  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-4xl text-center items-center mb-40 container mx-auto">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/gallery-1.png"}
            width={500}
            height={500}
            alt="Haircuts Gallery"
          />
        </div>

        <h1 className="text-3xl font-bold">Our Haircut Services</h1>

        <p>
          Discover our precision haircuts and grooming services. Each style is 
          crafted with expertise and attention to detail, tailored to enhance 
          your individual features and personal style.
        </p>

        <ServicesCarousel className="my-8" />

        <Button 
          variant="outline" 
          className="rounded-full py-2"
          onClick={() => router.back()}
        >
          Back to Gallery
        </Button>
      </section>
    </main>
  );
}