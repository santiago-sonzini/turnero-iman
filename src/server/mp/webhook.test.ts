import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { facturaAprobada, preapprovalPerteneceATenant, verificarFirma } from "./webhook";

describe("firma de Mercado Pago", () => {
  const secret = "webhook-test-secret";
  const requestId = "request-123";
  const dataId = "PAY-456";
  const nowMs = Date.parse("2030-01-15T12:00:00Z");
  const ts = String(Math.floor(nowMs / 1_000));
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");

  it("acepta una firma vigente y auténtica", () => {
    expect(verificarFirma({
      xSignature: `ts=${ts},v1=${digest}`,
      xRequestId: requestId,
      dataId,
      secreto: secret,
      nowMs,
    })).toBe(true);
  });

  it("rechaza firmas alteradas o con más de diez minutos", () => {
    expect(verificarFirma({
      xSignature: `ts=${ts},v1=${"0".repeat(64)}`,
      xRequestId: requestId,
      dataId,
      secreto: secret,
      nowMs,
    })).toBe(false);
    expect(verificarFirma({
      xSignature: `ts=${ts},v1=${digest}`,
      xRequestId: requestId,
      dataId,
      secreto: secret,
      nowMs: nowMs + 11 * 60_000,
    })).toBe(false);
  });
});

describe("propiedad y evidencia de pago", () => {
  it("exige que ID persistido y external_reference pertenezcan al mismo tenant", () => {
    const tenant = { id: "tenant-a", mpPreapprovalId: "pre-a" };
    expect(preapprovalPerteneceATenant(
      { id: "pre-a", external_reference: "tenant-a" }, tenant,
    )).toBe(true);
    expect(preapprovalPerteneceATenant(
      { id: "pre-victim", external_reference: "tenant-a" }, tenant,
    )).toBe(false);
    expect(preapprovalPerteneceATenant(
      { id: "pre-a", external_reference: "tenant-b" }, tenant,
    )).toBe(false);
  });

  it("no confunde autorización con cobro aprobado", () => {
    expect(facturaAprobada([])).toBeUndefined();
    expect(facturaAprobada([{
      id: "invoice-1",
      preapproval_id: "pre-a",
      status: "processed",
      payment: { id: 1, status: "pending" },
    }])).toBeUndefined();
    expect(facturaAprobada([{
      id: "invoice-2",
      preapproval_id: "pre-a",
      payment: { id: 2, status: "approved" },
    }])?.id).toBe("invoice-2");
  });
});
