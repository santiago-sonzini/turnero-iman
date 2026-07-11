"use server"

import { db } from "@/server/db"
import { PaymentStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

// Redondea a 2 decimales evitando ruido de punto flotante.
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Refresca las rutas donde se ve el saldo del cliente tras un cambio de pagos.
function revalidateClient(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath(`/dashboard/clients/${clientId}/payments`)
  revalidatePath(`/history/${clientId}`)
  revalidatePath(`/history/${clientId}/payments`)
}

// Única fuente de verdad del estado de pago de una orden: recalcula
// `percentageofPayment`, `paymentStatus` y `paidAt` a partir de la suma de sus
// asignaciones (PaymentAllocation). Se llama después de crear o borrar pagos.
async function recomputeOrderPayment(tx: any, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { total: true },
  })
  if (!order) return

  const agg = await tx.paymentAllocation.aggregate({
    _sum: { amount: true },
    where: { orderId },
  })
  const paid = Number(agg._sum.amount ?? 0)
  const total = Number(order.total)

  // Pagada cuando el residuo es menor a un centavo: evita que el redondeo de
  // varios pagos parciales deje la orden clavada en 99.99% para siempre.
  const isPaid = total > 0 ? total - paid <= 0.01 : paid > 0

  let pct = 0
  if (isPaid) pct = 100
  else if (total > 0) pct = Math.min(100, round2((paid / total) * 100))
  await tx.order.update({
    where: { id: orderId },
    data: {
      percentageofPayment: pct,
      paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paidAt: isPaid ? new Date() : null,
    },
  })
}

// El saldo pendiente de una orden = total * (1 - % pagado / 100).
const outstandingOf = (order: { total: any; percentageofPayment: number | null }) =>
  round2(Number(order.total) * (1 - (order.percentageofPayment || 0) / 100))

export const createPayment = async (data: {
  clientId: string
  orderIds: string[]
  total: number
  byDate: boolean
  paymentMethod?: string
}) => {
  try {
    // ---------------------------------------
    // 1) TRAER ÓRDENES CANDIDATAS (por IDs o todas las pendientes)
    // ---------------------------------------
    let orders = data.orderIds.length > 0
      ? await db.order.findMany({
          where: { id: { in: data.orderIds }, userId: data.clientId },
          orderBy: data.byDate ? { createdAt: "asc" } : undefined,
        })
      : await db.order.findMany({
          where: { userId: data.clientId, percentageofPayment: { lt: 100 } },
          orderBy: { createdAt: "asc" },
        })

    // Modo "por orden de selección": findMany con `id IN (...)` no garantiza
    // el orden del array, así que lo reimponemos según lo que eligió el usuario.
    if (data.orderIds.length > 0 && !data.byDate) {
      const posicion = new Map(data.orderIds.map((id, i) => [id, i]))
      orders = [...orders].sort(
        (a, b) => (posicion.get(a.id) ?? 0) - (posicion.get(b.id) ?? 0),
      )
    }

    // Solo las que tienen saldo pendiente participan del pago.
    const pendientes = orders
      .map((o) => ({ order: o, outstanding: outstandingOf(o) }))
      .filter((x) => x.outstanding > 0)

    if (!pendientes.length) {
      return { status: 404, message: "No hay órdenes con saldo pendiente para pagar" }
    }

    const totalOutstanding = round2(
      pendientes.reduce((sum, x) => sum + x.outstanding, 0),
    )

    // No se permite sobrepago: se limita al saldo total pendiente.
    const cappedTotal = Math.min(round2(data.total), totalOutstanding)
    if (cappedTotal <= 0) {
      return { status: 400, message: "El monto del pago debe ser mayor a cero" }
    }

    // ---------------------------------------
    // 2) REPARTIR EL PAGO ENTRE LAS ÓRDENES (greedy)
    // ---------------------------------------
    let remaining = cappedTotal
    const allocations: { orderId: string; amount: number }[] = []
    for (const { order, outstanding } of pendientes) {
      if (remaining <= 0) break
      const amount = round2(Math.min(remaining, outstanding))
      if (amount <= 0) continue
      allocations.push({ orderId: order.id, amount })
      remaining = round2(remaining - amount)
    }

    const allocatedTotal = round2(
      allocations.reduce((sum, a) => sum + a.amount, 0),
    )

    // ---------------------------------------
    // 3) CREAR EL PAGO + ASIGNACIONES Y SINCRONIZAR ÓRDENES
    // ---------------------------------------
    await db.$transaction(async (tx: any) => {
      await tx.payment.create({
        data: {
          clientId: data.clientId,
          amount: allocatedTotal,
          paymentMethod: data.paymentMethod || "cash",
          orders: { connect: allocations.map((a) => ({ id: a.orderId })) },
          allocations: {
            create: allocations.map((a) => ({
              orderId: a.orderId,
              amount: a.amount,
            })),
          },
        },
      })

      for (const a of allocations) {
        await recomputeOrderPayment(tx, a.orderId)
      }
    })

    revalidateClient(data.clientId)

    return {
      status: 200,
      message: "Pago registrado correctamente",
      data: { amount: allocatedTotal, orders: allocations.length },
    }
  } catch (error) {
    console.error("Error creating payment:", error)
    return { status: 500, message: "Error al crear el pago" }
  }
}

