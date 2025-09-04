"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import InstagramFeed from "@/components/instagram-feed";

export default function BarbershopGallery() {
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

        <h1 className="text-3xl font-bold">Our Barbershop Gallery</h1>

        <p>
          Discover our precision haircuts and grooming services. Each style is 
          crafted with expertise and attention to detail, tailored to enhance 
          your individual features and personal style.
        </p>

      {/* Instagram Gallery */}
      {/* <section className="container mx-auto px-4 mb-20"> */}
        <div className="border-t pt-10 w-full">
          <InstagramFeed />
        </div>
      {/* </section> */}

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