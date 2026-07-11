import { NextRequest } from "next/server"
import { systemDb } from "@/server/db"

// Token del pedido: header x-partner-token o query ?token=
function tokenDe(req: NextRequest): string | null {
  return (
    req.headers.get("x-partner-token") ||
    req.nextUrl.searchParams.get("token") ||
    null
  )
}

// Autoriza un pedido de partner: el token identifica AL NEGOCIO (tenant) que
// comparte — systemDb porque acá no hay sesión; el scoping sale del token.
// El opt-in correspondiente tiene que estar habilitado.
// FUTURO canal tenant-a-tenant: cuando distribuidora y comercio convivan en
// esta base, este endpoint se reemplaza por la relación Tenant→Tenant.
export async function autorizarPartner(
  req: NextRequest,
  flag: "shareStockEnabled" | "sharePricelistEnabled",
) {
  const token = tokenDe(req)
  if (!token) return { ok: false as const, status: 401, error: "Falta token" }

  const b = await systemDb.businessProfile.findFirst({
    where: { partnerToken: token },
  })
  if (!b) {
    return { ok: false as const, status: 401, error: "Token inválido" }
  }
  if (!b[flag]) {
    return { ok: false as const, status: 403, error: "Este negocio no habilitó compartir esto" }
  }
  return { ok: true as const, negocio: b, tenantId: b.tenantId }
}
