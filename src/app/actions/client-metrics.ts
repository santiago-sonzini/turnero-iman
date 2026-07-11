"use server"
import { db } from "@/server/db";
import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = db;

interface OrderInsight {
  summary: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    mostFrequentProducts: {
      productName: string;
      averageQuantity: number;
      lastPurchased: Date;
      totalPurchases: number;
    }[];
    monthlySpendingTrend: {
      currentMonth: number;
      previousMonth: number;
      growthPercent: number;
    };
  };
  recommendation: {
    suggestedOrderDate: Date;
    suggestedProducts: {
      productName: string;
      suggestedQuantity: number;
      reason: string;
      productId: string;
    }[];
    message: string;
  };
}

/**
 * Analiza el historial de pedidos de un cliente y genera insights + recomendaciones
 */
export async function clientOrderInsights(clientId: string): Promise<OrderInsight> {
  // 1. Obtener pedidos de los últimos 6 meses (solo completados)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const orders = await prisma.order.findMany({
    where: {
      userId: clientId,
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  console.log("🚀 ~ clientOrderInsights ~ orders:", orders)

  

  if (orders.length === 0) {
    return generateEmptyInsight();
  }

  // 2. Calcular métricas básicas
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const averageOrderValue = totalSpent / totalOrders;

  // 3. Analizar productos más frecuentes
  const productFrequency = new Map<string, {
    productId: string;
    productName: string;
    quantities: number[];
    dates: Date[];
  }>();

  orders.forEach(order => {
    order.products.forEach(item => {
      // Custom (free-text) line items have no linked product; key them by name.
      const key = item.productId ?? `custom:${item.customName ?? "manual"}`;
      const existing = productFrequency.get(key);
      if (existing) {
        existing.quantities.push(item.quantity);
        existing.dates.push(order.createdAt);
      } else {
        productFrequency.set(key, {
          productId: item.productId ?? "",
          productName: item.product?.name ?? item.customName ?? "Producto",
          quantities: [item.quantity],
          dates: [order.createdAt],
        });
      }
    });
  });

  // Ordenar por frecuencia y calcular promedios
  const mostFrequentProducts = Array.from(productFrequency.values())
    .map(prod => ({
      productId: prod.productId,
      productName: prod.productName,
      averageQuantity: Math.round(
        prod.quantities.reduce((a, b) => a + b, 0) / prod.quantities.length
      ),
      lastPurchased: new Date(Math.max(...prod.dates.map(d => d.getTime()))),
      totalPurchases: prod.quantities.length,
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  // 4. Tendencia mensual
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthOrders = orders.filter(o => o.createdAt >= currentMonthStart);
  const previousMonthOrders = orders.filter(
    o => o.createdAt >= previousMonthStart && o.createdAt < currentMonthStart
  );

  const currentMonth = currentMonthOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const previousMonth = previousMonthOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const growthPercent = previousMonth > 0 
    ? ((currentMonth - previousMonth) / previousMonth) * 100 
    : 0;

  // 5. Calcular frecuencia promedio de compra (en días)
  if (orders.length > 1) {
    const intervals: number[] = [];
    for (let i = 0; i < orders.length - 1; i++) {
    const order = orders[i];
    const nextOrder = orders[i + 1];
      if (!order || !nextOrder) continue;
      const diff = order.createdAt.getTime() - nextOrder.createdAt.getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24)); // Convertir a días
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // 6. Generar recomendación
    const lastOrder = orders[0];
    const daysSinceLastOrder =  lastOrder ? (now.getTime() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24) :  0;
    
    // Sugerir próximo pedido cuando esté cerca del intervalo promedio
    const suggestedOrderDate = new Date(lastOrder?.createdAt ?? '');
    suggestedOrderDate.setDate(suggestedOrderDate.getDate() + Math.round(avgInterval));

    // Sugerir productos basados en frecuencia y productos que podrían agotarse
    const suggestedProducts = await generateProductRecommendations(
      clientId,
      mostFrequentProducts,
      avgInterval,
      daysSinceLastOrder
    );

    const message = generateRecommendationMessage(
      daysSinceLastOrder,
      avgInterval,
      suggestedOrderDate,
      suggestedProducts.length
    );

    return {
      summary: {
        totalOrders,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        mostFrequentProducts,
        monthlySpendingTrend: {
          currentMonth: Math.round(currentMonth * 100) / 100,
          previousMonth: Math.round(previousMonth * 100) / 100,
          growthPercent: Math.round(growthPercent * 100) / 100,
        },
      },
      recommendation: {
        suggestedOrderDate,
        suggestedProducts,
        message,
      },
    };
  }

  // Solo 1 pedido, sugerir reorden después de 30 días
  const suggestedOrderDate = new Date(orders[0]?.createdAt ?? '');
  suggestedOrderDate.setDate(suggestedOrderDate.getDate() + 30);

  return {
    summary: {
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      mostFrequentProducts,
      monthlySpendingTrend: {
        currentMonth: Math.round(currentMonth * 100) / 100,
        previousMonth: Math.round(previousMonth * 100) / 100,
        growthPercent: Math.round(growthPercent * 100) / 100,
      },
    },
    recommendation: {
      suggestedOrderDate,
      suggestedProducts: mostFrequentProducts.slice(0, 3).map(p => ({
        productId: p.productId,
        productName: p.productName,
        suggestedQuantity: p.averageQuantity,
        reason: 'Basado en tu pedido anterior',
      })),
      message: 'Aún no tenemos suficiente historial, pero aquí hay algunas sugerencias basadas en tu último pedido.',
    },
  };
}

/**
 * Genera recomendaciones inteligentes de productos
 */
async function generateProductRecommendations(
  clientId: string,
  frequentProducts: any[],
  avgInterval: number,
  daysSinceLastOrder: number
) {
  const recommendations: any[] = [];

  // Productos que podrían estar agotándose pronto
  const productsNearRunOut = await prisma.productInOrder.findMany({
    where: {
      order: {
        userId: clientId,
      },
      hasRunOut: false,
      estimatedRunOutDate: {
        lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Próximos 14 días
      },
    },
    include: {
      product: true,
    },
    orderBy: {
      estimatedRunOutDate: 'asc',
    },
  });

  // Agregar productos que se están agotando
  productsNearRunOut.forEach(item => {
    const freq = frequentProducts.find(p => p.productId === item.productId);
    recommendations.push({
      productId: item.productId ?? "",
      productName: item.product?.name ?? item.customName ?? "Producto",
      suggestedQuantity: freq?.averageQuantity || item.quantity,
      reason: `Se agotará aproximadamente el ${item.estimatedRunOutDate?.toLocaleDateString('es-AR')}`,
    });
  });

  // Si estamos cerca del intervalo promedio, sugerir productos recurrentes
  if (daysSinceLastOrder >= avgInterval * 0.8) {
    frequentProducts.forEach(prod => {
      if (!recommendations.find(r => r.productId === prod.productId)) {
        recommendations.push({
          productId: prod.productId,
          productName: prod.productName,
          suggestedQuantity: prod.averageQuantity,
          reason: `Compra recurrente cada ${Math.round(avgInterval)} días`,
        });
      }
    });
  }

  return recommendations.slice(0, 5); // Máximo 5 productos
}

/**
 * Genera un mensaje personalizado
 */
function generateRecommendationMessage(
  daysSinceLastOrder: number,
  avgInterval: number,
  suggestedDate: Date,
  productCount: number
): string {
  const daysTillSuggested = Math.ceil((suggestedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastOrder >= avgInterval) {
    return `¡Es momento de reabastecer! Basándonos en tu historial de compras cada ${Math.round(avgInterval)} días, te recomendamos estos ${productCount} productos.`;
  }

  if (daysTillSuggested <= 7) {
    return `Tu próximo pedido estimado es en aproximadamente ${daysTillSuggested} días. Aquí tienes ${productCount} productos que probablemente necesites.`;
  }

  return `Basándonos en tus pedidos anteriores, tu próximo pedido podría ser alrededor del ${suggestedDate.toLocaleDateString('es-AR')}. Aquí hay algunas sugerencias.`;
}

/**
 * Retorna un insight vacío cuando no hay datos
 */
function generateEmptyInsight(): OrderInsight {
  return {
    summary: {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      mostFrequentProducts: [],
      monthlySpendingTrend: {
        currentMonth: 0,
        previousMonth: 0,
        growthPercent: 0,
      },
    },
    recommendation: {
      suggestedOrderDate: new Date(),
      suggestedProducts: [],
      message: 'Aún no hay pedidos completados para generar recomendaciones.',
    },
  };
}