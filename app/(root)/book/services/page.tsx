import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col gap-20 mt-40">
      <section className="container mx-auto flex flex-col md:flex-row justify-center items-center py-20 gap-8 px-4">
        <div className="w-full md:w-80">
          <Image
            src={"/assets/barber-1.png"}
            width={500}
            height={500}
            alt="Barber's Name"
          />
        </div>

        <div className="w-[1px] h-96 bg-[#D9D9D9] hidden md:block" />

        <div className="flex flex-col gap-4 w-full md:w-1/3">
          <h1>Josh</h1>
          <p>[IG@Josh.blendz_] (Available Now)</p>
          <div className="w-full h-[2px] bg-[#3D3D3D]" />

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger className="bg-[#3D3D3D] text-white rounded-xl px-6 py-4 w-full">
                <b>Haircut By Josh (Available Now) (O)</b>
                <br />
                <sub>$60.00 + [15% Surcharge On Sundays] ・ 30 min</sub>
              </AccordionTrigger>
              <AccordionContent className="px-10 py-4">
                <p>Yes. It adheres to the WAI-ARIA design pattern.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Button className="w-full">BOOK NOW</Button>
        </div>
      </section>

      <section className="container mx-auto flex flex-col md:flex-row justify-center items-center py-20 gap-8 px-4">
        <div className="w-full md:w-80">
          <Image
            src={"/assets/barber-1.png"}
            width={500}
            height={500}
            alt="Barber's Name"
          />
        </div>

        <div className="w-[1px] h-96 bg-[#D9D9D9] hidden md:block" />

        <div className="flex flex-col gap-4 w-full md:w-1/3">
          <h1>Josh</h1>
          <p>[IG@Josh.blendz_] (Available Now)</p>
          <div className="w-full h-[2px] bg-[#3D3D3D]" />

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger className="bg-[#3D3D3D] text-white rounded-xl px-6 py-4 w-full">
                <b>Haircut By Josh (Available Now) (O)</b>
                <br />
                <sub>$60.00 + [15% Surcharge On Sundays] ・ 30 min</sub>
              </AccordionTrigger>
              <AccordionContent className="px-10 py-4">
                <p>Yes. It adheres to the WAI-ARIA design pattern.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Button className="w-full">BOOK NOW</Button>
        </div>
      </section>
    </main>
  );
}
