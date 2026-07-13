import "server-only";

import { dateKeyAR } from "@/lib/format";
import { systemDb } from "@/server/db";
import { checkHealthLive, getUptime, HEALTH_SERVICES } from "@/server/observability/health";
import { accesoDe } from "@/server/plans";
import { requireFounder } from "./guard";
import { addMonthsAR, computeMrrBuckets, dayStartAR, monthStartAR, planPriceArs as priceArs } from "./math";

const DAY = 86_400_000;
const FUNNEL_STEPS = ["cuenta_creada", "plan_seleccionado", "suscripcion_iniciada", "suscripcion_autorizada", "pago_aprobado"] as const;

export async function getPlatformOverview() {
  await requireFounder();
  const now = new Date();
  const thisMonth = monthStartAR(now);
  const nextMonth = addMonthsAR(thisMonth, 1);
  const lastMonth = addMonthsAR(thisMonth, -1);
  const [groups, signupsThisMonth, signupsLastMonth, activeTrials, cancelling] = await Promise.all([
    systemDb.tenant.groupBy({ by: ["plan", "planStatus"], _count: true }),
    systemDb.tenant.count({ where: { createdAt: { gte: thisMonth, lt: nextMonth } } }),
    systemDb.tenant.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
    systemDb.tenant.groupBy({ by: ["plan"], where: { planStatus: "TRIALING", trialEndsAt: { gt: now } }, _count: true }),
    systemDb.tenant.groupBy({
      by: ["plan"], where: { planStatus: "CANCELLED", cancellationEffectiveAt: { gt: now } }, _count: true,
    }),
  ]);
  const normalized = groups.map((row) => ({ plan: row.plan, planStatus: row.planStatus, count: row._count }));
  const mrr = computeMrrBuckets(normalized);
  mrr.potentialArs = activeTrials.reduce((sum, row) => sum + priceArs(row.plan) * row._count, 0);
  mrr.cancellingArs = cancelling.reduce((sum, row) => sum + priceArs(row.plan) * row._count, 0);
  return {
    ...mrr,
    signupsThisMonth,
    signupsLastMonth,
    signupDeltaPct: signupsLastMonth ? Math.round(((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100) : null,
    statusCounts: Object.fromEntries(groups.map((row) => [row.planStatus, (normalized.filter((g) => g.planStatus === row.planStatus).reduce((s, g) => s + g.count, 0))])),
  };
}

export async function getRatios(windowDays = 90) {
  await requireFounder();
  const since = new Date(Date.now() - windowDays * DAY);
  const rows = await systemDb.funnelEvent.findMany({ where: { createdAt: { gte: since } }, select: { tenantId: true, event: true } });
  const tenants = (event: string) => new Set(rows.filter((row) => row.event === event).map((row) => row.tenantId));
  const created = tenants("cuenta_creada").size;
  const authorized = tenants("suscripcion_autorizada").size;
  const started = tenants("suscripcion_iniciada").size;
  const approved = rows.filter((row) => row.event === "pago_aprobado").length;
  const rejected = rows.filter((row) => row.event === "pago_rechazado").length;
  const cancels = tenants("suscripcion_cancelada").size;
  const active = await systemDb.tenant.count({ where: { planStatus: "ACTIVE" } });
  return {
    conversionPct: created ? Math.round((tenants("pago_aprobado").size / created) * 1000) / 10 : null,
    authorizePct: started ? Math.round((authorized / started) * 1000) / 10 : null,
    paymentApprovalPct: approved + rejected ? Math.round((approved / (approved + rejected)) * 1000) / 10 : null,
    churnPct: active + cancels ? Math.round((cancels / (active + cancels)) * 1000) / 10 : null,
    churnCount: cancels,
    windowDays,
  };
}

export async function getSignupSeries(days = 90) {
  await requireFounder();
  const since = dayStartAR(new Date(Date.now() - (days - 1) * DAY));
  const rows = await systemDb.tenant.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(dateKeyAR(row.createdAt), (counts.get(dateKeyAR(row.createdAt)) ?? 0) + 1);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since.getTime() + index * DAY);
    const key = dateKeyAR(date);
    return { date: key, label: date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "America/Argentina/Buenos_Aires" }), altas: counts.get(key) ?? 0 };
  });
}

