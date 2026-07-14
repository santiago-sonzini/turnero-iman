"use server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
// Ciclo de vida de la suscripción del tenant (Mercado Pago preapproval).
// La verdad del estado la escriben los webhooks (src/server/mp/webhook.ts);
// acá solo se crea/cambia/cancela y se refleja lo verificado contra la API.
import { db, systemDb, DEMO_MODE } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { DIAS_TRIAL, PLANES, finPeriodoSuscripcion, formatoArs } from "@/server/plans";
import {
  actualizarMonto,
  buscarSuscripciones,
  cancelarSuscripcionMp,
  crearSuscripcionPendiente,
  elegirSuscripcionCanonica,
  haySuscripcionLegacySinReferencia,
  MercadoPagoError,
  mpConfigurado,
  obtenerSuscripcion,
  suscripcionCancelada,
  type MpPreapproval,
} from "@/server/mp/preapproval";
import { reconciliarPagosSuscripcion, sincronizarPreapproval } from "@/server/mp/webhook";
import { track } from "@/server/track";
import getUserServer from "@/lib/user";
import { Prisma, type PlanTier } from "@prisma/client";

const MP_CHECKOUT_COOKIE = "iman_mp_checkout";
const checkoutHash = (token: string) => createHash("sha256").update(token).digest("hex");
const checkoutTokenMatches = (token: string, expected: string | null) => {
  if (!expected || token.length < 20 || token.length > 128) return false;
  const actual = Buffer.from(checkoutHash(token), "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && timingSafeEqual(Uint8Array.from(actual), Uint8Array.from(wanted));
};

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
  if (tenant.planStatus !== "ONBOARDING") {
    return { ok: false, error: "La prueba ya fue utilizada. Cambiá de plan desde Suscripción o reactivá el pago." };
  }
  const ahora = new Date();
  const finTrial =
    tenant.trialEndsAt ?? new Date(ahora.getTime() + DIAS_TRIAL * 86_400_000);

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

  return suscribirTenant(tenant.plan);
}

/**
 * Crea una preapproval INDIVIDUAL (sin plan asociado). El ID existe y queda
 * persistido antes de redirigir; external_reference nace con tenantId. Un
 * advisory lock evita dos creaciones concurrentes y la búsqueda previa recupera
 * una creación que haya quedado entre la API de MP y el commit local.
 */
