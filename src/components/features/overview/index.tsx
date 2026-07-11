"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Plus,
  Check,
  LucideIcon,
  FileText,
  DollarSign,
} from "lucide-react";
import { AreaChartStacked } from "./area-chart";
import {
  Activity,
  MonthlyStatsComparison,
  MonthlyStatsComparisonRange,
  WeekStats,
} from "@/app/actions/dashboard-metrics";
import { useMemo } from "react";
import StatCard from "./stat-card";
import { QuickActions } from "./quick-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export type Stat = {
  title: string;
  value: number;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  format: "currency" | "number" | "percentage";
};

interface DashboardOverviewProps {
  activities: Activity[];
  metrics: MonthlyStatsComparisonRange;
  weeklyStats: WeekStats[];
  months: [number, number];
  year: number;
  /** Vocabulario del pack de demo ("cliente" | "comercio"). */
  labelCliente?: string;
}

export default function DashboardOverview({
  activities,
  metrics,
  weeklyStats,
  months,
  year,
  labelCliente,
}: DashboardOverviewProps) {
  const stats: Stat[] = [
    {
      title: "Ingresos totales",
      value: metrics.metricsA.totalRevenue,
      change: metrics.changes.revenueChange.toFixed(1) + "%",
      trend: metrics.trends.revenue,
      icon: BarChart3,
      format: "currency",
    },
    {
      title: "Clientes",
      value: metrics.clientsCount,
      change: metrics.changes.revenueChange.toFixed(1) + "%",
      trend: metrics.trends.revenue,
      icon: Users,
      format: "number",
    },
    {
      title: "Ganancias",
      value: metrics.metricsA.totalProfit,
      change: metrics.changes.profitChange.toFixed(1) + "%",
      trend: metrics.trends.profit,
      format: "currency",
      icon: DollarSign,
    },
    // {
    //   title: "Productos totales",
    //   value: metrics.productsCount,
    //   icon: Package,
    // },

    {
      title: "Pedidos totales",
      value: metrics.metricsA.totalOrders,
      change: metrics.changes.ordersChange.toFixed(1) + "%",
      trend: metrics.trends.orders,
      icon: ShoppingCart,
      format: "number",
    },
  ];

  const monthsNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <div className="no-scrollbar space-y-6 px-4 pb-8 md:px-8">
      {/* Encabezado */}
      <div className="flex w-full flex-col items-center justify-between md:flex-row md:items-center">
        <div className="py-2">
          <h1 className="text-3xl md:flex items-center gap-2 font-bold tracking-tight">
            Panel de control
          </h1>
          <p className="text-muted-foreground">
            ¡Bienvenido nuevamente! Esto es lo que está ocurriendo en tu negocio
            hoy.
          </p>
        </div>

        {/* FILTROS */}
        {/* <div className="mt-4 flex flex-col gap-3 overflow-hidden md:mt-0 md:flex-row">
          <div className="flex gap-2">
            <Select value={monthA.toString()} onValueChange={handleMonthA}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Mes A" />
              </SelectTrigger>
              <SelectContent>
                {monthsNames.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={monthB.toString()} onValueChange={handleMonthB}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Mes B" />
              </SelectTrigger>
              <SelectContent>
                {monthsNames.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={year.toString()} onValueChange={handleYear}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(year - 1).toString()}>{year - 1}</SelectItem>
              <SelectItem value={year.toString()}>{year}</SelectItem>
              <SelectItem value={(year + 1).toString()}>{year + 1}</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
      </div>
      {/* CONTENIDO DEL DASHBOARD… */}

      {/* Acciones rápidas */}
      <QuickActions labelCliente={labelCliente} />

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard stat={stat} />
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 gap-6">
        {/* Actividad reciente */}
        <Card className="rounded-sm shadow-sm">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Últimos movimientos en tu negocio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="no-scrollbar max-h-[250px] space-y-4 overflow-y-auto">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex w-full flex-col items-start gap-2 md:gap-3"
                >
                  <div className="flex w-full items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <p className="w-full break-words text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                  </div>
                  <div className="flex w-full flex-col space-y-1 md:ml-5">
                    <p className="break-words text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs capitalize">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
    </div>
  );
}
