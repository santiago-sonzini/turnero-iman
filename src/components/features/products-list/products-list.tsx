"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid, List, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/types";

import { ProductCard } from "./product-card";
import {
  getProductsAction,
  ProductsReturn,
  ProductWithRelations,
} from "@/app/actions/products";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useCart } from "@/store/cart";
import CartIcon from "./cart-icon";
import DashboardLoader from "../products-list-dashboard/loader";

// Mock data - replace with actual API call

const Products = ({ catalog }: { catalog?: string }) => {
  const { toast } = useToast();
  const { items, removeItem, clear } = useCart();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 📦 Datos
  const [data, setData] = useState<ProductsReturn>({
    products: [],
    pagination: { page: 0, pageSize: 12, totalPages: 0, totalCount: 0 },
  });

  const [isLoading, setIsLoading] = useState(true);

  // 🔢 Estado tabla/lista
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  // 🔍 Filtros
  const [filters, setFilters] = useState({
    name: "",
    category: "",
    catalog: catalog ?? "",
  });

  // 🕒 Debounce filters
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(0);
    }, 750);

    return () => clearTimeout(timeout);
  }, [filters]);

  // 🔄 Cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);

        const res = await getProductsAction({
          page,
          pageSize: viewMode === "grid" ? 12 : 12,
          sortBy,
          sortOrder,
          filters: debouncedFilters,
        });

        setData(res);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [page, pageSize, sortBy, sortOrder, debouncedFilters, refreshKey]);

  // Sincronizar catalog cuando cambia como prop
  useEffect(() => {
    if (catalog) {
      setFilters((prev) => ({ ...prev, catalog }));
    }
  }, [catalog]);

  // ↕️ Ordenamiento
  const handleSortingChange = (updatedSorting: any[]) => {
    if (updatedSorting.length > 0) {
      setSortBy(updatedSorting[0].id);
      setSortOrder(updatedSorting[0].desc ? "desc" : "asc");
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  // 📑 Paginación
  const handlePaginationChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = data.pagination.totalPages;

  return (
    <div className="mt-14 min-h-screen bg-background">
      {/* Header minimalista */}

      {/* Main */}
      <main className="container mx-auto px-6 py-8">
        {/* Búsqueda minimalista */}
        <div className="mb-8 flex items-center justify-center">
          <div className="max-w-md">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-1 border-slate-200 dark:border-slate-800">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-9 w-9"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex items-center justify-center">
             <DashboardLoader />
          </div>
        )}

        {/* Grid o List */}
        {!isLoading && (
          <div
            className={
              viewMode === "grid"
                ? "grid h-[62vh] grid-cols-1 gap-6 overflow-y-scroll sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex h-[62vh] flex-col gap-3 overflow-y-scroll"
            }
          >
            {data.products.map((product: ProductWithRelations) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data.products.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No products found
            </p>
          </div>
        )}

        {/* Paginación */}
        {!isLoading && data.products.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePaginationChange(page - 1)}
              disabled={page === 0}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;

                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="icon"
                    onClick={() => handlePaginationChange(pageNum)}
                    className="h-9 w-9 text-sm"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePaginationChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Info de paginación */}
        {!isLoading && data.products.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Pagina {page + 1} de {totalPages} — Mostrando {data.products.length}{" "}
            de {data.pagination.totalCount} productos
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
