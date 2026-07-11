"use client";
import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronsUpDown, X, Tag, Package, Layers, Globe,
  Calendar, Percent, DollarSign, Link, ChevronRight, Search,
  Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createOfferAction } from "@/app/actions/offers";
import { ProductWithCategory } from "@/app/actions/products";
import { Category } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
type OfferScope = "GLOBAL" | "PRODUCTS" | "CATEGORY";

interface CreateOfferPageProps {
  products: ProductWithCategory[];
  categories: Category[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatPrice(n: number) {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

const CATALOG_COLOR: Record<string, string> = {
  Gas: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Sanitarios: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Perillas: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const catalogColor = (c: string | null) =>
  c ? (CATALOG_COLOR[c] ?? "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground";

// ─── Derived categories ───────────────────────────────────────────────────────

interface CategoryEntry {
  key: string; // `${catalog ?? "Sin catálogo"}::${category}`
  catalog: string | null;
  category: string;
  count: number;
}

function buildCategories(products: ProductWithCategory[]): CategoryEntry[] {
  const map = new Map<string, CategoryEntry>();
  for (const p of products) {
    const catalogKey = p.catalog ?? "Sin catálogo";
    const key = `${catalogKey}::${p.category}`;
    const e = map.get(key);
    e
      ? e.count++
      : map.set(key, { key, catalog: p.catalog, category: p.category, count: 1 });
  }
  return [...map.values()].sort((a, b) => {
    const ac = a.catalog ?? "";
    const bc = b.catalog ?? "";
    return ac.localeCompare(bc) || a.category.localeCompare(b.category);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScopeTab({ value, current, icon, label, onClick }: {
  value: OfferScope; current: OfferScope; icon: React.ReactNode; label: string; onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-md border-2 py-3 px-2 text-center transition-all",
        active
          ? "border-[#e8503a] bg-[#e8503a]/5 text-[#e8503a]"
          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
      )}
    >
      {icon}
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function ProductSearchCombobox({ products, selectedIds, onToggle }: {
  products: ProductWithCategory[];
  selectedIds: Set<string>;
  onToggle: (p: ProductWithCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return products.slice(0, 30);
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const fields = [
        normalize(p.name),
        normalize(p.slug),
        normalize(p.category),
        normalize(p.catalog ?? ""),
      ];
      return words.every((w) => fields.some((f) => f.includes(w)));
    });
  }, [products, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Buscar producto por nombre, código...
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Nombre, slug, categoría..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-72">
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {filtered.map((product) => {
                const selected = selectedIds.has(product.id);
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.slug} ${product.category}`}
                    onSelect={() => onToggle(product)}
                    className="gap-2"
                  >
                    <div className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border transition-colors",
                      selected && "border-[#e8503a] bg-[#e8503a]"
                    )}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="h-8 w-8 rounded-sm border border-border object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-sm border border-border bg-muted" />
                    )}
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">{product.name}</span>
                        {product.catalog && (
                          <span className={cn("rounded-sm px-1 py-0.5 text-[10px] font-semibold leading-none", catalogColor(product.catalog))}>
                            {product.catalog}
                          </span>
                        )}
                        <span className="rounded-sm bg-violet-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          {product.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{product.slug}</span>
                        <span className="text-xs text-muted-foreground">{formatPrice(product.price)}</span>
                        {product.status === "out_of_stock" && (
                          <span className="text-[10px] text-orange-600 font-semibold">Sin stock</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Toast inline ─────────────────────────────────────────────────────────────

function Toast({ type, message, onClose }: {
  type: "success" | "error"; message: string; onClose: () => void;
}) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium",
      type === "success"
        ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
        : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    )}>
      {type === "success"
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
      <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateOfferPage({ products, categories }: CreateOfferPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Basic fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [minPurchase, setMinPurchase] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Scope
  const [scope, setScope] = useState<OfferScope>("GLOBAL");

  const categoryChips = useMemo(() => buildCategories(products), [products]);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.has(p.id)),
    [products, selectedProductIds]
  );

  const affectedByCategory = useMemo(() => {
    if (!selectedCategoryKey) return 0;
    const [catalogKey, catName] = selectedCategoryKey.split("::");
    return products.filter(
      (p) => (p.catalog ?? "Sin catálogo") === catalogKey && p.category === catName
    ).length;
  }, [products, selectedCategoryKey]);

  const toggleProduct = (product: ProductWithCategory) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(product.id) ? next.delete(product.id) : next.add(product.id);
      return next;
    });
  };

  const resolveCategoryId = (key: string): string | undefined => {
    const [, catName] = key.split("::");
    return categories.find((c) => c.name === catName)?.id;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (scope === "CATEGORY" && !selectedCategoryKey) {
      setToast({ type: "error", message: "Seleccioná una categoría para esta oferta." });
      return;
    }
    if (scope === "PRODUCTS" && selectedProductIds.size === 0) {
      setToast({ type: "error", message: "Seleccioná al menos un producto." });
      return;
    }

    startTransition(async () => {
      const result = await createOfferAction({
        name,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        imageUrl: imageUrl || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive,
        minPurchaseAmount: minPurchase ? parseFloat(minPurchase) : undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        scope,
        ...(scope === "PRODUCTS" && { productIds: [...selectedProductIds] }),
        ...(scope === "CATEGORY" &&
          selectedCategoryKey && {
            categoryId: resolveCategoryId(selectedCategoryKey),
          }),
      });

      if (result.status === 200) {
        setToast({ type: "success", message: result.message });
        setTimeout(() => router.push("/ofertas"), 1200);
      } else {
        setToast({ type: "error", message: result.message });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Ofertas</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Nueva oferta</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e8503a]/10 text-[#e8503a]">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase italic tracking-tight leading-none">
                  Nueva Oferta
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configurá descuento, alcance y productos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Activa</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">

          {/* ── LEFT ── */}
          <div className="space-y-5">

            {/* Datos generales */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Datos generales
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Nombre <span className="text-[#e8503a]">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Promo invierno termocuplas"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold">Descripción</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Texto interno o visible al cliente..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="link" className="text-xs font-semibold flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" /> URL de la oferta
                </Label>
                <Input
                  id="link"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://sanigas.com.ar/ofertas/..."
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="img" className="text-xs font-semibold">URL imagen</Label>
                <Input
                  id="img"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 text-sm font-mono"
                />
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="mt-1 h-24 w-full rounded-md border border-border object-cover" />
                )}
              </div>
            </section>

            {/* Descuento */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Descuento
              </h2>
              <div className="flex gap-2">
                {(["PERCENTAGE", "FIXED_AMOUNT"] as DiscountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDiscountType(type)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md border-2 py-2.5 text-sm font-bold uppercase tracking-wider transition-all",
                      discountType === type
                        ? "border-[#e8503a] bg-[#e8503a]/5 text-[#e8503a]"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {type === "PERCENTAGE"
                      ? <><Percent className="h-4 w-4" /> Porcentaje</>
                      : <><DollarSign className="h-4 w-4" /> Monto fijo</>}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Valor {discountType === "PERCENTAGE" ? "(%)" : "(ARS)"}{" "}
                    <span className="text-[#e8503a]">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {discountType === "PERCENTAGE" ? "%" : "$"}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max={discountType === "PERCENTAGE" ? "100" : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "PERCENTAGE" ? "20" : "5000"}
                      required
                      className="h-9 pl-7 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold">Compra mínima (ARS)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(e.target.value)}
                      placeholder="Opcional"
                      className="h-9 pl-7 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold">Máx. usos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Sin límite"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Inicio <span className="text-[#e8503a]">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Vencimiento <span className="text-[#e8503a]">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Alcance */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Alcance
              </h2>
              <div className="flex gap-2">
                <ScopeTab value="GLOBAL"   current={scope} icon={<Globe   className="h-4 w-4" />} label="Global"      onClick={() => setScope("GLOBAL")}   />
                <ScopeTab value="CATEGORY" current={scope} icon={<Layers  className="h-4 w-4" />} label="Categorías" onClick={() => setScope("CATEGORY")} />
                <ScopeTab value="PRODUCTS" current={scope} icon={<Package className="h-4 w-4" />} label="Productos"  onClick={() => setScope("PRODUCTS")} />
              </div>

              {scope === "GLOBAL" && (
                <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                  El descuento aplica a todos los productos de la tienda.
                </p>
              )}

              {scope === "CATEGORY" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Seleccioná una categoría (el modelo admite una por oferta):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryChips.map((cat) => {
                      const active = selectedCategoryKey === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setSelectedCategoryKey(active ? null : cat.key)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                            active
                              ? "border-[#e8503a] bg-[#e8503a]/10 text-[#e8503a]"
                              : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                          )}
                        >
                          {active && <Check className="h-3 w-3" />}
                          {cat.catalog && (
                            <span className={cn("rounded-sm px-1 py-0.5 text-[9px] font-bold leading-none", catalogColor(cat.catalog))}>
                              {cat.catalog}
                            </span>
                          )}
                          {cat.category}
                          <span className="text-[10px] opacity-50">({cat.count})</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedCategoryKey && (
                    <p className="text-xs text-muted-foreground">
                      {affectedByCategory} producto{affectedByCategory !== 1 ? "s" : ""} afectado{affectedByCategory !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {scope === "PRODUCTS" && (
                <div className="space-y-3">
                  <ProductSearchCombobox
                    products={products}
                    selectedIds={selectedProductIds}
                    onToggle={toggleProduct}
                  />
                  {selectedProducts.length > 0 ? (
                    <div className="space-y-1">
                      {selectedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                        >
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="h-7 w-7 rounded-sm border border-border object-cover shrink-0" />
                          ) : (
                            <div className="h-7 w-7 shrink-0 rounded-sm border border-border bg-muted" />
                          )}
                          <div className="flex flex-1 items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium truncate">{p.name}</span>
                            {p.catalog && (
                              <span className={cn("shrink-0 rounded-sm px-1 py-0.5 text-[9px] font-bold leading-none", catalogColor(p.catalog))}>
                                {p.catalog}
                              </span>
                            )}
                            <span className="shrink-0 rounded-sm bg-violet-100 px-1 py-0.5 text-[9px] font-bold leading-none text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                              {p.category}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">{p.slug}</span>
                          <button
                            type="button"
                            onClick={() => toggleProduct(p)}
                            className="ml-1 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Ningún producto seleccionado
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT: Preview + submit ── */}
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-5 space-y-3 sticky top-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Vista previa
              </h2>

              <div className="rounded-md border-2 border-dashed border-border overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground/30">
                    <Tag className="h-10 w-10" />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black uppercase italic leading-tight">
                      {name || (
                        <span className="text-muted-foreground/40 font-normal not-italic normal-case text-xs">
                          Sin nombre
                        </span>
                      )}
                    </p>
                    {discountValue && (
                      <span className="shrink-0 bg-[#e8503a] px-2 py-0.5 text-sm font-black text-white">
                        {discountType === "PERCENTAGE"
                          ? `-${discountValue}%`
                          : `-$${Number(discountValue).toLocaleString("es-AR")}`}
                      </span>
                    )}
                  </div>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {scope === "GLOBAL"
                        ? "Toda la tienda"
                        : scope === "CATEGORY"
                        ? selectedCategoryKey?.split("::")[1] ?? "Sin categoría"
                        : `${selectedProducts.length} producto${selectedProducts.length !== 1 ? "s" : ""}`}
                    </Badge>
                    {endDate && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        <Calendar className="mr-1 h-2.5 w-2.5" />
                        Hasta{" "}
                        {new Date(endDate).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                        })}
                      </Badge>
                    )}
                    {minPurchase && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        Mín. ${Number(minPurchase).toLocaleString("es-AR")}
                      </Badge>
                    )}
                  </div>
                  {linkUrl && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">{linkUrl}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-semibold">
                    {discountType === "PERCENTAGE" ? "Porcentaje" : "Monto fijo"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alcance</span>
                  <span className="font-semibold">{scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <span className={cn("font-semibold", isActive ? "text-green-600" : "text-muted-foreground")}>
                    {isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                {maxUses && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Máx. usos</span>
                    <span className="font-semibold">{maxUses}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#e8503a] hover:bg-[#b51018] text-white font-black uppercase tracking-wider text-sm h-10 disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Crear oferta
                  </>
                )}
              </Button>
            </section>
          </div>

        </div>
      </form>
    </div>
  );
}