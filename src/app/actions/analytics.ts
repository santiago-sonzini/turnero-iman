"use server"

import { db } from "@/server/db"


type Period = {
    from?: Date
    to?: Date
}

export interface DashboardMetric {
    value: number
    change: number // porcentaje (+ ó -)
    trend: "up" | "down"
}

export interface DashboardMetrics {
    ingresosTotales: DashboardMetric
    ordenes: DashboardMetric
    clientesNuevos: DashboardMetric
    productosActivos: DashboardMetric
}



export async function getDashboardMetrics(period: Period): Promise<DashboardMetrics> {
    const { from, to } = period

    if (!from || !to) throw new Error("Missing date range")

    // Duración del periodo seleccionado
    const diff = to.getTime() - from.getTime()

    // Periodo anterior (= misma duración)
    const prevFrom = new Date(from.getTime() - diff)
    const prevTo = new Date(from.getTime())

    // --- MÉTRICAS ACTUALES ---
    const totalIncomeResult = await db.order.aggregate({
        _sum: { total: true },
        where: {
            createdAt: { gte: from, lte: to },
        },
    })

    const totalIncome = Number(totalIncomeResult._sum.total ?? 0)

    const ordersCount = await db.order.count({
        where: {
            createdAt: { gte: from, lte: to },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
    })

    const newClients = await db.client.count({
        where: {
            createdAt: { gte: from, lte: to },
        },
    })

    const activeProducts = await db.product.count({
        where: { isActive: true },
    })

    // --- MÉTRICAS PERIODO ANTERIOR ---
    const prevIncomeResult = await db.order.aggregate({
        _sum: { total: true },
        where: {
            createdAt: { gte: prevFrom, lte: prevTo },
        },
    })

    const prevIncome = Number(prevIncomeResult._sum.total ?? 0)

    const prevOrders = await db.order.count({
        where: {
            createdAt: { gte: prevFrom, lte: prevTo },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
    })

    const prevClients = await db.client.count({
        where: {
            createdAt: { gte: prevFrom, lte: prevTo },
        },
    })

    // --- FUNCIÓN PARA CALCULAR CHANGE ---
    const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }



    
    return {
        ingresosTotales: {
            value: totalIncome,
            change: calcChange(totalIncome, prevIncome),
            trend: totalIncome >= prevIncome ? "up" : "down",
        },
        ordenes: {
            value: ordersCount,
            change: calcChange(ordersCount, prevOrders),
            trend: ordersCount >= prevOrders ? "up" : "down",
        },
        clientesNuevos: {
            value: newClients,
            change: calcChange(newClients, prevClients),
            trend: newClients >= prevClients ? "up" : "down",
        },
        productosActivos: {
            value: activeProducts,
            change: 0, // No depende del tiempo
            trend: "up",
        },
    }
}


import { differenceInMonths, addWeeks, addMonths, isBefore, format } from "date-fns"
import { es } from "date-fns/locale"


export interface RevenueTrendPoint {
    date: string;        // Ej: "1 Ene" o "Feb 2025"
    revenue: number;     // total facturado
    orders: number;      // cantidad de órdenes
  }
  
  export interface RevenueTrendsResult {
    mode: "weekly" | "monthly";
    data: RevenueTrendPoint[];
  }

export async function getRevenueTrends({ from, to }: { from: Date; to: Date }): Promise<RevenueTrendsResult> {
  const monthsDifference = differenceInMonths(to, from)
  const isMonthly = monthsDifference >= 4

  const data: {
    date: string
    revenue: number
    orders: number
  }[] = []

  if (!isMonthly) {
    // ----- AGRUPACIÓN SEMANAL -----
    let cursor = new Date(from)

    while (isBefore(cursor, to)) {
      const weekEnd = addWeeks(cursor, 1)

      const orders = await db.order.findMany({
        where: {
          createdAt: { gte: cursor, lt: weekEnd },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
        select: { total: true },
      })

      const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0)

      data.push({
        date: format(cursor, "d MMM", { locale: es }), // Ej: "1 Ene"
        revenue,
        orders: orders.length,
      })

      cursor = weekEnd
    }

    return {
      mode: "weekly",
      data,
    }
  }

  // ----- AGRUPACIÓN MENSUAL -----
  let cursorMonth = new Date(from)

  while (isBefore(cursorMonth, to)) {
    const monthEnd = addMonths(cursorMonth, 1)

    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: cursorMonth, lt: monthEnd },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      select: { total: true },
    })

    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0)

    data.push({
      date: format(cursorMonth, "MMM yyyy", { locale: es }), // Ej: "Feb 2025"
      revenue,
      orders: orders.length,
    })

    cursorMonth = monthEnd
  }

  

    console.log("🚀 ~ getRevenueTrends ~ data:", data)
  return {
    mode: "monthly",
    data,
  }
}

interface TopClientsAnalyticsInput {
    startDate?: Date;
    endDate?: Date;
  }
  
  export async function getTopClientsAnalytics({ startDate, endDate }: TopClientsAnalyticsInput) {
    console.log(`🚀 ~ getTopClientsAnalytics ~ { startDate, endDate }:`, { startDate, endDate })
    
    // Traemos clientes con órdenes filtradas por período
    const result = await db.client.findMany({
      take: 20,
      include: {
        orders: {
          where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
              },
          },
          select: {
            createdAt: true,
            id: true,
            total: true,
          },
        },
      },
    });
    console.log("🚀 ~ getTopClientsAnalytics ~ result:", result[0])
  
    
    // Mapeamos métricas
    const mapped = result.map((client) => {
      const ordersCount = client.orders.length;
  
      const revenue = client.orders.reduce(
        (acc, order) => acc + Number(order.total),
        0
      );
  
      return {
        id: client.id,
        name: client.name,
        ordersCount,
        revenue,
      };
    });
  
    // Ordenamos por facturación y nos quedamos con los 20
    const sorted = mapped
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .filter(c => c.ordersCount >= 0 || c.revenue >= 0);

  
    return sorted;
  }
