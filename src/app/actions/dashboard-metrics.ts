"use server"
import { db } from '@/server/db';
import { PrismaClient } from '@prisma/client';


type ActivityType = 'cliente' | 'pedido' | 'producto';

export interface Activity {
  title: string;
  description: string;
  time: string;
  type: ActivityType;
}

/**
 * Obtiene las actividades recientes del sistema
 * @param limit - Número máximo de actividades a retornar (máximo 20)
 * @returns Array de actividades recientes
 */
export async function getRecentActivities(limit: number = 20): Promise<Activity[]> {
  const maxLimit = Math.min(limit, 20);

  try {
    // Obtener los últimos clientes creados
    const recentClients = await db.client.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(maxLimit / 3),
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Obtener los últimos pedidos
    const recentOrders = await db.order.findMany({
      orderBy: { updatedAt: 'desc' },
      take: Math.ceil(maxLimit / 3),
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

    // Obtener los últimos productos actualizados
    const recentProducts = await db.product.findMany({
      where: {
        updatedAt: {
          not: undefined,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.ceil(maxLimit / 3),
      select: {
        id: true,
        name: true,
        updatedAt: true,
        stock: true,
        price: true,
      },
    });


    // Convertir todo a actividades
    const activities: Activity[] = [];

    // Agregar actividades de clientes
    recentClients.forEach((client) => {
      activities.push({
        title: 'Nuevo cliente registrado',
        description: `${client.name} se ha registrado`,
        time: formatTimeAgo(client.createdAt),
        type: 'cliente',
      });
    });

    // Agregar actividades de pedidos
    recentOrders.forEach((order) => {
      let title = 'Pedido creado';
      let description = `Pedido #${order.orderNumber} de ${order.client.name}`;

      switch (order.status) {
        case 'COMPLETED':
          title = 'Pedido completado';
          description = `El pedido ${order.client.name} ha sido completado - $${order.total}`;
          break;
        case 'PROCESSING':
          title = 'Pedido en proceso';
          description = `El pedido ${order.client.name} está siendo procesado`;
          break;
        case 'CANCELLED':
          title = 'Pedido cancelado';
          description = `El pedido ${order.client.name} fue cancelado`;
          break;
        case 'REFUNDED':
          title = 'Pedido reembolsado';
          description = `El pedido ${order.client.name} fue reembolsado - $${order.total}`;
          break;
        default:
          title = 'Nuevo pedido';
          description = `Pedido para ${order.client.name} creado - $${order.total}`;
      }

      activities.push({
        title,
        description,
        time: formatTimeAgo(order.updatedAt),
        type: 'pedido',
      });
    });

    // Agregar actividades de productos
    recentProducts.forEach((product) => {
      activities.push({
        title: 'Producto actualizado',
        description: `${product.name} - Stock: ${product.stock}, Precio: $${product.price}`,
        time: formatTimeAgo(product.updatedAt),
        type: 'producto',
      });
    });

    // Ordenar todas las actividades por fecha más reciente
    activities.sort((a, b) => {
      const timeA = parseTimeAgo(a.time);
      const timeB = parseTimeAgo(b.time);
      return timeA - timeB;
    });

    // Retornar solo las primeras 'maxLimit' actividades
    return activities.slice(0, maxLimit);
  } catch (error) {
    console.error('Error al obtener actividades recientes:', error);
    return [];
  }
}

/**
 * Formatea una fecha a un texto relativo (ej: "Hace 5 minutos")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Hace menos de un minuto';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `Hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
}

/**
 * Convierte el texto "Hace X minutos/horas/días" a milisegundos para ordenar
 */
function parseTimeAgo(timeText: string): number {
  const match = timeText.match(/Hace (\d+) (minuto|minutos|hora|horas|día|días|mes|meses)/);
  
  if (!match) {
    return 0; // "Hace menos de un minuto"
  }

  const value = parseInt(match[1] ?? '');
  const unit = match[2];

  if (unit?.startsWith('minuto')) {
    return value * 60 * 1000;
  } else if (unit?.startsWith('hora')) {
    return value * 60 * 60 * 1000;
  } else if (unit?.startsWith('día')) {
    return value * 24 * 60 * 60 * 1000;
  } else if (unit?.startsWith('mes')) {
    return value * 30 * 24 * 60 * 60 * 1000;
  }

  return 0;
}

// Ejemplo de uso:
// const activities = await getRecentActivities(20);
// console.log(activities);



import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface MonthlyStatsComparison {
    month: string;
    clientsCount: number;
    productsCount: number;
    current: {
      totalRevenue: number;
      totalOrders: number;
      completionRate: number;
      totalProfit: number;
    };
    previous: {
      totalRevenue: number;
      totalOrders: number;
      completionRate: number;
      totalProfit: number;
    };
    changes: {
      revenueChange: number;
      ordersChange: number;
      completionChange: number;
      profitChange: number;
    };
    trends: {
      revenue: "up" | "down";
      orders: "up" | "down";
      completion: "up" | "down";
      profit: "up" | "down";
    };
  }

export async function getMonthlyStatsComparison(): Promise<MonthlyStatsComparison> {
  const now = new Date();

  const clientsCount = await db.client.count();
  const productsCount = await db.product.count();

  // Rango del mes actual y anterior
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  // Buscar pedidos de ambos meses
  const [currentOrders, previousOrders] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
      select: { total: true, status: true, profit: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { total: true, status: true, profit: true },
    }),
  ]);

  console.log("🚀 ~ getMonthlyStatsComparison ~ previousOrders:", previousOrders)


  // Calcular métricas
  const calcMetrics = (orders: typeof currentOrders) => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalProfit = orders.reduce((sum, o) => sum + Number(o.profit), 0);
    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    return { totalRevenue, totalOrders, completionRate, totalProfit };
  };

  const current = calcMetrics(currentOrders);
  const previous = calcMetrics(previousOrders);

  // Función auxiliar para calcular % de cambio
  const percentChange = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return 100;
    return ((curr - prev) / prev) * 100;
  };

  return {
    month: currentMonthStart.toLocaleString("es-AR", { month: "long" }),
    current,
    clientsCount,
    productsCount,
    previous,
    changes: {
      revenueChange: percentChange(current.totalRevenue, previous.totalRevenue),
      ordersChange: percentChange(current.totalOrders, previous.totalOrders),
      completionChange: percentChange(
        current.completionRate,
        previous.completionRate
      ),
      profitChange: percentChange(current.totalProfit, previous.totalProfit),

    },
    trends: {
      revenue: current.totalRevenue >= previous.totalRevenue ? "up" : "down",
      orders: current.totalOrders >= previous.totalOrders ? "up" : "down",
      completion:
        current.completionRate >= previous.completionRate ? "up" : "down",
      profit: current.totalProfit >= previous.totalProfit ? "up" : "down",

    },
  };
}

