"use server";

import { isVacation, weekdayOf, type Vacation } from "@/lib/availability";
import { dateKeyAR } from "@/lib/format";
import { db } from "@/server/db";
import { requireFeature } from "@/server/gate";
import { getCurrentTenant } from "@/server/tenant-context";
import { tieneFeature } from "@/server/plans";

const DAY = 86_400_000;

export async function getBusinessAnalytics(fromISO: string, toISO: string) {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  const from = new Date(fromISO);
  const to = new Date(toISO);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to.getTime() - from.getTime() > 3 * 366 * DAY) throw new Error("Rango inválido");

  const [appointments, allAttended, workingHours, profile, activeStaff, clients] = await Promise.all([
    db.appointment.findMany({ where: { startsAt: { gte: from, lte: to } }, include: { service: true, staff: true }, orderBy: { startsAt: "asc" } }),
    db.appointment.findMany({ where: { status: "ASISTIO", startsAt: { lte: to } }, select: { clientId: true, startsAt: true }, orderBy: { startsAt: "asc" } }),
    db.workingHour.findMany({ where: { active: true } }),
    db.businessProfile.findFirst({ select: { vacations: true } }),
    db.staff.count({ where: { active: true } }),
    db.client.findMany({ where: { expectedCycleDays: { not: null } }, select: { id: true, expectedCycleDays: true, appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1, select: { startsAt: true } } } }),
  ]);

  const attended = appointments.filter((appointment) => appointment.status === "ASISTIO");
  const futureConfirmed = appointments.filter((appointment) => appointment.status === "CONFIRMADO" && appointment.startsAt > new Date());
  const realizedCents = attended.reduce((sum, appointment) => sum + appointment.service.priceCents, 0);
  const projectedCents = futureConfirmed.reduce((sum, appointment) => sum + appointment.service.priceCents, 0);
  const completed = appointments.filter((appointment) => appointment.status === "ASISTIO" || appointment.status === "NO_VINO");
  const noShows = completed.filter((appointment) => appointment.status === "NO_VINO").length;

  const byMonthMap = new Map<string, { label: string; realizedCents: number; projectedCents: number }>();
  for (const appointment of appointments) {
    if (appointment.status !== "ASISTIO" && !(appointment.status === "CONFIRMADO" && appointment.startsAt > new Date())) continue;
    const key = dateKeyAR(appointment.startsAt).slice(0, 7);
    const current = byMonthMap.get(key) ?? { label: appointment.startsAt.toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }), realizedCents: 0, projectedCents: 0 };
    if (appointment.status === "ASISTIO") current.realizedCents += appointment.service.priceCents;
    else current.projectedCents += appointment.service.priceCents;
    byMonthMap.set(key, current);
  }
  const summarize = <T extends string>(keyOf: (appointment: typeof attended[number]) => T) => {
    const map = new Map<T, number>();
    for (const appointment of attended) map.set(keyOf(appointment), (map.get(keyOf(appointment)) ?? 0) + appointment.service.priceCents);
    return [...map.entries()].map(([name, cents]) => ({ name, revenueArs: cents / 100 })).sort((a, b) => b.revenueArs - a.revenueArs);
  };

  const capacity = tieneFeature(tenant, "multi_staff") ? Math.max(1, activeStaff) : 1;
  const vacations = (profile?.vacations as Vacation[] | null) ?? null;
  let availableMinutes = 0;
  for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY)) {
    const key = dateKeyAR(cursor);
    if (isVacation(key, vacations)) continue;
    const weekday = weekdayOf(key);
    availableMinutes += workingHours.filter((row) => row.weekday === weekday).reduce((sum, row) => sum + row.endMinutes - row.startMinutes, 0) * capacity;
  }
  const bookedMinutes = appointments.filter((appointment) => appointment.status !== "CANCELADO").reduce((sum, appointment) => sum + Math.max(0, appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000, 0);

  const visitsByClient = new Map<string, Date[]>();
  for (const visit of allAttended) {
    const values = visitsByClient.get(visit.clientId) ?? [];
    values.push(visit.startsAt);
    visitsByClient.set(visit.clientId, values);
  }
  const inRangeClients = new Set(attended.map((appointment) => appointment.clientId));
  let newClients = 0;
  let returningClients = 0;
  const cycles: number[] = [];
  for (const clientId of inRangeClients) {
    const visits = visitsByClient.get(clientId) ?? [];
    if (visits.length >= 2) returningClients += 1; else newClients += 1;
    for (let index = 1; index < visits.length; index += 1) cycles.push((visits[index]!.getTime() - visits[index - 1]!.getTime()) / DAY);
  }
  const recoverable = clients.filter((client) => {
    const last = client.appointments[0]?.startsAt;
    return !!last && !!client.expectedCycleDays && Date.now() - last.getTime() >= client.expectedCycleDays * DAY;
  }).length;

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    revenueArs: realizedCents / 100,
    projectedRevenueArs: projectedCents / 100,
    byMonth: [...byMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, label: value.label, realizedArs: value.realizedCents / 100, projectedArs: value.projectedCents / 100 })),
    byService: summarize((appointment) => appointment.service.name),
    byStaff: tieneFeature(tenant, "multi_staff") ? summarize((appointment) => appointment.staff?.name ?? "Sin asignar") : [],
    noShowCount: noShows,
    noShowPct: completed.length ? Math.round((noShows / completed.length) * 1000) / 10 : null,
    occupancyPct: availableMinutes ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 1000) / 10) : null,
    bookedMinutes: Math.round(bookedMinutes),
    availableMinutes,
    newClients,
    returningClients,
    returningPct: inRangeClients.size ? Math.round((returningClients / inRangeClients.size) * 1000) / 10 : null,
    averageCycleDays: cycles.length ? Math.round(cycles.reduce((sum, value) => sum + value, 0) / cycles.length) : null,
    recoverable,
  };
}
