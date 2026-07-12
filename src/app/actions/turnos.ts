"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, systemDb } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { requireFeature } from "@/server/gate";
import { tieneFeature, MAX_STAFF } from "@/server/plans";
import { computeSlots, isVacation, localDate, type Vacation } from "@/lib/availability";
import { ensureUniqueSlug, isValidSlug } from "@/lib/slug";
import { appUrl } from "@/server/mp/preapproval";
import { z } from "zod";

const phone = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");
const horizonOf = (profile: { bookingHorizonDays: number }) => Math.min(90, Math.max(1, profile.bookingHorizonDays || 30));
const clientCookie = (tenantId: string) => `iman_cli_${tenantId}`;
const localDayAR = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtFechaEmail = (d: string) => { const [, m, day] = d.split("-").map(Number); return `${day} de ${MESES_ES[(m ?? 1) - 1]}`; };

// Manda los emails de una reserva (fuera del camino crítico). Confirmación al
// cliente si dejó su email; aviso al dueño si activó las notificaciones —
// independiente de si el cliente cargó o no su email.
async function enviarEmailsReserva(a: {
  tenant: { name: string; slug: string };
  profile: { accent?: string; address?: string | null; notifyOnBooking?: boolean; notifyEmail?: string | null } | null;
  service: { name: string };
  clienteNombre: string; clienteEmail: string | null; telefono: string; date: string; time: string; clientToken?: string;
}) {
  try {
    const { emailConfigurado, sendEmail } = await import("@/lib/mailer");
    if (!(await emailConfigurado())) return;
    const { emailConfirmacionCliente, emailAvisoTurnoAdmin } = await import("@/lib/emails");
    const fecha = fmtFechaEmail(a.date);
    const accent = a.profile?.accent;
    const base = appUrl();
    if (a.clienteEmail) {
      // ?c=token: el link del email trae los turnos del cliente en cualquier
      // dispositivo (sin depender de la cookie de quien reservó).
      const url = a.clientToken ? `${base}/${a.tenant.slug}/turnos?c=${a.clientToken}` : `${base}/${a.tenant.slug}/turnos`;
      const { subject, html } = emailConfirmacionCliente({
        negocio: a.tenant.name, cliente: a.clienteNombre, servicio: a.service.name,
        fecha, hora: a.time, direccion: a.profile?.address ?? null, accent, url,
      });
      await sendEmail({ to: a.clienteEmail, subject, html }).catch((e) => console.error("[email] confirmación cliente falló", e));
    }
    if (a.profile?.notifyOnBooking && a.profile?.notifyEmail) {
      const { subject, html } = emailAvisoTurnoAdmin({
        negocio: a.tenant.name, cliente: a.clienteNombre, telefono: a.telefono,
        servicio: a.service.name, fecha, hora: a.time, accent, panelUrl: `${base}/app`,
      });
      await sendEmail({ to: a.profile.notifyEmail, subject, html }).catch((e) => console.error("[email] aviso dueño falló", e));
    }
  } catch (e) {
    console.error("[email] reserva", e);
  }
}

export async function getOwnerData(from: Date, to: Date) {
  const tenant = await getCurrentTenant();
  const [profile, services, staff, workingHours, appointments, clients, promotions, whatsapp] = await Promise.all([
    db.businessProfile.findFirst(),
    db.service.findMany({ orderBy: { sortOrder: "asc" } }),
    db.staff.findMany({ orderBy: { sortOrder: "asc" } }),
    db.workingHour.findMany({ orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] }),
    db.appointment.findMany({
      where: { startsAt: { gte: from, lte: to } },
      include: { client: true, service: true, staff: true }, orderBy: { startsAt: "asc" },
    }),
    db.client.findMany({ include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 8 } }, orderBy: { name: "asc" } }),
    db.promotion.findMany({ include: { service: true }, orderBy: { createdAt: "desc" } }),
    db.whatsappSession.findFirst(),
  ]);
  return { tenant, profile, services, staff, workingHours, appointments, clients, promotions, whatsapp };
}

