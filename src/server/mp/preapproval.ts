// Cliente mínimo de Mercado Pago Suscripciones (preapproval API).
// Docs: https://www.mercadopago.com.ar/developers/es/docs/subscriptions
// Flujo elegido: preapproval SIN card_token (status "pending") → MP devuelve
// init_point → el cliente autoriza el débito automático en el sitio de MP →
// vuelve a back_url → los webhooks mantienen el estado del tenant al día.
// SANDBOX: con MP_ACCESS_TOKEN de prueba (TEST-...) todo corre contra el
// entorno de test de MP; mismas URLs, tarjetas de prueba.
import { env } from "@/env";

const MP_API = "https://api.mercadopago.com";

/**
 * MP listo para operar: hace falta el token Y una URL pública https.
 * La API de preapproval EXIGE back_url y rechaza localhost, así que sin
 * NEXT_PUBLIC_APP_URL publicada no hay flujo posible (en dev usá un túnel
 * o la URL de Vercel si querés probar el checkout real).
 */
export function mpConfigurado(): boolean {
  if (!env.MP_ACCESS_TOKEN) return false;
  if (!appUrl().startsWith("https")) {
    console.warn("[mp] MP_ACCESS_TOKEN presente pero NEXT_PUBLIC_APP_URL no es https: el checkout queda deshabilitado");
    return false;
  }
  return true;
}

export class MercadoPagoError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Mercado Pago ${status}: ${body}`);
    this.name = "MercadoPagoError";
  }
}

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.MP_ACCESS_TOKEN)
    throw new Error("MP_ACCESS_TOKEN no configurado (ver .env.example)");
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const texto = await res.text();
  if (!res.ok) throw new MercadoPagoError(res.status, texto);
  return JSON.parse(texto) as T;
}

// Estados que devuelve MP para una preapproval.
export type MpPreapprovalStatus =
  | "pending" // creada, el payer todavía no autorizó
  | "authorized" // autorizada: se debita todos los meses
  | "paused"
  | "cancelled";

const autoRecurring = (montoArs: number, trialDias?: number) => {
  const trial = Math.max(0, Math.floor(trialDias ?? 0));
  return {
    frequency: 1,
    frequency_type: "months" as const,
    transaction_amount: montoArs,
    currency_id: "ARS" as const,
    ...(trial > 0 ? { free_trial: { frequency: trial, frequency_type: "days" as const } } : {}),
  };
};

export type MpPreapproval = {
  id: string;
  status: MpPreapprovalStatus;
  init_point: string; // URL donde el payer autoriza / gestiona el débito
  external_reference?: string; // nuestro tenantId
  preapproval_plan_id?: string; // si nació de un plan, apunta al plan
  payer_email?: string;
  reason?: string;
  next_payment_date?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
    start_date?: string;
    end_date?: string;
    free_trial?: { frequency: number; frequency_type: "months" | "days" };
  };
};

export type MpPreapprovalPlan = {
  id: string;
  status: string; // "active" | "cancelled" | ...
  init_point: string; // checkout de suscripción del plan
  external_reference?: string; // nuestro tenantId
  back_url?: string; // a dónde vuelve MP tras autorizar (queda grabado en el plan)
  auto_recurring?: MpPreapproval["auto_recurring"];
};

/**
 * Crea un PLAN de suscripción (preapproval_plan) COMPARTIDO y devuelve su
 * init_point. Se crea una sola plantilla por tier y todos los tenants suscriben
 * sobre ella (el mapeo tenant↔suscripción se resuelve con external_reference en
 * el init_point + email del pagador, no con un plan por cliente).
 *
 * Se usa el flujo de plan (no /preapproval directo) por dos motivos verificados
 * contra la API: (1) el preapproval directo con free_trial devuelve HTTP 500;
 * (2) `payment_methods_allowed` SOLO lo respeta MP a nivel plan (en el
 * preapproval directo lo ignora), y sin él el checkout habilita solo crédito.
 * `trialDias > 0` activa el free_trial nativo.
 */
export async function crearPlanCompartido(params: {
  razon: string;
  montoArs: number;
  trialDias?: number;
}): Promise<MpPreapprovalPlan> {
  return mp<MpPreapprovalPlan>("/preapproval_plan", {
    method: "POST",
    body: JSON.stringify({
      reason: params.razon,
      back_url: `${appUrl()}/suscripcion/retorno`,
      auto_recurring: autoRecurring(params.montoArs, params.trialDias),
      // Sin esto MP habilita SOLO tarjeta de crédito en el checkout. Declaramos
      // todos los medios que soporta una suscripción para que el cliente pueda
      // pagar con crédito, débito, prepaga o dinero en cuenta (efectivo no aplica).
      payment_methods_allowed: {
        payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "prepaid_card" },
          { id: "account_money" },
        ],
      },
    }),
  });
}

export async function obtenerPlan(id: string): Promise<MpPreapprovalPlan> {
  return mp<MpPreapprovalPlan>(`/preapproval_plan/${id}`);
}

export async function obtenerSuscripcion(id: string): Promise<MpPreapproval> {
  return mp<MpPreapproval>(`/preapproval/${id}`);
}

/**
 * Cambio de plan (upgrade/downgrade): actualiza el monto del débito. Según el
 * comportamiento de MP, el monto nuevo aplica al PRÓXIMO ciclo de cobro (no
 * hay prorrateo automático); lo reflejamos igual en el tenant al instante.
 */
export async function actualizarMonto(
  id: string,
  montoArs: number
): Promise<MpPreapproval> {
  return mp<MpPreapproval>(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      auto_recurring: { transaction_amount: montoArs, currency_id: "ARS" },
    }),
  });
}

export async function cancelarSuscripcionMp(id: string): Promise<MpPreapproval> {
  return mp<MpPreapproval>(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/** Pago recurrente de una suscripción (topic subscription_authorized_payment). */
export type MpAuthorizedPayment = {
  id: number | string;
  preapproval_id?: string;
  status?: string; // scheduled | processed | recycling ...
  payment?: { id: number; status: string; status_detail?: string };
  external_reference?: string;
};

export async function obtenerPagoAutorizado(
  id: string
): Promise<MpAuthorizedPayment> {
  return mp<MpAuthorizedPayment>(`/authorized_payments/${id}`);
}

export type MpPayment = {
  id: number;
  status: string; // approved | rejected | pending | ...
  external_reference?: string;
  metadata?: { preapproval_id?: string };
};

export async function obtenerPago(id: string): Promise<MpPayment> {
  return mp<MpPayment>(`/v1/payments/${id}`);
}

export function appUrl(): string {
  // Sin barra final: evita back_url con doble barra (…app//suscripcion/retorno).
  return (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
