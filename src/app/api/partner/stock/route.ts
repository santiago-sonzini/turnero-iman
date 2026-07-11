import { NextRequest, NextResponse } from "next/server"
import { systemDb } from "@/server/db"
import { autorizarPartner } from "../_auth"

// Stock que un comercio comparte con su distribuidora (opt-in). Solo los
// productos marcados como del proveedor (supplierLinked).
// GET /api/partner/stock?token=...  → { negocio, products: [{code,name,stock,updatedAt}] }
export async function GET(req: NextRequest) {
  const auth = await autorizarPartner(req, "shareStockEnabled")
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // systemDb + tenant del token: no hay sesión en este endpoint.
  const productos = await systemDb.product.findMany({
    where: { isActive: true, supplierLinked: true, tenantId: auth.tenantId },
    select: { slug: true, name: true, stock: true, updatedAt: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({
    negocio: auth.negocio.name,
    generatedAt: new Date().toISOString(),
    products: productos.map((p) => ({
      code: p.slug,
      name: p.name,
      stock: p.stock,
      updatedAt: p.updatedAt.toISOString(),
    })),
  })
}
