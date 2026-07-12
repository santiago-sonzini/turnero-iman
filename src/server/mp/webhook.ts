// Verificación y proceso de webhooks de Mercado Pago.
// NUNCA confiamos en la confirmación del lado del cliente: el estado del
// tenant SOLO cambia acá (webhook firmado) o tras verificar contra la API de
// MP server-side (retorno de autorización).
import { createHmac, timingSafeEqual } from "node:crypto";

import { systemDb } from "@/server/db";
import { DIAS_GRACIA } from "@/server/plans";
import { trackFor } from "@/server/track";
import {
  appUrl,
  obtenerPago,
  obtenerPagoAutorizado,
  obtenerSuscripcion,
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

async function tenantDePreapproval(pre: MpPreapproval): Promise<Tenant | null> {
  const porId = await systemDb.tenant.findUnique({
    where: { mpPreapprovalId: pre.id },
  });
  if (porId) return porId;
  if (pre.external_reference) {
    const porRef = await systemDb.tenant.findUnique({ where: { id: pre.external_reference } });
    if (porRef) return porRef;
  }
  // Plan compartido: el preapproval_plan_id NO distingue tenants (es el mismo
  // para todos los del tier), así que el fallback es el email del pagador.
  if (pre.payer_email) {
    return systemDb.tenant.findFirst({ where: { mpPayerEmail: pre.payer_email } });
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
    await sendEmail({ to, subject, html });
  } catch (e) {
    console.error("[email] bienvenida suscripción falló", e);
  }
}

/**
 * Sincroniza el estado del tenant desde una preapproval de MP (fuente de
 * verdad). Se usa desde el webhook Y desde el retorno de autorización.
 */
export async function sincronizarPreapproval(pre: MpPreapproval, tenantIdHint?: string): Promise<void> {
  // tenantIdHint: el retorno lo pasa con el tenant de la sesión, porque en un
  // plan compartido MP no propaga external_reference ni (para dinero en cuenta)
  // el email del pagador — así que el vínculo lo fija quien vuelve del checkout.
  const tenant = tenantIdHint
    ? await systemDb.tenant.findUnique({ where: { id: tenantIdHint } })
    : await tenantDePreapproval(pre);
  if (!tenant) {
    console.warn("[mp] preapproval sin tenant:", pre.id, pre.external_reference);
    return;
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
      // Autorizó el débito: si el trial sigue corriendo queda TRIALING (el
      // primer cobro llega en start_date); si no, ACTIVE. Recién acá se abre el
      // acceso del flujo con pago, así que damos por cerrado el onboarding.
      data.planStatus = enTrial ? "TRIALING" : "ACTIVE";
      data.graceUntil = null;
      data.onboardingStep = "listo";
      if (tenant.planStatus !== "ACTIVE" && tenant.planStatus !== "TRIALING") {
        await trackFor(tenant.id, "suscripcion_autorizada", { preapproval: pre.id });
        void enviarBienvenida(tenant); // primer alta: email de bienvenida (best-effort)
      }
      break;
    case "paused":
      data.planStatus = "PAST_DUE";
      data.graceUntil =
        tenant.graceUntil ?? new Date(ahora.getTime() + DIAS_GRACIA * 86_400_000);
      break;
    case "cancelled":
      data.planStatus = "CANCELLED";
      await trackFor(tenant.id, "suscripcion_cancelada", { preapproval: pre.id });
      break;
    case "pending":
      // Creada pero sin autorizar: no tocamos el estado (sigue en trial/onb).
      break;
  }

  await systemDb.tenant.update({ where: { id: tenant.id }, data: data as any });
}

async function aplicarResultadoPago(
  tenantId: string,
  aprobado: boolean,
  props: Record<string, unknown>
): Promise<void> {
  const ahora = new Date();
  if (aprobado) {
    await systemDb.tenant.update({
      where: { id: tenantId },
      data: { planStatus: "ACTIVE", mpLastPaymentAt: ahora, graceUntil: null },
    });
    await trackFor(tenantId, "pago_aprobado", props);
  } else {
    const tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
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

/** Procesa una notificación ya verificada. `tipo` = type|topic del payload. */
export async function procesarNotificacion(
  tipo: string,
  dataId: string
): Promise<void> {
  if (tipo === "subscription_preapproval") {
    const pre = await obtenerSuscripcion(dataId);
    await sincronizarPreapproval(pre);
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
      await aplicarResultadoPago(tenant.id, true, { cuota: cuota.id });
    } else if (estadoPago === "rejected") {
      await aplicarResultadoPago(tenant.id, false, { cuota: cuota.id });
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
    if (pago.status === "approved") {
      await aplicarResultadoPago(tenant.id, true, { pago: pago.id });
    } else if (pago.status === "rejected") {
      await aplicarResultadoPago(tenant.id, false, { pago: pago.id });
    }
  }
}