async function suscribirTenant(tier: PlanTier): Promise<ResultadoPlan> {
  const tenant = await getCurrentTenant();
  const plan = PLANES[tier];
  if (!plan.precioArs) return { ok: false, error: "Plan sin precio online." };

  try {
    const email = tenant.mpPayerEmail ?? (await getUserServer())?.user.email ?? null;
    if (!email) return { ok: false, error: "Necesitamos el email de tu cuenta para iniciar el pago." };
    const checkoutToken = randomBytes(32).toString("base64url");
    const checkoutExpiresAt = new Date(Date.now() + 60 * 60_000);
    const idempotencyKey = createHash("sha256")
      .update(`iman:${tenant.id}:${tier}:${checkoutToken}`)
      .digest("hex");

    const pre = await systemDb.$transaction(async (tx): Promise<MpPreapproval> => {
      // $executeRaw (no $queryRaw): pg_advisory_xact_lock() devuelve `void` y
      // $queryRaw falla al deserializar esa columna ("type 'void'"). executeRaw
      // no lee result set, así que toma el lock sin romper la transacción.
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${`mp-checkout:${tenant.id}`}, 0))
      `);
      const fresh = await tx.tenant.findUniqueOrThrow({ where: { id: tenant.id } });

      let stored: MpPreapproval | null = null;
      if (fresh.mpPreapprovalId) {
        try {
          stored = await obtenerSuscripcion(fresh.mpPreapprovalId);
        } catch (error) {
          if (!(error instanceof MercadoPagoError) || error.status !== 404) throw error;
          await tx.tenant.update({ where: { id: tenant.id }, data: { mpPreapprovalId: null } });
        }
        if (stored && stored.external_reference !== tenant.id) {
          throw new Error("La suscripción existente necesita revisión manual antes de continuar.");
        }
      }

      // Por external_reference recuperamos las suscripciones de ESTE tenant
      // (plan-era o no); por payer_email detectamos una legacy sin referencia
      // que pudiera seguir cobrando. Ya no dependemos de un plan asociado.
      const porRef = await buscarSuscripciones({ externalReference: tenant.id });
      const porEmail = await buscarSuscripciones({ payerEmail: email });
      const legacySinReferencia = haySuscripcionLegacySinReferencia(porEmail);
      const byId = new Map<string, MpPreapproval>();
      for (const item of [...porRef, ...porEmail]) {
        if (item.external_reference === tenant.id) byId.set(item.id, item);
      }
      if (stored) byId.set(stored.id, stored);
      const exactas = [...byId.values()];
      let canonical = elegirSuscripcionCanonica(exactas, tenant.id);

      if (legacySinReferencia) {
        throw new Error("Encontramos una suscripción anterior sin referencia segura. Revisala antes de crear otra para evitar un doble cobro.");
      }

      if (canonical) {
        // Si un flujo antiguo o un retry llegó a crear más de una, conservamos
        // una sola y cancelamos el resto antes de continuar cobrando.
        for (const duplicate of exactas) {
          if (duplicate.id !== canonical.id && !suscripcionCancelada(duplicate)) {
            await cancelarSuscripcionMp(duplicate.id);
            console.warn("[mp] preapproval duplicada cancelada", duplicate.id, tenant.id);
          }
        }
      } else {
        canonical = await crearSuscripcionPendiente({
          payerEmail: email,
          tenantId: tenant.id,
          idempotencyKey,
          razon: `Imán — Plan ${plan.nombre} (${formatoArs(plan.precioArs)}/mes)`,
          montoArs: plan.precioArs,
          trialDias: DIAS_TRIAL,
        });
      }

      if (canonical.external_reference !== tenant.id) {
        throw new Error("Mercado Pago no devolvió la referencia segura del negocio.");
      }
      const detached = await tx.tenant.updateMany({
        where: { mpPreapprovalId: canonical.id, NOT: { id: tenant.id } },
        data: { mpPreapprovalId: null, planStatus: "PAST_DUE", graceUntil: new Date() },
      });
      if (detached.count) {
        console.warn("[mp] vínculo incorrecto removido según external_reference", canonical.id);
      }
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          mpPreapprovalId: canonical.id,
          mpPayerEmail: email,
          mpCheckoutTokenHash: checkoutHash(checkoutToken),
          mpCheckoutExpiresAt: checkoutExpiresAt,
        },
      });
      return canonical;
    }, { maxWait: 10_000, timeout: 45_000 });

    const cookieStore = await cookies();
    cookieStore.set(MP_CHECKOUT_COOKIE, checkoutToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/suscripcion/retorno",
      expires: checkoutExpiresAt,
    });
    await track("suscripcion_iniciada", { plan: tier });
    if (pre.status === "authorized") {
      await sincronizarPreapproval(pre);
      await reconciliarPagosSuscripcion(tenant.id, pre.id);
    }
    return { ok: true, initPoint: pre.init_point };
  } catch (e: any) {
    console.error("[mp] error iniciando suscripción", e);
    const cuerpo = String(e?.body ?? e?.message ?? "");
    if (cuerpo.includes("suscripción anterior") || cuerpo.includes("revisión manual")) {
      return { ok: false, error: cuerpo };
    }
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
export async function confirmarRetorno(preapprovalId: string): Promise<{ authorized: boolean; paid: boolean }> {
  const tenant = await getCurrentTenant();
  if (!tenant.mpPreapprovalId || preapprovalId !== tenant.mpPreapprovalId) {
    console.warn("[mp] retorno con preapproval distinta a la iniciada", preapprovalId, tenant.id);
    return { authorized: false, paid: false };
  }
  const pre = await obtenerSuscripcion(preapprovalId);
  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(MP_CHECKOUT_COOKIE)?.value ?? "";
  const checkoutValido = !!tenant.mpCheckoutExpiresAt && tenant.mpCheckoutExpiresAt > new Date()
    && checkoutTokenMatches(checkoutToken, tenant.mpCheckoutTokenHash);
  // Propiedad: mismo ID que iniciamos + external_reference == tenantId + token de
  // checkout válido. (Ya no se valida por preapproval_plan_id: sin plan asociado.)
  const esDeTenant = pre.id === tenant.mpPreapprovalId
    && pre.external_reference === tenant.id
    && checkoutValido;
  if (!esDeTenant) {
    console.warn("[mp] retorno con preapproval no vinculable", preapprovalId, tenant.id);
    return { authorized: false, paid: false };
  }
  await sincronizarPreapproval(pre);
  const payment = await reconciliarPagosSuscripcion(tenant.id, pre.id);
  await db.tenant.update({
    where: { id: tenant.id },
    data: { mpCheckoutTokenHash: null, mpCheckoutExpiresAt: null },
  });
  cookieStore.set(MP_CHECKOUT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/suscripcion/retorno",
    maxAge: 0,
  });
  return { authorized: pre.status === "authorized", paid: payment.paid };
}