export async function getPublicBooking(slug: string, promoToken?: string, clientToken?: string) {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return null;
  const now = new Date();
  const horizonDays = horizonOf(tenant.profile);
  const horizon = new Date(now.getTime() + (horizonDays + 1) * 86_400_000);
  // Token del cliente: por link del email (?c=) o por cookie de este dispositivo.
  const token = clientToken || cookies().get(clientCookie(tenant.id))?.value;
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const [services, staff, hours, busy, promo, returning] = await Promise.all([
    systemDb.service.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" } }),
    multiStaff ? systemDb.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    systemDb.workingHour.findMany({ where: { tenantId: tenant.id, active: true } }),
    // Ventanas ocupadas del horizonte completo: el cliente calcula los
    // huecos al instante, sin volver al server ("buscando huecos" ya no espera).
    systemDb.appointment.findMany({
      where: { tenantId: tenant.id, status: { not: "CANCELADO" }, endsAt: { gte: now }, startsAt: { lte: horizon } },
      select: { startsAt: true, endsAt: true, staffId: true },
    }),
    promoToken ? systemDb.promotion.findFirst({ where: { tenantId: tenant.id, token: promoToken, active: true, expiresAt: { gt: new Date() } } }) : null,
    // Cliente que ya reservó antes (cookie/token con su accessToken): sus turnos.
    token ? systemDb.client.findFirst({
      where: { tenantId: tenant.id, accessToken: token },
      include: { appointments: { where: { status: { not: "CANCELADO" } }, include: { service: true, staff: true }, orderBy: { startsAt: "desc" }, take: 12 } },
    }) : null,
  ]);
  const misTurnos = returning
    ? { name: returning.name, appointments: returning.appointments }
    : null;
  // No exponer los datos de notificación del dueño en la página pública.
  const { notifyEmail, notifyOnBooking, ...profilePublico } = tenant.profile;
  return { tenant, profile: profilePublico, services, staff, hours, busy, promo, horizonDays, misTurnos };
}

export async function publicAvailability(slug: string, serviceId: string, date: string, staffId?: string) {
  const service = await systemDb.service.findFirst({
    where: { id: serviceId, active: true, tenant: { slug } },
    include: { tenant: { include: { profile: true } } },
  });
  if (!service?.tenant.profile) return [];
  const tenantId = service.tenantId;
  const multiStaff = tieneFeature(service.tenant, "multi_staff");
  const staffActivos = multiStaff ? await systemDb.staff.count({ where: { tenantId, active: true } }) : 0;
  const [busy, hours] = await Promise.all([
    systemDb.appointment.findMany({
      where: { tenantId, status: { not: "CANCELADO" }, startsAt: { lte: localDate(date, 1439) }, endsAt: { gte: localDate(date, 0) }, ...(staffId ? { staffId } : {}) },
      select: { startsAt: true, endsAt: true },
    }),
    systemDb.workingHour.findMany({ where: { tenantId, active: true } }),
  ]);
  // Con profesional elegido: cupo 1 (su agenda). "Cualquiera": cupo = cantidad
  // de profesionales activos (libre mientras haya al menos uno sin ocupar).
  const capacity = staffId ? 1 : Math.max(1, staffActivos);
  return computeSlots({ date, durationMinutes: service.durationMinutes, hours, busy, rules: service.tenant.profile, capacity });
}

const bookingSchema = z.object({
  slug: z.string().min(1), serviceId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/), name: z.string().trim().min(2).max(80),
  phone: z.string().min(8), email: z.string().email().optional().or(z.literal("")),
  promoToken: z.string().optional(), marketingConsent: z.boolean().optional(),
  staffId: z.string().optional(),
});

