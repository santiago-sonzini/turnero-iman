// Planes, features y estado de acceso. ÚNICA fuente de verdad del gating:
// el sidebar, las páginas y los actions preguntan acá, nunca deciden solos.
import type { PlanTier, Tenant } from "@prisma/client";

export const DIAS_TRIAL = 14;
export const DIAS_GRACIA = 7;

export type FeatureKey =
  | "importar" // import CSV/Excel asistido
  | "inteligencia" // semáforo + métricas de clientes
  | "whatsapp" // generador de links + plantillas
  | "email" // promos por email
  | "recibos" // presupuesto/remito/ticket PDF (facturas internas)
  | "productos" // gestión de productos
  | "precios" // listas de precios / actualización masiva
  | "ofertas"
  | "analytics" // analytics de ventas
  | "sync" // sync en la nube multi-dispositivo
  | "canal" // conexión distribuidora ↔ comercio (partner)
  | "arca"; // ADD-ON futuro: facturación electrónica ARCA (no implementado)

const FEATURES_SIMPLE: FeatureKey[] = [
  "importar",
  "inteligencia",
  "whatsapp",
  "email",
];

const FEATURES_COMPLETO: FeatureKey[] = [
  ...FEATURES_SIMPLE,
  "recibos",
  "productos",
  "precios",
  "ofertas",
  "analytics",
  "sync",
];

const FEATURES_PERSONALIZADO: FeatureKey[] = [...FEATURES_COMPLETO, "canal"];

export type PlanDef = {
  tier: PlanTier;
  nombre: string;
  descripcion: string;
  /** ARS por mes; null = precio a medida (sin checkout self-serve) */
  precioArs: number | null;
  features: FeatureKey[];
  destacado?: boolean;
};

export const PLANES: Record<PlanTier, PlanDef> = {
  SIMPLE: {
    tier: "SIMPLE",
    nombre: "Simple",
    descripcion:
      "Importás tu historial y recuperás clientes por WhatsApp. Nada más que configurar.",
    precioArs: 10_000,
    features: FEATURES_SIMPLE,
  },
  COMPLETO: {
    tier: "COMPLETO",
    nombre: "Completo",
    descripcion:
      "Todo Simple + el mostrador: recibos PDF, productos y listas de precios, sincronizado en la nube.",
    precioArs: 30_000,
    features: FEATURES_COMPLETO,
    destacado: true,
  },
  PERSONALIZADO: {
    tier: "PERSONALIZADO",
    nombre: "Personalizado",
    descripcion:
      "Para distribuidoras y canal: copias con tu marca para tus comercios. Lo armamos juntos.",
    precioArs: null,
    features: FEATURES_PERSONALIZADO,
  },
};

// ── Add-ons pagos (futuro) ───────────────────────────────────────────────────
// "arca": facturación electrónica ARCA como add-on recurrente SOBRE el plan
// COMPLETO. No implementado: cuando llegue, se crea una segunda suscripción MP
// (u upgrade del monto) y se agrega "arca" a tenant.addons — el gate de abajo
// ya lo lee, no hay que tocar nada más.
export const ADDONS: Record<string, { nombre: string; requierePlan: PlanTier }> = {
  arca: { nombre: "Facturación electrónica (ARCA)", requierePlan: "COMPLETO" },
};

export function tieneFeature(tenant: Tenant, feature: FeatureKey): boolean {
  if (tenant.addons?.includes(feature)) return true;
  if (!tenant.plan) return false;
  return PLANES[tenant.plan].features.includes(feature);
}

// ── Estado de acceso ─────────────────────────────────────────────────────────

export type Acceso =
  | { estado: "onboarding" }
  /** acceso pleno; aviso = banner suave (días de trial restantes) */
  | { estado: "pleno"; diasTrial?: number }
  /** débito rechazado dentro de la gracia: banner de reintento, todo sigue andando */
  | { estado: "gracia"; hasta: Date }
  /** bloqueado: solo /suscripcion; los datos NUNCA se borran */
  | { estado: "bloqueado"; motivo: "trial_vencido" | "pago_vencido" | "cancelado" };

export function accesoDe(tenant: Tenant, ahora = new Date()): Acceso {
  switch (tenant.planStatus) {
    case "ONBOARDING":
      return { estado: "onboarding" };
    case "ACTIVE":
      return { estado: "pleno" };
    case "TRIALING": {
      if (tenant.trialEndsAt && tenant.trialEndsAt > ahora) {
        const dias = Math.ceil(
          (tenant.trialEndsAt.getTime() - ahora.getTime()) / 86_400_000
        );
        return { estado: "pleno", diasTrial: dias };
      }
      return { estado: "bloqueado", motivo: "trial_vencido" };
    }
    case "PAST_DUE": {
      if (tenant.graceUntil && tenant.graceUntil > ahora)
        return { estado: "gracia", hasta: tenant.graceUntil };
      return { estado: "bloqueado", motivo: "pago_vencido" };
    }
    case "CANCELLED":
      return { estado: "bloqueado", motivo: "cancelado" };
  }
}

/** ARS estilo argentino: $ 1.234,56 (sin decimales si es entero). */
export function formatoArs(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: Number.isInteger(monto) ? 0 : 2,
  }).format(monto);
}
