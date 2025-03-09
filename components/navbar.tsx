"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Menu } from "./menu";

export function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    if (navRef.current) {
      setNavHeight(navRef.current.clientHeight);
    }
  }, []);

  return (
    <nav
      style={{ marginBottom: -navHeight }}
      ref={navRef}
      className="flex justify-between p-4 sticky top-0 bg-black/15 md:bg-[#F8F8F8] backdrop-blur-xs"
    >
      <div className="h-7">
        <Image
          className="w-fit"
          src={"/logo/text.png"}
          width={500}
          height={500}
          alt="Alpha Omega Text logo"
        />
      </div>

      <svg
        className="w-7 md:hidden"
        viewBox="0 0 32 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24.4706 19.9413H7.5M24.4706 13.9706H7.5M24.4706 7.99994H7.5"
          stroke="#F4F6F7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <Menu />
    </nav>
  );
}
