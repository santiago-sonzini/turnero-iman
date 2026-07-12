// Cálculo puro de disponibilidad de turnos. Es la ÚNICA implementación:
// la usa el server (validación race-safe en bookPublic) y el cliente
// (la página pública calcula los huecos al instante, sin round-trip).
export type HoursLike = { weekday: number; startMinutes: number; endMinutes: number; active?: boolean };
export type BusyLike = { startsAt: string | Date; endsAt: string | Date };
export type BookingRulesLike = { slotStepMinutes: number; bufferMinutes: number; bookingLeadMinutes: number };

export const TZ_OFFSET = "-03:00";

/** Instante absoluto para `date` (YYYY-MM-DD) a `minutes` del día, hora argentina. */
export function localDate(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${TZ_OFFSET}`);
}

/** Día de semana (0=domingo) del `date` en hora argentina. */
export function weekdayOf(date: string): number {
  // Mediodía local: cae siempre en el mismo día calendario en UTC.
  return localDate(date, 720).getUTCDay();
}

export function minutesLabel(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export type Vacation = { start: string; end: string; label?: string };

/** ¿La fecha (YYYY-MM-DD) cae dentro de algún rango de vacaciones (inclusive)? */
export function isVacation(date: string, vacations?: Vacation[] | null): boolean {
  if (!vacations?.length) return false;
  return vacations.some((v) => v.start && v.end && date >= v.start && date <= v.end);
}

export function computeSlots(params: {
  date: string;
  durationMinutes: number;
  hours: HoursLike[];
  busy: BusyLike[];
  rules: BookingRulesLike;
  vacations?: Vacation[] | null;
  now?: Date;
  // Cupo simultáneo: 1 = un profesional (o el negocio). Con N profesionales y
  // "cualquiera", un horario sigue libre mientras haya menos de N ocupados.
  capacity?: number;
}): string[] {
  const { date, durationMinutes, hours, busy, rules } = params;
  const capacity = Math.max(1, params.capacity ?? 1);
  if (isVacation(date, params.vacations)) return []; // negocio de vacaciones ese día
  const weekday = weekdayOf(date);
  const intervals = hours.filter((h) => h.weekday === weekday && (h.active ?? true));
  if (!intervals.length) return [];
  const lead = new Date((params.now ?? new Date()).getTime() + rules.bookingLeadMinutes * 60_000);
  const windows = busy.map((b) => ({ start: new Date(b.startsAt), end: new Date(b.endsAt) }));
  const slots: string[] = [];
  for (const interval of intervals) {
    for (let m = interval.startMinutes; m + durationMinutes <= interval.endMinutes; m += rules.slotStepMinutes) {
      const startsAt = localDate(date, m);
      if (startsAt <= lead) continue;
      const endsAt = new Date(startsAt.getTime() + (durationMinutes + rules.bufferMinutes) * 60_000);
      const solapados = windows.filter((w) => startsAt < w.end && endsAt > w.start).length;
      if (solapados >= capacity) continue;
      slots.push(minutesLabel(m));
    }
  }
  return slots;
}
