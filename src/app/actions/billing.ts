"use server";
// Ciclo de vida de la suscripción del tenant (Mercado Pago preapproval).
// La verdad del estado la escriben los webhooks (src/server/mp/webhook.ts);
// acá solo se crea/cambia/cancela y se refleja lo verificado contra la API.
import { db, systemDb, DEMO_MODE } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { DIAS_TRIAL, PLANES, finPeriodoSuscripcion, formatoArs } from "@/server/plans";
import {
  actualizarMonto,
  appUrl,
  cancelarSuscripcionMp,
  crearPlanCompartido,
  mpConfigurado,
  obtenerPlan,
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
  const ahora = new Date();
  const finTrial =
    tenant.trialEndsAt && tenant.trialEndsAt > ahora
      ? tenant.trialEndsAt
      : new Date(ahora.getTime() + DIAS_TRIAL * 86_400_000);

  // "Con pago" real: hay que dejar el débito autorizado en MP. En ese caso NO
  // habilitamos el acceso todavía: el tenant sigue en ONBOARDING hasta que MP
  // confirme la autorización (webhook o retorno → sincronizarPreapproval lo
  // pasa a TRIALING). Sin pago (MP sin configurar / demo) el trial arranca ya.
  const conPago = !!opciones?.conPago && mpConfigurado() && !DEMO_MODE;

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: tier,
      trialEndsAt: finTrial,
      // El acceso solo se abre por la vía sin pago; la vía con pago espera a MP.
      ...(conPago
        ? {}
        : {
            planStatus:
              tenant.planStatus === "ONBOARDING" || tenant.planStatus === "TRIALING"
                ? "TRIALING"
                : tenant.planStatus,
            onboardingStep: "listo",
          }),
    },
  });
  await track("plan_seleccionado", { plan: tier });

  if (!conPago) {
    return { ok: true, initPoint: null };
  }

  return suscribirTenant(tier);
}

/** Recupera (o crea la primera vez) el init_point de la suscripción del tenant. */
export async function activarPago(): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  if (!tenant.plan) return { ok: false, error: "Elegí un plan primero." };
  if (!mpConfigurado())
    return { ok: false, error: "Mercado Pago no está configurado todavía." };

  // Ya autorizó una suscripción: devolvemos su init_point (para gestionarla).
  if (tenant.mpPreapprovalId) {
    try {
      const pre = await obtenerSuscripcion(tenant.mpPreapprovalId);
      if (pre.status !== "cancelled") return { ok: true, initPoint: pre.init_point };
    } catch (e) {
      console.error("[mp] no se pudo recuperar la preapproval", e);
    }
  }

  return suscribirTenant(tenant.plan);
}

/**
 * Plan COMPARTIDO del tier: se crea una sola plantilla por plan y se cachea en
 * la tabla MpPlan; todos los tenants suscriben sobre la misma (antes se creaba
 * un plan por cliente). Devuelve su init_point.
 */
async function planCompartidoInitPoint(tier: PlanTier): Promise<string> {
  const plan = PLANES[tier];
  const backUrl = `${appUrl()}/suscripcion/retorno`;
  const guardado = await systemDb.mpPlan.findUnique({ where: { tier } });
  if (guardado && guardado.amountArs === plan.precioArs) {
    try {
      const mp = await obtenerPlan(guardado.mpPlanId);
      // Recreamos si cambió la URL pública: el back_url queda grabado en el plan,
      // así que un plan viejo redirigiría al dominio anterior tras autorizar.
      if (mp.status !== "cancelled" && mp.back_url === backUrl) return mp.init_point;
    } catch (e) {
      console.error("[mp] plan compartido guardado no recuperable; se recrea", e);
    }
  }
  const nuevo = await crearPlanCompartido({
    razon: `Imán — Plan ${plan.nombre} (${formatoArs(plan.precioArs!)}/mes)`,
    montoArs: plan.precioArs!,
    trialDias: DIAS_TRIAL,
  });
  // Reemplaza cualquier registro previo del tier (p. ej. si cambió el precio).
  await systemDb.mpPlan.deleteMany({ where: { tier } });
  await systemDb.mpPlan.create({ data: { tier, mpPlanId: nuevo.id, amountArs: plan.precioArs! } });
  return nuevo.init_point;
}

/**
 * Manda al tenant a suscribirse sobre el plan COMPARTIDO de su tier. El mapeo
 * suscripción↔tenant se resuelve con external_reference=tenantId en el
 * init_point (primario) y el email del pagador (fallback) — no con un plan por
 * cliente. El acceso se habilita recién cuando MP confirma la autorización.
 */
