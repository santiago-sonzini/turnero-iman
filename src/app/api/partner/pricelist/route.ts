import { NextRequest, NextResponse } from "next/server"
import { systemDb } from "@/server/db"
import { autorizarPartner } from "../_auth"

// Lista de precios que una distribuidora expone a sus comercios (opt-in).
// GET /api/partner/pricelist?token=...  → { negocio, products: [{code,name,price}] }
export async function GET(req: NextRequest) {
  const auth = await autorizarPartner(req, "sharePricelistEnabled")
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // systemDb + tenant del token: no hay sesión en este endpoint.
  const productos = await systemDb.product.findMany({
    where: { isActive: true, tenantId: auth.tenantId },
    select: { slug: true, name: true, price: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({
    negocio: auth.negocio.name,
    generatedAt: new Date().toISOString(),
    products: productos.map((p) => ({
      code: p.slug,
      name: p.name,
      price: Number(p.price),
    })),
  })
}
