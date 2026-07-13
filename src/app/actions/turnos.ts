"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, systemDb } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { requireFeature } from "@/server/gate";
import { accesoDe, tieneFeature, MAX_STAFF } from "@/server/plans";
import { computeSlots, isVacation, localDate, type Vacation } from "@/lib/availability";
import { instagramHandle } from "@/lib/instagram";
import { normalizeMapsUrl } from "@/lib/maps";
import { isValidPhone, normalizePhone, phoneCandidates } from "@/lib/phone";
import { ensureUniqueSlug, isValidSlug } from "@/lib/slug";
import { appUrl } from "@/server/mp/preapproval";
import {
  createPublicAppointmentToken,
  hashPublicAppointmentToken,
  publicAppointmentCookieName,
  publicAppointmentCredentials,
  publicTokenExpiry,
  safeTokenEqual,
  setPublicAppointmentCookie,
} from "@/server/public-booking-access";
import { consumeRateLimit, requestFingerprint } from "@/server/rate-limit";
import { logError } from "@/server/observability/log";
import { z } from "zod";

const horizonOf = (profile: { bookingHorizonDays: number }) => Math.min(90, Math.max(1, profile.bookingHorizonDays || 30));
const localDayAR = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtFechaEmail = (d: string) => { const [, m, day] = d.split("-").map(Number); return `${day} de ${MESES_ES[(m ?? 1) - 1]}`; };

async function requireTurnosOrOnboarding() {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  return tenant;
}

const serviceInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80),
  emoji: z.string().trim().min(1).max(16),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(100_000_000),
  active: z.boolean().optional(),
});

const profileInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(30).optional(),
  address: z.string().trim().max(160).optional(),
  mapsUrl: z.string().trim().max(500).optional(),
  instagram: z.string().trim().max(100).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

// Profesionales que ofrecen un servicio: los que lo tienen asignado, o TODOS
// los que no tienen ninguno asignado (default cómodo para no romper agendas).
function ofrecenServicio<T extends { services: { serviceId: string }[] }>(staff: T[], serviceId: string): T[] {
  return staff.filter((s) => s.services.length === 0 || s.services.some((x) => x.serviceId === serviceId));
}

// Manda los emails de una reserva (fuera del camino crítico). Confirmación al
// cliente si dejó su email; aviso al dueño si activó las notificaciones —
// independiente de si el cliente cargó o no su email.
async function enviarEmailsReserva(a: {
  tenant: { id: string; name: string; slug: string };
  profile: { accent?: string; address?: string | null; mapsUrl?: string | null; notifyOnBooking?: boolean; notifyEmail?: string | null } | null;
  service: { name: string };
  clienteNombre: string; clienteEmail: string | null; telefono: string; date: string; time: string;
  appointmentId: string; publicToken: string; profesional?: string | null;
}) {
  try {
    const { emailConfigurado, sendEmail } = await import("@/lib/mailer");
    if (!(await emailConfigurado())) return;
    const { emailConfirmacionCliente, emailAvisoTurnoAdmin } = await import("@/lib/emails");
    const fecha = fmtFechaEmail(a.date);
    const accent = a.profile?.accent;
    const base = appUrl();
    if (a.clienteEmail) {
      // El secreto viaja en el fragmento: no llega a logs HTTP ni Referer. La
      // página lo intercambia por una cookie HttpOnly y limpia la URL enseguida.
      const url = `${base}/${a.tenant.slug}/turnos#booking=${encodeURIComponent(`${a.appointmentId}.${a.publicToken}`)}`;
      const { subject, html } = emailConfirmacionCliente({
        negocio: a.tenant.name, cliente: a.clienteNombre, servicio: a.service.name,
        fecha, hora: a.time, direccion: a.profile?.address ?? null, mapsUrl: a.profile?.mapsUrl ?? null,
        profesional: a.profesional, accent, url,
      });
      await sendEmail({ to: a.clienteEmail, subject, html, tenantId: a.tenant.id, template: "confirmacion_cliente" }).catch((e) => console.error("[email] confirmación cliente falló", e));
    }
    if (a.profile?.notifyOnBooking && a.profile?.notifyEmail) {
      const { subject, html } = emailAvisoTurnoAdmin({
        negocio: a.tenant.name, cliente: a.clienteNombre, telefono: a.telefono,
        servicio: a.service.name, fecha, hora: a.time, profesional: a.profesional, accent, panelUrl: `${base}/app`,
      });
      await sendEmail({ to: a.profile.notifyEmail, subject, html, tenantId: a.tenant.id, template: "aviso_turno_admin" }).catch((e) => console.error("[email] aviso dueño falló", e));
    }
  } catch (e) {
    console.error("[email] reserva", e);
    await logError("email", e, { flow: "reserva" }, a.tenant.id);
  }
}

