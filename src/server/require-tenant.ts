import { redirect } from "next/navigation";
import type { Tenant } from "@prisma/client";
import { getCurrentTenant, TenantError } from "./tenant-context";

/**
 * Igual que getCurrentTenant, pero si no hay sesión (o el tenant no resuelve)
 * manda a /auth en vez de reventar con un 500. Para páginas de servidor que
 * dependen del negocio del usuario.
 */
export async function requireTenant(): Promise<Tenant> {
  try {
    return await getCurrentTenant();
  } catch (error) {
    if (error instanceof TenantError) redirect("/auth");
    throw error;
  }
}
