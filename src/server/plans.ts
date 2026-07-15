import type { PlanTier, Tenant } from "@prisma/client";

export const DIAS_TRIAL = 7;
export const DIAS_GRACIA = 7;
export type FeatureKey = "turnos" | "clientes" | "promos" | "wa_links" | "email" | "whatsapp_auto" | "multi_staff" | "temas";
export type PlanDef = { tier: PlanTier; nombre: string; descripcion: string; precioArs: number; features: FeatureKey[]; destacado?: boolean };

// Tope de profesionales que puede cargar un negocio con multi_staff.
export const MAX_STAFF = 3;

function sumarMesCalendario(fecha: Date): Date {
  const dia = fecha.getUTCDate();
  const siguiente = new Date(fecha);
  siguiente.setUTCDate(1);
  siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
  const ultimoDia = new Date(Date.UTC(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, 0)).getUTCDate();
  siguiente.setUTCDate(Math.min(dia, ultimoDia));
  return siguiente;
}

/** Fin del ciclo mensual vigente; el trial, si sigue activo, tiene prioridad. */
export function finPeriodoSuscripcion(
  tenant: Pick<Tenant, "trialEndsAt" | "mpLastPaymentAt">,
  ahora = new Date()
): Date {
  if (tenant.trialEndsAt && tenant.trialEndsAt > ahora) return tenant.trialEndsAt;
  let fin = new Date(tenant.mpLastPaymentAt ?? ahora);
  do fin = sumarMesCalendario(fin);
  while (fin <= ahora);
  return fin;
}

export const PLANES: Record<PlanTier, PlanDef> = {
  TURNOS: {
    tier: "TURNOS", nombre: "Turnos", precioArs: 20_000,
    descripcion: "Agenda, reservas online, clientes, promos y mensajes manuales por WhatsApp.",
    features: ["turnos", "clientes", "promos", "wa_links", "email"],
  },
  TURNOS_AUTO: {
    tier: "TURNOS_AUTO", nombre: "Turnos Pro", precioArs: 35_000,
    descripcion: "Todo Turnos + hasta 3 profesionales con agenda propia y temas visuales para tu página.",
    features: ["turnos", "clientes", "promos", "wa_links", "email", "whatsapp_auto", "multi_staff", "temas"], destacado: true,
  },
};

export function tieneFeature(tenant: Tenant, feature: FeatureKey) {
  return !!tenant.plan && (PLANES[tenant.plan].features.includes(feature) || tenant.addons.includes(feature));
}

export type Acceso =
  | { estado: "onboarding" }
  | { estado: "pleno"; diasTrial?: number }
  | { estado: "gracia"; hasta: Date }
  | { estado: "cancelado"; hasta: Date; verificarMercadoPago: boolean }
  | { estado: "bloqueado"; motivo: "trial_vencido" | "pago_vencido" | "cancelado" };

export function accesoDe(tenant: Tenant, now = new Date()): Acceso {
  if (tenant.planStatus === "ONBOARDING") return { estado: "onboarding" };
  if (tenant.planStatus === "ACTIVE") return { estado: "pleno" };
  if (tenant.planStatus === "TRIALING") {
    if (tenant.trialEndsAt && tenant.trialEndsAt > now) return { estado: "pleno", diasTrial: Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86400000) };
    return { estado: "bloqueado", motivo: "trial_vencido" };
  }
  if (tenant.planStatus === "PAST_DUE") {
    if (tenant.graceUntil && tenant.graceUntil > now) return { estado: "gracia", hasta: tenant.graceUntil };
    return { estado: "bloqueado", motivo: "pago_vencido" };
  }
  if (tenant.planStatus === "CANCELLED" && tenant.cancellationEffectiveAt && tenant.cancellationEffectiveAt > now) {
    return {
      estado: "cancelado",
      hasta: tenant.cancellationEffectiveAt,
      verificarMercadoPago: tenant.mpCancellationPending,
    };
  }
  return { estado: "bloqueado", motivo: "cancelado" };
}

export function formatoArs(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}
