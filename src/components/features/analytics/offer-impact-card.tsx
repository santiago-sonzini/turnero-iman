import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const OfferImpactCard = () => {
  const data = [
    { name: "Descuento 20%", conversions: 89, revenue: 18500 },
    { name: "2x1 en Alimentos", conversions: 125, revenue: 25300 },
    { name: "Envío Gratis", conversions: 67, revenue: 12800 },
    { name: "Promo Semanal", conversions: 45, revenue: 9200 },
  ];

  return (
    <Card className="border  border-gray-200 rounded-sm shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Impacto de Ofertas
        </CardTitle>
        <CardDescription>Conversiones e ingresos por promoción</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280" 
              style={{ fontSize: '11px' }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Bar
              yAxisId="left" 
              dataKey="conversions" 
              fill="#f59e0b" 
              radius={[8, 8, 0, 0]} 
              name="Conversiones"
            />
            <Bar 
              yAxisId="right" 
              dataKey="revenue" 
              fill="#8b5cf6" 
              radius={[8, 8, 0, 0]} 
              name="Ingresos ($)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
  