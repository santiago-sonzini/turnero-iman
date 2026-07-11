// Resolución del tenant (negocio) del request actual. ÚNICO lugar donde se
// decide "de quién son los datos": src/server/db.ts inyecta este tenantId en
// cada query. Cacheado por-request con React cache().
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { env } from "@/env";
import { systemDb, DEMO_MODE } from "./db";
import type { Tenant } from "@prisma/client";

export const DEMO_TENANT_ID = "demo-barberia-el-roble";

export class TenantError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "TenantError";
  }
}

function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set(_name: string, _value: string, _options: CookieOptions) {
        /* lectura solamente: el refresh de sesión pasa por lib/user.ts */
      },
      remove(_name: string, _options: CookieOptions) {
        /* idem */
      },
    },
  });
}

/**
 * tenantId de la sesión actual. Lanza TenantError si no hay sesión o el
 * usuario no tiene negocio asociado — así una query sin contexto NUNCA
 * devuelve datos de otro tenant.
 */
export const getTenantId = cache(async (): Promise<string> => {
  if (DEMO_MODE) {
    return DEMO_TENANT_ID;
  }
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TenantError("Sin sesión: no hay tenant para esta consulta");

  const fila = await systemDb.user.findUnique({
    where: { id: user.id },
    select: { tenantId: true },
  });
  if (!fila?.tenantId) throw new TenantError("Usuario sin negocio asociado");
  return fila.tenantId;
});

/** Tenant completo de la sesión (plan, estado de suscripción, onboarding). */
export const getCurrentTenant = cache(async (): Promise<Tenant> => {
  const tenantId = await getTenantId();
  let tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant && tenantId === DEMO_TENANT_ID) {
    // Primer arranque en demo: el seed lo crea, pero por las dudas.
    tenant = await systemDb.tenant.findUnique({ where: { id: tenantId } });
  }
  if (!tenant) throw new TenantError("Tenant inexistente");
  return tenant;
});
