import { getRevenueTrends, RevenueTrendsResult } from "@/app/actions/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const RevenueTrendsCard = ({
  date,
}: {
  date: { from: Date; to: Date };
}) => {
  const [trends, setTrends] = useState<RevenueTrendsResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (date.from && date.to) {
        const res = await getRevenueTrends(date);
        console.log("🚀 ~ load ~ res:", res);
        setTrends(res);
      }
      setLoading(false);
    }
    console.log("🚀 ~ RevenueTrendsCard ~ date:", date);
    load();
  }, [date.from, date.to]);

  return (
    <Card className="col-span-2 rounded-sm border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>Ingresos y Pedidos</CardTitle>
        <CardDescription>
          {trends?.mode === "weekly"
            ? "Ingresos y pedidos semanales"
            : "Ingresos y pedidos mensuales"}
        </CardDescription>{" "}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trends?.data ?? []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tickFormatter={(value) => `$${(value / 1_000_000).toFixed(1)}M`}
              />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                formatter={(value: any, name) => {
                  if (name === "Ingresos ($)") {
                    return [`$${(value / 1_000_000).toFixed(1)}M`, name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="#3b82f6"
                strokeWidth={2}
                name="Ingresos ($)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#10b981"
                fill="#10b981"
                strokeWidth={2}
                name="Pedidos"
                dot={{ fill: "#10b981", r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
