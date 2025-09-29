"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ChristosPage() {
  return (
    <main className="flex flex-col gap-20 px-4 my-32 max-w-4xl container mx-auto">
      {/* Profile Card */}
      <Card className="overflow-hidden rounded-2xl shadow-lg">
        <CardHeader className="flex flex-col items-center gap-4">
          <Image
            src={"/assets/ao-pixelate-black.png"}
            width={300}
            height={300}
            alt="Christos Barber"
            className="rounded-xl object-cover"
          />
          <CardTitle className="text-2xl font-bold">Christos</CardTitle>
          <CardDescription className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <Image
                src="/assets/aus.svg"
                width={24}
                height={16}
                alt="Australia Flag"
                className="rounded-sm"
              />
              English
            </span>
            <span className="flex items-center gap-2">
              <Image
                src="/assets/greece.svg"
                width={24}
                height={16}
                alt="Greece Flag"
                className="rounded-sm"
              />
              Greek
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="text-gray-700 leading-relaxed text-center space-y-4">
          <p>
            Driven by creativity, detail, and growth, I’ve been dedicated to the
            barbering industry since 2018. My journey began in Greece and led me
            to Australia with a clear mission: to redefine grooming through
            authenticity and excellence.
          </p>
          <p>
            Alpha Omega is more than just a barbershop — it’s my vision brought
            to life. A space that reflects luxury, craftsmanship, and
            individuality. For me, style isn’t just appearance; it’s confidence
            and a statement about how you live your life.
          </p>
          <p className="font-semibold italic">
            “Not here to imitate. Here to dominate.”
          </p>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link href="/barbers">
            <Button variant="default" className="px-6">
              Back to Barbers
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Work Gallery Card */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Work Showcase</CardTitle>
          <CardDescription>Some of Christos’ signature cuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "/assets/cuts-01.jpg",
              "/assets/cuts-02.jpg",
              "/assets/cuts-03.jpg",
              "/assets/cuts-04.jpg",
              "/assets/cuts-05.jpg",
              "/assets/cuts-06.png",
            ].map((src, idx) => (
              <div
                key={idx}
                className="relative aspect-square overflow-hidden rounded-xl"
              >
                <Image
                  src={src}
                  alt={`Christos cut ${idx + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
