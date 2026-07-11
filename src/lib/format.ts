// Formato argentino centralizado: $ 1.234,56 y dd/mm/aaaa

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const arsFormatterCents = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatARS(value: number, opts?: { cents?: boolean }): string {
  const n = Number.isFinite(value) ? value : 0;
  return (opts?.cents ? arsFormatterCents : arsFormatter).format(n);
}

export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// "hace 3 días" / "hoy" — para la lista de clientes y el timeline
export function haceDias(dias: number | null | undefined): string {
  if (dias == null) return "sin compras";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}
