import { describe, expect, it } from "vitest";
import {
  elegirSuscripcionCanonica,
  haySuscripcionLegacySinReferencia,
  suscripcionCancelada,
  type MpPreapproval,
} from "./preapproval";

const pre = (fields: Partial<MpPreapproval>): MpPreapproval => ({
  id: "pre-default",
  status: "pending",
  init_point: "https://www.mercadopago.com.ar/subscriptions/checkout",
  external_reference: "tenant-a",
  ...fields,
});

describe("vinculación de preapprovals", () => {
  it("jamás adopta una suscripción de otro tenant", () => {
    const result = elegirSuscripcionCanonica([
      pre({ id: "victim", external_reference: "tenant-b", status: "authorized" }),
    ], "tenant-a");
    expect(result).toBeNull();
  });

  it("prefiere la autorización existente y permite detectar duplicados", () => {
    const pending = pre({ id: "pending", date_created: "2030-01-02" });
    const authorized = pre({ id: "authorized", status: "authorized", date_created: "2030-01-01" });
    expect(elegirSuscripcionCanonica([pending, authorized], "tenant-a")?.id).toBe("authorized");
    expect(suscripcionCancelada(pre({ status: "canceled" }))).toBe(true);
  });

  it("detiene reintentos ante una suscripción legacy que podría seguir cobrando", () => {
    expect(haySuscripcionLegacySinReferencia([
      pre({ id: "orphan", external_reference: undefined, status: "authorized" }),
    ])).toBe(true);
    expect(haySuscripcionLegacySinReferencia([
      pre({ id: "old", external_reference: undefined, status: "cancelled" }),
    ])).toBe(false);
  });
});