async function suscribirTenant(tier: PlanTier): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const plan = PLANES[tier];
  if (!plan.precioArs) return { ok: false, error: "Plan sin precio online." };

  try {
    const initPoint = await planCompartidoInitPoint(tier);
    // Guardamos el email del dueño como fallback de mapeo (por si MP no propaga
    // el external_reference al preapproval creado desde el checkout del plan).
    const email = tenant.mpPayerEmail ?? (await getUserServer())?.user.email ?? null;
    if (email && email !== tenant.mpPayerEmail) {
      await db.tenant.update({ where: { id: tenant.id }, data: { mpPayerEmail: email } });
    }
    await track("suscripcion_iniciada", { plan: tier });
    const sep = initPoint.includes("?") ? "&" : "?";
    return { ok: true, initPoint: `${initPoint}${sep}external_reference=${encodeURIComponent(tenant.id)}` };
  } catch (e: any) {
    console.error("[mp] error iniciando suscripción", e);
    const cuerpo = String(e?.body ?? e?.message ?? "");
    if (cuerpo.includes("back_url")) {
      return { ok: false, error: "Falta la URL pública (NEXT_PUBLIC_APP_URL https) para el checkout de Mercado Pago." };
    }
    if (/\b5\d\d\b/.test(cuerpo) || cuerpo.includes("Internal server error")) {
      return { ok: false, error: "Mercado Pago tuvo un error interno. Probá de nuevo en un momento." };
    }
    return { ok: false, error: "No pudimos iniciar la suscripción en Mercado Pago. Probá de nuevo." };
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

/**
 * Registra primero la baja local y después cancela el débito en MP. Los datos
 * no se tocan y el acceso sigue habilitado hasta el fin del ciclo ya abonado.
 */
export async function cancelarSuscripcion(): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const ahora = new Date();
  let finAcceso = finPeriodoSuscripcion(tenant, ahora);
  const debeCancelarEnMp = !!tenant.mpPreapprovalId;

  // Este update debe ocurrir ANTES de cualquier escritura en Mercado Pago: la
  // intención de baja queda guardada aunque MP esté caído o sin configurar.
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      planStatus: "CANCELLED",
      cancellationEffectiveAt: finAcceso,
      mpCancellationPending: debeCancelarEnMp,
    },
  });
  await track("suscripcion_cancelada", { manual: true });

  if (tenant.mpPreapprovalId && mpConfigurado()) {
    let canceladaEnMp = false;

    // Leemos el próximo cobro antes de anular la preapproval: esa es la fecha
    // exacta de cierre del período vigente informada por Mercado Pago. La baja
    // ya está guardada localmente, por lo que esta consulta no altera el orden.
    try {
      const preActual = await obtenerSuscripcion(tenant.mpPreapprovalId);
      const proximoCobro = preActual.next_payment_date ? new Date(preActual.next_payment_date) : null;
      if (proximoCobro && !Number.isNaN(proximoCobro.getTime()) && proximoCobro > ahora) {
        finAcceso = proximoCobro;
        await db.tenant.update({
          where: { id: tenant.id },
          data: { cancellationEffectiveAt: finAcceso },
        });
      }
    } catch (e) {
      // No impide la baja: conservamos el cierre calculado con el último pago.
      console.error("[mp] no se pudo obtener el fin exacto del período", e);
    }

    try {
      const pre = await cancelarSuscripcionMp(tenant.mpPreapprovalId);
      canceladaEnMp = pre.status === "cancelled";
      const proximoCobro = pre.next_payment_date ? new Date(pre.next_payment_date) : null;
      if (proximoCobro && !Number.isNaN(proximoCobro.getTime()) && proximoCobro > ahora) {
        finAcceso = proximoCobro;
      }
    } catch (e) {
      // Una respuesta fallida puede ser un reintento sobre una suscripción que
      // MP ya canceló. Verificamos, pero la baja local nunca se revierte.
      try {
        const pre = await obtenerSuscripcion(tenant.mpPreapprovalId);
        canceladaEnMp = pre.status === "cancelled";
      } catch (e2) {
        console.error("[mp] error cancelando (y no pudimos verificar el estado)", e, e2);
      }
      if (!canceladaEnMp) console.error("[mp] la baja local quedó pendiente de verificar", e);
    }

    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        cancellationEffectiveAt: finAcceso,
        mpCancellationPending: !canceladaEnMp,
      },
    });
  }

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

  // El pagador que vuelve del checkout ES el dueño logueado. Como MP no propaga
  // el external_reference del init_point de un plan compartido, vinculamos la
  // suscripción al tenant de la SESIÓN, con guardas:
  //  - que nazca de UNO DE NUESTROS planes compartidos (no una preapproval ajena);
  //  - que no esté ya vinculada a OTRO tenant.
  const esNuestroPlan = !!pre.preapproval_plan_id
    && !!(await systemDb.mpPlan.findUnique({ where: { mpPlanId: pre.preapproval_plan_id } }));
  const deOtro = await systemDb.tenant.findFirst({
    where: { mpPreapprovalId: pre.id, NOT: { id: tenant.id } },
    select: { id: true },
  });
  const esDeTenant = pre.external_reference === tenant.id || (esNuestroPlan && !deOtro);
  if (!esDeTenant) {
    console.warn("[mp] retorno con preapproval no vinculable", preapprovalId, tenant.id);
    return false;
  }
  // Fijamos el vínculo en el tenant de la sesión (los webhooks siguientes ya lo
  // encuentran por mpPreapprovalId). Éxito real = MP autorizó el débito.
  await sincronizarPreapproval(pre, tenant.id);
  return pre.status === "authorized";
}
