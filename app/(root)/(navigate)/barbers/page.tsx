import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col gap-20">
      <section className="flex flex-col gap-8 px-4 mt-40 max-w-2xl container mx-auto">
        <div className="w-full md:w-max self-center">
          <Image
            src={"/assets/barbers-1.png"}
            width={500}
            height={500}
            alt="Barbers 3d"
          />
        </div>

        <p>
          From precision haircuts and classic shaves to beard styling and
          premium treatments, our services are designed to keep you looking
          sharp and feeling confident.
        </p>
      </section>

      <section className="flex flex-col items-center gap-8 px-4 container max-w-2xl mx-auto mb-40">
        <div className="w-full md:w-max flex flex-col items-center gap-4">
          {/* <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-4xl">
            <Image
              src={"/assets/barber-1.png"}
              width={500}
              height={500}
              className="object-cover w-full h-full"
              alt="The Barber"
            />
          </div> */}

          <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full flex justify-center items-center">
            <Image
              src={"/assets/ao-pixelate-black.png"}
              width={500}
              height={500}
              alt=""
            />
          </div>
          <h4>Christos</h4>

          <p className="text-gray-600 font-medium">Languages: 🇦🇺 🇬🇷</p>
        </div>
        <p className="text-center">
          Driven by creativity, detail, and the pursuit of growth, I’ve been
          dedicating myself to the industry since 2018, shaping my vision. I
          came from Greece to Australia, driven by a clear mission. Alpha Omega
          was created as more than just a barbershop, it’s a reflection of my
          journey a place of authenticity and luxuriness. To me, style is not
          just about appearance, but about elevating the way you carry yourself
          through life.
          <br />
          <br />
          Not here to imitate. Here to dominate.
        </p>
      </section>
    </main>
  );
}
