import type { Tenant } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { accesoDe, finPeriodoSuscripcion, PLANES } from "./plans";

const now = new Date("2030-01-15T12:00:00Z");
const tenant = (fields: Partial<Tenant>): Tenant => ({
  planStatus: "ONBOARDING",
  trialEndsAt: null,
  graceUntil: null,
  cancellationEffectiveAt: null,
  mpCancellationPending: false,
  ...fields,
} as Tenant);

describe("planes y acceso", () => {
  it("incluye automatización de WhatsApp en Turnos Pro", () => {
    expect(PLANES.TURNOS_AUTO.features).toContain("whatsapp_auto");
  });

  it("bloquea trials vencidos y respeta el período de gracia", () => {
    expect(accesoDe(tenant({ planStatus: "TRIALING", trialEndsAt: new Date("2030-01-14") }), now))
      .toEqual({ estado: "bloqueado", motivo: "trial_vencido" });
    expect(accesoDe(tenant({ planStatus: "PAST_DUE", graceUntil: new Date("2030-01-16") }), now).estado)
      .toBe("gracia");
  });

  it("calcula meses calendario sin desbordar febrero", () => {
    expect(finPeriodoSuscripcion(
      { trialEndsAt: null, mpLastPaymentAt: new Date("2030-01-31T12:00:00Z") },
      new Date("2030-02-01T12:00:00Z"),
    ).toISOString()).toBe("2030-02-28T12:00:00.000Z");
  });
});
