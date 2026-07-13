// Verificación y proceso de webhooks de Mercado Pago.
// NUNCA confiamos en la confirmación del lado del cliente: el estado del
// tenant SOLO cambia acá (webhook firmado) o tras verificar contra la API de
// MP server-side (retorno de autorización).
import { createHmac, timingSafeEqual } from "node:crypto";

import { systemDb } from "@/server/db";
import { DIAS_GRACIA, finPeriodoSuscripcion } from "@/server/plans";
import { trackFor } from "@/server/track";
import { logError } from "@/server/observability/log";
import {
  appUrl,
  buscarPagosAutorizados,
  obtenerPago,
  obtenerPagoAutorizado,
  obtenerSuscripcion,
  suscripcionCancelada,
  type MpPreapproval,
} from "./preapproval";
import type { Tenant } from "@prisma/client";

/**
 * Valida el header x-signature (ts=...,v1=...) contra la firma secreta del
 * panel de webhooks. Manifest oficial: `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * (data.id en minúsculas si es alfanumérico; partes ausentes se omiten).
 */
export function verificarFirma(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secreto: string;
  nowMs?: number;
}): boolean {
  const { xSignature, xRequestId, dataId, secreto } = params;
  if (!xSignature) return false;

  const partes = new Map<string, string>();
  for (const parte of xSignature.split(",")) {
    const [k, v] = parte.split("=", 2);
    if (k && v) partes.set(k.trim(), v.trim());
  }
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;
  const rawTimestamp = Number(ts);
  if (!Number.isFinite(rawTimestamp)) return false;
  const timestampMs = rawTimestamp > 1_000_000_000_000 ? rawTimestamp : rawTimestamp * 1_000;
  if (Math.abs((params.nowMs ?? Date.now()) - timestampMs) > 10 * 60_000) return false;

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const esperado = createHmac("sha256", secreto).update(manifest).digest("hex");
  try {
    return timingSafeEqual(
      new Uint8Array(Buffer.from(esperado)),
      new Uint8Array(Buffer.from(v1))
    );
  } catch {
    return false;
  }
}

export function preapprovalPerteneceATenant(
  pre: Pick<MpPreapproval, "id" | "external_reference">,
  tenant: Pick<Tenant, "id" | "mpPreapprovalId">,
): boolean {
  return pre.external_reference === tenant.id
    && (!tenant.mpPreapprovalId || tenant.mpPreapprovalId === pre.id);
}

async function tenantDePreapproval(pre: MpPreapproval): Promise<Tenant | null> {
  if (!pre.preapproval_plan_id) return null;
  const planPropio = await systemDb.mpPlan.findUnique({
    where: { mpPlanId: pre.preapproval_plan_id },
    select: { mpPlanId: true },
  });
  if (!planPropio) return null;

  const porId = await systemDb.tenant.findUnique({
    where: { mpPreapprovalId: pre.id },
  });
  if (porId && preapprovalPerteneceATenant(pre, porId)) return porId;
  if (pre.external_reference) {
    const porRef = await systemDb.tenant.findUnique({ where: { id: pre.external_reference } });
    if (porRef && preapprovalPerteneceATenant(pre, porRef)) return porRef;
  }
  return null;
}

// Email de bienvenida al dueño cuando su suscripción queda activa por primera
// vez. Best-effort: si no hay SMTP o no encontramos su email, se saltea.
async function enviarBienvenida(tenant: Tenant): Promise<void> {
  try {
    const { emailConfigurado, sendEmail } = await import("@/lib/mailer");
    if (!(await emailConfigurado())) return;
    const usuario = await systemDb.user.findFirst({ where: { tenantId: tenant.id }, select: { email: true } });
    const to = usuario?.email || tenant.mpPayerEmail;
    if (!to) return;
    const profile = await systemDb.businessProfile.findUnique({ where: { tenantId: tenant.id }, select: { accent: true } });
    const { emailBienvenidaSuscripcion } = await import("@/lib/emails");
    const { subject, html } = emailBienvenidaSuscripcion({ negocio: tenant.name, accent: profile?.accent, panelUrl: `${appUrl()}/app` });
    await sendEmail({ to, subject, html, tenantId: tenant.id, template: "bienvenida_suscripcion" });
  } catch (e) {
    console.error("[email] bienvenida suscripción falló", e);
  }
}

/**
 * Sincroniza el estado del tenant desde una preapproval de MP (fuente de
 * verdad). Se usa desde el webhook Y desde el retorno de autorización.
 */
