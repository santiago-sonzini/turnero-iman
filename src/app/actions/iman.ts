"use server"
import { db } from "@/server/db"
import { revalidatePath } from "next/cache"
import {
  calcularStats,
  resumenMetricas,
  VENTANA_RECUPERO,
  type ClienteStats,
  type EstadoCliente,
} from "@/server/iman/engine"
import { normalizarTelefono, sugerirFusiones } from "@/server/iman/normalize"
import { DEFAULT_PLANTILLAS } from "@/server/iman/default-templates"
import { getBusinessProfile } from "./business"

// Ventas que alimentan el motor: toda orden no cancelada/reembolsada.
const VENTAS_VALIDAS = { status: { notIn: ["CANCELLED", "REFUNDED"] as any } }

async function ventasPlanas() {
  const orders = await db.order.findMany({
    where: VENTAS_VALIDAS,
    select: { userId: true, total: true, createdAt: true },
  })
  return orders.map((o) => ({
    clienteId: o.userId,
    fecha: o.createdAt,
    monto: Number(o.total),
  }))
}

async function contactosPlanos() {
  const contactos = await db.contactLog.findMany({
    select: { id: true, clientId: true, sentAt: true, statusAtSend: true },
  })
  return contactos.map((c) => ({
    id: c.id,
    clienteId: c.clientId,
    fecha: c.sentAt,
    estadoEntonces: c.statusAtSend,
  }))
}

// ── Semáforo ────────────────────────────────────────────────────────────────

export interface ClienteSemaforo {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  estado: EstadoCliente
  dias: number | null
  ultima: string | null // ISO
  ciclo: number
  cicloEstimado: boolean
  compras: number
  total: number
  promedio: number
  ultimoContacto: { fecha: string; plantilla: string } | null
  recuperado: boolean
}

export async function getClientesSemaforo(): Promise<ClienteSemaforo[]> {
  const [clientes, ventas, contactos] = await Promise.all([
    db.client.findMany({
      select: { id: true, name: true, phone: true, email: true, notes: true },
    }),
    ventasPlanas(),
    contactosPlanos(),
  ])

  const stats = calcularStats(clientes.map((c) => c.id), ventas)
  const { porContacto } = resumenMetricas(contactos, ventas)

  const recuperados = new Set<string>()
  for (const c of contactos) {
    if (porContacto.has(c.id)) recuperados.add(c.clienteId)
  }

  const ultimoContactoDe = new Map<string, { fecha: Date; plantilla: string }>()
  const contactosDb = await db.contactLog.findMany({
    orderBy: { sentAt: "desc" },
    select: { clientId: true, sentAt: true, templateName: true },
  })
  for (const c of contactosDb) {
    if (!ultimoContactoDe.has(c.clientId)) {
      ultimoContactoDe.set(c.clientId, { fecha: c.sentAt, plantilla: c.templateName })
    }
  }

  return clientes.map((c) => {
    const s = stats.get(c.id)!
    const uc = ultimoContactoDe.get(c.id)
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ? normalizarTelefono(c.phone) : null,
      email: c.email,
      notes: c.notes,
      estado: s.estado,
      dias: s.dias,
      ultima: s.ultima ? s.ultima.toISOString() : null,
      ciclo: s.ciclo,
      cicloEstimado: s.cicloEstimado,
      compras: s.compras,
      total: s.total,
      promedio: s.promedio,
      ultimoContacto: uc
        ? { fecha: uc.fecha.toISOString(), plantilla: uc.plantilla }
        : null,
      recuperado: recuperados.has(c.id),
    }
  })
}

// ── Detalle de un cliente ───────────────────────────────────────────────────

export interface ClienteIntel {
  cliente: { id: string; name: string; phone: string | null; email: string | null; notes: string | null }
  stats: Omit<ClienteStats, "ultima"> & { ultima: string | null }
  productosFrecuentes: Array<{ nombre: string; veces: number; ultimaVez: string }>
  timeline: Array<
    | { tipo: "venta"; fecha: string; monto: number; detalle: string }
    | { tipo: "contacto"; fecha: string; plantilla: string; recupero: boolean }
  >
}