export interface MonthlyStatsComparisonRange {
  months: {
    monthA: string;
    monthB: string;
  };

  metricsA: {
    totalRevenue: number;
    totalOrders: number;
    completionRate: number;
    totalProfit: number;
  };

  metricsB: {
    totalRevenue: number;
    totalOrders: number;
    completionRate: number;
    totalProfit: number;
  };

  clientsCount: number;
  productsCount: number;

  changes: {
    revenueChange: number;
    ordersChange: number;
    completionChange: number;
    profitChange: number;
  };

  trends: {
    revenue: "up" | "down";
    orders: "up" | "down";
    completion: "up" | "down";
    profit: "up" | "down";
  };
}


export async function getMonthlyStatsComparisonRange(
  months: [number, number],
  year: number
): Promise<MonthlyStatsComparisonRange> {
  const now = new Date();

  const [monthB, monthA] = months;

  // Rango del mes A
  const monthAStart = startOfMonth(new Date(year, monthA, 1));
  const monthAEnd = endOfMonth(new Date(year, monthA, 1));

  // Rango del mes B
  const monthBStart = startOfMonth(new Date(year, monthB, 1));
  const monthBEnd = endOfMonth(new Date(year, monthB, 1));

  // Contadores generales
  const clientsCount = await db.client.count();
  const productsCount = await db.product.count();

  // Traer pedidos de ambos meses
  const [ordersA, ordersB] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: monthAStart, lte: monthAEnd } },
      select: { total: true, status: true, profit: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: monthBStart, lte: monthBEnd } },
      select: { total: true, status: true , profit: true },
    }),
  ]);

  // Calcular métricas
  const calcMetrics = (orders: typeof ordersA) => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const totalProfit = orders.reduce((sum, o) => sum + Number(o.profit), 0);
    return { totalRevenue, totalOrders, completionRate, totalProfit };
  };

  const metricsA = calcMetrics(ordersA);
  const metricsB = calcMetrics(ordersB);

  // % de cambio entre los dos meses
  const percentChange = (curr: number, prev: number) => {

    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return 100;
    return ((curr - prev) / prev) * 100;
  };

  return {
    months: {
      monthA: monthAStart.toLocaleString("es-AR", { month: "long" }),
      monthB: monthBStart.toLocaleString("es-AR", { month: "long" }),
    },
    metricsA,
    metricsB,
    clientsCount,
    productsCount,
    changes: {
      revenueChange: percentChange(metricsA.totalRevenue, metricsB.totalRevenue),
      ordersChange: percentChange(metricsA.totalOrders, metricsB.totalOrders),
      completionChange: percentChange(
        metricsA.completionRate,
        metricsB.completionRate
      ),
      profitChange: percentChange(metricsA.totalProfit, metricsB.totalProfit),
    },
    trends: {
      revenue: metricsA.totalRevenue >= metricsB.totalRevenue ? "up" : "down",
      orders: metricsA.totalOrders >= metricsB.totalOrders ? "up" : "down",
      completion:
      metricsA.completionRate >= metricsB.completionRate ? "up" : "down",
      profit: metricsA.totalProfit >= metricsB.totalProfit ? "up" : "down",
    },
  };
}



