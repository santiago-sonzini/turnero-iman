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

/** Datos mínimos para metadata de la página pública, nunca datos de billing. */
export function publicBusinessMeta(slug: string) {
  return systemDb.tenant.findUnique({
    where: { slug },
    select: { slug: true, name: true, planStatus: true, profile: { select: { name: true, description: true } } },
  });
}

/** Perfil + servicios del negocio actual (para precargar el onboarding). */
export function onboardingInitialData() {
  return Promise.all([
    db.businessProfile.findFirst(),
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
}
