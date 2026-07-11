'use server'

import { ProductFormSchema } from '@/components/features/products/product-form'
import { $Enums, Prisma, PrismaClient, Product } from '@prisma/client'
import { z } from 'zod'
import { ApiResponse } from './users'


// 🔹 Esquema de validación con Zod
const productQuerySchema = z.object({

  page: z.number().default(0),
  pageSize: z.number().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z
    .object({
      slug: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
      catalog: z.string().optional(),
    })
    .optional(),
})

export type ProductCreateData = z.infer<typeof ProductFormSchema>;

export type ProductByIdQuery = Prisma.ProductGetPayload<{
  include: {
    category: true;
  };
}>;



export const getProductById = async (id: string): Promise<ApiResponse<ProductByIdQuery>> => {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return {
        status: 404,
        message: "Product not found",
      };
    }

    return {
      status: 200,
      data: product,
      message: "Product found successfully",
    };
  } catch (error) {
    return {
      status: 500,
      message: "Error al obtener producto",
    };
  }
};


// --- CREATE PRODUCT ---
export const createProduct = async (data: ProductCreateData): Promise<ApiResponse> => {
  await requireFeature("productos")
  try {
    let categoryId: string | undefined;

    // Si viene el nombre de la categoría, buscarla o crearla
    if (data.category) {
      const slug = data.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      let category = await db.category.findFirst({ where: { slug } });

      if (!category) {
        category = await db.category.create({
          data: {
            name: data.category,
            slug,
          },
        });
      }

      categoryId = category.id;
    }

    const product = await db.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        price: parseFloat(data.price),
        cost: parseFloat(data.cost),
        stock: parseInt(data.stock),
        estimatedDurationDays: parseFloat(data.estimatedDurationDays ?? "10"),
        unit: data.unit || "",
        unitQuantity: parseFloat(data.unitQuantity ?? "0"),
        isActive: data.isActive || true,
        isFeatured: data.isFeatured || false,
        categoryId,
      },
      include: { category: true },
    });

    return {
      status: 200,
      data: product,
      message: "Product created successfully",
    };
  } catch (error: any) {

    return {
      status: 500,
      message: error.message || "Failed to create product",
    };
  }
};

// --- QUICK CREATE PRODUCT (from the invoice "custom line → save to catalog") ---
export interface QuickProductInput {
  name: string
  price: number
  cost?: number
  category?: string
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export const quickCreateProduct = async (
  input: QuickProductInput
): Promise<ApiResponse<ProductWithCategory>> => {
  await requireFeature("productos")
  try {
    const name = input.name?.trim()
    if (!name) {
      return { status: 400, message: "El nombre es obligatorio" }
    }

    let categoryId: string | undefined
    if (input.category) {
      const slug = slugify(input.category)
      let category = await db.category.findFirst({ where: { slug } })
      if (!category) {
        category = await db.category.create({
          data: { name: input.category, slug },
        })
      }
      categoryId = category.id
    }

    // Ensure a unique slug (slug is @unique in the schema).
    const base = slugify(name) || "producto"
    let slug = base
    let n = 1
    while (await db.product.findFirst({ where: { slug } })) {
      n += 1
      slug = `${base}-${n}`
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        price: input.price,
        cost: input.cost ?? 0,
        categoryId,
      },
      include: { category: { select: { name: true } } },
    })

    return {
      status: 200,
      message: "Producto creado",
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        images: product.images ?? [],
        category: product.category?.name || "Sin categoría",
        price: Number(product.price),
        cost: Number(product.cost),
        stock: product.stock,
        status:
          product.stock === 0
            ? "out_of_stock"
            : product.stock <= 10
              ? "low_stock"
              : "in_stock",
        createdAt: product.createdAt.toISOString(),
        catalog: product.catalog,
        isFeatured: product.isFeatured,
      },
    }
  } catch (error: any) {
    return {
      status: 500,
      message: error.message || "No se pudo crear el producto",
    }
  }
}