// Paga el saldo restante de UNA sola orden en un click.
export const quickPayOrder = async (
  orderId: string,
  paymentMethod?: string,
) => {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, total: true, percentageofPayment: true },
    })
    if (!order) return { status: 404, message: "Orden no encontrada" }

    const outstanding = outstandingOf(order)
    if (outstanding <= 0) {
      return { status: 400, message: "La orden ya está pagada" }
    }

    await db.$transaction(async (tx: any) => {
      await tx.payment.create({
        data: {
          clientId: order.userId,
          amount: outstanding,
          paymentMethod: paymentMethod || "cash",
          orders: { connect: { id: order.id } },
          allocations: { create: [{ orderId: order.id, amount: outstanding }] },
        },
      })
      await recomputeOrderPayment(tx, order.id)
    })

    revalidateClient(order.userId)
    return { status: 200, message: "Orden pagada correctamente" }
  } catch (error) {
    console.error("Error in quickPayOrder:", error)
    return { status: 500, message: "Error al pagar la orden" }
  }
}

// Elimina un pago y revierte el saldo de las órdenes que había cancelado.
export const deletePayment = async (paymentId: string) => {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: { select: { orderId: true } } },
    })
    if (!payment) return { status: 404, message: "Pago no encontrado" }

    // Pagos anteriores al sistema de asignaciones: no sabemos cuánto aplicó a
    // cada orden, así que revertirlos automáticamente sería adivinar.
    if (payment.allocations.length === 0) {
      return {
        status: 400,
        message:
          "Este pago no tiene detalle de asignación (registro anterior); no se puede revertir automáticamente.",
      }
    }

    const affectedOrderIds = Array.from(
      new Set(payment.allocations.map((a) => a.orderId)),
    )

    await db.$transaction(async (tx: any) => {
      // Borramos las asignaciones explícitamente (no dependemos del cascade de
      // la FK) y después el pago; luego recalculamos el saldo de las órdenes.
      await tx.paymentAllocation.deleteMany({ where: { paymentId } })
      await tx.payment.delete({ where: { id: paymentId } })
      for (const orderId of affectedOrderIds) {
        await recomputeOrderPayment(tx, orderId)
      }
    })

    revalidateClient(payment.clientId)
    return { status: 200, message: "Pago eliminado y saldo revertido" }
  } catch (error) {
    console.error("Error deleting payment:", error)
    return { status: 500, message: "Error al eliminar el pago" }
  }
}

// Resumen de cuenta del cliente: facturado, pagado, saldo y # de pedidos.
export const getClientAccountSummary = async (clientId: string) => {
  const orders = await db.order.findMany({
    where: { userId: clientId },
    select: { total: true, percentageofPayment: true },
  })

  const totalFacturado = round2(
    orders.reduce((sum, o) => sum + Number(o.total), 0),
  )
  const saldoPendiente = round2(
    orders.reduce((sum, o) => sum + outstandingOf(o), 0),
  )
  const totalPagado = round2(totalFacturado - saldoPendiente)
  const pedidos = orders.length
  const pedidosPendientes = orders.filter(
    (o) => (o.percentageofPayment || 0) < 100,
  ).length

  return {
    totalFacturado,
    totalPagado,
    saldoPendiente,
    pedidos,
    pedidosPendientes,
  }
}

export async function getPayments(
  filters: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    paymentMethod?: string;
    clientId?: string;
  },
  clientId?: string
) {
  const {
    page,
    pageSize,
    sortBy,
    sortOrder,
    paymentMethod,
  } = filters;

  const where: any = {};

  // Filtrar por cliente si corresponde
  if (clientId) {
    where.clientId = clientId;
  }

  // Filtro por método de pago
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Sorting dinámico
  const orderBy: any = sortBy
    ? { [sortBy]: sortOrder === "desc" ? "desc" : "asc" }
    : { createdAt: "desc" };

  const [payments, totalCount] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
      include: {
        client: true,
        orders: true,
      },
    }),
    db.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
    },
  };
}