// Resuelve a qué profesional se asigna el turno: el elegido, o (si eligió
// "cualquiera") el primer profesional activo que esté libre en ese horario.
// Devuelve null si el negocio no usa staff. Lanza si no hay ninguno libre.
async function resolverStaff(tenantId: string, staffActivos: { id: string }[], staffPedido: string | null, startsAt: Date, endsAt: Date): Promise<string | null> {
  if (!staffActivos.length) return null;
  if (staffPedido) return staffPedido;
  const ocupados = await systemDb.appointment.findMany({
    where: { tenantId, status: { not: "CANCELADO" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    select: { staffId: true },
  });
  const busy = new Set(ocupados.map((o) => o.staffId));
  const libre = staffActivos.find((s) => !busy.has(s.id));
  if (!libre) throw new Error("sin_staff_libre");
  return libre.id;
}

export async function bookPublic(input: z.infer<typeof bookingSchema>) {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revisá tus datos." };
  const data = parsed.data;
  // Una sola query trae servicio + tenant + perfil; después una de ocupación.
  const service = await systemDb.service.findFirst({
    where: { id: data.serviceId, active: true, tenant: { slug: data.slug } },
    include: { tenant: { include: { profile: true } } },
  });
  const tenant = service?.tenant;
  if (!tenant?.profile) return { ok: false as const, error: "El negocio no está disponible." };
  if (!service) return { ok: false as const, error: "Ese servicio ya no está disponible." };
  const vacations = (tenant.profile.vacations as Vacation[] | null) ?? null;
  if (isVacation(data.date, vacations)) return { ok: false as const, error: "El negocio no atiende ese día." };
  // Límite de agenda: no se puede reservar más allá del horizonte configurado.
  const maxDay = localDayAR(new Date(Date.now() + horizonOf(tenant.profile) * 86_400_000));
  if (data.date > maxDay) return { ok: false as const, error: "Ese día todavía no está habilitado para reservar." };
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const staffActivos = multiStaff
    ? await systemDb.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, emoji: true } })
    : [];
  const staffPedido = data.staffId?.trim() || null;
  if (staffPedido && !staffActivos.some((s) => s.id === staffPedido)) return { ok: false as const, error: "Ese profesional no está disponible." };
  const [busy, hours] = await Promise.all([
    systemDb.appointment.findMany({
      where: { tenantId: tenant.id, status: { not: "CANCELADO" }, startsAt: { lte: localDate(data.date, 1439) }, endsAt: { gte: localDate(data.date, 0) }, ...(staffPedido ? { staffId: staffPedido } : {}) },
      select: { startsAt: true, endsAt: true },
    }),
    systemDb.workingHour.findMany({ where: { tenantId: tenant.id, active: true } }),
  ]);
  const capacity = staffPedido ? 1 : Math.max(1, staffActivos.length);
  const available = computeSlots({ date: data.date, durationMinutes: service.durationMinutes, hours, busy, rules: tenant.profile, vacations, capacity });
  if (!available.includes(data.time)) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
  const [h = 0, m = 0] = data.time.split(":").map(Number);
  const startsAt = localDate(data.date, h * 60 + m);
  const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + tenant.profile.bufferMinutes) * 60000);
  let staffAsignado: string | null;
  try {
    staffAsignado = await resolverStaff(tenant.id, staffActivos, staffPedido, startsAt, endsAt);
  } catch { return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." }; }
  try {
    const { appointment, clientToken } = await systemDb.$transaction(async (tx) => {
      const consent = data.marketingConsent ?? true;
      let client = await tx.client.upsert({
        where: { tenantId_phone: { tenantId: tenant.id, phone: phone(data.phone) } },
        update: { name: data.name, email: data.email || null, marketingConsent: consent },
        create: { tenantId: tenant.id, name: data.name, phone: phone(data.phone), email: data.email || null, marketingConsent: consent, accessToken: randomUUID() },
      });
      // Clientes creados antes del token: asignarles uno para que puedan volver.
      if (!client.accessToken) client = await tx.client.update({ where: { id: client.id }, data: { accessToken: randomUUID() } });
      const promo = data.promoToken ? await tx.promotion.findFirst({ where: { tenantId: tenant.id, token: data.promoToken, active: true, expiresAt: { gt: new Date() } } }) : null;
      const appointment = await tx.appointment.create({ data: {
        tenantId: tenant.id, serviceId: service.id, clientId: client.id, staffId: staffAsignado, startsAt, endsAt,
        channel: promo ? "PROMO" : "PUBLIC", promotionId: promo?.id,
        depositRequired: false, depositStatus: "disabled",
      } });
      return { appointment, clientToken: client.accessToken! };
    });
    // Cookie por negocio: al volver, el cliente ve sus turnos sin loguearse.
    cookies().set(clientCookie(tenant.id), clientToken, {
      path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true,
    });
    if (tenant.plan === "TURNOS_AUTO" && tenant.whatsappRiskAcceptedAt) {
      await systemDb.messageJob.create({ data: {
        tenantId: tenant.id, kind: "CONFIRMACION", phone: phone(data.phone),
        body: `Hola ${data.name}, tu turno en ${tenant.name} quedó confirmado para el ${data.date.split("-").reverse().join("/")} a las ${data.time}.`,
        scheduledAt: new Date(), idempotencyKey: `confirmation:${appointment.id}`,
      } });
    }
    // Fuera del camino crítico: la respuesta no espera a los emails.
    void enviarEmailsReserva({
      tenant, profile: tenant.profile, service,
      clienteNombre: data.name, clienteEmail: data.email || null, telefono: phone(data.phone),
      date: data.date, time: data.time, clientToken,
    });
    const staff = staffAsignado ? staffActivos.find((s) => s.id === staffAsignado) ?? null : null;
    return { ok: true as const, appointmentId: appointment.id, staff };
  } catch (error: any) {
    if (error?.code === "P2004" || String(error?.message).includes("appointment_no_overlap")) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
    console.error("[booking]", error);
    return { ok: false as const, error: "No pudimos guardar el turno. Probá otra vez." };
  }
}