export const updateProductPartial = async (
  data: Partial<ProductCreateData> & { id: string }
): Promise<ApiResponse> => {
  await requireFeature("productos")
  try {
    let categoryId: string | undefined;

    if (data.category) {
      const slug = data.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      let category = await db.category.findFirst({ where: { slug } });

      if (!category) {
        category = await db.category.create({
          data: {
            name: data.category,
            slug,
          },
        });
      }

      categoryId = category.id;
    }

    const updated = await db.product.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.price !== undefined && { price: parseFloat(data.price) }),
        ...(data.stock !== undefined && { stock: parseInt(data.stock) }),
        ...(data.estimatedDurationDays !== undefined && {
          estimatedDurationDays: parseFloat(data.estimatedDurationDays),
        }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.unitQuantity !== undefined && {
          unitQuantity: parseFloat(data.unitQuantity),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(categoryId !== undefined && { categoryId }),
        ...(data.cost !== undefined && { cost: parseFloat(data.cost) }),
        ...(data.images !== undefined && { images: data.images }),
      },
      include: { category: true },
    });

    console.log("updated", updated);
    return {
      status: 200,
      data: updated,
      message: "Product updated successfully",
    };
  } catch (error: any) {
    return {
      status: 500,
      message: error.message || "Failed to update product",
    };
  }
};

export const updateProduct = async (data: ProductCreateData): Promise<ApiResponse> => {
  await requireFeature("productos")
  try {
    if (!data.id) {
      return {
        status: 400,
        message: "Product ID is required for update",
      };
    }

    let categoryId: string | undefined;

    // Si viene categoría como string, buscar o crear
    if (data.category) {
      const slug = data.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      let category = await db.category.findFirst({ where: { slug } });

      if (!category) {
        category = await db.category.create({
          data: {
            name: data.category,
            slug,
          },
        });
      }

      categoryId = category.id;
    }

    // Actualizar producto
    const updated = await db.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        estimatedDurationDays: parseFloat(data.estimatedDurationDays ?? "10"),
        unit: data.unit || "",
        unitQuantity: parseFloat(data.unitQuantity ?? "0"),
        isActive: data.isActive || true,
        isFeatured: data.isFeatured || false,
        categoryId,
        cost: parseFloat(data.cost),
        catalog: data.catalog,
      },
      include: { category: true },
    });

    return {
      status: 200,
      data: updated,
      message: "Product updated successfully",
    };
  } catch (error: any) {
    return {
      status: 500,
      message: error.message || "Failed to update product",
    };
  }
};


export type ProductQueryParams = z.infer<typeof productQuerySchema>

