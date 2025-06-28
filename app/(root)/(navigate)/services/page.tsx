"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleBookBarber = () => {
    if (isAuthenticated) {
      router.push("/book/services");
    } else {
      router.push("/login?returnUrl=/book/services");
    }
  };
  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-2xl container mx-auto">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/services-1.png"}
            width={500}
            height={500}
            alt="What We Do For You"
          />
        </div>

        <p>
          From precision haircuts and classic shaves to beard styling and
          premium treatments, our services are designed to keep you looking
          sharp and feeling confident.
        </p>
      </section>

      <section className="flex flex-col gap-8 items-center text-center bg-[#292929] py-10 px-4">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/services-2.png"}
            width={500}
            height={500}
            alt="Types Of Service"
          />
        </div>

        <p className="text-white max-w-2xl">
          we offer a full range of services, including expert haircuts to beard
          sculpting. Each service is tailored to suit your style, ensuring you
          leave feeling your best.
        </p>

        <div className="bg-white rounded-md flex flex-col text-center items-center gap-8 p-2 w-full max-w-2xl">
          <h3>Haircut</h3>

          <p>
            A precision-crafted haircut tailored to your style, ensuring sharp
            lines, clean fades, or classic trims that leave you looking your
            best.
          </p>

          <div className="w-full md:w-max self-center">
            <Image
              src={"/assets/services-3.png"}
              width={500}
              height={500}
              alt="The Haircut"
            />
          </div>

          <Button variant={"secondary"} onClick={handleBookBarber}>BOOK BARBER</Button>

          <a href="#">Learn More</a>
        </div>

        <div className="bg-white rounded-md flex flex-col text-center items-center gap-8 p-2 w-full max-w-2xl">
          <h3>Haircut + Beard </h3>

          <p>
            A complete grooming package that combines a tailored haircut with
            expert beard shaping and styling for a polished, cohesive look.
          </p>

          <div className="w-full md:w-max self-center">
            <Image
              src={"/assets/services-4.png"}
              width={500}
              height={500}
              alt="The Haircut"
            />
          </div>

          <Button variant={"secondary"} onClick={handleBookBarber}>BOOK BARBER</Button>

          <a href="#">Learn More</a>
        </div>
      </section>

      <section className="flex flex-col gap-8 items-center">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/services-5.png"}
            width={500}
            height={500}
            alt="Haircut"
          />
        </div>

        <div className="w-full md:w-max self-center">
          <Image
            src={"/bg/services-1.png"}
            width={500}
            height={500}
            alt="Background Services"
          />
        </div>
      </section>

      <section className="flex flex-col gap-8 items-center px-4 mb-40">
        <p className="max-w-2xl">
          {`
          A precision-crafted haircut tailored to your style, ensuring sharp
          lines, clean fades, or classic trims that leave you looking your best.
          Our haircuts are more than just a trim—they're crafted to match your
          unique style and personality. Whether it’s a classic cut or a modern
          look, we deliver precision, detail, and confidence every time.`}
        </p>

        <b>Reviews Of The Service</b>

        <div className="w-full overflow-x-auto">
          <div className="flex md:justify-center gap-8 w-max md:w-full">
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/services-carousel-1.png"}
                width={500}
                height={500}
                alt="The Haircut"
              />

              <Button variant={"secondary"} className="w-full" onClick={handleBookBarber}>
                BOOK BARBER
              </Button>
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/services-carousel-1.png"}
                width={500}
                height={500}
                alt="The Haircut"
              />

              <Button variant={"secondary"} className="w-full" onClick={handleBookBarber}>
                BOOK BARBER
              </Button>
            </div>
            <div className="w-80 md:w-md flex flex-col gap-6">
              <Image
                src={"/assets/services-carousel-1.png"}
                width={500}
                height={500}
                alt="The Haircut"
              />

              <Button variant={"secondary"} className="w-full" onClick={handleBookBarber}>
                BOOK BARBER
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
