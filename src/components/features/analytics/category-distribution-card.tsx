import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, ShoppingCart, Tag, TrendingDown, TrendingUp, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


// Componente 4: Client Analytics
export const CategoryDistributionCard = () => {
  const data = [
    { name: "Alimentos", value: 4200, orders: 145 },
    { name: "Accesorios", value: 2800, orders: 98 },
    { name: "Farmacia", value: 1900, orders: 67 },
    { name: "Juguetes", value: 1500, orders: 52 },
    { name: "Higiene", value: 1200, orders: 43 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <Card className="border  border-gray-200 rounded-sm shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Distribución por Categoría
        </CardTitle>
        <CardDescription>Ingresos por categoría de producto</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `$${value.toLocaleString()}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="flex flex-col justify-center space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">${item.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{item.orders} órdenes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};