export async function getOwnerData(from: Date, to: Date) {
  const tenant = await requireTurnosOrOnboarding();
  const [profile, services, staff, workingHours, appointments, clients, promotions, whatsapp] = await Promise.all([
    db.businessProfile.findFirst(),
    db.service.findMany({ orderBy: { sortOrder: "asc" } }),
    db.staff.findMany({ orderBy: { sortOrder: "asc" }, include: { services: { select: { serviceId: true } } } }),
    db.workingHour.findMany({ orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] }),
    db.appointment.findMany({
      where: { startsAt: { gte: from, lte: to } },
      include: { client: true, service: true, staff: true }, orderBy: { startsAt: "asc" },
    }),
    db.client.findMany({ include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 8 } }, orderBy: { name: "asc" } }),
    db.promotion.findMany({ include: { service: true }, orderBy: { createdAt: "desc" } }),
    db.whatsappSession.findFirst(),
  ]);
  const staffConServicios = staff.map((s) => ({ ...s, serviceIds: s.services.map((x) => x.serviceId) }));
  return { tenant, profile, services, staff: staffConServicios, workingHours, appointments, clients, promotions, whatsapp };
}

export async function getPublicBooking(slug: string, promoToken?: string) {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return null;
  const access = accesoDe(tenant);
  if (access.estado === "onboarding" || access.estado === "bloqueado") return null;
  const now = new Date();
  const horizonDays = horizonOf(tenant.profile);
  const horizon = new Date(now.getTime() + (horizonDays + 1) * 86_400_000);
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const credentials = await publicAppointmentCredentials();
  const [services, staff, hours, busy, promo, appointmentCandidates] = await Promise.all([
    systemDb.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, emoji: true, durationMinutes: true, priceCents: true },
    }),
    multiStaff ? systemDb.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" }, include: { services: { select: { serviceId: true } } } }) : Promise.resolve([]),
    systemDb.workingHour.findMany({ where: { tenantId: tenant.id, active: true }, select: { weekday: true, startMinutes: true, endMinutes: true, active: true } }),
    systemDb.appointment.findMany({
      where: { tenantId: tenant.id, status: { not: "CANCELADO" }, endsAt: { gte: now }, startsAt: { lte: horizon } },
      select: { startsAt: true, endsAt: true, staffId: true },
    }),
    promoToken ? systemDb.promotion.findFirst({
      where: { tenantId: tenant.id, token: promoToken, active: true, expiresAt: { gt: now } },
      select: { name: true, message: true, token: true, expiresAt: true },
    }) : null,
    credentials.size ? systemDb.appointment.findMany({
      where: { tenantId: tenant.id, id: { in: [...credentials.keys()] }, status: { not: "CANCELADO" } },
      select: {
        id: true, startsAt: true, endsAt: true, status: true,
        publicTokenHash: true, publicTokenExpiresAt: true,
        client: { select: { name: true } },
        service: { select: { name: true, emoji: true } },
        staff: { select: { name: true, emoji: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 12,
    }) : Promise.resolve([]),
  ]);

  const authorizedAppointments = appointmentCandidates
    .filter((appointment) => {
      const token = credentials.get(appointment.id);
      return !!token && !!appointment.publicTokenExpiresAt && appointment.publicTokenExpiresAt > now
        && safeTokenEqual(token, appointment.publicTokenHash);
    })
    .map(({ publicTokenHash: _hash, publicTokenExpiresAt: _expires, client, ...appointment }) => ({
      ...appointment,
      clientName: client.name,
    }));
  const misTurnos = authorizedAppointments.length
    ? { name: authorizedAppointments[0]?.clientName ?? "", appointments: authorizedAppointments }
    : null;

  const staffPublico = staff.map((member) => ({
    id: member.id,
    name: member.name,
    emoji: member.emoji,
    serviceIds: member.services.map((link) => link.serviceId),
  }));

  // El navegador recibe disponibilidad, no las ventanas exactas de turnos de
  // terceros. Así puede responder al instante sin exponer la ocupación interna.
  const availability: Record<string, string[]> = {};
  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const date = localDayAR(new Date(now.getTime() + dayOffset * 86_400_000));
    for (const service of services) {
      const offered = staffPublico.filter((member) => !member.serviceIds.length || member.serviceIds.includes(service.id));
      const generalBusy = offered.length
        ? busy.filter((window) => offered.some((member) => member.id === window.staffId))
        : busy;
      availability[`${service.id}|${date}|*`] = computeSlots({
        date,
        durationMinutes: service.durationMinutes,
        hours,
        busy: generalBusy,
        rules: tenant.profile,
        vacations: (tenant.profile.vacations as Vacation[] | null) ?? null,
        capacity: Math.max(1, offered.length),
        now,
      });
      for (const member of offered) {
        availability[`${service.id}|${date}|${member.id}`] = computeSlots({
          date,
          durationMinutes: service.durationMinutes,
          hours,
          busy: busy.filter((window) => window.staffId === member.id),
          rules: tenant.profile,
          vacations: (tenant.profile.vacations as Vacation[] | null) ?? null,
          capacity: 1,
          now,
        });
      }
    }
  }

  const profilePublico = {
    name: tenant.profile.name,
    description: tenant.profile.description,
    address: tenant.profile.address,
    mapsUrl: tenant.profile.mapsUrl,
    phone: tenant.profile.phone,
    instagram: tenant.profile.instagram,
    accent: tenant.profile.accent,
    theme: tenant.profile.theme,
    logoUrl: tenant.profile.logoUrl,
    bookingLeadMinutes: tenant.profile.bookingLeadMinutes,
    bookingHorizonDays: tenant.profile.bookingHorizonDays,
    slotStepMinutes: tenant.profile.slotStepMinutes,
    bufferMinutes: tenant.profile.bufferMinutes,
    showPrices: tenant.profile.showPrices,
    vacations: tenant.profile.vacations,
    cancelWindowHours: tenant.profile.cancelWindowHours,
  };
  return {
    tenant: { slug: tenant.slug, name: tenant.name },
    profile: profilePublico,
    services,
    staff: staffPublico,
    hours,
    availability,
    promo,
    horizonDays,
    misTurnos,
  };
}