// Disponibilidad para el ALTA MANUAL del dueño: igual que la pública pero sin
// el tope de anticipación (bookingLeadMinutes = 0), así puede cargar un turno
// para ahora mismo (walk-in). Respeta horarios, buffer, vacaciones y ocupación.
export async function ownerAvailability(serviceId: string, date: string, staffId?: string): Promise<string[]> {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const [service, profile, hours, busy, staffCount] = await Promise.all([
    db.service.findFirst({ where: { id: serviceId, active: true } }),
    db.businessProfile.findFirst(),
    db.workingHour.findMany({ where: { active: true } }),
    db.appointment.findMany({
      where: { status: { not: "CANCELADO" }, startsAt: { lte: localDate(date, 1439) }, endsAt: { gte: localDate(date, 0) }, ...(staffId ? { staffId } : {}) },
      select: { startsAt: true, endsAt: true },
    }),
    multiStaff ? db.staff.count({ where: { active: true } }) : Promise.resolve(0),
  ]);
  if (!service || !profile) return [];
  const vacations = (profile.vacations as Vacation[] | null) ?? null;
  const capacity = staffId ? 1 : Math.max(1, staffCount);
  return computeSlots({ date, durationMinutes: service.durationMinutes, hours, busy, rules: { ...profile, bookingLeadMinutes: 0 }, vacations, capacity });
}

const manualBookingSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().min(6),
  staffId: z.string().optional(),
});

/**
 * Alta MANUAL de un turno por el dueño (canal OWNER). Usa el mismo motor de
 * disponibilidad race-safe que la página pública (sin el tope de anticipación)
 * y NO toca cookies de cliente. Reutiliza/crea el cliente por teléfono.
 */
