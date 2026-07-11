'use server'

import { db } from '@/server/db'
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const prisma = db;

// -----------------------------
// Tipado y validación
// -----------------------------

const orderQuerySchema = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z
    .object({
      status: z.string().optional(),
      clientName: z.string().optional(),
      clientId: z.string().optional(),
    })
    .optional(),
})

export type OrderQueryParams = z.infer<typeof orderQuerySchema>

export type GetOrdersResponse = {
  orders: any[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

// -----------------------------
// Server Action principal
// -----------------------------

export async function getOrders(
  input: OrderQueryParams,
  clientId?: string
): Promise<GetOrdersResponse> {
  const { page, pageSize, sortBy, sortOrder, filters } =
    orderQuerySchema.parse(input);

  const where: any = {};

  // Status
  if (filters?.status) {
    where.status = filters.status;
  }

  // Client filters — se construyen una sola vez
  if (clientId) {
    where.userId = clientId; // campo FK real en el modelo
  } else if (filters?.clientName) {
    where.client = {
      name: { contains: filters.clientName, mode: "insensitive" },
    };
  }

  const orderBy: any = sortBy
    ? { [sortBy]: sortOrder || "asc" }
    : { createdAt: "desc" };

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
      include: {
        client: true,
        products: { include: { product: true } },
      },
    }),
  ]);

  const serializedOrders = orders.map((order) => ({
    ...order,
    createdAt: new Date(order.createdAt),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
  }));

  return {
    orders: serializedOrders,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}


export interface OrderItemInput {
  productId: string
  quantity: number
  unitPrice: number
}


export async function createOrder(userId: string, items: OrderItemInput[]) {
  if (!userId || !items || items.length === 0) {
    return {
      status: 400,
      data: { error: "Missing required fields" },
    }
  }

  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
    select: {
      id: true,
      price: true,
      stock: true,
      estimatedDurationDays: true,
    },
  })

  if (products.length !== productIds.length) {
    return {
      status: 400,
      data: { error: "One or more products not found or inactive" },
    }
  }

  for (const item of items) {
    const product = products.find((p: any) => p.id === item.productId)
    // if (product && product.stock < item.quantity) {
    //   return {
    //     status: 400,
    //     data: { error: `Insufficient stock for product ${item.productId}` },
    //   }
    // }
  }

  const orderNumber = `P-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`
  const subtotal = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  )

  const order = await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: subtotal,
        discount: 0,
        total: subtotal,

        products: {
          create: items.map((item) => {
            const product = products.find((p: any) => p.id === item.productId)!
            const itemSubtotal = item.quantity * item.unitPrice
            let estimatedRunOutDate: Date | undefined

            if (product.estimatedDurationDays) {
              estimatedRunOutDate = new Date()
              estimatedRunOutDate.setDate(
                estimatedRunOutDate.getDate() + product.estimatedDurationDays
              )
            }

            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: new Prisma.Decimal(0),
              subtotal: new Prisma.Decimal(itemSubtotal),
              purchaseDate: new Date(),
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
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      })
    }

    return newOrder
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
      product: {
        ...p.product,
        price: Number(p.product.price),
        unitQuantity: p.product.unitQuantity
          ? Number(p.product.unitQuantity)
          : null,
      },
    })),
  }

  return { status: 201, data: serializedOrder }
}


export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    adress: string | null;
  };
  
  products: {
    id: string;
    quantity: number;
    unitPrice: number;
    costAtPurchase: number;
    discount: number;
    index: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      category: string;
    };
  }[];
}





/**
 * Busca pedidos por número de orden o por fecha de creación
 * @param searchQuery - Query de búsqueda (puede ser número de orden o fecha en formato dd/mm/yy)
 * @returns Array de pedidos filtrados
 */
