"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

export function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));
  const [selectedDate, setSelectedDate] = useState(dayjs().date());

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfMonth = currentMonth.startOf("month").day();

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, "month"));

  return (
    <div className="w-full mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {currentMonth.format("MMMM YYYY")}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 border rounded">
            <ChevronLeft />
          </button>
          <button onClick={nextMonth} className="p-2 border rounded">
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-gray-500">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="font-semibold p-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[
          ...Array(firstDayOfMonth).fill(null),
          ...Array(daysInMonth).keys(),
        ].map((day, index) => (
          <div
            key={index}
            className={`p-4 text-center rounded cursor-pointer ${
              day !== null ? "hover:bg-gray-200" : ""
            } ${day + 1 === selectedDate ? "bg-black text-white" : ""}`}
            onClick={() => day !== null && setSelectedDate(day + 1)}
          >
            {day !== null ? day + 1 : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