export interface ProductsReturn {
  products: ProductWithRelations[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface ProductWithRelations {
  id: string;
  catalog: string | null;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  category: string;
  price: number;
  cost: number;
  stock: number;
  status: string;
  createdAt: string;
  isFeatured: boolean;
  offers: {
    id: string;
    name: string;
    discountType: $Enums.DiscountType;
    discountValue: number;
  }[];
}[]

// 🔹 Server Action
export async function getProductsAction(input: ProductQueryParams): Promise<ProductsReturn> {
  const { page, pageSize, sortBy, sortOrder, filters } =
    productQuerySchema.parse(input)

  const where: Prisma.ProductWhereInput = {}

  const AND: Prisma.ProductWhereInput[] = []

  // Multi-token search: every word must match somewhere (name, slug, category
  // name or catalog). This makes queries like "termo 50" or "valvula gas" work.
  if (filters?.name) {
    const words = filters.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    for (const word of words) {
      AND.push({
        OR: [
          { name: { contains: word, mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: word, mode: Prisma.QueryMode.insensitive } },
          { catalog: { contains: word, mode: Prisma.QueryMode.insensitive } },
          {
            category: {
              name: { contains: word, mode: Prisma.QueryMode.insensitive },
            },
          },
        ],
      })
    }
  }

  if (filters?.slug) {
    const cleanSlug = filters.slug?.trim()

    AND.push({
      slug: {
        contains: cleanSlug,
        mode: Prisma.QueryMode.insensitive,
      },
    })
  }

  if (AND.length > 0) {
    where.AND = AND
  }
  // if (filters?.name) {
  //   where.slug = { contains: filters?.name, mode: 'insensitive' }
  // }

  // if (filters?.name) {
  //   where.category = {
  //     name: { equals: filters.name, mode: 'insensitive' },
  //   }
  // }

  if (filters?.catalog) {
    where.catalog = { equals: filters.catalog, mode: 'insensitive' }
  }


  if (filters?.status) {
    if (filters.status === 'in_stock') {
      where.stock = { gt: 10 }
    } else if (filters.status === 'low_stock') {
      where.stock = { gt: 0, lte: 10 }
    } else if (filters.status === 'out_of_stock') {
      where.stock = 0
    }
  }

  const orderBy: any = sortBy
    ? { [sortBy]: sortOrder || 'asc' }
    : { createdAt: 'desc' }

  // 🔹 Conteo total
  const totalCount = await db.product.count({ where })

  // 🔹 Consulta principal
  const products = await db.product.findMany({
    where,
    orderBy,
    skip: page * pageSize,
    take: pageSize,
    include: {
      category: { select: { name: true } },
      offers: {
        select: {
          id: true,
          name: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  })

  // 🔹 Convertimos Decimals a números y formateamos los resultados
  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    catalog: p.catalog,
    description: p.description,
    images: p.images ?? [p.imageUrl],
    category: p.category?.name || 'Sin categoría',
    price: Number(p.price),
    cost: Number(p.cost),
    stock: p.stock,
    status:
      p.stock === 0
        ? 'out_of_stock'
        : p.stock <= 10
          ? 'low_stock'
          : 'in_stock',
    createdAt: p.createdAt.toISOString(),
    isFeatured: p.isFeatured,
    offers: p.offers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      discountType: offer.discountType,
      discountValue: Number(offer.discountValue),
    })),
  }))


  // 🔹 Retorno estructurado
  return {
    products: mappedProducts,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  }
}




export type ProductWithCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  category: string;
  price: number;
  cost: number;
  stock: number;
  status: string;
  createdAt: string;
  catalog: string | null;
  isFeatured: boolean;

}

export async function getAllProductsAction(): Promise<ProductWithCategory[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      category: { select: { name: true } },

    },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    catalog: p.catalog,
    description: p.description,
    images: p.images ?? [p.imageUrl],
    category: p.category?.name || 'Sin categoría',
    price: Number(p.price),
    cost: Number(p.cost),
    stock: p.stock,
    status:
      p.stock === 0
        ? 'out_of_stock'
        : p.stock <= 10
          ? 'low_stock'
          : 'in_stock',
    createdAt: p.createdAt.toISOString(),
    isFeatured: p.isFeatured,

  }))
}




import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { description } from '@/components/features/overview/area-chart'
import { db } from '@/server/db'
import { requireFeature } from '@/server/gate'
import { parse } from 'path'

export async function getProductInsights(productId: string) {
  try {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    // Total vendido y facturado este mes
    const current = await db.productInOrder.aggregate({
      where: {
        productId,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
    });

    // Mes anterior (para comparación)
    const previous = await db.productInOrder.aggregate({
      where: {
        productId,
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
    });

    const currentRevenue = current._sum.subtotal || 0;
    const prevRevenue = previous._sum.subtotal || 0;
    const trendPercentage = prevRevenue
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
      : null;

    const data = {
      totalRevenue: currentRevenue,
      totalSold: current._sum.quantity || 0,
      trendPercentage,
      avgMonthlySales: current._sum.quantity
        ? current._sum.quantity / (now.getDate() / 30)
        : 0,
    };

    return {
      status: 200,
      message: "Insights obtenidos correctamente",
      data,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "Error al obtener insights del producto",
      data: null,
    };
  }
}


const productQuerySchemaWithPeriod = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),

  startDate: z.string().optional(),
  endDate: z.string().optional(),

  filters: z
    .object({
      slug: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
    })
    .optional(),
});


