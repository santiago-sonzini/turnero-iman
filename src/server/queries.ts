// Data-access de servidor para los Server Components (páginas). Reads con
// nombre en vez de Prisma inline en los page.tsx. NO son server actions:
// son loaders que corren en el render del servidor.
import { db, systemDb } from "@/server/db";

/** Solo el id del negocio dueño de un slug (para el chequeo de propiedad). */
export function tenantIdBySlug(slug: string) {
  return systemDb.tenant.findUnique({ where: { slug }, select: { id: true } });
}

/** slug + estado del plan del tenant de la sesión (para el redirect de /app). */
export function tenantRouteMeta(tenantId: string) {
  return systemDb.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, planStatus: true } });
}

/** Datos mínimos para metadata + JSON-LD de la página pública, nunca billing. */
export function publicBusinessMeta(slug: string) {
  return systemDb.tenant.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      planStatus: true,
      profile: {
        select: {
          name: true,
          description: true,
          businessType: true,
          address: true,
          phone: true,
          instagram: true,
          mapsUrl: true,
          logoUrl: true,
          accent: true,
          timezone: true,
          showPrices: true,
        },
      },
      services: {
        where: { active: true },
        select: { name: true, priceCents: true, durationMinutes: true, emoji: true },
        orderBy: { sortOrder: "asc" },
        take: 30,
      },
    },
  });
}

/** Slugs de negocios públicos y visibles (para el sitemap). */
export function activePublicBusinessSlugs() {
  return systemDb.tenant.findMany({
    where: { planStatus: { notIn: ["ONBOARDING"] }, profile: { isNot: null } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
}

/** Perfil + servicios del negocio actual (para precargar el onboarding). */
export function onboardingInitialData() {
  return Promise.all([
    db.businessProfile.findFirst(),
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
}