export async function publicAvailability(slug: string, serviceId: string, date: string, staffId?: string) {
  const fingerprint = await requestFingerprint();
  if (!(await consumeRateLimit({ scope: "public-availability", subject: `${slug}:${fingerprint}`, limit: 60, windowMs: 60_000 }))) return [];
  const service = await systemDb.service.findFirst({
    where: { id: serviceId, active: true, tenant: { slug } },
    include: { tenant: { include: { profile: true } } },
  });
  if (!service?.tenant.profile) return [];
  const tenantId = service.tenantId;
  const multiStaff = tieneFeature(service.tenant, "multi_staff");
  let capacity = 1;
  let staffFilter: Record<string, unknown> = {};
  if (multiStaff) {
    const activos = await systemDb.staff.findMany({ where: { tenantId, active: true }, select: { id: true, services: { select: { serviceId: true } } } });
    if (activos.length) {
      if (staffId) {
        if (!ofrecenServicio(activos, serviceId).some((member) => member.id === staffId)) return [];
        staffFilter = { staffId }; capacity = 1;
      }
      else {
        const ofrecen = ofrecenServicio(activos, serviceId);
        if (!ofrecen.length) return []; // ningún profesional ofrece este servicio
        staffFilter = { staffId: { in: ofrecen.map((s) => s.id) } };
        capacity = ofrecen.length;
      }
    }
  }
  const [busy, hours] = await Promise.all([
    systemDb.appointment.findMany({
      where: { tenantId, status: { not: "CANCELADO" }, startsAt: { lte: localDate(date, 1439) }, endsAt: { gte: localDate(date, 0) }, ...staffFilter },
      select: { startsAt: true, endsAt: true },
    }),
    systemDb.workingHour.findMany({ where: { tenantId, active: true } }),
  ]);
  return computeSlots({ date, durationMinutes: service.durationMinutes, hours, busy, rules: service.tenant.profile, capacity });
}