export async function getFunnel(windowDays = 90) {
  await requireFounder();
  const since = new Date(Date.now() - windowDays * DAY);
  const rows = await systemDb.funnelEvent.findMany({ where: { createdAt: { gte: since }, event: { in: [...FUNNEL_STEPS] } }, select: { tenantId: true, event: true } });
  return FUNNEL_STEPS.map((event, index) => {
    const count = new Set(rows.filter((row) => row.event === event).map((row) => row.tenantId)).size;
    const previousEvent = FUNNEL_STEPS[index - 1];
    const previous = previousEvent ? new Set(rows.filter((row) => row.event === previousEvent).map((row) => row.tenantId)).size : count;
    return { event, count, stepPct: previous ? Math.round((count / previous) * 1000) / 10 : null };
  });
}

export async function getLifecycle() {
  await requireFounder();
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * DAY);
  const recent = new Date(now.getTime() - 30 * DAY);
  const select = { id: true, name: true, slug: true, trialEndsAt: true, cancellationEffectiveAt: true } as const;
  const [trialsEnding, trialQuits, subscriptionsEnding, recentlyEnded] = await Promise.all([
    systemDb.tenant.findMany({ where: { planStatus: "TRIALING", trialEndsAt: { gte: now, lte: soon } }, select, orderBy: { trialEndsAt: "asc" }, take: 12 }),
    systemDb.tenant.findMany({ where: { planStatus: "TRIALING", trialEndsAt: { lt: now } }, select, orderBy: { trialEndsAt: "desc" }, take: 12 }),
    systemDb.tenant.findMany({ where: { planStatus: "CANCELLED", cancellationEffectiveAt: { gte: now } }, select, orderBy: { cancellationEffectiveAt: "asc" }, take: 12 }),
    systemDb.tenant.findMany({ where: { planStatus: "CANCELLED", cancellationEffectiveAt: { gte: recent, lt: now } }, select, orderBy: { cancellationEffectiveAt: "desc" }, take: 8 }),
  ]);
  const serialize = (rows: typeof trialsEnding) => rows.map((row) => ({ ...row, trialEndsAt: row.trialEndsAt?.toISOString() ?? null, cancellationEffectiveAt: row.cancellationEffectiveAt?.toISOString() ?? null }));
  return { trialsEnding: serialize(trialsEnding), trialQuits: serialize(trialQuits), subscriptionsEnding: serialize(subscriptionsEnding), recentlyEnded: serialize(recentlyEnded) };
}

