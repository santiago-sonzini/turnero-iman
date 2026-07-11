"use server"
// Operaciones de precio en masa: aumento por porcentaje y aplicación de margen
// (precio = costo × (1 + margen)). Por selección de productos o por grupo
// (categoría / catálogo). Los márgenes por grupo se guardan en
// BusinessProfile.margins para recordarlos.
import { db } from "@/server/db"
import { requireFeature } from "@/server/gate"
import { revalidatePath } from "next/cache"

// Redondeo comercial: al múltiplo de 10 más cercano.
function redondear(n: number): number {
  return Math.max(0, Math.round(n / 10) * 10)
}

export interface GrupoPrecio {
  key: string        // categoryId o el string del catálogo
  label: string
  count: number
  margin: number | null // margen guardado (%), si hay
}

interface MarginsData {
  categories?: Record<string, number>
  catalogs?: Record<string, number>
}

async function leerMargins(): Promise<MarginsData> {
  const b = await db.businessProfile.findFirst()
  return (b?.margins as MarginsData) ?? {}
}

export async function getGruposPrecios(): Promise<{
  categorias: GrupoPrecio[]
  catalogos: GrupoPrecio[]
}> {
  const [categorias, catalogAgg, margins] = await Promise.all([
    db.category.findMany({
      select: { id: true, name: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    db.product.groupBy({
      by: ["catalog"],
      where: { catalog: { not: null } },
      _count: { _all: true },
    }),
    leerMargins(),
  ])

  return {
    categorias: categorias
      .filter((c) => c._count.products > 0)
      .map((c) => ({
        key: c.id,
        label: c.name,
        count: c._count.products,
        margin: margins.categories?.[c.id] ?? null,
      })),
    catalogos: (catalogAgg as Array<{ catalog: string | null; _count: { _all: number } }>)
      .filter((c) => c.catalog)
      .map((c) => ({
        key: c.catalog!,
        label: c.catalog!,
        count: c._count._all,
        margin: margins.catalogs?.[c.catalog!] ?? null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

// Lista de catálogos distintos (para el filtro dinámico).
export async function getCatalogos(): Promise<string[]> {
  const rows = await db.product.groupBy({
    by: ["catalog"],
    where: { catalog: { not: null } },
  })
  return (rows as Array<{ catalog: string | null }>)
    .map((r) => r.catalog!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

function whereGrupo(tipo: "categoria" | "catalogo", key: string) {
  return tipo === "categoria" ? { categoryId: key } : { catalog: key }
}

// Aplica un margen (precio = costo × (1+margen)) a todo un grupo y lo guarda.
export async function guardarYAplicarMargen(input: {
  tipo: "categoria" | "catalogo"
  key: string
  margin: number
}) {
  await requireFeature("precios")
  const { tipo, key, margin } = input
  if (!isFinite(margin) || margin < 0) return { status: 400, message: "Margen inválido." }

  const productos = await db.product.findMany({
    where: whereGrupo(tipo, key),
    select: { id: true, cost: true },
  })

  await db.$transaction(async (tx: any) => {
    for (const p of productos) {
      const nuevoPrecio = redondear(Number(p.cost) * (1 + margin / 100))
      await tx.product.update({ where: { id: p.id }, data: { price: nuevoPrecio } })
    }
    // Guardar el margen del grupo
    const b = await tx.businessProfile.findFirst()
    const current: MarginsData = (b?.margins as MarginsData) ?? {}
    const bucket = tipo === "categoria" ? "categories" : "catalogs"
    const next = { ...current, [bucket]: { ...(current[bucket] ?? {}), [key]: margin } }
    if (b) await tx.businessProfile.update({ where: { id: b.id }, data: { margins: next } })
  })

  revalidatePath("/dashboard/products")
  return { status: 200, message: `Margen ${margin}% aplicado a ${productos.length} productos.` }
}

// Aumento porcentual sobre el precio actual de todo un grupo.
export async function aumentarPreciosGrupo(input: {
  tipo: "categoria" | "catalogo"
  key: string
  pct: number
}) {
  await requireFeature("precios")
  const { tipo, key, pct } = input
  if (!isFinite(pct)) return { status: 400, message: "Porcentaje inválido." }
  const productos = await db.product.findMany({
    where: whereGrupo(tipo, key),
    select: { id: true, price: true },
  })
  await db.$transaction(async (tx: any) => {
    for (const p of productos) {
      await tx.product.update({
        where: { id: p.id },
        data: { price: redondear(Number(p.price) * (1 + pct / 100)) },
      })
    }
  })
  revalidatePath("/dashboard/products")
  return { status: 200, message: `Precios ${pct >= 0 ? "+" : ""}${pct}% en ${productos.length} productos.` }
}

// ── Sobre una selección manual de productos ─────────────────────────────────

export async function aumentarPreciosSeleccion(ids: string[], pct: number) {
  await requireFeature("precios")
  if (!ids.length) return { status: 400, message: "No hay productos seleccionados." }
  if (!isFinite(pct)) return { status: 400, message: "Porcentaje inválido." }
  const productos = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, price: true },
  })
  await db.$transaction(async (tx: any) => {
    for (const p of productos) {
      await tx.product.update({
        where: { id: p.id },
        data: { price: redondear(Number(p.price) * (1 + pct / 100)) },
      })
    }
  })
  revalidatePath("/dashboard/products")
  return { status: 200, message: `Precios ${pct >= 0 ? "+" : ""}${pct}% en ${productos.length} productos.` }
}

export async function aplicarMargenSeleccion(ids: string[], margin: number) {
  await requireFeature("precios")
  if (!ids.length) return { status: 400, message: "No hay productos seleccionados." }
  if (!isFinite(margin) || margin < 0) return { status: 400, message: "Margen inválido." }
  const productos = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, cost: true },
  })
  await db.$transaction(async (tx: any) => {
    for (const p of productos) {
      await tx.product.update({
        where: { id: p.id },
        data: { price: redondear(Number(p.cost) * (1 + margin / 100)) },
      })
    }
  })
  revalidatePath("/dashboard/products")
  return { status: 200, message: `Margen ${margin}% aplicado a ${productos.length} productos.` }
}
