"use server"
import { db } from "@/server/db"
import { requireFeature } from "@/server/gate"
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client"

export interface OrderItemInput {
  /** Registered product id. Null/empty for free-text ("custom") line items. */
  productId?: string | null
  /** Free-text name used when the line item is not a registered product. */
  customName?: string | null
  quantity: number
  unitPrice: number
  costAtPurchase: number
}


export async function createInvoice(userId: string, items: OrderItemInput[], discount: number = 0, paymentStatus: PaymentStatus = PaymentStatus.PENDING, iva: boolean = false) {
  await requireFeature("recibos")
  if (!userId || !items || items.length === 0) {
    return {
      status: 400,
      data: { error: "Missing required fields" },
    }
  }

  // Only registered line items carry a productId; custom (free-text) lines don't.
  const productIds = items
    .map((i) => i.productId)
    .filter((id): id is string => !!id)

  const products = productIds.length
    ? await db.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          price: true,
          stock: true,
          estimatedDurationDays: true,
        },
      })
    : []

  const notFound = productIds.filter((id) => !products.find((p) => p.id === id))

  if (notFound.length > 0) {
    //search wich products are not found
    console.log("🚀 ~ createInvoice ~ notFound:", notFound)
    return {
      status: 400,
      data: { error: "One or more products not found or inactive" },
    }
  }

  const orderNumber = `F-${Date.now()}`
  const subtotal = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  )
  console.log("🚀 ~ createInvoice ~ subtotal:", subtotal)

  const total = (subtotal * (1 - discount / 100))
  const totalIva = total * (iva ? (1 + 21 / 100) : 1)
  console.log("🚀 ~ createInvoice ~ total:", total)

  const cost = items.reduce(
    (sum, i) => sum + i.costAtPurchase * i.quantity,
    0
  )

  const profit = total - cost
  console.log("🚀 ~ createInvoice ~ profit:", profit)

  const order = await db.$transaction(async (tx: any) => {

    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: OrderStatus.COMPLETED,
        paymentStatus: paymentStatus,
        percentageofPayment: paymentStatus === PaymentStatus.PAID ? 100 : 0,
        subtotal: subtotal,
        discount: discount,
        total: totalIva,
        profit: profit,
        products: {
          create: items.map((item) => {
            const product = item.productId
              ? products.find((p: any) => p.id === item.productId)
              : undefined
            const itemSubtotal = item.quantity * item.unitPrice
            let estimatedRunOutDate: Date | undefined
            let itemProfit = itemSubtotal * (1 - (discount / 100)) - (item.costAtPurchase * item.quantity)

            if (product?.estimatedDurationDays) {
              estimatedRunOutDate = new Date()
              estimatedRunOutDate.setDate(
                estimatedRunOutDate.getDate() + product.estimatedDurationDays
              )
            }

            return {
              productId: item.productId || null,
              customName: item.productId ? null : (item.customName ?? null),
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: new Prisma.Decimal(discount),
              subtotal: new Prisma.Decimal(itemSubtotal),
              profit: new Prisma.Decimal(itemProfit),
              purchaseDate: new Date(),
              costAtPurchase: new Prisma.Decimal(item.costAtPurchase),
              estimatedRunOutDate,
              hasRunOut: false,
              reorderSent: false,
            }
          }),
        },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Update stock
    // for (const item of items) {
    //   await tx.product.update({
    //     where: { id: item.productId },
    //     data: {
    //       stock: { decrement: item.quantity },
    //     },
    //   })
    // }

    return newOrder
  }, {
    timeout: 15000, // 15 seconds
    maxWait: 5000,
  })

  const serializedOrder = {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    products: order.products.map((p: any) => ({
      ...p,
      unitPrice: Number(p.unitPrice),
      discount: Number(p.discount),
      subtotal: Number(p.subtotal),
      product: p.product
        ? {
            ...p.product,
            price: Number(p.product.price),
            unitQuantity: p.product.unitQuantity
              ? Number(p.product.unitQuantity)
              : null,
          }
        : null,
    })),
  }

  return { status: 201, data: serializedOrder }
}


export interface UpdateInvoiceInput {
  discount?: number
  paymentStatus?: PaymentStatus
  iva?: boolean
  items?: OrderItemInput[]
}

