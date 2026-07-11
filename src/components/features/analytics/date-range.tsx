"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function DateRangePickerMinimal({
  date,
  setDate,
}: {
  date: { from?: Date; to?: Date };
  setDate: (v: { from?: Date; to?: Date }) => void;
}) {
  const handleSelect = (value: DateRange | undefined) => {
    if (!value) {
      setDate({ from: undefined, to: undefined });
      return;
    }

    setDate({
      from: value.from,
      to: value.to,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start border-gray-300 rounded-sm text-sm font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />

          {date.from && date.to ? (
            <>
              {format(date.from, "dd/MM/yyyy")} — {format(date.to, "dd/MM/yyyy")}
            </>
          ) : (
            <span>Seleccionar rango</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0 w-full rounded-sm border border-gray-300"
      >
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={date.from && date.to ? { from: date.from, to: date.to } : undefined}
          onSelect={handleSelect}
          defaultMonth={date.from}
        />
      </PopoverContent>
    </Popover>
  );
}