export async function crearTurnoManual(input: z.infer<typeof manualBookingSchema>) {
  const parsed = manualBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revisá los datos del turno." };
  const data = parsed.data;
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  const [profile, service] = await Promise.all([
    db.businessProfile.findFirst(),
    db.service.findFirst({ where: { id: data.serviceId, active: true } }),
  ]);
  if (!profile) return { ok: false as const, error: "Configurá tu negocio primero." };
  if (!service) return { ok: false as const, error: "Ese servicio ya no está disponible." };
  const vacations = (profile.vacations as Vacation[] | null) ?? null;
  if (isVacation(data.date, vacations)) return { ok: false as const, error: "Ese día el negocio no atiende." };
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const staffActivos = multiStaff
    ? await db.staff.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true } })
    : [];
  const staffPedido = data.staffId?.trim() || null;
  if (staffPedido && !staffActivos.some((s) => s.id === staffPedido)) return { ok: false as const, error: "Ese profesional no existe." };
  const [busy, hours] = await Promise.all([
    db.appointment.findMany({
      where: { status: { not: "CANCELADO" }, startsAt: { lte: localDate(data.date, 1439) }, endsAt: { gte: localDate(data.date, 0) }, ...(staffPedido ? { staffId: staffPedido } : {}) },
      select: { startsAt: true, endsAt: true },
    }),
    db.workingHour.findMany({ where: { active: true } }),
  ]);
  const capacity = staffPedido ? 1 : Math.max(1, staffActivos.length);
  const available = computeSlots({ date: data.date, durationMinutes: service.durationMinutes, hours, busy, rules: { ...profile, bookingLeadMinutes: 0 }, vacations, capacity });
  if (!available.includes(data.time)) return { ok: false as const, error: "Ese horario está ocupado o fuera de agenda. Elegí otro." };
  const [h = 0, m = 0] = data.time.split(":").map(Number);
  const startsAt = localDate(data.date, h * 60 + m);
  const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + profile.bufferMinutes) * 60000);
  let staffAsignado: string | null;
  try { staffAsignado = await resolverStaff(tenant.id, staffActivos, staffPedido, startsAt, endsAt); }
  catch { return { ok: false as const, error: "Ese horario está ocupado. Elegí otro." }; }
  try {
    const appointment = await db.$transaction(async (tx) => {
      const client = await tx.client.upsert({
        where: { tenantId_phone: { tenantId: tenant.id, phone: phone(data.phone) } },
        update: { name: data.name },
        create: { tenantId: tenant.id, name: data.name, phone: phone(data.phone), accessToken: randomUUID() },
      });
      return tx.appointment.create({ data: {
        tenantId: tenant.id, serviceId: service.id, clientId: client.id, staffId: staffAsignado, startsAt, endsAt,
        channel: "OWNER", depositRequired: false, depositStatus: "disabled",
      } });
    });
    revalidatePath("/app");
    revalidatePath(`/${tenant.slug}`);
    return { ok: true as const, appointmentId: appointment.id };
  } catch (error: any) {
    if (error?.code === "P2004" || String(error?.message).includes("appointment_no_overlap")) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
    console.error("[manual booking]", error);
    return { ok: false as const, error: "No pudimos crear el turno. Probá de nuevo." };
  }
}

export async function setAppointmentStatus(id: string, status: "CONFIRMADO" | "ASISTIO" | "NO_VINO" | "CANCELADO") {
  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/app");
}

export async function saveService(input: { id?: string; name: string; emoji: string; durationMinutes: number; priceCents: number; active?: boolean }) {
  // El primer servicio se crea antes de elegir el plan, dentro del onboarding.
  // Una vez operativo, vuelve a regir el gate normal de la suscripción.
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  if (input.id) await db.service.update({ where: { id: input.id }, data: input });
  else if (tenant.planStatus === "ONBOARDING") {
    // Idempotente: si el navegador se cerró después de guardar, reintentar el
    // paso actualiza el mismo servicio en vez de chocar con el nombre único.
    await systemDb.service.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: input.name } },
      update: { ...input, active: input.active ?? true },
      create: { tenantId: tenant.id, ...input, active: input.active ?? true },
    });
  } else await db.service.create({ data: { ...input, active: input.active ?? true } as any });
  revalidatePath("/app");
}

