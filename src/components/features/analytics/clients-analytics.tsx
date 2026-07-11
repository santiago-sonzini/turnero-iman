import { getTopClientsAnalytics } from "@/app/actions/analytics";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Componente 4: Client Analytics
export const ClientAnalyticsCard = ({
  date,
}: {
  date: { from?: Date; to?: Date };
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>([]);

  useEffect(() => {
    console.log("🚀 ~ ClientAnalyticsCard ~ date:", date);
    const getData = async () => {
      setLoading(true);
      const res = await getTopClientsAnalytics({
        startDate: date.from,
        endDate: date.to,
      });
      console.log("🚀 ~ getData ~ res:", res);
      setData(res);
      setLoading(false);
    };
    getData();
  }, [date.from, date.to]);

  return (
    <Card className="w rounded-sm border border-gray-200 p-4 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Análisis de Clientes
        </CardTitle>
        <CardDescription>Nuevos vs Recurrentes (última semana)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                fontSize={12}
                dataKey="name"
                angle={-30}
                textAnchor="end"
                interval={0} // fuerza que todas las etiquetas se muestren
                stroke="#6b7280"
              />
              {/* Eje para revenue */}
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tickFormatter={(value) => `$${(value / 1_000_000).toFixed(1)}M`}
              />

              {/* Eje para ordersCount */}
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />

              <Tooltip
                formatter={(value: any, name) => {
                  if (name === "Facturación") {
                    return [`$${(value / 1_000_000).toFixed(1)}M`, name];
                  }
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "#111827",
                }}
              />

              <Legend layout="horizontal" verticalAlign="top" align="center" />

              {/* Facturación */}
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#3b82f6"
                name="Facturación"
                radius={[6, 6, 0, 0]}
              />

              {/* Cantidad de órdenes */}
              <Bar
                yAxisId="right"
                dataKey="ordersCount"
                fill="#10b981"
                name="Pedidos"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
