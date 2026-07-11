"use server";

import { revalidatePath } from "next/cache";
import { db, systemDb } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { requireFeature } from "@/server/gate";
import { z } from "zod";

const phone = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");
const localDate = (date: string, minutes: number) => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00-03:00`);
};

export async function getOwnerData(from: Date, to: Date) {
  const tenant = await getCurrentTenant();
  const [profile, services, workingHours, appointments, clients, promotions, whatsapp] = await Promise.all([
    db.businessProfile.findFirst(),
    db.service.findMany({ orderBy: { sortOrder: "asc" } }),
    db.workingHour.findMany({ orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] }),
    db.appointment.findMany({
      where: { startsAt: { gte: from, lte: to } },
      include: { client: true, service: true }, orderBy: { startsAt: "asc" },
    }),
    db.client.findMany({ include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 8 } }, orderBy: { name: "asc" } }),
    db.promotion.findMany({ include: { service: true }, orderBy: { createdAt: "desc" } }),
    db.whatsappSession.findFirst(),
  ]);
  return { tenant, profile, services, workingHours, appointments, clients, promotions, whatsapp };
}

export async function getPublicBooking(slug: string, promoToken?: string) {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return null;
  const [services, hours, promo] = await Promise.all([
    systemDb.service.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" } }),
    systemDb.workingHour.findMany({ where: { tenantId: tenant.id, active: true } }),
    promoToken ? systemDb.promotion.findFirst({ where: { tenantId: tenant.id, token: promoToken, active: true, expiresAt: { gt: new Date() } } }) : null,
  ]);
  return { tenant, profile: tenant.profile, services, hours, promo };
}

export async function publicAvailability(slug: string, serviceId: string, date: string) {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return [];
  const service = await systemDb.service.findFirst({ where: { id: serviceId, tenantId: tenant.id, active: true } });
  if (!service) return [];
  const noon = localDate(date, 720);
  const weekday = noon.getUTCDay();
  const intervals = await systemDb.workingHour.findMany({ where: { tenantId: tenant.id, weekday, active: true } });
  const startDay = localDate(date, 0);
  const endDay = localDate(date, 1439);
  const busy = await systemDb.appointment.findMany({ where: { tenantId: tenant.id, status: { not: "CANCELADO" }, startsAt: { lte: endDay }, endsAt: { gte: startDay } } });
  const now = new Date(Date.now() + tenant.profile.bookingLeadMinutes * 60000);
  const slots: string[] = [];
  for (const interval of intervals) {
    for (let m = interval.startMinutes; m + service.durationMinutes <= interval.endMinutes; m += tenant.profile.slotStepMinutes) {
      const startsAt = localDate(date, m);
      const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + tenant.profile.bufferMinutes) * 60000);
      if (startsAt <= now) continue;
      if (!busy.some((a) => startsAt < a.endsAt && endsAt > a.startsAt)) slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
  }
  return slots;
}

const bookingSchema = z.object({
  slug: z.string().min(1), serviceId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/), name: z.string().trim().min(2).max(80),
  phone: z.string().min(8), email: z.string().email().optional().or(z.literal("")), promoToken: z.string().optional(),
});

export async function bookPublic(input: z.infer<typeof bookingSchema>) {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revisá tus datos." };
  const data = parsed.data;
  const tenant = await systemDb.tenant.findUnique({ where: { slug: data.slug }, include: { profile: true } });
  if (!tenant?.profile) return { ok: false as const, error: "El negocio no está disponible." };
  const service = await systemDb.service.findFirst({ where: { id: data.serviceId, tenantId: tenant.id, active: true } });
  if (!service) return { ok: false as const, error: "Ese servicio ya no está disponible." };
  const available = await publicAvailability(data.slug, data.serviceId, data.date);
  if (!available.includes(data.time)) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
  const [h = 0, m = 0] = data.time.split(":").map(Number);
  const startsAt = localDate(data.date, h * 60 + m);
  const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + tenant.profile.bufferMinutes) * 60000);
  try {
    const appointment = await systemDb.$transaction(async (tx) => {
      const client = await tx.client.upsert({
        where: { tenantId_phone: { tenantId: tenant.id, phone: phone(data.phone) } },
        update: { name: data.name, email: data.email || null },
        create: { tenantId: tenant.id, name: data.name, phone: phone(data.phone), email: data.email || null },
      });
      const promo = data.promoToken ? await tx.promotion.findFirst({ where: { tenantId: tenant.id, token: data.promoToken, active: true, expiresAt: { gt: new Date() } } }) : null;
      return tx.appointment.create({ data: {
        tenantId: tenant.id, serviceId: service.id, clientId: client.id, startsAt, endsAt,
        channel: promo ? "PROMO" : "PUBLIC", promotionId: promo?.id,
        depositRequired: false, depositStatus: "disabled",
      } });
    });
    if (tenant.plan === "TURNOS_AUTO" && tenant.whatsappRiskAcceptedAt) {
      await systemDb.messageJob.create({ data: {
        tenantId: tenant.id, kind: "CONFIRMACION", phone: phone(data.phone),
        body: `Hola ${data.name}, tu turno en ${tenant.name} quedó confirmado para el ${data.date.split("-").reverse().join("/")} a las ${data.time}.`,
        scheduledAt: new Date(), idempotencyKey: `confirmation:${appointment.id}`,
      } });
    }
    if (data.email && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const { sendEmail } = await import("@/lib/mailer");
      await sendEmail({
        to: data.email,
        subject: `Turno confirmado en ${tenant.name}`,
        html: `<h2>¡Tu turno está confirmado!</h2><p>${data.date.split("-").reverse().join("/")} a las ${data.time} — ${service.name}.</p>`,
      }).catch((error) => console.error("[email] confirmación opcional falló", error));
    }
    return { ok: true as const, appointmentId: appointment.id };
  } catch (error: any) {
    if (error?.code === "P2004" || String(error?.message).includes("appointment_no_overlap")) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
    console.error("[booking]", error);
    return { ok: false as const, error: "No pudimos guardar el turno. Probá otra vez." };
  }
}

export async function setAppointmentStatus(id: string, status: "CONFIRMADO" | "ASISTIO" | "NO_VINO" | "CANCELADO") {
  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/app");
}

export async function saveService(input: { id?: string; name: string; emoji: string; durationMinutes: number; priceCents: number; active?: boolean }) {
  await requireFeature("turnos");
  if (input.id) await db.service.update({ where: { id: input.id }, data: input });
  else await db.service.create({ data: { ...input, active: input.active ?? true } as any });
  revalidatePath("/app");
}

export async function saveProfile(input: { name: string; phone?: string; address?: string; instagram?: string; accent: string }) {
  const tenant = await getCurrentTenant();
  await db.businessProfile.upsert({ where: { tenantId: tenant.id }, update: input, create: { tenantId: tenant.id, ...input } });
  await db.tenant.update({ where: { id: tenant.id }, data: { name: input.name } });
  revalidatePath("/app");
}

export async function ensureDefaultWorkingHours() {
  await db.workingHour.createMany({ data: [1,2,3,4,5,6].map((weekday) => ({ weekday, startMinutes: 600, endMinutes: weekday === 6 ? 1080 : 1200, active: true })) as any, skipDuplicates: true });
}

export async function createPromotion(input: { serviceId?: string; name: string; addOnLabel: string; message: string; expiresAt: Date }) {
  const promotion = await db.promotion.create({ data: { ...input, kind: "ADD_ON" } as any });
  revalidatePath("/app");
  return promotion.token;
}

export async function acceptWhatsappRisk() {
  await requireFeature("whatsapp_auto");
  const tenant = await getCurrentTenant();
  await db.tenant.update({ where: { id: tenant.id }, data: { whatsappRiskAcceptedAt: new Date(), whatsappRiskAcceptedBy: tenant.mpPayerEmail ?? "owner" } });
  await db.whatsappSession.upsert({ where: { tenantId: tenant.id }, update: { health: "QR_PENDING" }, create: { tenantId: tenant.id, health: "QR_PENDING" } });
  if (process.env.WA_SERVER_URL && process.env.WA_SERVER_TOKEN) {
    fetch(`${process.env.WA_SERVER_URL}/link`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WA_SERVER_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id }),
    }).catch((error) => console.error("[whatsapp] worker no disponible; se mantiene fallback wa.me", error));
  }
  revalidatePath("/app");
}

export async function queueGapFill(startLabel: string, endLabel: string) {
  await requireFeature("whatsapp_auto");
  const tenant = await getCurrentTenant();
  if (!tenant.whatsappRiskAcceptedAt) throw new Error("Aceptá primero el riesgo de la integración.");
  const clients = await db.client.findMany({ where: { marketingConsent: true }, include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1 } } });
  const due = clients.filter((client) => {
    const last = client.appointments[0]?.startsAt;
    return last && client.expectedCycleDays && Date.now() - last.getTime() >= client.expectedCycleDays * 86400000;
  }).slice(0, 5);
  const batch = new Date().toISOString().slice(0, 13);
  for (const client of due) await db.messageJob.upsert({
    where: { idempotencyKey: `gap:${tenant.id}:${batch}:${client.id}` }, update: {},
    create: { kind: "HUECO", phone: client.phone, scheduledAt: new Date(), idempotencyKey: `gap:${tenant.id}:${batch}:${client.id}`, body: `Hola ${client.name.split(" ")[0]} 👋 Se liberó un lugar de ${startLabel} a ${endLabel} en ${tenant.name}. ¿Te viene bien?` } as any,
  });
  return due.length;
}
