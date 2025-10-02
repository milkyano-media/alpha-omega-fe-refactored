"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

const instaPosts = [
  {
    id: 1,
    type: "video",
    src: "/assets/video-1.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 2,
    type: "video",
    src: "/assets/video-2.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 3,
    type: "video",
    src: "/assets/video-3.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 4,
    type: "video",
    src: "/assets/video-4.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
];

export default function HaircutsGallery() {
  const router = useRouter();

  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-5xl text-center items-center mb-40 container mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-gray-600 max-w-2xl">
          Discover our precision haircuts and grooming styles. Straight from our
          Instagram — real cuts, real clients, and authentic detail.
        </p>

        {/* Video Gallery */}
        <div className="w-full flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-hide py-6">
          {instaPosts.map((post) => (
            <Link
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex-shrink-0 snap-center w-72 h-96 rounded-xl overflow-hidden shadow-md hover:scale-[1.02] transition"
            >
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={post.src} type="video/mp4" />
              </video>
            </Link>
          ))}
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
