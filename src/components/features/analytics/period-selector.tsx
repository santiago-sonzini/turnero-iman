"use client";

import { useState, useEffect } from "react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import DateRangePickerMinimal from "./date-range";

export default function PeriodSelector({
  date,
  setDate,
}: {
  date: { from?: Date; to?: Date };
  setDate: (v: { from?: Date; to?: Date }) => void;
}) {
  const [preset, setPreset] = useState("custom");

  const presets = [
    { id: "today", label: "Hoy" },
    { id: "7d", label: "Últimos 7 días" },
    { id: "30d", label: "Últimos 30 días" },
    { id: "month", label: "Este mes" },
    { id: "custom", label: "Personalizado" },
  ];

  // Update date range when preset changes
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        setDate({
          from: today,
          to: today,
        });
        break;
      case "7d":
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 6);
        setDate({
          from: last7Days,
          to: today,
        });
        break;
      case "30d":
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 29);
        setDate({
          from: last30Days,
          to: today,
        });
        break;
      case "month":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        setDate({
          from: firstDayOfMonth,
          to: today,
        });
        break;
      case "custom":
        // Don't update when switching to custom, keep current dates
        break;
    }
  }, [preset]);

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      {/* SELECT PRESETS */}
      <div className="w-[200px]">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="rounded-sm border border-gray-300 bg-white text-sm">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent className="rounded-sm">
            {presets.map((p) => (
              <SelectItem
                className="rounded-sm text-sm"
                key={p.id}
                value={p.id}
              >
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RANGO PERSONALIZADO */}
      {preset === "custom" && (
        <DateRangePickerMinimal date={date} setDate={setDate} />
      )}
    </div>
  );
}