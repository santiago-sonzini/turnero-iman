// Cliente mínimo de Mercado Pago Suscripciones (preapproval API).
// Docs: https://www.mercadopago.com.ar/developers/es/docs/subscriptions
// Flujo elegido: preapproval SIN card_token (status "pending") → MP devuelve
// init_point → el cliente autoriza el débito automático en el sitio de MP →
// vuelve a back_url → los webhooks mantienen el estado del tenant al día.
// SANDBOX: con MP_ACCESS_TOKEN de prueba (TEST-...) todo corre contra el
// entorno de test de MP; mismas URLs, tarjetas de prueba.
import { env } from "@/env";

const MP_API = "https://api.mercadopago.com";

export function mpConfigurado(): boolean {
  return !!env.MP_ACCESS_TOKEN;
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

export type MpPreapproval = {
  id: string;
  status: MpPreapprovalStatus;
  init_point: string; // URL donde el payer autoriza / gestiona el débito
  external_reference?: string; // nuestro tenantId
  payer_email?: string;
  reason?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
    start_date?: string;
    end_date?: string;
  };
};

/**
 * Crea la suscripción (débito automático mensual en ARS) y devuelve el
 * init_point al que hay que redirigir al usuario para que la autorice.
 * `inicio`: primer débito (fin del trial). external_reference = tenantId:
 * es como el webhook encuentra al tenant sin confiar en el cliente.
 */
export async function crearSuscripcion(params: {
  tenantId: string;
  payerEmail: string;
  razon: string;
  montoArs: number;
  inicio: Date;
}): Promise<MpPreapproval> {
  return mp<MpPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: params.razon,
      external_reference: params.tenantId,
      payer_email: params.payerEmail,
      back_url: `${appUrl()}/suscripcion/retorno`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.montoArs,
        currency_id: "ARS",
        start_date: params.inicio.toISOString(),
      },
      status: "pending",
    }),
  });
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
  return env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
