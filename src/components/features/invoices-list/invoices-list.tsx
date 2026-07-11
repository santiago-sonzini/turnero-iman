"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { getOrders } from "@/app/actions/orders";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLoader from "../products-list-dashboard/loader";
import { OrderRow } from "./invoice-row";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
export default function InvoicesPageTable({ id }: { id?: string }) {
  const { toast } = useToast();

  // 📦 Datos
  const [data, setData] = useState<any>({
    orders: [],
    pagination: { page: 0, pageSize: 12, totalPages: 0, totalCount: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);

  // 🔢 Paginación / orden
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  // 🔍 Filtros
  const [filters, setFilters] = useState({ clientName: "" });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [refreshKey, setRefreshKey] = useState(0);

  // 🕒 Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(0);
    }, 900);
    return () => clearTimeout(t);
  }, [filters]);

  // 🔄 Cargar órdenes
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getOrders({
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters: {
            clientName: debouncedFilters.clientName || undefined,
        },
      });
      setData(res);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize, sortBy, sortOrder, debouncedFilters, refreshKey]);

  const totalPages = data.pagination.totalPages;

  return (
    <div className="mt-14 min-h-screen bg-background dark:bg-background">
      <main className="container mx-auto px-6 py-8">

        {/* Búsqueda + botón agregar */}
        <div className="mb-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por cliente..."
                  className="w-full rounded-sm bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-none focus:outline-none"
                  value={filters.clientName}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                />
              </div>
              <Link href="/dashboard/invoices/create">
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <DashboardLoader color="#e8503a" />
          </div>
        )}

        {/* Tabla / lista */}
        {!isLoading && (
          <div className="flex h-[62vh] flex-col gap-3 overflow-y-scroll">
            {data.orders.map((order: any) => (
              <OrderRow
                key={order.id}
                order={order}
               
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && data.orders.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No se encontraron facturas
            </p>
          </div>
        )}

        {/* Paginación */}
        {!isLoading && data.orders.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum =
                  totalPages <= 7 ? i
                  : page < 3 ? i
                  : page > totalPages - 4 ? totalPages - 7 + i
                  : page - 3 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setPage(pageNum)}
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
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Info paginación */}
        {!isLoading && data.orders.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Pagina {page + 1} de {totalPages} — Mostrando {data.orders.length}{" "}
            de {data.pagination.totalCount} facturas
          </div>
        )}
      </main>
    </div>
  );
}