export async function getClienteIntel(clientId: string): Promise<ClienteIntel | null> {
  const cliente = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, phone: true, email: true, notes: true },
  })
  if (!cliente) return null

  const [ventas, contactos] = await Promise.all([ventasPlanas(), contactosPlanos()])
  const stats = calcularStats([clientId], ventas).get(clientId)!
  const { porContacto } = resumenMetricas(contactos, ventas)

  const ordenes = await db.order.findMany({
    where: { userId: clientId, ...VENTAS_VALIDAS },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      createdAt: true,
      total: true,
      products: {
        select: { quantity: true, customName: true, product: { select: { name: true } } },
      },
    },
  })

  // Productos más comprados (todas las órdenes, no solo las últimas 30)
  const items = await db.productInOrder.findMany({
    where: { order: { userId: clientId, ...VENTAS_VALIDAS } },
    select: {
      purchaseDate: true,
      customName: true,
      product: { select: { name: true } },
    },
  })
  const frec = new Map<string, { veces: number; ultimaVez: Date }>()
  for (const it of items) {
    const nombre = it.product?.name ?? it.customName ?? "(producto)"
    const cur = frec.get(nombre)
    if (!cur) frec.set(nombre, { veces: 1, ultimaVez: it.purchaseDate })
    else {
      cur.veces++
      if (it.purchaseDate > cur.ultimaVez) cur.ultimaVez = it.purchaseDate
    }
  }
  const productosFrecuentes = [...frec.entries()]
    .sort((a, b) => b[1].veces - a[1].veces)
    .slice(0, 5)
    .map(([nombre, v]) => ({ nombre, veces: v.veces, ultimaVez: v.ultimaVez.toISOString() }))

  const contactosCliente = await db.contactLog.findMany({
    where: { clientId },
    orderBy: { sentAt: "desc" },
    select: { id: true, sentAt: true, templateName: true },
  })

  const timeline: ClienteIntel["timeline"] = [
    ...ordenes.map((o) => ({
      tipo: "venta" as const,
      fecha: o.createdAt.toISOString(),
      monto: Number(o.total),
      detalle: o.products
        .map((p) => `${p.quantity}× ${p.product?.name ?? p.customName ?? "producto"}`)
        .slice(0, 3)
        .join(", "),
    })),
    ...contactosCliente.map((c) => ({
      tipo: "contacto" as const,
      fecha: c.sentAt.toISOString(),
      plantilla: c.templateName,
      recupero: porContacto.has(c.id),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  return {
    cliente,
    stats: { ...stats, ultima: stats.ultima ? stats.ultima.toISOString() : null },
    productosFrecuentes,
    timeline,
  }
}

// ── Registro de contactos ───────────────────────────────────────────────────

export async function registrarContacto(input: {
  clientId: string
  templateId?: string | null
  templateName: string
  message: string
  statusAtSend: string
  mediaUrl?: string | null
}) {
  await db.contactLog.create({
    data: {
      clientId: input.clientId,
      templateId: input.templateId ?? null,
      templateName: input.templateName || "personalizado",
      message: input.message,
      statusAtSend: input.statusAtSend,
      mediaUrl: input.mediaUrl ?? null,
    },
  })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/resultados")
  return { status: 200 }
}

// ── Plantillas ──────────────────────────────────────────────────────────────

// Carga las plantillas por defecto la primera vez (deploy real o demo) para
// que Promos nunca arranque vacío. Idempotente: solo actúa si no hay ninguna.
export async function ensureDefaultTemplates() {
  const count = await db.messageTemplate.count()
  if (count > 0) return
  await db.messageTemplate.createMany({
    data: DEFAULT_PLANTILLAS.map((t) => ({
      name: t.name,
      situation: t.situation,
      text: t.text,
      imageUrl: t.imageUrl ?? null,
      isDefault: t.isDefault ?? true,
    })),
  })
}

export async function getPlantillas() {
  await ensureDefaultTemplates()
  return db.messageTemplate.findMany({ orderBy: { createdAt: "asc" } })
}

export async function guardarPlantilla(input: {
  id?: string
  name: string
  situation?: string
  text: string
  imageUrl?: string | null
}) {
  if (!input.name.trim() || !input.text.trim()) {
    return { status: 400, message: "La plantilla necesita nombre y texto." }
  }
  const data = {
    name: input.name.trim(),
    situation: input.situation?.trim() || null,
    text: input.text,
    imageUrl: input.imageUrl ?? null,
  }
  const saved = input.id
    ? await db.messageTemplate.update({ where: { id: input.id }, data })
    : await db.messageTemplate.create({ data })
  revalidatePath("/dashboard/promos")
  return { status: 200, data: saved }
}

export async function borrarPlantilla(id: string) {
  await db.messageTemplate.delete({ where: { id } })
  revalidatePath("/dashboard/promos")
  return { status: 200 }
}

// ── Segmentos para el armador de promos ─────────────────────────────────────

export type SegmentoInput =
  | { tipo: "top"; cantidad: number }
  | { tipo: "categoria"; categoriaId: string }
  | { tipo: "inactivos"; dias: number }
  | { tipo: "estado"; estado: EstadoCliente }

export async function getSegmento(seg: SegmentoInput): Promise<ClienteSemaforo[]> {
  const todos = await getClientesSemaforo()

  if (seg.tipo === "top") {
    return [...todos].sort((a, b) => b.total - a.total).slice(0, seg.cantidad)
  }
  if (seg.tipo === "inactivos") {
    return todos
      .filter((c) => c.dias == null || c.dias >= seg.dias)
      .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999))
  }
  if (seg.tipo === "estado") {
    return todos.filter((c) => c.estado === seg.estado).sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))
  }
  // categoria: clientes que compraron productos de esa categoría
  const compradores = await db.productInOrder.findMany({
    where: {
      product: { categoryId: seg.categoriaId },
      order: VENTAS_VALIDAS,
    },
    select: { order: { select: { userId: true } } },
  })
  const ids = new Set(compradores.map((c) => c.order.userId))
  return todos.filter((c) => ids.has(c.id)).sort((a, b) => b.total - a.total)
}

