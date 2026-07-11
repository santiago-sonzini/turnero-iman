"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "./product-card";
import {
  getProductsAction,
  ProductsReturn,
  ProductWithCategory,
} from "@/app/actions/products";
import { getCatalogos } from "@/app/actions/precios";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProductForm } from "../products/product-form";
import DashboardLoader from "./loader";
import { ImportProductsModal } from "./bulk-insert-modal";
import { ActualizarPreciosDialog } from "@/components/iman/actualizar-precios-dialog";
import { MargenesDialog } from "@/components/iman/margenes-dialog";
import { PreciosBulkBar } from "@/components/iman/precios-bulk-bar";

const FIRST_PAGE_SIZE = 50;

// features del pack de demo: sin features (deploy real) se muestra todo.
import type { DemoPackFeatures } from "@/server/demo/packs/types";

const ProductsDashboard = ({
  features,
}: {
  features?: DemoPackFeatures | null;
}) => {
  const { toast } = useToast();
  const verProveedor = features ? features.conexionProveedor : true;
  const verMargenes = features ? features.margenesMasa : true;

  const [data, setData] = useState<ProductsReturn>({
    products: [],
    pagination: { page: 0, pageSize: FIRST_PAGE_SIZE, totalPages: 0, totalCount: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(FIRST_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState({ name: "", catalog: "" });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [catalogos, setCatalogos] = useState<string[]>([]);

  // ── Selección tipo Excel (checkbox + arrastre) ──────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dragging = useRef(false);
  const dragMode = useRef<"add" | "remove">("add");

  useEffect(() => {
    getCatalogos().then(setCatalogos).catch(() => {});
    const stop = () => (dragging.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const onSelectDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          dragMode.current = "remove";
        } else {
          next.add(id);
          dragMode.current = "add";
        }
        return next;
      });
    },
    [],
  );

  const onSelectEnter = useCallback((id: string) => {
    if (!dragging.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current === "add") next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Debounce filters — reset to page 0 on change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(0);
    }, 500);
    return () => clearTimeout(timeout);
  }, [filters]);

  // Fetch
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await getProductsAction({
          page,
          pageSize,
          filters: debouncedFilters,
        });
        setData(res);
        setSelected(new Set()); // la selección se limpia al cambiar de lista
      } catch {
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [page, pageSize, debouncedFilters, refreshKey]);

  const { products, pagination } = data;
  const { totalPages, totalCount } = pagination;

  const goTo = (next: number) => {
    setPage(next);
  };

  return (
    <div className="mt-10 min-h-screen bg-background text-foreground">
      <ProductForm
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onSuccess={(product: any) => {
          toast({ title: "PRODUCTO AGREGADO", description: product.name });
          setRefreshKey((prev) => prev + 1);
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 p-3">
            {/* SEARCH */}
            <div className="relative rounded-md border border-neutral-300 dark:border-neutral-700">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Buscar..."
                className="h-9 w-52 border-0 bg-transparent pl-8 text-sm text-black dark:text-white"
                value={filters.name}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* CATALOG */}
            <Select
              value={filters.catalog || "ALL"}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, catalog: val === "ALL" ? "" : val }))
              }
            >
              <SelectTrigger className="h-9 w-36 rounded-md border border-neutral-300 bg-transparent text-sm text-black dark:border-neutral-700 dark:text-white">
                <SelectValue placeholder="Catálogo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {catalogos.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ADD */}
            <Button
              onClick={() => setIsAddProductOpen(true)}
              className="h-9 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="mr-2 size-3.5" />
              Agregar
            </Button>

            <ImportProductsModal />

            {verProveedor && (
              <ActualizarPreciosDialog onAplicado={() => setRefreshKey((k) => k + 1)} />
            )}

            {verMargenes && (
              <MargenesDialog onAplicado={() => setRefreshKey((k) => k + 1)} />
            )}

            {/* PAGE SIZE */}
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-24 rounded-md border border-neutral-300 bg-transparent text-sm text-black dark:border-neutral-700 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LOADER */}
        {isLoading && (
          <div className="flex items-center justify-center rounded-lg border border-neutral-200 py-12 dark:border-neutral-800">
            <DashboardLoader />
          </div>
        )}

        {/* LIST */}
        {!isLoading && products.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            {/* Column header (desktop only) — Notion-style property row */}
            <div className="hidden grid-cols-[30px_34px_1fr_92px_92px_72px_88px] items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 lg:grid dark:border-neutral-800 dark:bg-neutral-900/50">
              {/* SELECT ALL (página visible) */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Seleccionar todo"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.size === products.length
                        ? new Set()
                        : new Set(products.map((p) => p.id)),
                    )
                  }
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                    products.length > 0 && selected.size === products.length
                      ? "border-acento bg-acento text-white"
                      : "border-neutral-300 dark:border-neutral-600",
                  )}
                >
                  {products.length > 0 && selected.size === products.length && (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  )}
                </button>
              </div>
              <span />
              <span>Producto</span>
              <span className="text-right">Costo</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Margen</span>
              <span className="text-right">Stock</span>
            </div>
            <div className="flex max-h-[62vh] flex-col overflow-y-auto">
              {products.map((product: ProductWithCategory) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode="list"
                  selectable
                  selected={selected.has(product.id)}
                  onSelectDown={onSelectDown}
                  onSelectEnter={onSelectEnter}
                />
              ))}
            </div>
          </div>
        )}

        {/* EMPTY */}
        {!isLoading && products.length === 0 && (
          <div className="rounded-lg border border-neutral-200 py-12 text-center text-xs font-medium uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            SIN RESULTADOS
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border border-neutral-300 dark:border-neutral-700"
              disabled={page === 0}
              onClick={() => goTo(page - 1)}
            >
              <ChevronLeft className="size-3" />
            </Button>

            {/* Page pills — show up to 7 pages around current */}
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => Math.abs(i - page) <= 3 || i === 0 || i === totalPages - 1)
              .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="text-xs font-bold opacity-40">
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 rounded-md border text-xs font-medium ${item === page
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-background text-black dark:border-neutral-700 dark:text-white"
                      }`}
                    onClick={() => goTo(item as number)}
                  >
                    {(item as number) + 1}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border border-neutral-300 dark:border-neutral-700"
              disabled={page >= totalPages - 1}
              onClick={() => goTo(page + 1)}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        )}

        {/* INFO */}
        {!isLoading && products.length > 0 && (
          <div className="mt-2 text-center text-[10px] font-bold uppercase opacity-70">
            PÁGINA {page + 1} / {totalPages} — {products.length} / {totalCount} PRODUCTOS
          </div>
        )}
      </main>

      {/* Barra de acciones en masa (aparece con la selección) */}
      {verMargenes && (
        <PreciosBulkBar
          ids={[...selected]}
          onClear={clearSelection}
          onDone={() => {
            clearSelection();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};

export default ProductsDashboard;