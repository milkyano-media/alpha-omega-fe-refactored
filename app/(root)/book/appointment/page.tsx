import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/ui/calendar";

export default function Home() {
  return (
    <main className="flex flex-col gap-20 mt-20">
      <section className="flex gap-8 py-20 justify-center px-4">
        <BookingCalendar />

        <div className="flex flex-col w-xl">
          <b>APPOINTMENT SUMMARY</b>

          <div className="flex flex-col border border-black rounded-xl mt-14">
            <div className="flex flex-col gap-4 p-4 border-b border-black">
              <p>Haircut By Josh (Available Now) (O)</p>
              <div className="flex gap-8">
                <sub>$60.00</sub>
                <sub>30 Mins</sub>
              </div>
            </div>

            <div className="flex justify-between p-4">
              <p>Haircut By Josh (Available Now) (O)</p>

              <sub>$60.00</sub>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-8 container mx-auto mb-40">
        <Button className="rounded-md px-8 py-2 text-base">7:30 AM</Button>

        <div className="flex gap-8">
          <Button className="rounded-md px-8 py-2 text-base">7:30 AM</Button>
          <Button className="rounded-md px-8 py-2 text-base">7:30 AM</Button>
        </div>

        <Button className="rounded-md px-8 py-2 text-base">7:30 AM</Button>
      </section>
    </main>
  );
}