const bookingSchema = z.object({
  slug: z.string().min(1), serviceId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/), name: z.string().trim().min(2).max(80),
  phone: z.string().refine(isValidPhone), email: z.string().email().max(254).optional().or(z.literal("")),
  promoToken: z.string().max(100).optional(), marketingConsent: z.boolean().default(false),
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
  const fingerprint = await requestFingerprint();
  if (!(await consumeRateLimit({ scope: "public-booking-ip", subject: `${data.slug}:${fingerprint}`, limit: 12, windowMs: 10 * 60_000 }))) {
    return { ok: false as const, error: "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo." };
  }
  // Una sola query trae servicio + tenant + perfil; después una de ocupación.
  const service = await systemDb.service.findFirst({
    where: { id: data.serviceId, active: true, tenant: { slug: data.slug } },
    include: { tenant: { include: { profile: true } } },
  });
  const tenant = service?.tenant;
  if (!tenant?.profile) return { ok: false as const, error: "El negocio no está disponible." };
  if (!service) return { ok: false as const, error: "Ese servicio ya no está disponible." };
  const access = accesoDe(tenant);
  if (access.estado === "onboarding" || access.estado === "bloqueado") {
    return { ok: false as const, error: "La agenda de este negocio no está disponible por el momento." };
  }
  const vacations = (tenant.profile.vacations as Vacation[] | null) ?? null;
  if (isVacation(data.date, vacations)) return { ok: false as const, error: "El negocio no atiende ese día." };
  // Límite de agenda: no se puede reservar más allá del horizonte configurado.
  const maxDay = localDayAR(new Date(Date.now() + (horizonOf(tenant.profile) - 1) * 86_400_000));
  if (data.date > maxDay) return { ok: false as const, error: "Ese día todavía no está habilitado para reservar." };
  const multiStaff = tieneFeature(tenant, "multi_staff");
  const staffActivos = multiStaff
    ? await systemDb.staff.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, emoji: true, services: { select: { serviceId: true } } } })
    : [];
  const staffOfrecen = ofrecenServicio(staffActivos, service.id);
  const staffPedido = data.staffId?.trim() || null;
  if (staffPedido && !staffOfrecen.some((s) => s.id === staffPedido)) return { ok: false as const, error: "Ese profesional no atiende este servicio." };
  if (staffActivos.length && !staffPedido && !staffOfrecen.length) return { ok: false as const, error: "Ese servicio no tiene un profesional asignado todavía." };
  const staffFilter = staffPedido ? { staffId: staffPedido } : (staffActivos.length ? { staffId: { in: staffOfrecen.map((s) => s.id) } } : {});
  const [busy, hours] = await Promise.all([
    systemDb.appointment.findMany({
      where: { tenantId: tenant.id, status: { not: "CANCELADO" }, startsAt: { lte: localDate(data.date, 1439) }, endsAt: { gte: localDate(data.date, 0) }, ...staffFilter },
      select: { startsAt: true, endsAt: true },
    }),
    systemDb.workingHour.findMany({ where: { tenantId: tenant.id, active: true } }),
  ]);
  const capacity = staffPedido ? 1 : Math.max(1, staffActivos.length ? staffOfrecen.length : 1);
  const available = computeSlots({ date: data.date, durationMinutes: service.durationMinutes, hours, busy, rules: tenant.profile, vacations, capacity });
  if (!available.includes(data.time)) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
  const [h = 0, m = 0] = data.time.split(":").map(Number);
  const startsAt = localDate(data.date, h * 60 + m);
  const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + tenant.profile.bufferMinutes) * 60000);
  const normalizedPhone = normalizePhone(data.phone);
  if (!(await consumeRateLimit({ scope: "public-booking-phone", subject: `${tenant.id}:${normalizedPhone}`, limit: 5, windowMs: 60 * 60_000 }))) {
    return { ok: false as const, error: "Ese número hizo demasiadas reservas recientemente. Probá más tarde." };
  }
  let staffAsignado: string | null;
  try {
    staffAsignado = await resolverStaff(tenant.id, staffOfrecen, staffPedido, startsAt, endsAt);
  } catch { return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." }; }
  const publicToken = createPublicAppointmentToken();
  const publicTokenHash = hashPublicAppointmentToken(publicToken);
  const publicTokenExpiresAt = publicTokenExpiry(startsAt);
  try {
    const appointment = await systemDb.$transaction(async (tx) => {
      const existingClient = await tx.client.findFirst({
        where: { tenantId: tenant.id, phone: { in: phoneCandidates(data.phone) } },
      });
      // Conocer un teléfono no autoriza a modificar identidad, email ni
      // consentimiento de un cliente existente.
      const client = existingClient ?? await tx.client.create({ data: {
        tenantId: tenant.id,
        name: data.name,
        phone: normalizedPhone,
        email: data.email || null,
        marketingConsent: data.marketingConsent,
      } });
      const promo = data.promoToken ? await tx.promotion.findFirst({ where: { tenantId: tenant.id, token: data.promoToken, active: true, expiresAt: { gt: new Date() } } }) : null;
      const appointment = await tx.appointment.create({ data: {
        tenantId: tenant.id, serviceId: service.id, clientId: client.id, staffId: staffAsignado, startsAt, endsAt,
        channel: promo ? "PROMO" : "PUBLIC", promotionId: promo?.id,
        depositRequired: false, depositStatus: "disabled", publicTokenHash, publicTokenExpiresAt,
      } });
      return appointment;
    });
    await setPublicAppointmentCookie({
      appointmentId: appointment.id,
      slug: tenant.slug,
      token: publicToken,
      expiresAt: publicTokenExpiresAt,
    });
    if (tenant.plan === "TURNOS_AUTO" && tenant.whatsappRiskAcceptedAt) {
      await systemDb.$transaction([
        systemDb.messageJob.create({ data: {
          tenantId: tenant.id, kind: "CONFIRMACION", phone: normalizedPhone,
          body: `Hola ${data.name}, tu turno en ${tenant.name} quedó confirmado para el ${data.date.split("-").reverse().join("/")} a las ${data.time}.`,
          scheduledAt: new Date(), idempotencyKey: `confirmation:${appointment.id}`,
        } }),
        systemDb.messageJob.create({ data: {
          tenantId: tenant.id, kind: "RECORDATORIO", phone: normalizedPhone,
          body: `Hola ${data.name} 👋 Te recordamos tu turno de ${service.name} mañana a las ${data.time}.`,
          scheduledAt: new Date(Math.max(Date.now(), startsAt.getTime() - 24 * 3_600_000)),
          idempotencyKey: `reminder:${appointment.id}`,
        } }),
      ]);
    }
    await enviarEmailsReserva({
      tenant, profile: tenant.profile, service,
      clienteNombre: data.name, clienteEmail: data.email || null, telefono: normalizedPhone,
      date: data.date, time: data.time, appointmentId: appointment.id, publicToken,
      profesional: staffAsignado ? (staffActivos.find((s) => s.id === staffAsignado)?.name ?? null) : null,
    });
    const staff = staffAsignado ? staffActivos.find((s) => s.id === staffAsignado) ?? null : null;
    return { ok: true as const, appointmentId: appointment.id, staff };
  } catch (error: any) {
    if (error?.code === "P2004" || String(error?.message).includes("appointment_no_overlap")) return { ok: false as const, error: "Ese horario acaba de ocuparse. Elegí otro." };
    console.error("[booking]", error);
    await logError("booking", error, undefined, tenant.id);
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
  const [service, profile, hours] = await Promise.all([
    db.service.findFirst({ where: { id: serviceId, active: true } }),
    db.businessProfile.findFirst(),
    db.workingHour.findMany({ where: { active: true } }),
  ]);
  if (!service || !profile) return [];
  let capacity = 1;
  let staffFilter: Record<string, unknown> = {};
  if (multiStaff) {
    const activos = await db.staff.findMany({ where: { active: true }, select: { id: true, services: { select: { serviceId: true } } } });
    if (activos.length) {
      if (staffId) { staffFilter = { staffId }; capacity = 1; }
      else {
        const ofrecen = ofrecenServicio(activos, serviceId);
        if (!ofrecen.length) return [];
        staffFilter = { staffId: { in: ofrecen.map((s) => s.id) } };
        capacity = ofrecen.length;
      }
    }
  }
  const busy = await db.appointment.findMany({
    where: { status: { not: "CANCELADO" }, startsAt: { lte: localDate(date, 1439) }, endsAt: { gte: localDate(date, 0) }, ...staffFilter },
    select: { startsAt: true, endsAt: true },
  });
  const vacations = (profile.vacations as Vacation[] | null) ?? null;
  return computeSlots({ date, durationMinutes: service.durationMinutes, hours, busy, rules: { ...profile, bookingLeadMinutes: 0 }, vacations, capacity });
}

const manualBookingSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().optional().refine((value) => !value?.trim() || isValidPhone(value)),
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
    ? await db.staff.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, services: { select: { serviceId: true } } } })
    : [];
  const staffOfrecen = ofrecenServicio(staffActivos, service.id);
  const staffPedido = data.staffId?.trim() || null;
  if (staffPedido && !staffOfrecen.some((s) => s.id === staffPedido)) return { ok: false as const, error: "Ese profesional no atiende este servicio." };
  if (staffActivos.length && !staffPedido && !staffOfrecen.length) return { ok: false as const, error: "Ese servicio no tiene un profesional asignado." };
  const staffFilter = staffPedido ? { staffId: staffPedido } : (staffActivos.length ? { staffId: { in: staffOfrecen.map((s) => s.id) } } : {});
  const [busy, hours] = await Promise.all([
    db.appointment.findMany({
      where: { status: { not: "CANCELADO" }, startsAt: { lte: localDate(data.date, 1439) }, endsAt: { gte: localDate(data.date, 0) }, ...staffFilter },
      select: { startsAt: true, endsAt: true },
    }),
    db.workingHour.findMany({ where: { active: true } }),
  ]);
  const capacity = staffPedido ? 1 : Math.max(1, staffActivos.length ? staffOfrecen.length : 1);
  const available = computeSlots({ date: data.date, durationMinutes: service.durationMinutes, hours, busy, rules: { ...profile, bookingLeadMinutes: 0 }, vacations, capacity });
  if (!available.includes(data.time)) return { ok: false as const, error: "Ese horario está ocupado o fuera de agenda. Elegí otro." };
  const [h = 0, m = 0] = data.time.split(":").map(Number);
  const startsAt = localDate(data.date, h * 60 + m);
  const endsAt = new Date(startsAt.getTime() + (service.durationMinutes + profile.bufferMinutes) * 60000);
  let staffAsignado: string | null;
  try { staffAsignado = await resolverStaff(tenant.id, staffOfrecen, staffPedido, startsAt, endsAt); }
  catch { return { ok: false as const, error: "Ese horario está ocupado. Elegí otro." }; }
  const tel = data.phone?.trim() ? normalizePhone(data.phone) : "";
  try {
    const appointment = await db.$transaction(async (tx) => {
      // Con teléfono: reutiliza/crea el cliente por número. Sin teléfono
      // (walk-in): crea uno nuevo con phone null (no hay clave por la que reusar).
      const existing = tel ? await tx.client.findFirst({
        where: { tenantId: tenant.id, phone: { in: phoneCandidates(data.phone ?? "") } },
      }) : null;
      const client = existing ?? await tx.client.create({
        data: { tenantId: tenant.id, name: data.name, phone: tel || null },
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
    await logError("manual_booking", error, undefined, tenant.id);
    return { ok: false as const, error: "No pudimos crear el turno. Probá de nuevo." };
  }
}

export async function setAppointmentStatus(id: string, status: "CONFIRMADO" | "ASISTIO" | "NO_VINO" | "CANCELADO") {
  await requireFeature("turnos");
  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/app");
}

export async function saveService(input: { id?: string; name: string; emoji: string; durationMinutes: number; priceCents: number; active?: boolean }) {
  // El primer servicio se crea antes de elegir el plan, dentro del onboarding.
  // Una vez operativo, vuelve a regir el gate normal de la suscripción.
  const tenant = await requireTurnosOrOnboarding();
  const parsed = serviceInputSchema.parse(input);
  if (parsed.id) await db.service.update({ where: { id: parsed.id }, data: parsed });
  else if (tenant.planStatus === "ONBOARDING") {
    // Idempotente: si el navegador se cerró después de guardar, reintentar el
    // paso actualiza el mismo servicio en vez de chocar con el nombre único.
    await systemDb.service.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: parsed.name } },
      update: { ...parsed, active: parsed.active ?? true },
      create: { tenantId: tenant.id, ...parsed, active: parsed.active ?? true },
    });
  } else await db.service.create({ data: { tenantId: tenant.id, ...parsed, active: parsed.active ?? true } });
  revalidatePath("/app");
}