export async function sincronizarPreapproval(pre: MpPreapproval): Promise<boolean> {
  const tenant = await tenantDePreapproval(pre);
  if (!tenant) {
    if (pre.external_reference && suscripcionCancelada(pre)) {
      const owner = await systemDb.tenant.findUnique({
        where: { id: pre.external_reference },
        select: { mpPreapprovalId: true },
      });
      // Una preapproval duplicada ya cancelada no debe reabrir ni ensuciar el
      // tenant canónico, pero sí puede darse por procesada.
      if (owner?.mpPreapprovalId && owner.mpPreapprovalId !== pre.id) return true;
    }
    console.warn("[mp] preapproval sin tenant:", pre.id, pre.external_reference);
    return false;
  }

  const ahora = new Date();
  const enTrial = !!tenant.trialEndsAt && tenant.trialEndsAt > ahora;

  const data: Record<string, unknown> = {
    mpPreapprovalId: pre.id,
    // || y no ??: MP suele devolver payer_email como string vacío.
    mpPayerEmail: pre.payer_email || tenant.mpPayerEmail,
  };

  switch (pre.status) {
    case "authorized":
      // Un webhook anterior a la baja puede llegar tarde. Si se trata de la
      // misma suscripción que el dueño canceló localmente, no la reactivamos.
      if (
        tenant.planStatus === "CANCELLED" &&
        tenant.cancellationEffectiveAt &&
        tenant.mpPreapprovalId === pre.id
      ) break;
      // "authorized" confirma el mandato de débito, NO un pago. Durante el
      // trial habilitamos acceso; fuera del trial solo un pago aprobado permite
      // ACTIVE. La reconciliación de facturas corrige PAST_DUE si ya cobró.
      data.planStatus = enTrial
        ? "TRIALING"
        : "PAST_DUE";
      data.graceUntil = null;
      if (!enTrial) {
        data.graceUntil = tenant.graceUntil ?? new Date(ahora.getTime() + DIAS_GRACIA * 86_400_000);
      }
      data.cancellationEffectiveAt = null;
      data.mpCancellationPending = false;
      data.onboardingStep = "listo";
      if (tenant.planStatus !== "ACTIVE" && tenant.planStatus !== "TRIALING") {
        await trackFor(tenant.id, "suscripcion_autorizada", { preapproval: pre.id });
        await enviarBienvenida(tenant);
      }
      break;
    case "paused":
      data.planStatus = "PAST_DUE";
      data.graceUntil =
        tenant.graceUntil ?? new Date(ahora.getTime() + DIAS_GRACIA * 86_400_000);
      break;
    case "cancelled":
    case "canceled":
      data.planStatus = "CANCELLED";
      data.mpCancellationPending = false;
      if (!tenant.cancellationEffectiveAt) {
        const proximoCobro = pre.next_payment_date ? new Date(pre.next_payment_date) : null;
        data.cancellationEffectiveAt =
          proximoCobro && !Number.isNaN(proximoCobro.getTime()) && proximoCobro > ahora
            ? proximoCobro
            : finPeriodoSuscripcion(tenant, ahora);
      }
      await trackFor(tenant.id, "suscripcion_cancelada", { preapproval: pre.id });
      break;
    case "pending":
      // Creada pero sin autorizar: no tocamos el estado (sigue en trial/onb).
      break;
  }

  await systemDb.tenant.update({ where: { id: tenant.id }, data: data as any });
  return true;
}

async function aplicarResultadoPago(
  tenantId: string,
  preapprovalId: string,
  aprobado: boolean,
  props: Record<string, unknown>,
  occurredAt?: Date,
): Promise<void> {
  const ahora = occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt : new Date();
  if (aprobado) {
    const tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
    if (
      tenant?.mpLastPaymentPreapprovalId === preapprovalId
      && tenant.mpLastPaymentAt
      && tenant.mpLastPaymentAt >= ahora
    ) return;
    // Un pago/webhook demorado no debe deshacer una baja solicitada. Guardamos
    // el pago para auditoría pero mantenemos CANCELLED y su fecha efectiva.
    const bajaProgramada = tenant?.planStatus === "CANCELLED" && !!tenant.cancellationEffectiveAt;
    await systemDb.tenant.update({
      where: { id: tenantId },
      data: bajaProgramada
        ? { mpLastPaymentAt: ahora, mpLastPaymentPreapprovalId: preapprovalId }
        : { planStatus: "ACTIVE", mpLastPaymentAt: ahora, mpLastPaymentPreapprovalId: preapprovalId, graceUntil: null },
    });
    await trackFor(tenantId, "pago_aprobado", props);
  } else {
    const tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.planStatus === "CANCELLED") {
      await trackFor(tenantId, "pago_rechazado", { ...props, baja_programada: true });
      return;
    }
    await systemDb.tenant.update({
      where: { id: tenantId },
      data: {
        planStatus: "PAST_DUE",
        graceUntil:
          tenant?.graceUntil ?? new Date(ahora.getTime() + DIAS_GRACIA * 86_400_000),
      },
    });
    await trackFor(tenantId, "pago_rechazado", props);
  }
}