export async function updateInvoice(
  orderId: string,
  updates: UpdateInvoiceInput
) {
  if (!orderId) {
    return { status: 400, data: { error: "Missing order ID" } }
  }

  const existingOrder = await db.order.findUnique({
    where: { id: orderId },
    include: {
      products: true,
    },
  })

  if (!existingOrder) {
    return { status: 404, data: { error: "Order not found" } }
  }

  // Calcular nuevos valores si se actualizan los items
  let items = updates.items
  let products: any[] = []

  if (items && items.length > 0) {
    const productIds = items
      .map((i) => i.productId)
      .filter((id): id is string => !!id)

    products = productIds.length
      ? await db.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, price: true, stock: true, estimatedDurationDays: true },
        })
      : []

    const notFound = productIds.filter((id) => !products.find((p) => p.id === id))

    if (notFound.length > 0) {
      return {
        status: 400,
        data: { error: "One or more products not found or inactive" },
      }
    }
  }

  const discount = updates.discount ?? Number(existingOrder.discount)
  const iva = updates.iva ?? false

  // Recalcular totales si hay nuevos items, sino usar los existentes
  const baseItems = items ?? existingOrder.products.map((p: any) => ({
    productId: p.productId,
    customName: p.customName,
    quantity: p.quantity,
    unitPrice: Number(p.unitPrice),
    costAtPurchase: Number(p.costAtPurchase),
  }))

  const subtotal = baseItems.reduce(
    (sum: number, i: any) => sum + i.quantity * i.unitPrice,
    0
  )

  const total = subtotal * (1 - discount / 100)
  const totalIva = total * (iva ? 1 + 21 / 100 : 1)

  const cost = baseItems.reduce(
    (sum: number, i: any) => sum + i.costAtPurchase * i.quantity,
    0
  )
  const profit = total - cost

  // Si hay nuevos items, reemplazar los existentes
  if (items && items.length > 0) {
    await db.productInOrder.deleteMany({ where: { orderId } })

    await db.order.update({
      where: { id: orderId },
      data: {
        products: {
          create: items.map((item) => {
            const product = item.productId
              ? products.find((p: any) => p.id === item.productId)
              : undefined
            const itemSubtotal = item.quantity * item.unitPrice
            const itemProfit =
              itemSubtotal * (1 - discount / 100) -
              item.costAtPurchase * item.quantity

            let estimatedRunOutDate: Date | undefined
            if (product?.estimatedDurationDays) {
              estimatedRunOutDate = new Date()
              estimatedRunOutDate.setDate(
                estimatedRunOutDate.getDate() + product.estimatedDurationDays
              )
            }

            return {
              productId: item.productId || null,
              customName: item.productId ? null : (item.customName ?? null),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: discount,
              subtotal: itemSubtotal,
              profit: itemProfit,
              purchaseDate: new Date(),
              costAtPurchase: item.costAtPurchase,
              estimatedRunOutDate,
              hasRunOut: false,
              reorderSent: false,
            }
          }),
        },
      },
    })
  }

  // % pagado coherente con los pagos registrados: al des-pagar (PENDING) no se
  // fuerza a 0 — se deriva de lo efectivamente asignado (PaymentAllocation).
  let pctForStatus: number | undefined
  if (updates.paymentStatus !== undefined) {
    if (updates.paymentStatus === PaymentStatus.PAID) {
      pctForStatus = 100
    } else {
      const agg = await db.paymentAllocation.aggregate({
        _sum: { amount: true },
        where: { orderId },
      })
      const pagado = Number(agg._sum.amount ?? 0)
      pctForStatus =
        totalIva > 0
          ? Math.min(100, Math.round((pagado / totalIva) * 10000) / 100)
          : 0
    }
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      ...(updates.paymentStatus !== undefined && {
        paymentStatus: updates.paymentStatus,
        percentageofPayment: pctForStatus,
        paidAt: updates.paymentStatus === PaymentStatus.PAID ? new Date() : null,
      }),
      ...(updates.discount !== undefined && {
        discount: updates.discount,
      }),
      subtotal,
      total: totalIva,
      profit,
    },
    include: {
      products: {
        include: { product: true },
      },
      client: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  const serializedOrder = {
    ...updatedOrder,
    subtotal: Number(updatedOrder.subtotal),
    discount: Number(updatedOrder.discount),
    total: Number(updatedOrder.total),
    products: updatedOrder.products.map((p: any) => ({
      ...p,
      unitPrice: Number(p.unitPrice),
      discount: Number(p.discount),
      subtotal: Number(p.subtotal),
      product: p.product
        ? {
            ...p.product,
            price: Number(p.product.price),
            unitQuantity: p.product.unitQuantity
              ? Number(p.product.unitQuantity)
              : null,
          }
        : null,
    })),
  }

  return { status: 200, data: serializedOrder }
}