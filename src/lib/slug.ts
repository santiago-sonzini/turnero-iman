// Identificador de link del negocio: /{slug} = panel del dueño (protegido),
// /{slug}/turnos = página pública de reservas. El slug se genera del nombre al
// crear la cuenta y se puede editar en Ajustes.

// Segmentos de ruta que NO pueden ser un slug de negocio (chocarían con las
// rutas reales de la app).
export const RESERVED_SLUGS = new Set([
  "", "auth", "onboarding", "suscripcion", "api", "app", "reservar", "turnos",
  "admin", "login", "logout", "dashboard", "_next", "favicon.ico", "robots.txt",
  "sitemap.xml", "public", "static", "assets",
]);

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

/**
 * Slug único a partir del nombre. `taken(slug)` resuelve si ya existe en la
 * base (lo inyecta el caller con systemDb). Agrega -2, -3… ante colisiones.
 */
export async function ensureUniqueSlug(name: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  let base = slugify(name) || "negocio";
  if (RESERVED_SLUGS.has(base)) base = `${base}-turnos`;
  let slug = base;
  let i = 1;
  while (RESERVED_SLUGS.has(slug) || (await taken(slug))) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}