/**
 * Consulta las facturas reales de la preapproval. `authorized` por sí solo no
 * alcanza: paid=true únicamente si la factura/pago asociado está aprobado.
 */
export async function reconciliarPagosSuscripcion(
  tenantId: string,
  preapprovalId: string,
): Promise<{ paid: boolean; lastPaymentAt: Date | null }> {
  const tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.mpPreapprovalId !== preapprovalId) {
    return { paid: false, lastPaymentAt: null };
  }
  const invoices = await buscarPagosAutorizados(preapprovalId);
  const ordered = invoices.sort((a, b) => {
    const ad = Date.parse(a.payment?.date_approved ?? a.last_modified ?? a.date_created ?? "") || 0;
    const bd = Date.parse(b.payment?.date_approved ?? b.last_modified ?? b.date_created ?? "") || 0;
    return bd - ad;
  });
  const approved = facturaAprobada(ordered);
  if (approved) {
    let occurredAt = new Date(
      approved.payment?.date_approved ?? approved.last_modified ?? approved.date_created ?? Date.now(),
    );
    if (approved.payment?.id) {
      try {
        const payment = await obtenerPago(String(approved.payment.id));
        if (payment.status !== "approved") return { paid: false, lastPaymentAt: null };
        if (payment.date_approved) occurredAt = new Date(payment.date_approved);
      } catch (error) {
        console.error("[mp] no se pudo verificar el pago asociado a la factura", approved.id, error);
        await logError("mp_webhook", error, { approvedPaymentId: approved.id }, tenantId);
        return { paid: false, lastPaymentAt: null };
      }
    }
    if (Number.isNaN(occurredAt.getTime())) occurredAt = new Date();
    await aplicarResultadoPago(tenantId, preapprovalId, true, { cuota: approved.id, reconciliado: true }, occurredAt);
    return { paid: true, lastPaymentAt: occurredAt };
  }

  const rejected = ordered[0]?.payment?.status === "rejected" ? ordered[0] : undefined;
  if (rejected) {
    await aplicarResultadoPago(tenantId, preapprovalId, false, { cuota: rejected.id, reconciliado: true });
  }
  return { paid: false, lastPaymentAt: null };
}

export function facturaAprobada(invoices: Awaited<ReturnType<typeof buscarPagosAutorizados>>) {
  return invoices.find((invoice) => invoice.payment?.status === "approved");
}

/** Procesa una notificación ya verificada. `tipo` = type|topic del payload. */
export async function procesarNotificacion(
  tipo: string,
  dataId: string
): Promise<void> {
  if (tipo === "subscription_preapproval") {
    const pre = await obtenerSuscripcion(dataId);
    if (!(await sincronizarPreapproval(pre))) {
      throw new Error(`Preapproval ${pre.id} todavía no vinculada`);
    }
    return;
  }

  if (tipo === "subscription_authorized_payment") {
    // Cuota recurrente de la suscripción (creación/actualización).
    const cuota = await obtenerPagoAutorizado(dataId);
    const preId = cuota.preapproval_id;
    if (!preId) return;
    const pre = await obtenerSuscripcion(preId);
    const tenant = await tenantDePreapproval(pre);
    if (!tenant) return;

    const estadoPago = cuota.payment?.status ?? cuota.status;
    if (estadoPago === "approved" || estadoPago === "processed") {
      const paidAt = cuota.payment?.date_approved ? new Date(cuota.payment.date_approved) : undefined;
      await aplicarResultadoPago(tenant.id, preId, true, { cuota: cuota.id }, paidAt);
    } else if (estadoPago === "rejected") {
      await aplicarResultadoPago(tenant.id, preId, false, { cuota: cuota.id });
    }
    return;
  }

  if (tipo === "payment") {
    // Pago suelto: solo nos interesa si referencia a un tenant nuestro.
    const pago = await obtenerPago(dataId);
    const ref = pago.external_reference ?? pago.metadata?.preapproval_id;
    if (!ref) return;
    const tenant =
      (await systemDb.tenant.findUnique({ where: { id: ref } })) ??
      (await systemDb.tenant.findUnique({ where: { mpPreapprovalId: ref } }));
    if (!tenant) return;
    const paymentPreapprovalId = pago.metadata?.preapproval_id
      ?? (ref === tenant.mpPreapprovalId ? ref : tenant.mpPreapprovalId);
    if (!paymentPreapprovalId || paymentPreapprovalId !== tenant.mpPreapprovalId) return;
    if (pago.status === "approved") {
      await aplicarResultadoPago(tenant.id, paymentPreapprovalId, true, { pago: pago.id }, pago.date_approved ? new Date(pago.date_approved) : undefined);
    } else if (pago.status === "rejected") {
      await aplicarResultadoPago(tenant.id, paymentPreapprovalId, false, { pago: pago.id });
    }
  }
}
