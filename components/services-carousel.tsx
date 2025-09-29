"use client";

import { FanCarousel } from "@/components/ui/fan-carousel";

interface ServiceCarouselProps {
  className?: string;
}

const carouselItems = [
  {
    id: "1",
    title: "",
    image: "/assets/main-8.png",
    gradient: "from-slate-800 to-slate-900",
  },
  {
    id: "2",
    title: "",
    image: "/assets/cuts-01.jpg",
    gradient: "from-amber-800 to-amber-900",
  },
  {
    id: "3",
    title: "",
    image: "/assets/cuts-02.jpg",
    gradient: "from-blue-800 to-blue-900",
  },
  {
    id: "4",
    title: "",
    image: "/assets/cuts-03.jpg",
    gradient: "from-purple-800 to-purple-900",
  },
  {
    id: "5",
    title: "",
    image: "/assets/cuts-04.jpg",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "6",
    title: "",
    image: "/assets/cuts-05.jpg",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "7",
    title: "",
    image: "/assets/cuts-06.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "8",
    title: "",
    image: "/assets/cuts-07.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "9",
    title: "",
    image: "/assets/cuts-08.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "10",
    title: "",
    image: "/assets/cuts-09.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "11",
    title: "",
    image: "/assets/cuts-10.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "12",
    title: "",
    image: "/assets/cuts-11.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
  {
    id: "13",
    title: "",
    image: "/assets/cuts-12.png",
    gradient: "from-emerald-800 to-emerald-900",
  },
];

export function ServicesCarousel({ className }: ServiceCarouselProps) {
  return (
    <FanCarousel
      items={carouselItems}
      autoRotate={false}
      className={className}
    />
  );
}