export async function saveProfile(input: { name: string; phone?: string; address?: string; mapsUrl?: string; instagram?: string; accent: string }) {
  const tenant = await requireTurnosOrOnboarding();
  const parsed = profileInputSchema.parse(input);
  const mapsUrl = parsed.mapsUrl ? normalizeMapsUrl(parsed.mapsUrl) : null;
  if (parsed.mapsUrl && !mapsUrl) throw new Error("El enlace de Google Maps no es válido.");
  // Guardamos el usuario de Instagram normalizado (sin URL ni @); si es inválido, vacío.
  const data = {
    ...parsed,
    phone: parsed.phone?.trim() ? normalizePhone(parsed.phone) : null,
    mapsUrl,
    instagram: parsed.instagram ? (instagramHandle(parsed.instagram) ?? "") : "",
  };
  await db.businessProfile.upsert({ where: { tenantId: tenant.id }, update: data, create: { tenantId: tenant.id, ...data } });
  await db.tenant.update({ where: { id: tenant.id }, data: { name: input.name } });
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
}

// Logo del negocio: imagen chica como data URL (el cliente la redimensiona a
// ≤512px antes de mandar). null = quitar el logo.
export async function saveLogo(dataUrl: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await requireTurnosOrOnboarding();
  if (dataUrl !== null) {
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
      return { ok: false, error: "El logo tiene que ser una imagen PNG, JPG o WebP." };
    }
    if (dataUrl.length > 400_000) return { ok: false, error: "El logo es muy pesado. Probá con una imagen más chica." };
  }
  await db.businessProfile.update({ where: { tenantId: tenant.id }, data: { logoUrl: dataUrl } });
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// Aviso por email al dueño cada vez que entra una reserva (opt-in). Va al mail
// que elija, sin importar si el cliente cargó o no el suyo.
export async function saveNotifications(input: { notifyOnBooking: boolean; notifyEmail: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireFeature("email");
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

// ── Profesionales (multi_staff, plan Turnos Pro) ───────────────────────────
// Setea los servicios que ofrece un profesional (vacío = ofrece todos).
async function setStaffServicios(tenantId: string, staffId: string, serviceIds: string[]) {
  await db.staffService.deleteMany({ where: { staffId } });
  const validos = serviceIds.length
    ? await db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true } })
    : [];
  if (validos.length) await db.staffService.createMany({ data: validos.map((s) => ({ tenantId, staffId, serviceId: s.id })), skipDuplicates: true });
}

