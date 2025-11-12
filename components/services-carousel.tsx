"use client";

import { Circular3DCarousel } from "@/components/ui/circular-3d-carousel";

interface ServiceCarouselProps {
  className?: string;
}

const carouselItems = [
  {
    id: "1",
    image: "/assets/main-8.png",
    alt: "Haircut showcase 1",
  },
  {
    id: "2",
    image: "/assets/cuts-01.jpg",
    alt: "Haircut showcase 2",
  },
  {
    id: "3",
    image: "/assets/cuts-02.jpg",
    alt: "Haircut showcase 3",
  },
  {
    id: "4",
    image: "/assets/cuts-03.jpg",
    alt: "Haircut showcase 4",
  },
  {
    id: "5",
    image: "/assets/cuts-04.jpg",
    alt: "Haircut showcase 5",
  },
  {
    id: "6",
    image: "/assets/cuts-05.jpg",
    alt: "Haircut showcase 6",
  },
  {
    id: "7",
    image: "/assets/cuts-06.png",
    alt: "Haircut showcase 7",
  },
  {
    id: "8",
    image: "/assets/cuts-07.png",
    alt: "Haircut showcase 8",
  },
  {
    id: "9",
    image: "/assets/cuts-08.png",
    alt: "Haircut showcase 9",
  },
  {
    id: "10",
    image: "/assets/cuts-09.png",
    alt: "Haircut showcase 10",
  },
  {
    id: "11",
    image: "/assets/cuts-10.png",
    alt: "Haircut showcase 11",
  },
  {
    id: "12",
    image: "/assets/cuts-11.png",
    alt: "Haircut showcase 12",
  },
  {
    id: "13",
    image: "/assets/cuts-12.png",
    alt: "Haircut showcase 13",
  },
];

export function ServicesCarousel({ className }: ServiceCarouselProps) {
  return (
    <Circular3DCarousel
      items={carouselItems}
      autoRotate={true}
      radius={550}
      className={className}
    />
  );
}
