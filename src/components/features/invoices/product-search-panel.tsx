"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductWithCategory } from "@/app/actions/products";
import { searchProducts, normalizeText } from "@/lib/product-search";
import { cn } from "@/lib/utils";

const BADGE_BASE =
  "shrink-0 rounded-sm px-1 py-0.5 text-[10px] font-medium leading-none";

// Fixed colors per known catalog.
const CATALOG_COLORS: Record<string, string> = {
  gas: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  sanitarios: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  perillas: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

const CATALOG_FALLBACK =
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

function catalogColor(catalog: string): string {
  return CATALOG_COLORS[normalizeText(catalog)] ?? CATALOG_FALLBACK;
}

// A palette of full Tailwind class strings so the JIT keeps them.
const CATEGORY_PALETTE = [
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
];

// Deterministic "random" color per category name (same name → same color).
function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0]!;
}

interface ProductSearchPanelProps {
  products: ProductWithCategory[];
  onAdd: (product: ProductWithCategory) => void;
  // Compute the display price for the current invoice type / IVA.
  formatPrice: (basePrice: number) => number;
  // Product ids already present in the invoice (for the "en factura" badge).
  addedIds: Set<string>;
}

const MAX_RESULTS = 50;

export function ProductSearchPanel({
  products,
  onAdd,
  formatPrice,
  addedIds,
}: ProductSearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return products.slice(0, MAX_RESULTS);
    return searchProducts(products, q, "name", MAX_RESULTS);
  }, [products, query]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 w-full sm:w-auto sm:shrink-0">
          <Search className="mr-2 h-4 w-4" />
          Buscar productos
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-3 sm:w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Buscar productos</SheetTitle>
        </SheetHeader>

        <Input
          autoFocus
          placeholder="Buscar por nombre, categoría o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9"
        />

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-1 pb-4">
            {results.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No hay productos.
              </p>
            )}

            {results.map((product) => {
              const added = addedIds.has(product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {product.name}
                      </span>
                      {added && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-sm bg-green-100 px-1 py-0.5 text-[10px] font-medium leading-none text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          <Check className="h-2.5 w-2.5" /> en factura
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      {product.catalog && (
                        <span className={cn(BADGE_BASE, catalogColor(product.catalog))}>
                          {product.catalog}
                        </span>
                      )}
                      {product.category && (
                        <span className={cn(BADGE_BASE, categoryColor(product.category))}>
                          {product.category}
                        </span>
                      )}
                      {product.slug && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {product.slug}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    ${formatPrice(product.price).toFixed(0)}
                  </span>

                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onAdd(product)}
                    aria-label={`Agregar ${product.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
