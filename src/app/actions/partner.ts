"use server"
// Conexión partner por URL (distribuidora ↔ comercio). Cada deploy sigue
// siendo un solo negocio; se conectan por HTTP con URL + token, opt-in de los
// dos lados. Nada de multi-tenancy dentro de una base.
import { headers } from "next/headers"
import { randomUUID } from "crypto"
import { db } from "@/server/db"
import { revalidatePath } from "next/cache"
import { normalizarNombre } from "@/server/iman/normalize"

export interface PartnerConfig {
  partnerToken: string | null
  shareStockEnabled: boolean
  sharePricelistEnabled: boolean
  supplierUrl: string | null
  supplierToken: string | null
}

// Devuelve (o crea) la fila única del negocio. Necesario porque un deploy
// nuevo puede no tener BusinessProfile todavía.
async function ensureBusiness() {
  const existing = await db.businessProfile.findFirst()
  if (existing) return existing
  return db.businessProfile.create({ data: { name: "Mi negocio" } })
}

export async function getPartnerConfig(): Promise<PartnerConfig> {
  const b = await db.businessProfile.findFirst()
  return {
    partnerToken: b?.partnerToken ?? null,
    shareStockEnabled: b?.shareStockEnabled ?? false,
    sharePricelistEnabled: b?.sharePricelistEnabled ?? false,
    supplierUrl: b?.supplierUrl ?? null,
    supplierToken: b?.supplierToken ?? null,
  }
}

export async function updatePartnerConfig(data: {
  shareStockEnabled?: boolean
  sharePricelistEnabled?: boolean
  supplierUrl?: string | null
  supplierToken?: string | null
}) {
  const b = await ensureBusiness()
  const shareStock = data.shareStockEnabled ?? b.shareStockEnabled
  const sharePrice = data.sharePricelistEnabled ?? b.sharePricelistEnabled
  // Si se enciende algún opt-in de exposición y no hay token, generar uno.
  const needToken = (shareStock || sharePrice) && !b.partnerToken
  const saved = await db.businessProfile.update({
    where: { id: b.id },
    data: {
      shareStockEnabled: shareStock,
      sharePricelistEnabled: sharePrice,
      ...(data.supplierUrl !== undefined ? { supplierUrl: data.supplierUrl?.trim() || null } : {}),
      ...(data.supplierToken !== undefined ? { supplierToken: data.supplierToken?.trim() || null } : {}),
      ...(needToken ? { partnerToken: randomUUID() } : {}),
    },
  })
  revalidatePath("/dashboard/ajustes")
  return { status: 200, data: saved }
}

export async function regeneratePartnerToken() {
  const b = await ensureBusiness()
  const saved = await db.businessProfile.update({
    where: { id: b.id },
    data: { partnerToken: randomUUID() },
  })
  revalidatePath("/dashboard/ajustes")
  return { status: 200, token: saved.partnerToken }
}

// ── Actualización de precios desde la distribuidora ─────────────────────────

export interface DiffPrecio {
  productId: string
  name: string
  slug: string
  costActual: number
  costNuevo: number
  price: number // precio de venta actual (para mostrar el margen resultante)
}

// Convierte una URL relativa (ej: /demo/...) en absoluta para poder hacer fetch
// desde el server.
function absoluta(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const h = headers()
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("host") ?? "localhost:3000"
  return `${proto}://${host}${url.startsWith("/") ? url : `/${url}`}`
}

interface PricelistItem {
  code?: string
  name?: string
  price?: number
}

export async function buscarActualizacionesPrecios(): Promise<{
  status: number
  message?: string
  diffs?: DiffPrecio[]
}> {
  const cfg = await getPartnerConfig()
  if (!cfg.supplierUrl) {
    return { status: 400, message: "Cargá primero la URL de tu proveedor en Ajustes." }
  }

  let items: PricelistItem[]
  try {
    const res = await fetch(absoluta(cfg.supplierUrl), {
      headers: cfg.supplierToken ? { Authorization: `Bearer ${cfg.supplierToken}` } : {},
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return { status: res.status, message: `El proveedor respondió ${res.status}.` }
    const raw = await res.text()
    if (raw.length > 2_000_000) return { status: 413, message: "La lista es demasiado grande." }
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed) ? parsed : parsed.products
    if (!Array.isArray(items)) return { status: 422, message: "Formato de lista inesperado." }
  } catch (e: any) {
    const timeout = e?.name === "TimeoutError" || e?.name === "AbortError"
    return {
      status: 502,
      message: timeout ? "El proveedor no respondió a tiempo." : "No se pudo leer la lista del proveedor.",
    }
  }

  // Indexar la lista del proveedor por código y por nombre normalizado
  const porCodigo = new Map<string, number>()
  const porNombre = new Map<string, number>()
  for (const it of items) {
    const precio = Number(it.price)
    if (!isFinite(precio) || precio <= 0) continue
    if (it.code) porCodigo.set(String(it.code), precio)
    if (it.name) porNombre.set(normalizarNombre(it.name), precio)
  }

  const productos = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, cost: true, price: true },
  })

  const diffs: DiffPrecio[] = []
  for (const p of productos) {
    const nuevo = porCodigo.get(p.slug) ?? porNombre.get(normalizarNombre(p.name))
    if (nuevo == null) continue
    const costActual = Math.round(Number(p.cost) * 100) / 100
    const costNuevo = Math.round(nuevo * 100) / 100
    if (costNuevo === costActual) continue
    diffs.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      costActual,
      costNuevo,
      price: Number(p.price),
    })
  }

  return { status: 200, diffs }
}

// Aplica solo los cambios elegidos por el usuario (semi-automático). Marca los
// productos como gestionados por el proveedor (supplierLinked).
export async function aplicarActualizacionesPrecios(
  cambios: Array<{ productId: string; costNuevo: number }>,
) {
  if (!cambios.length) return { status: 400, message: "No hay cambios para aplicar." }
  // Callback form (no la de array): compatible con el proxy de modo demo.
  await db.$transaction(async (tx: any) => {
    for (const c of cambios) {
      await tx.product.update({
        where: { id: c.productId },
        data: { cost: c.costNuevo, supplierLinked: true },
      })
    }
  })
  revalidatePath("/dashboard/products")
  return { status: 200, message: `${cambios.length} precios actualizados.` }
}
