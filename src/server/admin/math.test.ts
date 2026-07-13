import { describe, expect, it } from "vitest";
import { computeMrrBuckets, dayStartAR, monthStartAR } from "./math";

describe("admin metrics math", () => {
  it("keeps whole-ARS plan prices and isolates MRR buckets", () => {
    const result = computeMrrBuckets([
      { plan: "TURNOS", planStatus: "ACTIVE", count: 2 },
      { plan: "TURNOS_AUTO", planStatus: "ACTIVE", count: 1 },
      { plan: "TURNOS_AUTO", planStatus: "PAST_DUE", count: 1 },
      { plan: "TURNOS", planStatus: "TRIALING", count: 1 },
    ]);
    expect(result.committedArs).toBe(60_000);
    expect(result.arrArs).toBe(720_000);
    expect(result.arpaArs).toBe(20_000);
    expect(result.atRiskArs).toBe(30_000);
    expect(result.potentialArs).toBe(15_000);
  });

  it("uses Argentina local boundaries around UTC month rollover", () => {
    const utcButStillJulyInArgentina = new Date("2026-08-01T02:30:00.000Z");
    expect(monthStartAR(utcButStillJulyInArgentina).toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(dayStartAR(utcButStillJulyInArgentina).toISOString()).toBe("2026-07-31T03:00:00.000Z");
  });
});
