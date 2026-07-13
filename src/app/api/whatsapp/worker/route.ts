import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { env } from "@/env";
import { normalizePhone } from "@/lib/phone";
import { systemDb } from "@/server/db";

function authorized(req: NextRequest) {
  return !!env.WA_SERVER_TOKEN && req.headers.get("authorization") === `Bearer ${env.WA_SERVER_TOKEN}`;
}

async function scheduleAutomations() {
  const tenants = await systemDb.tenant.findMany({
    where: {
      plan: "TURNOS_AUTO",
      whatsappRiskAcceptedAt: { not: null },
      planStatus: { in: ["ACTIVE", "TRIALING"] },
    },
  });
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 86_400_000);
  for (const tenant of tenants) {
    // Backfill durable: cualquier turno de la próxima semana obtiene recordatorio.
    // Si el worker estuvo caído, se agenda para ahora en vez de perder la ventana.
    const upcoming = await systemDb.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: "CONFIRMADO",
        client: { phone: { not: null } },
        startsAt: { gt: now, lte: horizon },
      },
      include: { client: true, service: true },
    });
    for (const appointment of upcoming) {
      const phone = normalizePhone(appointment.client.phone);
      if (!phone) continue;
      const time = appointment.startsAt.toLocaleTimeString("es-AR", {
        hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires",
      });
      await systemDb.messageJob.upsert({
        where: { idempotencyKey: `reminder:${appointment.id}` },
        update: {},
        create: {
          tenantId: tenant.id,
          kind: "RECORDATORIO",
          phone,
          scheduledAt: new Date(Math.max(now.getTime(), appointment.startsAt.getTime() - 24 * 3_600_000)),
          idempotencyKey: `reminder:${appointment.id}`,
          body: `Hola ${appointment.client.name.split(" ")[0]} 👋 Te recordamos tu turno de ${appointment.service.name} mañana a las ${time}.`,
        },
      });
    }

    const clients = await systemDb.client.findMany({
      where: { tenantId: tenant.id, expectedCycleDays: { not: null }, phone: { not: null }, marketingConsent: true },
      include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1 } },
    });
    for (const client of clients) {
      const last = client.appointments[0]?.startsAt;
      if (!last || !client.expectedCycleDays || now.getTime() - last.getTime() < client.expectedCycleDays * 86_400_000) continue;
      const month = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
      await systemDb.messageJob.upsert({
        where: { idempotencyKey: `cycle:${client.id}:${month}` },
        update: {},
        create: {
          tenantId: tenant.id,
          kind: "CICLO",
          phone: normalizePhone(client.phone),
          scheduledAt: now,
          idempotencyKey: `cycle:${client.id}:${month}`,
          body: `Hola ${client.name.split(" ")[0]} 👋 Ya pasó tu ciclo habitual. Cuando quieras, tenemos un lugar para vos.`,
        },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await scheduleAutomations();
  const now = new Date();
  const stale = new Date(now.getTime() - 10 * 60_000);
  await systemDb.messageJob.updateMany({
    where: { status: "PROCESSING", processingStartedAt: { lt: stale } },
    data: { status: "PENDING", processingStartedAt: null, nextAttemptAt: now, lastError: "worker lease expired" },
  });
  const candidates = await systemDb.messageJob.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    orderBy: { scheduledAt: "asc" },
    take: 4,
  });
  const jobs = [];
  for (const job of candidates) {
    const claimed = await systemDb.messageJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "PROCESSING", processingStartedAt: now, attempts: { increment: 1 } },
    });
    if (claimed.count) jobs.push({ ...job, attempts: job.attempts + 1, processingStartedAt: now });
  }
  return NextResponse.json({ jobs });
}

const patchSchema = z.object({
  tenantId: z.string().min(1).max(100),
  jobId: z.string().min(1).max(100).optional(),
  result: z.enum(["SENT", "FAILED"]).optional(),
  error: z.string().max(2_000).optional(),
  health: z.enum(["DISCONNECTED", "QR_PENDING", "CONNECTED", "DEGRADED", "BANNED"]).optional(),
  qrCode: z.string().max(100_000).nullable().optional(),
  lastSeenAt: z.string().datetime().optional(),
  lastError: z.string().max(2_000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const body = parsed.data;
  const tenantExists = await systemDb.tenant.findUnique({ where: { id: body.tenantId }, select: { id: true } });
  if (!tenantExists) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  if (body.jobId && body.result) {
    const job = await systemDb.messageJob.findFirst({ where: { id: body.jobId, tenantId: body.tenantId, status: "PROCESSING" } });
    if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
    if (body.result === "SENT") {
      await systemDb.messageJob.update({ where: { id: job.id }, data: { status: "SENT", sentAt: new Date(), lastError: null, processingStartedAt: null } });
    } else {
      const exhausted = job.attempts >= 4;
      await systemDb.messageJob.update({ where: { id: job.id }, data: {
        status: exhausted ? "FALLBACK" : "PENDING",
        lastError: body.error ?? "send failed",
        processingStartedAt: null,
        nextAttemptAt: exhausted ? null : new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** job.attempts)),
      } });
    }
  }
  if (body.health) {
    await systemDb.whatsappSession.upsert({
      where: { tenantId: body.tenantId },
      update: {
        health: body.health,
        qrCode: body.qrCode === undefined ? undefined : body.qrCode,
        lastSeenAt: body.lastSeenAt ? new Date(body.lastSeenAt) : undefined,
        lastError: body.lastError === undefined ? undefined : body.lastError,
      },
      create: {
        tenantId: body.tenantId,
        health: body.health,
        qrCode: body.qrCode ?? null,
        lastError: body.lastError ?? null,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