export type ProductQueryParamsWithPeriod = z.infer<typeof productQuerySchemaWithPeriod>;

export async function getProductsActionWithPeriod(input: ProductQueryParamsWithPeriod) {
  const { page, pageSize, sortBy, sortOrder, filters, startDate, endDate } =
    productQuerySchemaWithPeriod.parse(input);

  const where: any = {};

  if (filters?.name) {
    where.name = { contains: filters.name, mode: "insensitive" };
  }

  if (filters?.slug) {
    where.slug = { contains: filters.slug, mode: "insensitive" };
  }

  if (filters?.category) {
    where.category = {
      name: { equals: filters.category, mode: "insensitive" },
    };
  }

  if (filters?.status) {
    if (filters.status === "in_stock") {
      where.stock = { gt: 10 };
    } else if (filters.status === "low_stock") {
      where.stock = { gt: 0, lte: 10 };
    } else if (filters.status === "out_of_stock") {
      where.stock = 0;
    }
  }

  const orderBy: any = sortBy
    ? { [sortBy]: sortOrder || "asc" }
    : { createdAt: "desc" };

  const totalCount = await db.product.count({ where });

  const products = await db.product.findMany({
    where,
    orderBy,
    skip: page * pageSize,
    take: pageSize,

    include: {
      category: {
        select: { name: true },
      },
      offers: {
        select: {
          id: true,
          name: true,
          discountType: true,
          discountValue: true,
        },
      },
      orderItems: {
        select: { id: true, orderId: true, productId: true, quantity: true, unitPrice: true },
      },
    },
  });


  // 2) Buscar todas las orders filtradas por periodo
  const orders = await db.order.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          lte: new Date(endDate),
        },
      }),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      updatedAt: true,
      client: {
        select: {
          name: true,
        },
      },
    },
  });


  // 3) Hacer un map para unir products + orders asociados
  const productsWithOrders = products.map((product) => {
    const relatedOrders = orders.filter((order) =>
      product.orderItems.some((oi) => oi.orderId === order.id)
    );

    return {
      ...product,
      orders: relatedOrders,
    };
  });



  const mappedProducts = productsWithOrders.map((p) => {
    // Orders válidos asociados al producto
    const validOrders = p.orders;

    // Cantidad única de órdenes
    const ordersCount = validOrders.length;

    // Revenue por producto = sum(orderItems * price)
    const revenue = validOrders.reduce((acc, order) => {
      // orderItems del producto que pertenecen a esta order
      const productItems = p.orderItems.filter(
        (oi) => oi.orderId === order.id
      );

      // Sumar cantidades * precio
      const itemsTotal = productItems.reduce(
        (sum, item) =>
          sum + item.quantity * Number(item.unitPrice),
        0
      );

      return acc + itemsTotal;
    }, 0);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      images: p.images ?? [p.imageUrl],
      category: p.category?.name || "Sin categoría",
      price: Number(p.price),
      stock: p.stock,
      status:
        p.stock === 0
          ? "out_of_stock"
          : p.stock <= 10
            ? "low_stock"
            : "in_stock",
      createdAt: p.createdAt.toISOString(),
      isFeatured: p.isFeatured,

      // Nuevos valores
      ordersCount,
      revenue,
    };
  });


  return {
    products: mappedProducts,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}




export const upsertProducts = async (products: ProductCreateData[]) => {
  await requireFeature("productos")
  const results = [];

  for (const data of products) {
    const existing = await db.product.findFirst({
      where: { slug: data.slug },
    });

    if (existing) {
      const updated = await db.product.update({
        where: { id: existing.id },
        data: {
          price: parseFloat(data.cost) * 1.5,
          cost: parseFloat(data.cost),
        },
      });

      results.push(updated);
    } else {
      const created = await createProduct({ ...data, price: (parseFloat(data.cost) * 1.5).toString() });
      results.push(created);
    }
  }

  return results;
};