export async function searchOrders(searchQuery: string, clientId?: string) {
  console.log("🚀 ~ searchOrders ~ clientId:", clientId)
  console.log("🚀 ~ searchOrders ~ searchQuery:", searchQuery)

  try {
    if (!searchQuery || searchQuery.trim() === '') {
      // Si no hay búsqueda, devolver todos los pedidos
      const orders = await db.order.findMany({
        where: {
          userId: clientId
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          status: true,
          paymentStatus: true,
          percentageofPayment: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        success: true,
        data: orders,
        count: orders.length,
      }
    }

    const query = searchQuery.trim().toLowerCase()

    // Intentar detectar si es una búsqueda por fecha (formato dd/mm/yy)
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
    const dateMatch = query.match(datePattern)

    let orders

    if (dateMatch) {
      // Es una búsqueda por fecha
      const [, day, month, year] = dateMatch

      // Convertir año de 2 dígitos a 4 dígitos
      const fullYear = parseInt(year as string) >= 50 ? `19${year}` : `20${year}`

      // Crear fecha de inicio y fin del día
      const searchDate = new Date(
        parseInt(fullYear),
        parseInt(month as string) - 1,
        parseInt(day as string)
      )

      const startOfDay = new Date(searchDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(searchDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Buscar por fecha O por número de orden que contenga la query
      orders = await db.order.findMany({
        where: {
          OR: [
            {
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            {
              orderNumber: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
          userId: clientId ? clientId : undefined,
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          discount: true,
          subtotal: true,
          status: true,
          paymentStatus: true,
          percentageofPayment: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else {
      // Buscar solo por número de orden
      orders = await db.order.findMany({
        where: {
          userId: clientId,

          orderNumber: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          status: true,
          discount: true,
          subtotal: true,
          paymentStatus: true,
          percentageofPayment: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    orders = orders.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),

    }))

    return {
      success: true,
      data: orders,
      count: orders.length,
    }
  } catch (error) {
    console.error('Error searching orders:', error)
    return {
      success: false,
      error: 'Error al buscar pedidos',
      data: [],
      count: 0,
    }
  }
}

/**
 * Obtiene todos los pedidos sin filtros
 */
export async function getAllOrders() {
  try {
    const orders = await db.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        total: true,
        status: true,
        discount: true,
        subtotal: true,
        paymentStatus: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const serializedOrders = orders.map((order) => ({
      ...order,
      createdAt: new Date(order.createdAt),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
    }))

    return {
      success: true,
      data: serializedOrders,
      count: orders.length,
    }
  } catch (error) {
    console.error('Error getting all orders:', error)
    return {
      success: false,
      error: 'Error al obtener pedidos',
      data: [],
      count: 0,
    }
  }
}

/**
 * Obtiene un pedido por ID con toda su información
 */
export async function getOrderById(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        client: true,
        products: {
          include: {
            product: {
              include: {
                category: true,
              }
            },
          },
        },
        payments: true,
      },
    })

    if (!order) {
      return {
        success: false,
        error: 'Pedido no encontrado',
        data: null,
      }
    }

    const mapped = {
      ...order,
      products: order.products.map(item => ({
        ...item,
        // Custom (free-text) line items have no linked product. Synthesize a
        // minimal product object from `customName` so downstream consumers can
        // render them without null checks.
        product: item.product
          ? {
              ...item.product,
              category: item.product.category?.name ?? "",
            }
          : {
              id: "",
              name: item.customName ?? "Producto",
              slug: "",
              description: null,
              imageUrl: null,
              category: "",
            },
      })),
    }

    return {
      success: true,
      data: mapped,
    }
  } catch (error) {
    console.error('Error getting order by ID:', error)
    return {
      success: false,
      error: 'Error al obtener el pedido',
      data: null,
    }
  }
}


export interface ClientOrderItemInput {
  /** Producto registrado. Null/vacío para líneas libres ("custom"). */
  productId?: string | null
  customName?: string | null
  quantity: number
  unitPrice: number
  costAtPurchase?: number
}

/**
 * Crea un PEDIDO (no una factura) a nombre de un cliente. Queda en estado
 * PENDING / paymentStatus PENDING / 0% pagado. Pensado para que el propio
 * cliente arme su pedido desde la página pública: guarda costo/ganancia en el
 * server pero nunca los expone.
 */
export async function createClientOrder(
  clientId: string,
  items: ClientOrderItemInput[],
) {
  if (!clientId || !items || items.length === 0) {
    return { status: 400, message: "Faltan datos para crear el pedido", data: null }
  }

  const cleanItems = items.filter(
    (i) => (i.productId || i.customName?.trim()) && i.quantity > 0,
  )
  if (cleanItems.length === 0) {
    return { status: 400, message: "Agregá al menos un producto", data: null }
  }

  const productIds = cleanItems
    .map((i) => i.productId)
    .filter((pid): pid is string => !!pid)

  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, estimatedDurationDays: true },
      })
    : []

  const notFound = productIds.filter((pid) => !products.find((p) => p.id === pid))
  if (notFound.length > 0) {
    return { status: 400, message: "Uno o más productos no existen", data: null }
  }

  const orderNumber = `P-${Date.now()}`
  const subtotal = cleanItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const cost = cleanItems.reduce(
    (sum, i) => sum + (i.costAtPurchase ?? 0) * i.quantity,
    0,
  )
  const profit = subtotal - cost

  try {
    const order = await db.$transaction(async (tx: any) => {
      return tx.order.create({
        data: {
          orderNumber,
          userId: clientId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          percentageofPayment: 0,
          subtotal,
          discount: 0,
          total: subtotal,
          profit,
          products: {
            create: cleanItems.map((item) => {
              const product = item.productId
                ? products.find((p: any) => p.id === item.productId)
                : undefined
              const itemSubtotal = item.quantity * item.unitPrice
              let estimatedRunOutDate: Date | undefined
              if (product?.estimatedDurationDays) {
                estimatedRunOutDate = new Date()
                estimatedRunOutDate.setDate(
                  estimatedRunOutDate.getDate() + product.estimatedDurationDays,
                )
              }
              return {
                productId: item.productId || null,
                customName: item.productId ? null : (item.customName ?? null),
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                discount: new Prisma.Decimal(0),
                subtotal: new Prisma.Decimal(itemSubtotal),
                costAtPurchase: new Prisma.Decimal(item.costAtPurchase ?? 0),
                profit: new Prisma.Decimal(
                  itemSubtotal - (item.costAtPurchase ?? 0) * item.quantity,
                ),
                purchaseDate: new Date(),
                estimatedRunOutDate,
                hasRunOut: false,
                reorderSent: false,
              }
            }),
          },
        },
      })
    })

    revalidatePath(`/history/${clientId}`)
    revalidatePath(`/dashboard/clients/${clientId}`)

    return {
      status: 201,
      message: "Pedido creado correctamente",
      data: { id: order.id, orderNumber: order.orderNumber },
    }
  } catch (error) {
    console.error("Error creating client order:", error)
    return { status: 500, message: "No se pudo crear el pedido", data: null }
  }
}

export async function deleteOrderAction(id: string) {
  try {
    const order = await db.order.delete({
      where: { id },
    })

    return {
      success: true,
      error: null,
      data: order,
    }
  } catch (error) {
    console.error('Error deleting order:', error)
    return {
      success: false,
      error: 'Error al eliminar el pedido',
      data: null,
    }
  }
}
