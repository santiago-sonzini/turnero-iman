// Identificadores de packs de demo. Módulo PURO (sin imports de datos ni de
// PGlite): lo consumen el middleware (edge), las server actions y el registro.

export type DemoTipo = "comercio" | "distribuidora";
export type DemoRubro = "almacen" | "dietetica" | "ropa" | "limpieza" | "petshop";

export const TIPOS: Array<{ id: DemoTipo; label: string }> = [
  { id: "comercio", label: "Comercio" },
  { id: "distribuidora", label: "Distribuidora" },
];

export const RUBROS: Array<{ id: DemoRubro; label: string }> = [
  { id: "almacen", label: "Almacén" },
  { id: "dietetica", label: "Dietética" },
  { id: "ropa", label: "Ropa" },
  { id: "limpieza", label: "Limpieza" },
  { id: "petshop", label: "Petshop" },
];

export const DEMO_PACK_COOKIE = "demo-pack";

// Tenant único de cada base demo (una por pack). Vive acá porque este módulo
// es puro y lo pueden importar tanto el seed como el resolvedor de tenant.
export const DEMO_TENANT_ID = "demo-tenant";

export const DEFAULT_TIPO: DemoTipo = "comercio";
export const DEFAULT_RUBRO: DemoRubro = "almacen";
export const DEFAULT_PACK_ID = `${DEFAULT_TIPO}-${DEFAULT_RUBRO}`;

export const esTipo = (v: unknown): v is DemoTipo =>
  TIPOS.some((t) => t.id === v);
export const esRubro = (v: unknown): v is DemoRubro =>
  RUBROS.some((r) => r.id === v);

export const packIdDe = (tipo: DemoTipo, rubro: DemoRubro) => `${tipo}-${rubro}`;

/** Parsea "tipo-rubro"; null si no es un pack válido. */
export function parsePackId(
  raw: string | undefined | null,
): { tipo: DemoTipo; rubro: DemoRubro } | null {
  if (!raw) return null;
  const idx = raw.indexOf("-");
  if (idx < 0) return null;
  const tipo = raw.slice(0, idx);
  const rubro = raw.slice(idx + 1);
  if (!esTipo(tipo) || !esRubro(rubro)) return null;
  return { tipo, rubro };
}
