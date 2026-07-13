/** Normaliza teléfonos argentinos al formato internacional que espera wa.me. */
export function normalizePhone(value: string | null | undefined): string {
  let digits = String(value ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return "";
  if (digits.startsWith("54")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");

  // Formato doméstico histórico: 0 + característica + 15 + abonado.
  if (digits.length === 12) {
    for (let areaLength = 2; areaLength <= 4; areaLength += 1) {
      if (digits.slice(areaLength, areaLength + 2) === "15") {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2);
        break;
      }
    }
  }

  // WhatsApp usa 54 + 9 + los diez dígitos nacionales para móviles AR.
  if (digits.startsWith("9") && digits.length === 11) return `54${digits}`;
  if (digits.length === 10) return `549${digits}`;
  return `54${digits}`;
}

export function isValidPhone(value: string | null | undefined): boolean {
  const normalized = normalizePhone(value);
  return normalized.length >= 10 && normalized.length <= 15;
}

export function whatsappUrl(value: string | null | undefined, text?: string): string {
  const normalized = normalizePhone(value);
  return `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Variantes legacy para encontrar números guardados antes de normalizar. */
export function phoneCandidates(value: string): string[] {
  const raw = value.replace(/\D/g, "").replace(/^0+/, "");
  const normalized = normalizePhone(raw);
  const withoutMobileNine = normalized.startsWith("549") ? `54${normalized.slice(3)}` : "";
  return [...new Set([normalized, withoutMobileNine, raw].filter(Boolean))];
}
