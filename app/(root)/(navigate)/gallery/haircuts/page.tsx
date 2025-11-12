"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

const instaPosts = [
  {
    id: 1,
    type: "video",
    src: "/video-1.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 2,
    type: "video",
    src: "/video-2.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 3,
    type: "video",
    src: "/video-3.mp4",
    url: "https://www.instagram.com/alpha.omega_mens.grooming",
  },
  {
    id: 4,
    type: "video",
    src: "/video-4.mp4",
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
              className="snap-center flex-shrink-0"
            >
              <video
                src={post.src}
                muted
                controls
                autoPlay
                loop
                playsInline
                className="w-64 h-96 object-cover rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
              />
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
