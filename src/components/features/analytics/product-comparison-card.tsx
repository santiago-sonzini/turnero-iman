import { getProductsAction, getProductsActionWithPeriod } from "@/app/actions/products";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, ShoppingCart, TrendingDown, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  ordersCount: number;
  revenue: number;
};

export const ProductComparisonCard = ({ date }: { date: { from: Date; to: Date } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // --------------------------
  // 🔍 FUNCIÓN DE BÚSQUEDA REAL
  // --------------------------
  const searchProducts = async (query: string, searchBy: "slug" | "name") => {
    if (!query || query.length < 2) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getProductsActionWithPeriod({
        page: 0,
        pageSize: 10,
        sortBy: "name",
        sortOrder: "asc",
        startDate: date.from && date.from.toISOString(),
        endDate: date.to && date.to.toISOString(),
        filters: {
          slug: searchBy === "slug" ? query : "",
          name: searchBy === "name" ? query : "",
        },
      });
      console.log("🚀 ~ ProductComparisonCard ~ response:", response);
      setProducts(response.products);
    } catch (error) {
      console.error("Error buscando productos:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    if (!selectedProducts.find((p) => p.id === product.id) && selectedProducts.length < 6) {
      setSelectedProducts([...selectedProducts, product]);
    }
    setSearchTerm("");
    setProducts([]);
  };

  const handleRemoveProduct = (productId: string) => {
    if (selectedProducts.length > 1) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
    }
  };

  const chartData = selectedProducts.map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
    ventas: p.ordersCount,
    ingresos: p.revenue / 100,
  }));

  return (
    <Card className="border col-span-2 border-gray-200 rounded-sm shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Comparador de Productos
        </CardTitle>
        <CardDescription>Compara hasta 6 productos simultáneamente</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* ---------------------- */}
          {/* 🔍 Input de búsqueda */}
          {/* ---------------------- */}
          <div className="relative">
            <Input
              placeholder="Buscar producto para agregar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchProducts(e.target.value, "name");
              }}
              className="pr-10"
            />
            {selectedProducts.length >= 6 && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">Máx. 6</span>
            )}
          </div>

          {/* ---------------------- */}
          {/* 📌 Dropdown de resultados */}
          {/* ---------------------- */}
          {searchTerm && (
            <div className="border rounded-sm max-h-48 overflow-y-auto bg-white shadow-sm">
              {isLoading && (
                <div className="p-3 text-center text-sm text-gray-500">Buscando...</div>
              )}

              {!isLoading && products.length === 0 && (
                <div className="p-3 text-center text-sm text-gray-500">No se encontraron productos</div>
              )}

              {!isLoading &&
                products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    disabled={
                      selectedProducts.some((p) => p.id === product.id) ||
                      selectedProducts.length >= 6
                    }
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{product.category}</span>
                      </div>
                      <span className="text-sm text-gray-600">${product.price}</span>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* ---------------------- */}
          {/* 🏷️ Chips de productos */}
          {/* ---------------------- */}
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <span className="font-medium">{product.name}</span>
                <button
                  onClick={() => handleRemoveProduct(product.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  disabled={selectedProducts.length === 1}
                >
                  <X size={14} />
                </button>
              </Badge>
            ))}
          </div>

          {/* ---------------------- */}
          {/* 📊 Chart */}
          {/* ---------------------- */}
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="ventas" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Ventas (unidades)" />
              <Bar yAxisId="right" dataKey="ingresos" fill="#10b981" radius={[8, 8, 0, 0]} name="Ingresos (x100)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
