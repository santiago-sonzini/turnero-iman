"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  Tag,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import PeriodSelector from "@/components/features/analytics/period-selector";
import { MetricCard } from "@/components/features/analytics/metric-card";
import { RevenueTrendsCard } from "@/components/features/analytics/revenue-card";
import { ProductComparisonCard } from "@/components/features/analytics/product-comparison-card";
import { ClientAnalyticsCard } from "@/components/features/analytics/clients-analytics";
import { CategoryDistributionCard } from "@/components/features/analytics/category-distribution-card";
import { OfferImpactCard } from "@/components/features/analytics/offer-impact-card";
import { addDays } from "date-fns";
import { DashboardMetrics, getDashboardMetrics } from "@/app/actions/analytics";
import { Stat } from "@/components/features/overview";
import { set } from "zod";
import StatCard from "@/components/features/overview/stat-card";
import { se } from "date-fns/locale";

// Mock data generators basados en el schema
 const generateMockProducts = () => {
  const categories = [
    "Alimentos",
    "Accesorios",
    "Farmacia",
    "Juguetes",
    "Higiene",
  ];
  const productNames = [
    "Alimento Premium Perro",
    "Collar Antipulgas",
    "Shampoo Medicado",
    "Pelota Interactiva",
    "Correa Extensible",
    "Vitaminas",
    "Cama Ortopédica",
    "Arena Sanitaria",
    "Snacks Dentales",
    "Plato Elevado",
    "Juguete Mordedor",
    "Antiparasitario",
    "Cepillo Dental",
    "Transportadora",
  ];

  return Array.from({ length: 1000 }, (_, i) => ({
    id: `p${i}`,
    name: i < productNames.length ? productNames[i] : `Producto ${i}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    price: Math.floor(Math.random() * 5000) + 500,
    stock: Math.floor(Math.random() * 200),
    sales: Math.floor(Math.random() * 150),
    revenue: 0, // Se calculará
  })).map((p) => ({ ...p, revenue: p.price * p.sales }));
};

// Componente de métrica rápida

// Componente 1: Revenue Trends

// Componente 3: Product Comparison

// Componente 5: Category Distribution

// Componente 6: Offer Impact

// Página Principal



 function mapDashboardMetricsToStats(metrics: DashboardMetrics): Stat[] {
  return [
    {
      title: "Ingresos Totales",
      value: metrics.ingresosTotales.value,
      change: metrics.ingresosTotales.change.toString(),
      trend: metrics.ingresosTotales.trend,
      format: "currency",
      icon: DollarSign,
    },
    {
      title: "Órdenes",
      value: metrics.ordenes.value,
      change: metrics.ordenes.change.toString(),
      trend: metrics.ordenes.trend,
      format: "number",
      icon: ShoppingCart,
    },
    {
      title: "Clientes Nuevos",
      value: metrics.clientesNuevos.value,
      change: metrics.clientesNuevos.change.toString(),
      trend: metrics.clientesNuevos.trend,
      format: "number",
      icon: Users,
    },
    {
      title: "Productos Activos",
      value: metrics.productosActivos.value,
      change: metrics.productosActivos.change.toString(),
      trend: metrics.productosActivos.trend,
      format: "number",
      icon: Package,
    },
  ]
}



export default function AnalyticsDashboard() {
  const today = new Date();
const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

const [date, setDate] = useState<{
  from?: Date;
  to?: Date;
}>({
  from: firstDayLastMonth,
  to: today,
});

  const [stats, setStats] = useState<Stat[]>([
    {
        title: "Ingresos Totales",
        value: 0,
        change: "0",
        trend: "up",
        format: "currency",
        icon: DollarSign,
    },
    {
        title: "Órdenes",
        value: 0,
        change: "0",
        trend: "up",
        format: "number",
        icon: ShoppingCart,
    },
    {
        title: "Clientes Nuevos",
        value: 0,
        change: "0",
        trend: "up",
        format: "number",
        icon: Users,
    },
    {
        title: "Productos Activos",
        value: 0,
        change: "0",
        trend: "up",
        format: "number",
        icon: Package,
    }
  ]);

  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const stableDateRange = useMemo(() => {
    if (date.from && date.to) return { from: date.from, to: date.to };
    return { from: new Date(), to: new Date() };
  }, [date.from, date.to]);

  useEffect(() => {
    console.log("🚀 ~ DashboardMetrics ~ date:", date);

    async function load() {
        setLoadingMetrics(true);
      const data = await getDashboardMetrics(stableDateRange);
      setStats(mapDashboardMetricsToStats(data));
      console.log("🚀 ~ load ~ mapDashboardMetricsToStats(data):", mapDashboardMetricsToStats(data))
      setLoadingMetrics(false);
    }
    load();
  }, [stableDateRange.from, stableDateRange.to]);

 

  return (
    <div className="h-screen max-h-screen overflow-y-scroll p-4">
      <div className="container mx-auto p-0 pt-5 md:p-6">
        <div className="mb-8">
          <h1 className="text-text text-4xl font-bold">
            Dashboard de Analítica
          </h1>
          <p className="mt-2 text-gray-500">
            Métricas y estadísticas de tu negocio
          </p>
        </div>
        <div className="m-2 flex items-center justify-between p-2">
          <PeriodSelector date={date} setDate={setDate} />
        </div>

        {/* Métricas Rápidas */}
        <div className="mb-6">
          {/* MOBILE → Carousel */}
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 md:hidden">
            {stats.map((m, i) => (
              <div key={i} className="min-w-[240px] flex-shrink-0">
                <StatCard loading={loadingMetrics} stat={m} />
              </div>
            ))}
          </div>

          {/* DESKTOP → Grid */}
          <div className="hidden grid-cols-4 gap-4 md:grid">
           {stats.map((m, i) => ( 
             <StatCard key={i} stat={m} />
           ))}
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-1">
        <RevenueTrendsCard date={stableDateRange} />
        <ClientAnalyticsCard date={stableDateRange} />
        </div>
      </div>
    </div>
  );
}