export async function saveStaff(input: { id?: string; name: string; emoji?: string; active?: boolean; serviceIds?: string[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  try { await requireFeature("multi_staff"); }
  catch { return { ok: false, error: "Los profesionales son parte de Turnos Pro o requieren una suscripción activa." }; }
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Poné el nombre del profesional." };
  let staffId = input.id;
  if (input.id) {
    await db.staff.update({ where: { id: input.id }, data: { name, emoji: input.emoji || undefined, ...(input.active === undefined ? {} : { active: input.active }) } });
  } else {
    const count = await db.staff.count();
    if (count >= MAX_STAFF) return { ok: false, error: `Con Turnos Pro podés cargar hasta ${MAX_STAFF} profesionales.` };
    const nuevo = await db.staff.create({ data: { tenantId: tenant.id, name, emoji: input.emoji || "💈", sortOrder: count } });
    staffId = nuevo.id;
  }
  if (input.serviceIds && staffId) await setStaffServicios(tenant.id, staffId, input.serviceIds);
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

export async function deleteStaff(id: string): Promise<{ ok: true }> {
  const tenant = await getCurrentTenant();
  await requireFeature("multi_staff");
  // Los turnos del profesional quedan sin asignar (staffId → null por la FK).
  await db.staff.delete({ where: { id } });
  revalidatePath("/app");
  revalidatePath(`/${tenant.slug}`);
  return { ok: true };
}

// Tema visual de la página pública (multi/temas, plan Turnos Pro).
const TEMAS_VALIDOS = ["clasico", "profesional", "noche"];
export async function saveTheme(theme: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getCurrentTenant();
  try { await requireFeature("temas"); }
  catch { return { ok: false, error: "Los temas son parte de Turnos Pro o requieren una suscripción activa." }; }
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
  const tenant = await requireTurnosOrOnboarding();
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

/** Intercambia el secreto de un magic link por una cookie HttpOnly y limpia la
 * URL en el cliente. El token está hasheado en DB y vence después del turno. */
export async function claimPublicAppointmentAccess(input: {
  slug: string;
  appointmentId: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.object({
    slug: z.string().min(1).max(40),
    appointmentId: z.string().min(10).max(80),
    token: z.string().min(20).max(128),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "El enlace no es válido." };
  const appointment = await systemDb.appointment.findFirst({
    where: { id: parsed.data.appointmentId, tenant: { slug: parsed.data.slug } },
    select: { id: true, startsAt: true, publicTokenHash: true, publicTokenExpiresAt: true },
  });
  if (!appointment?.publicTokenExpiresAt || appointment.publicTokenExpiresAt <= new Date()
    || !safeTokenEqual(parsed.data.token, appointment.publicTokenHash)) {
    return { ok: false, error: "El enlace venció o ya no es válido." };
  }
  await setPublicAppointmentCookie({
    appointmentId: appointment.id,
    slug: parsed.data.slug,
    token: parsed.data.token,
    expiresAt: appointment.publicTokenExpiresAt,
  });
  return { ok: true };
}

/**
 * Cancelación del turno POR EL CLIENTE desde la página pública. Se identifica
 * por una cookie por-turno (no por teléfono). Solo se permite hasta N horas antes,
 * con N configurable por el negocio (cancelWindowHours).
 */
export async function cancelPublicAppointment(slug: string, appointmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await systemDb.tenant.findUnique({ where: { slug }, include: { profile: true } });
  if (!tenant?.profile) return { ok: false, error: "El negocio no está disponible." };
  const cookieStore = await cookies();
  const token = cookieStore.get(publicAppointmentCookieName(appointmentId))?.value;
  if (!token) return { ok: false, error: "No encontramos tu reserva en este dispositivo." };
  const appt = await systemDb.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id } });
  if (!appt) return { ok: false, error: "Ese turno ya no existe." };
  if (!appt.publicTokenExpiresAt || appt.publicTokenExpiresAt <= new Date()
    || !safeTokenEqual(token, appt.publicTokenHash)) {
    return { ok: false, error: "No pudimos verificar que este turno sea tuyo." };
  }
  if (appt.status === "CANCELADO") return { ok: true };
  const windowH = Math.max(0, tenant.profile.cancelWindowHours ?? 48);
  if (windowH === 0) return { ok: false, error: "Este negocio no permite cancelar turnos online. Escribiles por WhatsApp para reprogramar." };
  const limite = new Date(appt.startsAt.getTime() - windowH * 3_600_000);
  if (new Date() > limite) return { ok: false, error: `Solo se puede cancelar hasta ${windowH} h antes del turno. Escribinos por WhatsApp para reprogramar.` };
  await systemDb.appointment.update({ where: { id: appt.id }, data: { status: "CANCELADO" } });
  cookieStore.set(publicAppointmentCookieName(appointmentId), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${slug}/turnos`,
    maxAge: 0,
  });
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
  await requireTurnosOrOnboarding();
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
  if (tenant.planStatus !== "ONBOARDING") await requireFeature("turnos");
  const parsed = profileInputSchema.extend({ businessType: z.string().trim().max(40).optional() }).parse(input);
  const mapsUrl = parsed.mapsUrl ? normalizeMapsUrl(parsed.mapsUrl) : null;
  if (parsed.mapsUrl && !mapsUrl) throw new Error("El enlace de Google Maps no es válido.");
  const data = {
    ...parsed,
    mapsUrl,
    phone: parsed.phone?.trim() ? normalizePhone(parsed.phone) : null,
    instagram: parsed.instagram ? (instagramHandle(parsed.instagram) ?? "") : "",
  };
  await Promise.all([
    db.businessProfile.upsert({ where: { tenantId: tenant.id }, update: data, create: { tenantId: tenant.id, ...data } }),
    db.tenant.update({
      where: { id: tenant.id },
      data: { name: data.name, ...(tenant.planStatus === "ONBOARDING" ? { onboardingStep: "servicio" } : {}) },
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
  const limpios = z.array(serviceInputSchema.omit({ id: true, active: true })).min(1).max(30).parse(services);
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
  const parsed = serviceInputSchema.parse(input);
  await Promise.all([
    parsed.id
      ? db.service.update({ where: { id: parsed.id }, data: parsed })
      : systemDb.service.upsert({
          // Idempotente: reintentar el paso actualiza el mismo servicio.
          where: { tenantId_name: { tenantId: tenant.id, name: parsed.name } },
          update: { ...parsed, active: true },
          create: { tenantId: tenant.id, ...parsed, active: true },
        }),
    tenant.planStatus === "ONBOARDING"
      ? db.tenant.update({ where: { id: tenant.id }, data: { onboardingStep: "plan" } })
      : Promise.resolve(),
  ]);
  revalidatePath("/onboarding");
  revalidatePath("/app");
}

export async function createPromotion(input: { serviceId?: string; name: string; addOnLabel: string; message: string; expiresAt: Date }) {
  await requireFeature("promos");
  const tenant = await getCurrentTenant();
  const parsed = z.object({
    serviceId: z.string().min(1).optional(),
    name: z.string().trim().min(2).max(80),
    addOnLabel: z.string().trim().min(1).max(100),
    message: z.string().trim().min(2).max(500),
    expiresAt: z.coerce.date().refine((date) => date > new Date()),
  }).parse(input);
  if (parsed.serviceId && !(await db.service.findFirst({ where: { id: parsed.serviceId }, select: { id: true } }))) {
    throw new Error("El servicio no pertenece a este negocio.");
  }
  const promotion = await db.promotion.create({ data: { tenantId: tenant.id, ...parsed, kind: "ADD_ON" } });
  revalidatePath("/app");
  return promotion.token;
}

export async function acceptWhatsappRisk() {
  await requireFeature("whatsapp_auto");
  const tenant = await getCurrentTenant();
  await db.tenant.update({ where: { id: tenant.id }, data: { whatsappRiskAcceptedAt: new Date(), whatsappRiskAcceptedBy: tenant.mpPayerEmail ?? "owner" } });
  await db.whatsappSession.upsert({ where: { tenantId: tenant.id }, update: { health: "QR_PENDING" }, create: { tenantId: tenant.id, health: "QR_PENDING" } });
  if (process.env.WA_SERVER_URL && process.env.WA_SERVER_TOKEN) {
    await fetch(`${process.env.WA_SERVER_URL}/link`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WA_SERVER_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id }),
      signal: AbortSignal.timeout(8_000),
    }).catch(async (error) => {
      console.error("[whatsapp] worker no disponible; se mantiene fallback wa.me", error);
      await logError("wa_worker", error, { flow: "accept_risk" }, tenant.id);
    });
  }
  revalidatePath("/app");
}

export async function queueGapFill(startLabel: string, endLabel: string, promoToken?: string) {
  await requireFeature("whatsapp_auto");
  const tenant = await getCurrentTenant();
  if (!tenant.whatsappRiskAcceptedAt) throw new Error("Aceptá primero el riesgo de la integración.");
  const [clients, promo] = await Promise.all([
    // Solo clientes con teléfono: el recupero se manda por WhatsApp.
    db.client.findMany({ where: { marketingConsent: true, phone: { not: null } }, include: { appointments: { where: { status: "ASISTIO" }, orderBy: { startsAt: "desc" }, take: 1 } } }),
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
    create: { kind: "HUECO", phone: normalizePhone(client.phone), scheduledAt: new Date(), idempotencyKey: `gap:${tenant.id}:${batch}:${client.id}`,
      body: `Hola ${client.name.split(" ")[0]} 👋 Se liberó un lugar de ${startLabel} a ${endLabel} en ${tenant.name}.${promo ? ` Además tenés esta promo: ${promo.name}.` : ""} Reservá tu lugar acá: ${link}` } as any,
  });
  return due.length;
}
