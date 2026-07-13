import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { PLANES } from "@/server/plans";

function arParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function dayStartAR(date = new Date()): Date {
  const { year, month, day } = arParts(date);
  return new Date(Date.UTC(year, month - 1, day, 3));
}

export function monthStartAR(date = new Date()): Date {
  const { year, month } = arParts(date);
  return new Date(Date.UTC(year, month - 1, 1, 3));
}

export function addMonthsAR(start: Date, amount: number): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + amount, 1, 3));
}

const priceArs = (plan: PlanTier | null) => plan ? PLANES[plan].precioArs : 0;

export function computeMrrBuckets(groups: Array<{ plan: PlanTier | null; planStatus: SubscriptionStatus; count: number }>) {
  const bucket = { committedArs: 0, potentialArs: 0, atRiskArs: 0, cancellingArs: 0, activeCount: 0 };
  for (const group of groups) {
    const valueArs = priceArs(group.plan) * group.count;
    if (group.planStatus === "ACTIVE") { bucket.committedArs += valueArs; bucket.activeCount += group.count; }
    if (group.planStatus === "TRIALING") bucket.potentialArs += valueArs;
    if (group.planStatus === "PAST_DUE") bucket.atRiskArs += valueArs;
    if (group.planStatus === "CANCELLED") bucket.cancellingArs += valueArs;
  }
  return { ...bucket, arrArs: bucket.committedArs * 12, arpaArs: bucket.activeCount ? Math.round(bucket.committedArs / bucket.activeCount) : 0 };
}

export const planPriceArs = priceArs;
