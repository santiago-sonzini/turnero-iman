import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { systemDb } from "@/server/db";

function authorized(req: NextRequest) {
  return !!env.WA_SERVER_TOKEN && req.headers.get("authorization") === `Bearer ${env.WA_SERVER_TOKEN}`;
}

async function scheduleAutomations() {
  const tenants = await systemDb.tenant.findMany({ where: { plan: "TURNOS_AUTO", whatsappRiskAcceptedAt: { not: null }, planStatus: { in: ["ACTIVE", "TRIALING"] } } });
  const now = new Date();
  for (const tenant of tenants) {
    const upcoming = await systemDb.appointment.findMany({
      where: { tenantId: tenant.id, status: "CONFIRMADO", startsAt: { gte: new Date(now.getTime() + 23 * 3600000), lte: new Date(now.getTime() + 25 * 3600000) } },
      include: { client: true, service: true },
    });
    for (const appointment of upcoming) await systemDb.messageJob.upsert({
      where: { idempotencyKey: `reminder:${appointment.id}` }, update: {},
      create: { tenantId: tenant.id, kind: "RECORDATORIO", phone: appointment.client.phone, scheduledAt: now, idempotencyKey: `reminder:${appointment.id}`, body: `Hola ${appointment.client.name.split(" ")[0]} 👋 Te recordamos tu turno de ${appointment.service.name} mañana a las ${appointment.startsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })}.` },
    });
    const clients = await systemDb.client.findMany({ where: { tenantId: tenant.id, expectedCycleDays: { not: null }, marketingConsent: true }, include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1 } } });
    for (const client of clients) {
      const last = client.appointments[0]?.startsAt; if (!last || !client.expectedCycleDays) continue;
      if (now.getTime() - last.getTime() < client.expectedCycleDays * 86400000) continue;
      const month = `${now.getFullYear()}-${now.getMonth()+1}`;
      await systemDb.messageJob.upsert({
        where: { idempotencyKey: `cycle:${client.id}:${month}` }, update: {},
        create: { tenantId: tenant.id, kind: "CICLO", phone: client.phone, scheduledAt: now, idempotencyKey: `cycle:${client.id}:${month}`, body: `Hola ${client.name.split(" ")[0]} 👋 Ya pasó tu ciclo habitual. Cuando quieras, tenemos un lugar para vos.` },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await scheduleAutomations();
  const now = new Date();
  const candidates = await systemDb.messageJob.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    orderBy: { scheduledAt: "asc" }, take: 4,
  });
  const jobs = [];
  for (const job of candidates) {
    const claimed = await systemDb.messageJob.updateMany({ where: { id: job.id, status: "PENDING" }, data: { status: "PROCESSING", attempts: { increment: 1 } } });
    if (claimed.count) jobs.push(job);
  }
  return NextResponse.json({ jobs });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.jobId) {
    const job = await systemDb.messageJob.findFirst({ where: { id: body.jobId, tenantId: body.tenantId } });
    if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
    if (body.result === "SENT") await systemDb.messageJob.update({ where: { id: job.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
    else {
      const exhausted = job.attempts >= 4;
      await systemDb.messageJob.update({ where: { id: job.id }, data: {
        status: exhausted ? "FALLBACK" : "PENDING", lastError: body.error ?? "send failed",
        nextAttemptAt: exhausted ? null : new Date(Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts)),
      } });
    }
  }
  if (body.health) await systemDb.whatsappSession.upsert({
    where: { tenantId: body.tenantId },
    update: { health: body.health, qrCode: body.qrCode ?? undefined, lastSeenAt: body.lastSeenAt ? new Date(body.lastSeenAt) : undefined, lastError: body.lastError ?? null },
    create: { tenantId: body.tenantId, health: body.health, qrCode: body.qrCode, lastError: body.lastError },
  });
  return NextResponse.json({ ok: true });
}
