import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone, phoneCandidates, whatsappUrl } from "./phone";

describe("teléfonos argentinos", () => {
  it("normaliza formatos nacionales e internacionales para WhatsApp", () => {
    expect(normalizePhone("353 479-7679")).toBe("5493534797679");
    expect(normalizePhone("+54 9 353 479-7679")).toBe("5493534797679");
    expect(normalizePhone("0353 15 479-7679")).toBe("5493534797679");
  });

  it("conserva variantes legacy para búsquedas y codifica el mensaje", () => {
    expect(phoneCandidates("3534797679")).toContain("543534797679");
    expect(whatsappUrl("3534797679", "Hola & gracias")).toBe(
      "https://wa.me/5493534797679?text=Hola%20%26%20gracias",
    );
    expect(isValidPhone("123")).toBe(false);
  });
});
