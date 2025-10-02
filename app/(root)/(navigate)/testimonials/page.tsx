"use client";

import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 my-40 container mx-auto">
        <div className="w-full md:w-max mx-auto">
          <Image
            src={"/assets/testi-1.png"}
            width={400}
            height={400}
            alt="Testimonials"
          />
        </div>

        <div className="w-full overflow-x-auto flex justify-center items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 justify-center gap-8 w-max md:w-full">
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-1.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-2.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-3.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-4.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-5.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/testi-carousel-6.png"}
                width={400}
                height={400}
                alt="The Haircut"
              />
            </div>
          </div>
        </div>
      </section>

      {/* <section className="flex flex-col gap-8 px-4 text-center container mx-auto mb-40">
        <div className="w-full md:w-max mx-auto">
          <Image
            src={"/assets/testi-2.png"}
            width={400}
            height={400}
            alt="Need More Convincing?"
          />
        </div>

        <p className="text-lg md:text-xl max-w-2xl mx-auto text-center">
          We have the customers and the reviews to prove it our specialty is one
          of the best in Melbourne.
        </p>

        <div className="w-full overflow-x-auto">
          <div className="flex gap-4 md:gap-8 w-max md:w-full md:justify-center">
            <div className="w-40 md:w-[350px] md:h-[600px] h-80 bg-[#D9D9D9] rounded-md"></div>

            <div className="w-40 md:w-[350px] md:h-[600px] h-80 bg-[#D9D9D9] rounded-md"></div>

            <div className="w-40 md:w-[350px] md:h-[600px] h-80 bg-[#D9D9D9] rounded-md"></div>
          </div>
        </div>
      </section> */}
    </main>
  );
}
