"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
// import InstagramFeed from "@/components/instagram-feed";

export default function BarbershopGallery() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const galleryImages = [
    "/assets/ao-barbershop-1.png",
    "/assets/ao-barbershop-2.png",
    "/assets/ao-barbershop-7.png",
    "/assets/ao-barbershop-4.png",
    "/assets/ao-barbershop-13.png",
    // "/assets/ao-barbershop-14.png",
    "/assets/ao-barbershop-17.png",
    "/assets/ao-barbershop-18.png",
    "/assets/ao-barbershop-5.png",
    "/assets/ao-barbershop-6.png",
    "/assets/ao-barbershop-3.png",
    "/assets/ao-barbershop-8.png",
    "/assets/ao-barbershop-9.png",
    "/assets/ao-barbershop-10.png",
    "/assets/ao-barbershop-11.png",
    "/assets/ao-barbershop-12.png",
    // "/assets/ao-barbershop-15.png",
    "/assets/ao-barbershop-16.png",
    "/assets/ao-barbershop-20.png",
    "/assets/ao-barbershop-19.png",
  ];

  const openLightbox = (image: string, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToPrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : galleryImages.length - 1;
    setSelectedIndex(newIndex);
    setSelectedImage(galleryImages[newIndex]);
  };

  const goToNext = () => {
    const newIndex = selectedIndex < galleryImages.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    setSelectedImage(galleryImages[newIndex]);
  };

  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-6xl text-center items-center mb-40 container mx-auto">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/gallery-1.png"}
            width={500}
            height={500}
            alt="Haircuts Gallery"
          />
        </div>

        {/* <h1 className="text-3xl font-bold">Our Barbershop Gallery</h1>

        <p>
          Discover our precision haircuts and grooming services. Each style is
          crafted with expertise and attention to detail, tailored to enhance
          your individual features and personal style.
        </p> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {galleryImages.map((image, index) => (
            <div
              key={image}
              className="relative aspect-square overflow-hidden rounded-xl cursor-pointer group"
              onClick={() => openLightbox(image, index)}
            >
              <Image
                src={image}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                alt={`Barbershop Gallery ${index + 1}`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>

        {/* Instagram Gallery */}
        {/* <section className="container mx-auto px-4 mb-20"> */}
        {/* <div className="border-t pt-10 w-full">
          <InstagramFeed />
        </div> */}
        {/* </section> */}

        <Button
          variant="outline"
          className="rounded-full py-2"
          onClick={() => router.back()}
        >
          Back to Gallery
        </Button>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light w-12 h-12 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 text-white hover:text-gray-300 text-4xl font-bold z-50 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50 transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 text-white hover:text-gray-300 text-4xl font-bold z-50 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50 transition-colors"
            aria-label="Next"
          >
            ›
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              fill
              className="object-contain"
              alt={`Gallery image ${selectedIndex + 1}`}
              sizes="100vw"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </main>
  );
}
