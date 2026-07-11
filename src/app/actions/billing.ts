"use server";
// Ciclo de vida de la suscripción del tenant (Mercado Pago preapproval).
// La verdad del estado la escriben los webhooks (src/server/mp/webhook.ts);
// acá solo se crea/cambia/cancela y se refleja lo verificado contra la API.
import { db, DEMO_MODE } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { DIAS_TRIAL, PLANES, accesoDe, formatoArs } from "@/server/plans";
import {
  actualizarMonto,
  cancelarSuscripcionMp,
  crearSuscripcion,
  mpConfigurado,
  obtenerSuscripcion,
} from "@/server/mp/preapproval";
import { sincronizarPreapproval } from "@/server/mp/webhook";
import { track } from "@/server/track";
import getUserServer from "@/lib/user";
import type { PlanTier } from "@prisma/client";

export type ResultadoPlan =
  | { ok: true; initPoint: string | null }
  | { ok: false; error: string };

/**
 * Selección de plan al final del onboarding (o cambio desde /suscripcion).
 * Arranca el trial de 7 días y, si MP está configurado y el usuario quiere
 * dejar el débito listo, crea la preapproval y devuelve el init_point para
 * redirigir a Mercado Pago (el primer cobro es al terminar el trial).
 */
export async function elegirPlan(
  tier: PlanTier,
  opciones?: { conPago?: boolean }
): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const plan = PLANES[tier];
  const ahora = new Date();
  const finTrial =
    tenant.trialEndsAt && tenant.trialEndsAt > ahora
      ? tenant.trialEndsAt
      : new Date(ahora.getTime() + DIAS_TRIAL * 86_400_000);

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: tier,
      planStatus:
        tenant.planStatus === "ONBOARDING" || tenant.planStatus === "TRIALING"
          ? "TRIALING"
          : tenant.planStatus,
      trialEndsAt: finTrial,
      onboardingStep: "listo",
    },
  });
  await track("plan_seleccionado", { plan: tier });

  if (!opciones?.conPago || !mpConfigurado() || DEMO_MODE) {
    return { ok: true, initPoint: null };
  }

  return crearPreapprovalParaTenant(tier, finTrial);
}

/** Crea (o recupera) la preapproval y devuelve el init_point de MP. */
export async function activarPago(): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  if (!tenant.plan) return { ok: false, error: "Elegí un plan primero." };
  if (!mpConfigurado())
    return { ok: false, error: "Mercado Pago no está configurado todavía." };

  // Ya hay una suscripción: devolvemos su init_point (sirve para reintentar
  // el pago o volver a autorizar).
  if (tenant.mpPreapprovalId) {
    try {
      const pre = await obtenerSuscripcion(tenant.mpPreapprovalId);
      if (pre.status !== "cancelled")
        return { ok: true, initPoint: pre.init_point };
    } catch (e) {
      console.error("[mp] no se pudo recuperar la preapproval", e);
    }
  }

  const ahora = new Date();
  const finTrial =
    tenant.trialEndsAt && tenant.trialEndsAt > ahora
      ? tenant.trialEndsAt
      : new Date(ahora.getTime() + 10 * 60_000); // sin trial: primer débito ya
  return crearPreapprovalParaTenant(tenant.plan, finTrial);
}

async function crearPreapprovalParaTenant(
  tier: PlanTier,
  primerDebito: Date
): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const plan = PLANES[tier];
  if (!plan.precioArs) return { ok: false, error: "Plan sin precio online." };

  const usuario = await getUserServer();
  const email = tenant.mpPayerEmail ?? usuario?.user.email;
  if (!email) return { ok: false, error: "No hay email para facturar." };

  try {
    const pre = await crearSuscripcion({
      tenantId: tenant.id,
      payerEmail: email,
      razon: `Imán — Plan ${plan.nombre} (${formatoArs(plan.precioArs)}/mes)`,
      montoArs: plan.precioArs,
      inicio: primerDebito,
    });
    await db.tenant.update({
      where: { id: tenant.id },
      data: { mpPreapprovalId: pre.id, mpPayerEmail: email },
    });
    await track("suscripcion_iniciada", { plan: tier, preapproval: pre.id });
    return { ok: true, initPoint: pre.init_point };
  } catch (e: any) {
    console.error("[mp] error creando preapproval", e);
    return {
      ok: false,
      error: "No pudimos iniciar la suscripción en Mercado Pago. Probá de nuevo.",
    };
  }
}

/**
 * Upgrade/downgrade: actualiza el monto del débito en MP. El monto nuevo rige
 * desde el PRÓXIMO ciclo (comportamiento de MP, sin prorrateo); el acceso a
 * las features del plan nuevo es inmediato.
 */
export async function cambiarPlan(nuevo: PlanTier): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const plan = PLANES[nuevo];

  if (tenant.mpPreapprovalId && plan.precioArs && mpConfigurado()) {
    try {
      await actualizarMonto(tenant.mpPreapprovalId, plan.precioArs);
    } catch (e) {
      console.error("[mp] error actualizando monto", e);
      return { ok: false, error: "Mercado Pago rechazó el cambio. Probá de nuevo." };
    }
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: { plan: nuevo },
  });
  await track("plan_seleccionado", { plan: nuevo, cambio: true });
  return { ok: true, initPoint: null };
}

/** Cancela el débito en MP y bloquea features pagas. Los datos NO se tocan. */
export async function cancelarSuscripcion(): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();

  if (tenant.mpPreapprovalId && mpConfigurado()) {
    try {
      await cancelarSuscripcionMp(tenant.mpPreapprovalId);
    } catch (e) {
      console.error("[mp] error cancelando", e);
      return { ok: false, error: "No se pudo cancelar en Mercado Pago." };
    }
  }
  await db.tenant.update({
    where: { id: tenant.id },
    data: { planStatus: "CANCELLED" },
  });
  await track("suscripcion_cancelada", { manual: true });
  return { ok: true, initPoint: null };
}

/**
 * Retorno desde MP (back_url): verifica la preapproval CONTRA LA API (nunca
 * el query string del navegador) y sincroniza el tenant. Devuelve si la
 * preapproval es válida y de ESTE tenant (nada de redirect(): la página del
 * retorno la llama dentro de un try/catch que se lo tragaría).
 */
export async function confirmarRetorno(preapprovalId: string): Promise<boolean> {
  const tenant = await getCurrentTenant();
  const pre = await obtenerSuscripcion(preapprovalId);
  // Solo aceptamos preapprovals que referencian a ESTE tenant.
  if (pre.external_reference !== tenant.id) {
    console.warn("[mp] retorno con preapproval ajena", preapprovalId, tenant.id);
    return false;
  }
  await sincronizarPreapproval(pre);
  return true;
}
