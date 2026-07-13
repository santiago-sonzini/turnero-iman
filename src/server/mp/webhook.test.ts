import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verificarFirma } from "./webhook";

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