import {  eachWeekOfInterval } from "date-fns";
import { da, es } from "date-fns/locale";

export interface WeekStats {
  weekLabel: string; // "1-7 Ene", "8-14 Ene", etc
  total: number;
}

export async function getWeeklyTotalsByMonths(months: number[], year: number): Promise<WeekStats[]> {
  const now = new Date();

  // 👉 Si son más de 4 meses, devolvemos totales por mes
  if (months.length > 4) {
    const monthlyData: WeekStats[] = [];

    for (const month of months) {
      const monthStart = startOfMonth(new Date(year, month, 1));
      const monthEnd = endOfMonth(new Date(year, month, 1));

      const orders = await db.order.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: { total: true },
      });

      const total = orders.reduce((s, o) => s + Number(o.total), 0);

      monthlyData.push({
        weekLabel: monthStart.toLocaleString("es-AR", { month: "long" }),
        total,
      });
    }

    return monthlyData;
  }

  // 👉 Si NO son más de 4 meses → mostrar por semanas (tu lógica actual)
  let weeklyData: WeekStats[] = [];

  for (const month of months) {
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));

    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    for (let i = 0; i < weekStarts.length; i++) {
      const weekStart = weekStarts[i]!;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const rangeStart = weekStart < monthStart ? monthStart : weekStart;
      const rangeEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

      const orders = await db.order.findMany({
        where: {
          createdAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        select: { total: true },
      });

      const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

      weeklyData.push({
        weekLabel: `${rangeStart.getDate()}-${rangeEnd.getDate()} ${monthStart.toLocaleString(
          "es-AR",
          { month: "short" }
        )}`,
        total,
      });
    }
  }

  return weeklyData;
}




// ── Types ─────────────────────────────────────────────────────────────


export type BillingCards = {
  todayRevenue: number;
  weekRevenue: number;
  todayChange: number;   // % vs ayer
  weekChange: number;    // % vs semana anterior
  todayTrend: "up" | "down";
  weekTrend: "up" | "down";
};

// ── Helpers ───────────────────────────────────────────────────────────

function sumRevenue(orders: { total: unknown }[]) {
  return orders.reduce((sum, o) => sum + Number(o.total), 0);
}

function percentChange(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return ((curr - prev) / prev) * 100;
}

// ── Weekly chart data ─────────────────────────────────────────────────
// Devuelve los 7 días de la semana actual (lun→dom).
// Los días futuros tienen total = 0 para que el gráfico los muestre vacíos.

export type WeekStats2 = {
  date: Date;
  total: number;
  orders: number;
};

export async function getWeeklyStats(): Promise<WeekStats2[]> {
  const now = new Date();

  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: monday, lte: sunday },
    },
    select: { total: true, createdAt: true },
  });

  const days: WeekStats2[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { date, total: 0, orders: 0 };
  });

  for (const order of orders) {
    const dow = new Date(order.createdAt).getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    if (days[idx]) {
      days[idx].total += Number(order.total);
      days[idx].orders += 1;
    }
  }

  return days;
}

// ── Billing cards (Hoy / Semana) ──────────────────────────────────────

export async function getBillingCards(): Promise<BillingCards> {
  const now = new Date();

  // ── Rangos de hoy y ayer ──────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(todayEnd.getDate() - 1);

  // ── Rangos de esta semana y la anterior ───────────────────────────
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() + diffToMonday);
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);

  // ── Queries en paralelo ───────────────────────────────────────────
  const clientFilter = {};

  const [today, yesterday, thisWeek, lastWeek] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, ...clientFilter },
      select: { total: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, ...clientFilter },
      select: { total: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: thisWeekStart, lte: thisWeekEnd }, ...clientFilter },
      select: { total: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: lastWeekStart, lte: lastWeekEnd }, ...clientFilter },
      select: { total: true },
    }),
  ]);

  const todayRevenue = sumRevenue(today);
  const yesterdayRevenue = sumRevenue(yesterday);
  const weekRevenue = sumRevenue(thisWeek);
  const lastWeekRevenue = sumRevenue(lastWeek);

  const todayChange = percentChange(todayRevenue, yesterdayRevenue);
  const weekChange = percentChange(weekRevenue, lastWeekRevenue);

  return {
    todayRevenue,
    weekRevenue,
    todayChange: Math.abs(todayChange),
    weekChange: Math.abs(weekChange),
    todayTrend: todayRevenue >= yesterdayRevenue ? "up" : "down",
    weekTrend: weekRevenue >= lastWeekRevenue ? "up" : "down",
  };
}