import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "@/env";

const COOKIE_PREFIX = "iman_appt_";

export function createPublicAppointmentToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPublicAppointmentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function publicTokenExpiry(startsAt: Date): Date {
  return new Date(startsAt.getTime() + 7 * 86_400_000);
}

export function publicAppointmentCookieName(appointmentId: string): string {
  return `${COOKIE_PREFIX}${appointmentId}`;
}

export function safeTokenEqual(token: string, expectedHash: string | null): boolean {
  if (!expectedHash || token.length < 20 || token.length > 128) return false;
  const actual = Buffer.from(hashPublicAppointmentToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(Uint8Array.from(actual), Uint8Array.from(expected));
}

export async function setPublicAppointmentCookie(params: {
  appointmentId: string;
  slug: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const store = await cookies();
  store.set(publicAppointmentCookieName(params.appointmentId), params.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${params.slug}/turnos`,
    expires: params.expiresAt,
  });
}

export async function publicAppointmentCredentials(): Promise<Map<string, string>> {
  const store = await cookies();
  const entries = store
    .getAll()
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => [cookie.name.slice(COOKIE_PREFIX.length), cookie.value] as const)
    .filter(([id, token]) => id.length > 0 && token.length >= 20);
  return new Map(entries);
}
