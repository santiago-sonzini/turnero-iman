export function normalizeMapsUrl(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      host.startsWith("maps.google.") ||
      host === "google.com" ||
      host.startsWith("www.google.");
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}
