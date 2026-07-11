import { Area, AreaChart, CartesianGrid, XAxis, Tooltip } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  getWeeklyTotalsByMonths,
  WeekStats,
} from "@/app/actions/dashboard-metrics";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

const CustomTooltip = ({ active, payload, label, months }: { active?: boolean, payload?: any, label?: string, months: number[] }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="bg-background border border-primary p-2 rounded-md shadow-sm"
    >
      <p style={{ margin: 0, fontWeight: "600" }}>{months.length > 4 ? "Mes" : "Semana"}: {label}</p>
      <p style={{ margin: 0 }}>
        Total: ${payload[0].value.toLocaleString("es-AR")}
      </p>
    </div>
  );
};

export const description = "Gráfico de áreas apiladas";



const chartConfig = {
  desktop: {
    label: "Escritorio",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Móvil",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function AreaChartStacked({months, year} : {months: [number, number], year: number}) {

  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<WeekStats[]>([]);
  const getChartData = async () => {
    setLoading(true);
    const res = await getWeeklyTotalsByMonths(months, year);
    console.log("🚀 ~ getChartData ~ res:", res);
    setChartData(res);
    setLoading(false);
  };

  useEffect(() => {
    getChartData();
  }, [months, year]);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      {loading ? (
          <div className="space-y-3">
          {/* Header fake */}

          {/* Chart area */}
          <div
            className="w-full rounded-md bg-gray-100 dark:bg-slate-800 animate-pulse"
            style={{ height: 250 }}
          />

          {/* X Axis labels */}
          <div className="flex justify-between pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
      ) : (
        <AreaChart
          height={300}
          data={chartData}
          margin={{ left: 12, right: 12 }}

        >

          <XAxis
            dataKey="weekLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />

          {/* Tooltip nativo de Recharts */}
          <Tooltip content={<CustomTooltip months={months} />} />

          <Area
            dataKey="total"
            type="monotone"
            stroke="#14b8a6"
            fill="#14b8a6"
            fillOpacity={0.4}

          />
        </AreaChart>
      )}
    </ChartContainer>
  );
}
