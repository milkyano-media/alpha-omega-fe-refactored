"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HorizontalCarousel } from "@/components/ui/horizontal-carousel";

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

        {/* <h1 className="text-3xl font-bold">Our Haircut Services</h1>

        <p>
          Discover our precision haircuts and grooming services. Each style is
          crafted with expertise and attention to detail, tailored to enhance
          your individual features and personal style.
        </p> */}

        <div className="w-full flex justify-center">
          <HorizontalCarousel
            items={[
              {
                id: "1",
                title: "Gallery Showcase 1",
                image: "/assets/main-8.png",
                gradient: "from-slate-800 to-slate-900",
              },
              {
                id: "2",
                title: "Gallery Showcase 2",
                image: "/assets/cuts-01.jpg",
                gradient: "from-amber-800 to-amber-900",
              },
              {
                id: "3",
                title: "Gallery Showcase 3",
                image: "/assets/cuts-02.jpg",
                gradient: "from-blue-800 to-blue-900",
              },
              {
                id: "4",
                title: "Gallery Showcase 4",
                image: "/assets/cuts-03.jpg",
                gradient: "from-purple-800 to-purple-900",
              },
              {
                id: "5",
                title: "Gallery Showcase 5",
                image: "/assets/cuts-04.jpg",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "6",
                title: "Gallery Showcase 6",
                image: "/assets/cuts-05.jpg",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "7",
                title: "Gallery Showcase 7",
                image: "/assets/cuts-06.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "8",
                title: "Gallery Showcase 8",
                image: "/assets/cuts-07.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "9",
                title: "Gallery Showcase 9",
                image: "/assets/cuts-08.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "10",
                title: "Gallery Showcase 10",
                image: "/assets/cuts-09.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "11",
                title: "Gallery Showcase 11",
                image: "/assets/cuts-10.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "12",
                title: "Gallery Showcase 12",
                image: "/assets/cuts-11.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
              {
                id: "13",
                title: "Gallery Showcase 13",
                image: "/assets/cuts-12.png",
                gradient: "from-emerald-800 to-emerald-900",
              },
            ]}
            autoRotate={true}
            autoRotateInterval={4000}
            className="my-8"
          />
        </div>

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