export async function saveProfile(input: { name: string; phone?: string; address?: string; mapsUrl?: string; instagram?: string; accent: string }) {
  const tenant = await getCurrentTenant();
  await db.businessProfile.upsert({ where: { tenantId: tenant.id }, update: input, create: { tenantId: tenant.id, ...input } });
  await db.tenant.update({ where: { id: tenant.id }, data: { name: input.name } });
  revalidatePath("/app");
}

// Aviso por email al dueño cada vez que entra una reserva (opt-in). Va al mail
// que elija, sin importar si el cliente cargó o no el suyo.
export async function saveNotifications(input: { notifyOnBooking: boolean; notifyEmail: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  const email = input.notifyEmail.trim();
  if (input.notifyOnBooking && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Poné un email válido para recibir los avisos." };
  }
  await db.businessProfile.update({
    where: { tenantId: tenant.id },
    data: { notifyOnBooking: input.notifyOnBooking, notifyEmail: email || null },
  });
  revalidatePath("/app");
  return { ok: true };
}

// ── Profesionales (multi_staff, plan Turnos Auto) ───────────────────────────
export async function saveStaff(input: { id?: string; name: string; emoji?: string; active?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  if (!tieneFeature(tenant, "multi_staff")) return { ok: false, error: "Los profesionales son parte de Turnos Auto." };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Poné el nombre del profesional." };
  if (input.id) {
    await db.staff.update({ where: { id: input.id }, data: { name, emoji: input.emoji || undefined, ...(input.active === undefined ? {} : { active: input.active }) } });
  } else {
    const count = await db.staff.count();
    if (count >= MAX_STAFF) return { ok: false, error: `Con Turnos Auto podés cargar hasta ${MAX_STAFF} profesionales.` };
    await db.staff.create({ data: { tenantId: tenant.id, name, emoji: input.emoji || "💈", sortOrder: count } });
  }
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

export async function deleteStaff(id: string): Promise<{ ok: true }> {
  const tenant = await getCurrentTenant();
  if (!tieneFeature(tenant, "multi_staff")) return { ok: true };
  // Los turnos del profesional quedan sin asignar (staffId → null por la FK).
  await db.staff.delete({ where: { id } });
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// Tema visual de la página pública (multi/temas, plan Turnos Auto).
const TEMAS_VALIDOS = ["clasico", "profesional", "noche"];
export async function saveTheme(theme: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  if (!tieneFeature(tenant, "temas")) return { ok: false, error: "Los temas son parte de Turnos Auto." };
  if (!TEMAS_VALIDOS.includes(theme)) return { ok: false, error: "Tema no válido." };
  await db.businessProfile.update({ where: { tenantId: tenant.id }, data: { theme } });
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// Ajustes de reservas: identificador de link, límite de agenda, mostrar
// precios y vacaciones. El slug se valida (formato + reservados + único).
export async function saveBookingSettings(input: {
  slug?: string;
  showPrices: boolean;
  bookingHorizonDays: number;
  cancelWindowHours: number;
  vacations: Vacation[];
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  const horizon = Math.min(90, Math.max(1, Math.round(input.bookingHorizonDays) || 30));
  const cancelWindowHours = Math.min(720, Math.max(0, Math.round(input.cancelWindowHours) || 0));
  const vacations = (input.vacations ?? [])
    .filter((v) => v.start && v.end && v.start <= v.end)
    .map((v) => ({ start: v.start, end: v.end, label: v.label?.slice(0, 60) || undefined }));

  let finalSlug = tenant.slug;
  if (input.slug && input.slug !== tenant.slug) {
    const slug = input.slug.trim().toLowerCase();
    if (!isValidSlug(slug)) return { ok: false, error: "El identificador solo puede tener letras, números y guiones (2 a 40), y no puede ser una palabra reservada." };
    const existe = await systemDb.tenant.findFirst({ where: { slug, NOT: { id: tenant.id } }, select: { id: true } });
    if (existe) return { ok: false, error: "Ese identificador ya está en uso. Probá otro." };
    await db.tenant.update({ where: { id: tenant.id }, data: { slug } });
    finalSlug = slug;
  }

  await db.businessProfile.update({
    where: { tenantId: tenant.id },
    data: { showPrices: input.showPrices, bookingHorizonDays: horizon, cancelWindowHours, vacations: vacations as any },
  });
  revalidatePath("/app");
  revalidatePath(`/${finalSlug}`);
  return { ok: true, slug: finalSlug };
}

/**
 * Cancelación del turno POR EL CLIENTE desde la página pública. Se identifica
 * por su cookie/token (no hay login). Solo se permite hasta N horas antes,
 * con N configurable por el negocio (cancelWindowHours).
 */
export async function cancelPublicAppointment(slug: string, appointmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return { ok: false, error: "El negocio no está disponible." };
  const token = cookies().get(clientCookie(tenant.id))?.value;
  if (!token) return { ok: false, error: "No encontramos tu reserva en este dispositivo." };
  const client = await systemDb.client.findFirst({ where: { tenantId: tenant.id, accessToken: token }, select: { id: true } });
  if (!client) return { ok: false, error: "No encontramos tu reserva en este dispositivo." };
  const appt = await systemDb.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id, clientId: client.id } });
  if (!appt) return { ok: false, error: "Ese turno ya no existe." };
  if (appt.status === "CANCELADO") return { ok: true };
  const windowH = Math.max(0, tenant.profile.cancelWindowHours ?? 48);
  const limite = new Date(appt.startsAt.getTime() - windowH * 3_600_000);
  if (new Date() > limite) return { ok: false, error: `Solo se puede cancelar hasta ${windowH} h antes del turno. Escribinos por WhatsApp para reprogramar.` };
  await systemDb.appointment.update({ where: { id: appt.id }, data: { status: "CANCELADO" } });
  revalidatePath(`/${slug}/turnos`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

/** Sugiere un slug libre a partir de un texto (para el editor de identificador). */
export async function suggestSlug(text: string): Promise<string> {
  await getCurrentTenant();
  return ensureUniqueSlug(text, async (slug) =>
    !!(await systemDb.tenant.findFirst({ where: { slug }, select: { id: true } }))
  );
}

export async function ensureDefaultWorkingHours() {
  await db.workingHour.createMany({ data: [1,2,3,4,5,6].map((weekday) => ({ weekday, startMinutes: 600, endMinutes: weekday === 6 ? 1080 : 1200, active: true })) as any, skipDuplicates: true });
}

export async function saveOnboardingStep(step: "negocio" | "servicio" | "plan") {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") return;
  await db.tenant.update({ where: { id: tenant.id }, data: { onboardingStep: step } });
  revalidatePath("/onboarding");
}

// Pasos del onboarding consolidados: UNA server action por paso (antes eran
// tres llamadas encadenadas y "Dale tu identidad" tardaba una eternidad).
export async function saveOnboardingBusiness(input: { name: string; phone?: string; address?: string; mapsUrl?: string; instagram?: string; accent: string; businessType?: string }) {
  const tenant = await getCurrentTenant();
  await Promise.all([
    db.businessProfile.upsert({ where: { tenantId: tenant.id }, update: input, create: { tenantId: tenant.id, ...input } }),
    db.tenant.update({
      where: { id: tenant.id },
      data: { name: input.name, ...(tenant.planStatus === "ONBOARDING" ? { onboardingStep: "servicio" } : {}) },
    }),
    db.workingHour.createMany({ data: [1,2,3,4,5,6].map((weekday) => ({ weekday, startMinutes: 600, endMinutes: weekday === 6 ? 1080 : 1200, active: true })) as any, skipDuplicates: true }),
  ]);
  revalidatePath("/onboarding");
  revalidatePath("/app");
}

// Crea de una todos los servicios elegidos del rubro. Idempotente por nombre:
// reintentar el paso (o volver atrás) actualiza en vez de duplicar.
export async function saveOnboardingServices(services: { name: string; emoji: string; durationMinutes: number; priceCents: number }[]) {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  const limpios = services.filter((s) => s.name.trim() && s.priceCents >= 0);
  if (!limpios.length) throw new Error("Elegí al menos un servicio.");
  await Promise.all(limpios.map((s, i) => systemDb.service.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: s.name } },
    update: { ...s, active: true, sortOrder: i },
    create: { tenantId: tenant.id, ...s, active: true, sortOrder: i },
  })));
  if (tenant.planStatus === "ONBOARDING") {
    await db.tenant.update({ where: { id: tenant.id }, data: { onboardingStep: "plan" } });
  }
  revalidatePath("/onboarding");
  revalidatePath("/app");
}

export async function saveOnboardingService(input: { id?: string; name: string; emoji: string; durationMinutes: number; priceCents: number }) {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  await Promise.all([
    input.id
      ? db.service.update({ where: { id: input.id }, data: input })
      : systemDb.service.upsert({
          // Idempotente: reintentar el paso actualiza el mismo servicio.
          where: { tenantId_name: { tenantId: tenant.id, name: input.name } },
          update: { ...input, active: true },
          create: { tenantId: tenant.id, ...input, active: true },
        }),
    tenant.planStatus === "ONBOARDING"
      ? db.tenant.update({ where: { id: tenant.id }, data: { onboardingStep: "plan" } })
      : Promise.resolve(),
  ]);
  revalidatePath("/onboarding");
  revalidatePath("/app");
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

export async function queueGapFill(startLabel: string, endLabel: string, promoToken?: string) {
  await requireFeature("whatsapp_auto");
  const tenant = await getCurrentTenant();
  if (!tenant.whatsappRiskAcceptedAt) throw new Error("Aceptá primero el riesgo de la integración.");
  const [clients, promo] = await Promise.all([
    db.client.findMany({ where: { marketingConsent: true }, include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1 } } }),
    // La promo la elige el dueño en el sheet (o ninguna): el link la referencia.
    promoToken ? db.promotion.findFirst({ where: { token: promoToken, active: true, expiresAt: { gt: new Date() } } }) : null,
  ]);
  const due = clients.filter((client) => {
    const last = client.appointments[0]?.startsAt;
    return last && client.expectedCycleDays && Date.now() - last.getTime() >= client.expectedCycleDays * 86400000;
  }).slice(0, 5);
  const base = `${appUrl()}/${tenant.slug}/turnos`;
  const link = promo ? `${base}?promo=${promo.token}` : base;
  const batch = new Date().toISOString().slice(0, 13);
  for (const client of due) await db.messageJob.upsert({
    where: { idempotencyKey: `gap:${tenant.id}:${batch}:${client.id}` }, update: {},
    create: { kind: "HUECO", phone: client.phone, scheduledAt: new Date(), idempotencyKey: `gap:${tenant.id}:${batch}:${client.id}`,
      body: `Hola ${client.name.split(" ")[0]} 👋 Se liberó un lugar de ${startLabel} a ${endLabel} en ${tenant.name}.${promo ? ` Además tenés esta promo: ${promo.name}.` : ""} Reservá tu lugar acá: ${link}` } as any,
  });
  return due.length;
}
