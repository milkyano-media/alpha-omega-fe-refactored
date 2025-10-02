import Image from "next/image";
import Link from "next/link";

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

        {/* <p className="text-center text-gray-700">
          Precision cuts, classic shaves, and premium grooming to keep you sharp
          and confident.
        </p> */}
      </section>

      {/* Featured Barber */}
      <section className="flex flex-col items-center gap-8 px-4 container max-w-2xl mx-auto mb-40">
        <div className="w-full md:w-max flex flex-col items-center gap-4">
          <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full flex justify-center items-center">
            <Image
              src={"/assets/christos.jpg"}
              width={500}
              height={500}
              alt="Christos Barber"
            />
          </div>
          <h4 className="text-xl font-semibold">Christos</h4>

          <div className="flex gap-4">
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
          </div>
        </div>

        <p className="text-center max-w-lg text-gray-700">
          Barber since 2018, bringing creativity and precision from Greece to
          Australia. Founder of Alpha Omega — where authenticity meets luxury.
        </p>

        <Link
          href="/barbers/christos"
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Learn More
        </Link>
      </section>
    </main>
  );
}
