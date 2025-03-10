import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col gap-20">
      <section className="bg-[url('/bg/about-1.png')] bg-cover bg-center h-80 md:h-screen flex flex-col justify-center items-center text-center text-white"></section>

      <section className="flex flex-col md:grid grid-cols-2 gap-8 px-4 md:w-4xl container mx-auto">
        <div className="w-full md:w-max">
          <Image
            src={"/assets/about-1.png"}
            width={500}
            height={500}
            alt="Our Story"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full" />
          <h4>HOW IT BEGINS</h4>
          <p>
            {`
            Two years ago, I arrived in Australia from Greece with no money, a
            dream in my heart and a determination to succeed. The journey was
            far from easy — filled with challenges, long days of hard work, and
            countless sacrifices. But through perseverance, dedication, and an
            unwavering focus on my goals, I was able to turn my vision into
            reality. None of this would have been possible without my
            now-business partner. A Serbian native who grew up in Australia but
            spent years living in Serbia, he brought a unique perspective to the
            craft of barbering. When I first joined his barbershop, it was a
            small operation with four barbers. Through endless discussions and a
            shared passion for excellence, the business expanded and we grew
            together. `}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full" />
          <h4>WHY WE CREATES BARBERSHOP</h4>
          <p>
            {`
            As our collaboration grew stronger, we decided it was time to create
            something new - something that wasn’t existing - a space that would
            redefine men’s grooming. Inspired by the fusion of traditional
            barbering and modern luxury, we created a one of a kind environment
            that blends premium services, innovative technology, and a stunning
            interior designed to make every visit unforgettable `}
          </p>
        </div>

        <p className="text-center">
          Welcome to the next chapter in men’s grooming—where street-inspired
          luxuries meets timeless elegance.
        </p>
      </section>

      <section className="flex flex-col gap-8 px-4">
        <div className="w-full md:w-max">
          <Image
            src={"/assets/about-2.png"}
            width={500}
            height={500}
            alt="Our Values"
          />
        </div>

        <p>
          At Alpha Omega, we stand by a commitment to excellence, authenticity,
          and the art of grooming.
        </p>

        <p>
          Our values shape every experience, from the first consultation to the
          final touch, ensuring every client leaves with confidence and style
          that lasts.
        </p>

        <div className="flex gap-4">
          <svg
            className="w-12"
            viewBox="0 0 46 47"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              y="0.159912"
              width="45.42"
              height="46"
              rx="22.71"
              fill="#F8F8F8"
            />
            <path
              d="M25.2088 14.6145V29.1599H22.5739V17.1784H22.4886L19.0866 19.3517V16.9369L22.7017 14.6145H25.2088Z"
              fill="#292929"
            />
          </svg>

          <b>Delivering exceptional service, every time.</b>
        </div>

        <div className="flex gap-4">
          <svg
            className="w-13"
            viewBox="0 0 46 47"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              y="0.159912"
              width="45.23"
              height="46"
              rx="22.615"
              fill="#F8F8F8"
            />
            <path
              d="M18.2926 29.1599V27.2565L23.3423 22.3062C23.8253 21.8185 24.2277 21.3853 24.5497 21.0065C24.8717 20.6277 25.1132 20.2608 25.2741 19.9057C25.4351 19.5505 25.5156 19.1717 25.5156 18.7693C25.5156 18.31 25.4115 17.917 25.2031 17.5903C24.9948 17.2589 24.7083 17.0032 24.3438 16.8233C23.9792 16.6433 23.5649 16.5534 23.1009 16.5534C22.6226 16.5534 22.2036 16.6528 21.8438 16.8517C21.4839 17.0458 21.2045 17.3228 21.0057 17.6826C20.8116 18.0425 20.7145 18.471 20.7145 18.9682H18.2074C18.2074 18.0449 18.4181 17.2423 18.8395 16.5605C19.2609 15.8787 19.8409 15.3507 20.5795 14.9767C21.3229 14.6026 22.1752 14.4156 23.1364 14.4156C24.1117 14.4156 24.9688 14.5979 25.7074 14.9625C26.446 15.3271 27.0189 15.8266 27.4261 16.461C27.8381 17.0955 28.044 17.8199 28.044 18.6343C28.044 19.1789 27.9399 19.7139 27.7315 20.2395C27.5232 20.765 27.1563 21.3474 26.6307 21.9866C26.1098 22.6258 25.3783 23.4 24.4361 24.3091L21.929 26.8588V26.9582H28.2642V29.1599H18.2926Z"
              fill="#292929"
            />
          </svg>

          <b>Building trust and connections with every visit.</b>
        </div>

        <div className="flex gap-4">
          <svg
            className="w-15"
            viewBox="0 0 45 47"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              y="0.159912"
              width="44.84"
              height="46"
              rx="22.42"
              fill="#F8F8F8"
            />
            <path
              d="M22.5128 29.3588C21.4901 29.3588 20.581 29.1836 19.7855 28.8332C18.9948 28.4828 18.3698 27.9951 17.9105 27.3701C17.4512 26.7451 17.2074 26.0231 17.179 25.2039H19.8494C19.8731 25.5969 20.0033 25.9402 20.2401 26.2338C20.4768 26.5226 20.7917 26.7475 21.1847 26.9085C21.5777 27.0695 22.018 27.15 22.5057 27.15C23.0265 27.15 23.4882 27.06 23.8906 26.8801C24.2931 26.6954 24.608 26.4397 24.8352 26.113C25.0625 25.7863 25.1738 25.4099 25.169 24.9838C25.1738 24.5434 25.0601 24.1552 24.8281 23.819C24.5961 23.4828 24.2599 23.22 23.8196 23.0307C23.384 22.8413 22.8584 22.7466 22.2429 22.7466H20.9574V20.7153H22.2429C22.7495 20.7153 23.1922 20.6277 23.571 20.4525C23.9545 20.2773 24.2552 20.0311 24.473 19.7139C24.6908 19.3919 24.7973 19.0202 24.7926 18.5988C24.7973 18.1869 24.705 17.8294 24.5156 17.5264C24.331 17.2186 24.0682 16.9795 23.7273 16.8091C23.3911 16.6386 22.9957 16.5534 22.5412 16.5534C22.0961 16.5534 21.6842 16.6339 21.3054 16.7949C20.9266 16.9558 20.6212 17.1855 20.3892 17.4838C20.1572 17.7773 20.0341 18.1277 20.0199 18.5349H17.4844C17.5033 17.7205 17.7377 17.0056 18.1875 16.39C18.642 15.7698 19.2481 15.2868 20.0057 14.9412C20.7633 14.5908 21.6132 14.4156 22.5554 14.4156C23.526 14.4156 24.3688 14.5979 25.0838 14.9625C25.8035 15.3223 26.3598 15.8076 26.7528 16.4184C27.1458 17.0292 27.3423 17.7039 27.3423 18.4426C27.3471 19.2617 27.1056 19.9483 26.6179 20.5022C26.1349 21.0562 25.5005 21.4184 24.7145 21.5889V21.7025C25.7372 21.8446 26.5208 22.2234 27.0653 22.8389C27.6146 23.4497 27.8868 24.2096 27.8821 25.1187C27.8821 25.9331 27.6501 26.6623 27.1861 27.3062C26.7268 27.9454 26.0923 28.4473 25.2827 28.8119C24.4777 29.1765 23.5545 29.3588 22.5128 29.3588Z"
              fill="#292929"
            />
          </svg>

          <b>Celebrating individuality through tailored grooming.</b>
        </div>

        <Button>BOOK US</Button>

        <div className="w-full md:w-max">
          <Image
            src={"/assets/about-3.png"}
            width={500}
            height={500}
            alt="The Haircut"
          />
        </div>
      </section>

      <section className="flex flex-col items-center gap-8 bg-[#F8F8F8] py-10 px-4">
        <div className="w-full md:w-max">
          <Image
            src={"/assets/about-4.png"}
            width={500}
            height={500}
            alt="Our Goals"
          />
        </div>

        <p>
          Our goal is to provide luxury services that goes beyond the ordinary,
          leaving an indelible mark of refinement and excellence on each of our
          clients
        </p>

        <div className="bg-[#D9D9D9] rounded-xl aspect-square w-full" />
      </section>

      <section className="flex flex-col items-center gap-8 px-4">
        <div className="w-full md:w-max">
          <Image
            src={"/assets/about-5.png"}
            width={500}
            height={500}
            alt="Why We Stand Out"
          />
        </div>

        <p>
          Alpha Omega proudly represents the pinnacle of Australian barbershops,
          delivering a standard of excellence that rivals any in the world. We
          draw inspiration from global grooming trends, infusing them with the
          laid-back yet refined Australian spirit. Whether you’re a local, a
          professional, or just passing through, our goal is to provide a
          barbershop experience that keeps you coming back. At Alpha Omega,
          we’re not just raising the standard; we’re redefining it.
        </p>
      </section>

      <section className="bg-[url('/bg/about-2.png')] bg-cover bg-center h-80 -mt-20"></section>

      <section className="flex px-4">
        <p>
          What sets us apart is the seamless blend of timeless barbershop
          culture with a contemporary twist. At Alpha Omega, you’re not just a
          customer; you’re part of a community. From the moment you step through
          our doors, you’ll experience a welcoming atmosphere, premium service,
          and an attention to detail that takes grooming to the next level. Our
          premium products and techniques ensure that every visit feels like a
          luxurious retreat, while staying true to the authenticity of
          old-school barbering.
        </p>
      </section>

      <section className="flex flex-col gap-8 px-4 mb-40">
        <h2 className="text-center">Book An Appointment</h2>

        <Button className="w-full">BOOK NOW</Button>

        <p>
          We pride ourselves in offering a high quality of service and that
          begins with appointment based bookings. Our online system allows you
          to pick a stylist and time that’s convenient for you, and if you can’t
          make it you can reschedule within 24 hours of your appointment.
        </p>
      </section>
    </main>
  );
}
