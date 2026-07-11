// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Package, TrendingDown, TrendingUp } from "lucide-react";
// import { useMemo } from "react";
// import { Area, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// // Componente 2: Top Products Analytics
// export const TopProductsCard = () => {
//   const topProducts = useMemo(() => 
//     allProducts
//       .sort((a, b) => b.revenue - a.revenue)
//       .slice(0, 8)
//   , [allProducts]);

//   return (
//     <Card className="border border-gray-200 rounded-sm shadow-sm">
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Package className="w-5 h-5" />
//           Top 8 Productos
//         </CardTitle>
//         <CardDescription>Por ingresos generados</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <ResponsiveContainer width="100%" height={350}>
//           <BarChart data={topProducts} layout="vertical">
//             <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//             <XAxis type="number" stroke="#6b7280" />
//             <YAxis 
//               dataKey="name" 
//               type="category" 
//               width={120}
//               stroke="#6b7280"
//               style={{ fontSize: '12px' }}
//             />
//             <Tooltip 
//               contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
//               formatter={(value) => `$${value.toLocaleString()}`}
//             />
//             <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Ingresos" />
//           </BarChart>
//         </ResponsiveContainer>
//       </CardContent>
//     </Card>
//   );
// };