import "server-only";

import { unstable_cache } from "next/cache";
import { env } from "@/env";
import { verifyEmail } from "@/lib/mailer";
import { systemDb } from "@/server/db";

export const HEALTH_SERVICES = ["db", "mercadopago", "smtp", "wa_server"] as const;
export type HealthService = typeof HEALTH_SERVICES[number];
export type LiveHealth = { service: HealthService; ok: boolean; latencyMs: number; detail: string | null };

async function timed(service: HealthService, check: () => Promise<string | null>): Promise<LiveHealth> {
  const started = Date.now();
  try {
    const detail = await check();
    return { service, ok: true, latencyMs: Date.now() - started, detail };
  } catch (error) {
    return {
      service,
      ok: false,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    };
  }
}

async function checkMercadoPago(): Promise<string | null> {
  if (!env.MP_ACCESS_TOKEN) throw new Error("no configurado");
  const response = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return "API autenticada";
}

async function checkWhatsapp(): Promise<string | null> {
  if (!env.WA_SERVER_URL) throw new Error("no configurado");
  const session = await systemDb.whatsappSession.findFirst({ orderBy: { lastSeenAt: "desc" } });
  if (!session?.lastSeenAt) throw new Error("sin heartbeat");
  if (["BANNED", "DEGRADED", "DISCONNECTED"].includes(session.health)) throw new Error(session.lastError || session.health);
  const ageMinutes = (Date.now() - session.lastSeenAt.getTime()) / 60_000;
  if (ageMinutes > 10) throw new Error(`heartbeat hace ${Math.round(ageMinutes)} min`);
  return `${session.health} · ${Math.round(ageMinutes)} min`;
}

// Data Cache de Next (persistente entre invocaciones cuando la plataforma lo
// soporta), no memoria del proceso serverless.
const cachedMercadoPago = unstable_cache(checkMercadoPago, ["health-mercadopago"], { revalidate: 60 });
const cachedSmtp = unstable_cache(async () => { await verifyEmail(); return "SMTP verificado"; }, ["health-smtp"], { revalidate: 60 });

export async function checkHealthLive(): Promise<LiveHealth[]> {
  return Promise.all([
    timed("db", async () => { await systemDb.$queryRaw`SELECT 1`; return "PostgreSQL"; }),
    timed("mercadopago", cachedMercadoPago),
    timed("smtp", cachedSmtp),
    timed("wa_server", checkWhatsapp),
  ]);
}

export async function recordHealthSample(): Promise<LiveHealth[]> {
  const samples = await checkHealthLive();
  await systemDb.healthCheck.createMany({ data: samples });
  return samples;
}

export async function getUptime(since: Date): Promise<Record<HealthService, number | null>> {
  const rows = await systemDb.healthCheck.groupBy({
    by: ["service", "ok"],
    where: { createdAt: { gte: since }, service: { in: [...HEALTH_SERVICES] } },
    _count: true,
  });
  const result = Object.fromEntries(HEALTH_SERVICES.map((service) => [service, null])) as Record<HealthService, number | null>;
  for (const service of HEALTH_SERVICES) {
    const serviceRows = rows.filter((row) => row.service === service);
    const total = serviceRows.reduce((sum, row) => sum + row._count, 0);
    const ok = serviceRows.find((row) => row.ok)?._count ?? 0;
    result[service] = total ? Math.round((ok / total) * 10_000) / 100 : null;
  }
  return result;
}
