import { describe, expect, it } from "vitest";
import { computeSlots, isVacation, localDate, weekdayOf } from "./availability";

const monday = "2030-01-07";
const rules = { slotStepMinutes: 15, bufferMinutes: 0, bookingLeadMinutes: 0 };

describe("computeSlots", () => {
  it("respeta duración, buffer y cierre del negocio", () => {
    expect(computeSlots({
      date: monday,
      durationMinutes: 45,
      hours: [{ weekday: 1, startMinutes: 540, endMinutes: 600 }],
      busy: [],
      rules: { ...rules, bufferMinutes: 15 },
      now: localDate("2030-01-01", 0),
    })).toEqual(["09:00"]);
  });

  it("considera el cupo simultáneo sin exponer ventanas ocupadas", () => {
    const busy = [{ startsAt: localDate(monday, 540), endsAt: localDate(monday, 570) }];
    const base = {
      date: monday,
      durationMinutes: 30,
      hours: [{ weekday: 1, startMinutes: 540, endMinutes: 600 }],
      busy,
      rules,
      now: localDate("2030-01-01", 0),
    };
    expect(computeSlots({ ...base, capacity: 1 })).toEqual(["09:30"]);
    expect(computeSlots({ ...base, capacity: 2 })).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("bloquea vacaciones inclusivas y calcula el día argentino", () => {
    expect(weekdayOf(monday)).toBe(1);
    expect(isVacation(monday, [{ start: monday, end: monday }])).toBe(true);
    expect(computeSlots({
      date: monday,
      durationMinutes: 30,
      hours: [{ weekday: 1, startMinutes: 540, endMinutes: 600 }],
      busy: [], rules, vacations: [{ start: monday, end: monday }],
    })).toEqual([]);
  });
});