export async function getRecentActivity(limit = 40) {
  await requireFounder();
  const [events, signups] = await Promise.all([
    systemDb.funnelEvent.findMany({ include: { tenant: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: limit }),
    systemDb.tenant.findMany({ select: { id: true, name: true, slug: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 20) }),
  ]);
  return [
    ...events.map((row) => ({ id: row.id, event: row.event, tenantName: row.tenant.name, slug: row.tenant.slug, createdAt: row.createdAt.toISOString() })),
    ...signups.map((row) => ({ id: `signup-${row.id}`, event: "negocio_creado", tenantName: row.name, slug: row.slug, createdAt: row.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function getMessagingStats() {
  await requireFounder();
  const since = monthStartAR();
  const [emailsOk, emailsFailed, whatsappSent, whatsappFallback] = await Promise.all([
    systemDb.emailLog.count({ where: { createdAt: { gte: since }, ok: true } }),
    systemDb.emailLog.count({ where: { createdAt: { gte: since }, ok: false } }),
    systemDb.messageJob.count({ where: { createdAt: { gte: since }, status: "SENT" } }),
    systemDb.messageJob.count({ where: { createdAt: { gte: since }, status: "FALLBACK" } }),
  ]);
  return { emailsOk, emailsFailed, whatsappSent, whatsappFallback };
}

export async function getIssues() {
  await requireFounder();
  const since = new Date(Date.now() - 30 * DAY);
  const stuckBefore = new Date(Date.now() - 5 * 60_000);
  const [errors, whatsappFallback, unhealthyWhatsapp, stuckWebhooks, rejectedPayments] = await Promise.all([
    systemDb.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    systemDb.messageJob.count({ where: { status: "FALLBACK", createdAt: { gte: since } } }),
    systemDb.whatsappSession.count({ where: { health: { in: ["DEGRADED", "BANNED", "DISCONNECTED"] } } }),
    systemDb.webhookEvent.count({ where: { processedAt: null, createdAt: { lt: stuckBefore } } }),
    systemDb.funnelEvent.count({ where: { event: "pago_rechazado", createdAt: { gte: monthStartAR() } } }),
  ]);
  return {
    whatsappFallback, unhealthyWhatsapp, stuckWebhooks, rejectedPayments,
    errors: errors.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), meta: row.meta as Record<string, unknown> | null })),
  };
}

export async function getHealthPanel() {
  await requireFounder();
  const [live, uptime24h, uptime7d, uptime30d] = await Promise.all([
    checkHealthLive(),
    getUptime(new Date(Date.now() - DAY)),
    getUptime(new Date(Date.now() - 7 * DAY)),
    getUptime(new Date(Date.now() - 30 * DAY)),
  ]);
  return { live, uptime24h, uptime7d, uptime30d, services: HEALTH_SERVICES };
}

export async function listTenants() {
  await requireFounder();
  const now = new Date();
  const rows = await systemDb.tenant.findMany({ include: { _count: { select: { appointments: true, clients: true } } }, orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    planStatus: row.planStatus,
    access: accesoDe(row, now).estado,
    mrrArs: row.planStatus === "ACTIVE" ? priceArs(row.plan) : 0,
    createdAt: row.createdAt.toISOString(),
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    graceUntil: row.graceUntil?.toISOString() ?? null,
    cancellationEffectiveAt: row.cancellationEffectiveAt?.toISOString() ?? null,
    mpLastPaymentAt: row.mpLastPaymentAt?.toISOString() ?? null,
    mpPayerEmail: row.mpPayerEmail,
    appointments: row._count.appointments,
    clients: row._count.clients,
  }));
}

export const ADMIN_APPOINTMENTS_PAGE_SIZE = 20;

export async function getTenantDetail(slug: string, requestedPage = 1) {
  await requireFounder();
  const now = new Date();
  const tenant = await systemDb.tenant.findUnique({
    where: { slug },
    include: {
      profile: true,
      users: { orderBy: { createdAt: "asc" } },
      services: {
        orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { appointments: true } } },
      },
      staff: {
        orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { appointments: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      },
      workingHours: { orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] },
      clients: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: { _count: { select: { appointments: true } } },
      },
      promotions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { service: { select: { name: true } } },
      },
      whatsappSession: true,
      _count: {
        select: {
          appointments: true,
          clients: true,
          services: true,
          staff: true,
          promotions: true,
          messageJobs: true,
        },
      },
    },
  });
  if (!tenant) return null;

  const totalPages = Math.max(1, Math.ceil(tenant._count.appointments / ADMIN_APPOINTMENTS_PAGE_SIZE));
  const page = Math.min(Math.max(Math.trunc(requestedPage) || 1, 1), totalPages);
  const [appointments, statusRows, upcomingAppointments, messageRows, recentEmails, recentErrors] = await Promise.all([
    systemDb.appointment.findMany({
      where: { tenantId: tenant.id },
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * ADMIN_APPOINTMENTS_PAGE_SIZE,
      take: ADMIN_APPOINTMENTS_PAGE_SIZE,
      include: {
        client: true,
        service: true,
        staff: true,
        promotion: { select: { name: true } },
      },
    }),
    systemDb.appointment.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: true,
    }),
    systemDb.appointment.count({
      where: { tenantId: tenant.id, startsAt: { gte: now }, status: { not: "CANCELADO" } },
    }),
    systemDb.messageJob.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: true,
    }),
    systemDb.emailLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    systemDb.errorLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    tenant,
    appointments,
    page,
    totalPages,
    upcomingAppointments,
    appointmentStatusCounts: Object.fromEntries(statusRows.map((row) => [row.status, row._count])),
    messageStatusCounts: Object.fromEntries(messageRows.map((row) => [row.status, row._count])),
    recentEmails,
    recentErrors,
    access: accesoDe(tenant, now),
    mrrArs: tenant.planStatus === "ACTIVE" ? priceArs(tenant.plan) : 0,
  };
}