// ── Resultados (métrica estrella) ───────────────────────────────────────────

export interface Resultados {
  clientesRecuperados: number
  montoRecuperado: number
  totalContactos: number
  clientesContactados: number
  tasaRecupero: number | null
  ventanaDias: number
  recuperos: Array<{
    clienteNombre: string
    contactoFecha: string
    ventaFecha: string
    monto: number
    plantilla: string
  }>
  contactosRecientes: Array<{
    clienteNombre: string
    fecha: string
    plantilla: string
    estadoEntonces: string
    recupero: boolean
  }>
}

export async function getResultados(): Promise<Resultados> {
  const [ventas, contactos] = await Promise.all([ventasPlanas(), contactosPlanos()])
  const r = resumenMetricas(contactos, ventas)

  const contactosDb = await db.contactLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
    select: {
      id: true,
      sentAt: true,
      templateName: true,
      statusAtSend: true,
      client: { select: { name: true } },
    },
  })
  const plantillaDeContacto = new Map(contactosDb.map((c) => [c.id, c.templateName]))
  const nombreDeContacto = new Map(contactosDb.map((c) => [c.id, c.client.name]))

  return {
    clientesRecuperados: r.clientesRecuperados,
    montoRecuperado: r.montoRecuperado,
    totalContactos: r.totalContactos,
    clientesContactados: r.clientesContactados,
    tasaRecupero: r.tasaRecupero,
    ventanaDias: VENTANA_RECUPERO,
    recuperos: r.recuperos
      .sort((a, b) => b.ventaFecha.getTime() - a.ventaFecha.getTime())
      .slice(0, 20)
      .map((rec) => ({
        clienteNombre: nombreDeContacto.get(rec.contactoId) ?? "",
        contactoFecha: rec.contactoFecha.toISOString(),
        ventaFecha: rec.ventaFecha.toISOString(),
        monto: rec.monto,
        plantilla: plantillaDeContacto.get(rec.contactoId) ?? "personalizado",
      })),
    contactosRecientes: contactosDb.slice(0, 15).map((c) => ({
      clienteNombre: c.client.name,
      fecha: c.sentAt.toISOString(),
      plantilla: c.templateName,
      estadoEntonces: c.statusAtSend,
      recupero: r.porContacto.has(c.id),
    })),
  }
}

// ── Duplicados y fusión ─────────────────────────────────────────────────────

export async function getSugerenciasFusion() {
  const clientes = await db.client.findMany({
    select: { id: true, name: true, phone: true, _count: { select: { orders: true } } },
  })
  return sugerirFusiones(clientes).map(({ a, b, score }) => ({
    score: Math.round(score * 100) / 100,
    a: { id: a.id, name: a.name, phone: a.phone, ordenes: a._count.orders },
    b: { id: b.id, name: b.name, phone: b.phone, ordenes: b._count.orders },
  }))
}

