import { describe, expect, it } from "vitest";
import { normalizeMapsUrl } from "./maps";

describe("normalizeMapsUrl", () => {
  it("acepta únicamente enlaces HTTPS de Google Maps", () => {
    expect(normalizeMapsUrl("https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
    expect(normalizeMapsUrl("https://www.google.com/maps/place/Cordoba")).toBe("https://www.google.com/maps/place/Cordoba");
    expect(normalizeMapsUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeMapsUrl("https://google.com.evil.example/maps")).toBeNull();
  });
});
