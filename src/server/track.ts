// Eventos del funnel de onboarding/suscripción (medibles con SQL sobre
// FunnelEvent). Nunca rompe el flujo que lo llama.
import { db, systemDb } from "./db";
import { logError } from "./observability/log";

export type EventoFunnel =
  | "cuenta_creada"
  | "datos_importados"
  | "datos_ejemplo_usados"
  | "resultado_revelado"
  | "plan_seleccionado"
  | "suscripcion_iniciada" // redirigido a MP para autorizar
  | "suscripcion_autorizada"
  | "pago_aprobado"
  | "pago_rechazado"
  | "suscripcion_cancelada";

export async function track(
  event: EventoFunnel,
  props?: Record<string, unknown>
): Promise<void> {
  try {
    await db.funnelEvent.create({
      data: { event, props: (props ?? undefined) as any },
    } as any);
  } catch (e) {
    console.error("[track]", event, e);
    await logError("track", e, { event });
  }
}

/** Variante para contextos sin sesión (webhooks): tenant explícito. */
export async function trackFor(
  tenantId: string,
  event: EventoFunnel,
  props?: Record<string, unknown>
): Promise<void> {
  try {
    await systemDb.funnelEvent.create({
      data: { tenantId, event, props: (props ?? undefined) as any },
    });
  } catch (e) {
    console.error("[track]", event, e);
    await logError("track", e, { event }, tenantId);
  }
}