// Reasigna todo lo del duplicado al cliente que queda y borra el duplicado.
export async function fusionarClientes(keepId: string, mergeId: string) {
  if (keepId === mergeId) return { status: 400, message: "Elegí dos clientes distintos." }
  const [keep, merge] = await Promise.all([
    db.client.findUnique({ where: { id: keepId } }),
    db.client.findUnique({ where: { id: mergeId } }),
  ])
  if (!keep || !merge) return { status: 404, message: "Cliente no encontrado." }

  await db.$transaction(async (tx: any) => {
    await tx.order.updateMany({ where: { userId: mergeId }, data: { userId: keepId } })
    await tx.payment.updateMany({ where: { clientId: mergeId }, data: { clientId: keepId } })
    await tx.contactLog.updateMany({ where: { clientId: mergeId }, data: { clientId: keepId } })
    await tx.reorderAlert.updateMany({ where: { userId: mergeId }, data: { userId: keepId } })
    await tx.user.updateMany({ where: { clientId: mergeId }, data: { clientId: keepId } })
    // Completar datos que al principal le falten
    await tx.client.update({
      where: { id: keepId },
      data: {
        phone: keep.phone ?? merge.phone,
        email: keep.email ?? merge.email,
        adress: keep.adress ?? merge.adress,
        notes: [keep.notes, merge.notes].filter(Boolean).join(" · ") || null,
      },
    })
    await tx.client.delete({ where: { id: mergeId } })
  })
  revalidatePath("/dashboard")
  return { status: 200, message: `${merge.name} se fusionó con ${keep.name}.` }
}

// ── Import de ventas históricas (CSV) ───────────────────────────────────────
// Columnas esperadas: cliente, fecha (dd/mm/aaaa), monto, telefono (opcional).
// Crea clientes que no existan (por nombre) y una orden por fila.

export interface FilaImport {
  cliente: string
  fecha: string
  monto: number
  telefono?: string
}

export async function importarVentas(filas: FilaImport[]) {
  if (!filas.length) return { status: 400, message: "No hay filas para importar." }

  let creadas = 0
  let clientesNuevos = 0
  const errores: string[] = []

  const parseFecha = (s: string): Date | null => {
    const t = s.trim()
    let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (m) {
      const anio = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      const d = new Date(anio, Number(m[2]) - 1, Number(m[1]), 12)
      return isNaN(d.getTime()) ? null : d
    }
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]!
    const nombre = f.cliente?.trim()
    const fecha = parseFecha(f.fecha ?? "")
    const monto = Number(f.monto)
    if (!nombre || !fecha || !isFinite(monto) || monto <= 0) {
      errores.push(`Fila ${i + 2}: datos inválidos (cliente/fecha/monto).`)
      continue
    }

    let cliente = await db.client.findFirst({ where: { name: nombre } })
    if (!cliente) {
      cliente = await db.client.create({
        data: {
          name: nombre,
          phone: f.telefono ? normalizarTelefono(f.telefono) : null,
        },
      })
      clientesNuevos++
    }

    await db.order.create({
      data: {
        orderNumber: `IMP-${Date.now()}-${i}`,
        userId: cliente.id,
        status: "COMPLETED",
        paymentStatus: "PAID",
        percentageofPayment: 100,
        subtotal: monto,
        discount: 0,
        total: monto,
        profit: 0,
        notes: "Importado de historial",
        createdAt: fecha,
        updatedAt: fecha,
      },
    })
    creadas++
  }

  revalidatePath("/dashboard")
  return {
    status: 200,
    message: `${creadas} ventas importadas${clientesNuevos ? `, ${clientesNuevos} clientes nuevos` : ""}.`,
    errores,
  }
}

// ── Datos auxiliares para armar mensajes ────────────────────────────────────

export async function getContextoPromos() {
  const [negocio, categorias, productos, plantillas] = await Promise.all([
    getBusinessProfile(),
    db.category.findMany({ select: { id: true, name: true } }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, images: true, imageUrl: true },
      orderBy: { name: "asc" },
    }),
    getPlantillas(),
  ])
  return { negocio, categorias, productos, plantillas }
}

export async function actualizarTelefono(clientId: string, telefono: string) {
  const normalizado = normalizarTelefono(telefono)
  if (!normalizado || normalizado.length < 11) {
    return { status: 400, message: "Teléfono inválido. Usá código de área + número." }
  }
  try {
    await db.client.update({ where: { id: clientId }, data: { phone: normalizado } })
  } catch {
    return { status: 400, message: "Ese teléfono ya está usado por otro cliente." }
  }
  revalidatePath("/dashboard")
  return { status: 200, data: normalizado }
}
