import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ShoppingCart, Package } from "lucide-react";
import { Product } from "@prisma/client";
import { getProductInsights } from "@/app/actions/products";
import Image from "next/image";

export const ProductModal = ({ product }: { product: Product }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [insights, setInsights] = useState<{
    totalRevenue: number;
    totalSold: number;
    trendPercentage: number | null;
    avgMonthlySales: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const images = product.images?.length
    ? product.images
    : product.imageUrl
    ? [product.imageUrl]
    : [];

  useEffect(() => {
    if (open) {
      (async () => {
        setLoading(true);
        const res = await getProductInsights(product.id);
        if (res.status === 200) setInsights(res.data);
        setLoading(false);
      })();
    }
  }, [open, product.id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <p className="hover:underline cursor-pointer">{product.name}</p>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="grid md:grid-cols-2">
          {/* Imagenes */}
          <div className="relative bg-gray-50">
            {images.length > 0 && images[currentImageIndex] && (
              <Image
                height={300}
                width={300}
                src={images[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
            </DialogHeader>

            <p className="text-3xl font-bold text-green-600 mb-4">
              {formatCurrency(Number(product.price))}
            </p>

            {/* Insights */}
            {loading && <p className="text-gray-500 text-sm">Cargando insights...</p>}
            {insights && !loading && (
              <div className="bg-background rounded-lg p-4 mb-6 border space-y-2">
                <p className="text-sm">
                 <strong>Facturado último mes:</strong> {formatCurrency(insights.totalRevenue)}
                </p>
                <p className="text-sm">
                   <strong>Unidades vendidas:</strong> {insights.totalSold}
                </p>
                {insights.trendPercentage !== null && (
                  <p
                    className={`text-sm ${
                      insights.trendPercentage >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {insights.trendPercentage >= 0 ? "⬆️" : "⬇️"}{" "}
                    <strong>{insights.trendPercentage.toFixed(1)}%</strong> respecto al mes anterior
                  </p>
                )}
              </div>
            )}

            {product.description && (
              <p className="text-gray-600 mb-6">{product.description}</p>
            )}


          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
