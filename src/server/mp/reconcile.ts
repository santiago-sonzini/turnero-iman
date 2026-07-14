import { Prisma } from "@prisma/client";

import { systemDb } from "@/server/db";
import {
  buscarSuscripciones,
  cancelarSuscripcionMp,
  elegirSuscripcionCanonica,
  haySuscripcionLegacySinReferencia,
  MercadoPagoError,
  obtenerSuscripcion,
  suscripcionCancelada,
  type MpPreapproval,
} from "./preapproval";
import { reconciliarPagosSuscripcion, sincronizarPreapproval } from "./webhook";

export type ReconciliationResult = {
  status: "synced" | "not_found" | "not_configured" | "mismatch" | "manual_review";
  preapprovalId?: string;
  authorized?: boolean;
  paid?: boolean;
};

/** Recupera abandonos, elimina duplicados y verifica autorización + cobros. */
export async function reconciliarTenantMercadoPago(
  tenantId: string,
): Promise<ReconciliationResult> {
  const initial = await systemDb.tenant.findUnique({ where: { id: tenantId } });
  if (!initial?.plan || !initial.mpPayerEmail) return { status: "not_configured" };

  let manualReview = false;
  const canonical = await systemDb.$transaction(async (tx): Promise<MpPreapproval | null> => {
    // $executeRaw (no $queryRaw): pg_advisory_xact_lock() devuelve `void` y
    // $queryRaw falla al deserializar esa columna ("type 'void'"). executeRaw
    // no lee result set, así que toma el lock sin romper la transacción.
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${`mp-checkout:${tenantId}`}, 0))
    `);
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    let stored: MpPreapproval | null = null;
    if (tenant.mpPreapprovalId) {
      try {
        stored = await obtenerSuscripcion(tenant.mpPreapprovalId);
      } catch (error) {
        if (!(error instanceof MercadoPagoError) || error.status !== 404) throw error;
        await tx.tenant.update({ where: { id: tenant.id }, data: { mpPreapprovalId: null } });
      }
      if (stored && stored.external_reference !== tenant.id) return null;
    }

    // Por external_reference (== tenantId) recuperamos sus suscripciones; por
    // payer_email detectamos una legacy sin referencia que siga cobrando.
    const porRef = await buscarSuscripciones({ externalReference: tenant.id });
    const porEmail = await buscarSuscripciones({ payerEmail: tenant.mpPayerEmail! });
    if (haySuscripcionLegacySinReferencia(porEmail)) manualReview = true;
    const byId = new Map<string, MpPreapproval>();
    for (const pre of [...porRef, ...porEmail]) {
      if (pre.external_reference === tenant.id) byId.set(pre.id, pre);
    }
    if (stored) byId.set(stored.id, stored);
    const exact = [...byId.values()];
    const selected = elegirSuscripcionCanonica(exact, tenant.id);
    if (!selected) return null;

    for (const duplicate of exact) {
      if (duplicate.id !== selected.id && !suscripcionCancelada(duplicate)) {
        await cancelarSuscripcionMp(duplicate.id);
        console.warn("[mp] reconciliación canceló duplicado", duplicate.id, tenant.id);
      }
    }
    const detached = await tx.tenant.updateMany({
      where: { mpPreapprovalId: selected.id, NOT: { id: tenant.id } },
      data: { mpPreapprovalId: null, planStatus: "PAST_DUE", graceUntil: new Date() },
    });
    if (detached.count) {
      console.warn("[mp] reconciliación removió vínculo incorrecto", selected.id);
    }
    if (tenant.mpPreapprovalId !== selected.id) {
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { mpPreapprovalId: selected.id },
      });
    }
    return selected;
  }, { maxWait: 10_000, timeout: 45_000 });

  if (!canonical) {
    if (manualReview) return { status: "manual_review" };
    return initial.mpPreapprovalId ? { status: "mismatch" } : { status: "not_found" };
  }
  if (!(await sincronizarPreapproval(canonical))) return { status: "mismatch" };
  const payment = await reconciliarPagosSuscripcion(tenantId, canonical.id);
  return {
    status: manualReview ? "manual_review" : "synced",
    preapprovalId: canonical.id,
    authorized: canonical.status === "authorized",
    paid: payment.paid,
  };
}
