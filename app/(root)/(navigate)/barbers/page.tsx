"use client";

import Image from "next/image";
import Link from "next/link";

const barbers = [
  // {
  //   name: "Nikos",
  //   image: "/assets/ao-pixelate-black.png",
  //   flags: [
  //     { src: "/assets/aus.svg", alt: "Australia Flag", lang: "English" },
  //     { src: "/assets/greece.svg", alt: "Greece Flag", lang: "Greek" },
  //   ],
  //   bio: "Specialist in modern fades and luxury beard trims. Attention to detail with a sharp, clean aesthetic.",
  //   link: "/barbers/nikos",
  // },
  {
    name: "Christos",
    image: "/assets/christos.jpg",
    flags: [
      { src: "/assets/aus.svg", alt: "Australia Flag", lang: "English" },
      { src: "/assets/greece.svg", alt: "Greece Flag", lang: "Greek" },
    ],
    bio: "Barber since 2018, bringing creativity and precision from Greece to Australia. Founder of Alpha Omega — where authenticity meets luxury.",
    link: "/barbers/christos",
  },
  // {
  //   name: "Alex",
  //   image: "/assets/ao-pixelate-black.png",
  //   flags: [{ src: "/assets/aus.svg", alt: "Australia Flag", lang: "English" }],
  //   bio: "Master stylist focusing on scissor work, long hair, and contemporary restyling.",
  //   link: "/barbers/alex",
  // },
];

export default function BarbersPage() {
  return (
    <main className="flex flex-col gap-20">
      {/* Hero Section */}
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-2xl container mx-auto">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/barbers-1.png"}
            width={500}
            height={500}
            alt="Barbers 3d"
          />
        </div>
      </section>

      {/* Scrollable Barbers */}
      <section className="px-4 container mx-auto mb-40">
        <h2 className="text-center text-2xl font-bold mb-10">
          Meet Our Barbers
        </h2>

        <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:justify-center">
          {barbers.map((barber) => (
            <div
              key={barber.name}
              className="bg-white rounded-xl shadow-md flex-shrink-0 snap-center w-80 flex flex-col justify-between items-center gap-4 p-6"
            >
              <div className="flex flex-col justify-center items-center gap-4">
                {/* Image */}
                <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full flex justify-center items-center overflow-hidden">
                  <Image
                    src={barber.image}
                    width={400}
                    height={400}
                    alt={barber.name}
                    className="object-cover"
                  />
                </div>

                {/* Name */}
                <h4 className="text-xl font-semibold">{barber.name}</h4>

                {/* Flags */}
                <div className="flex gap-4">
                  {barber.flags.map((flag, idx) => (
                    <span key={idx} className="flex items-center gap-2">
                      <Image
                        src={flag.src}
                        width={24}
                        height={16}
                        alt={flag.alt}
                        className="rounded-sm"
                      />
                      {flag.lang}
                    </span>
                  ))}
                </div>

                {/* Bio */}
                <p className="text-center text-gray-700 text-sm">
                  {barber.bio}
                </p>
              </div>
              {/* Button */}
              <Link
                href={barber.link}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
              >
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
