"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  KeyboardEvent,
  useEffect,
} from "react";
import { Check, ChevronsUpDown, Trash2, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { SafeImageWithModal } from "./safe-image";
import { OrderItem, Product } from "./create";
import { ProductWithCategory, updateProductPartial } from "@/app/actions/products";
import { searchProducts } from "@/lib/product-search";

const FOCUSABLE_COLS = [
  "quantity",
  "slug",
  "name",
  "unitPrice",
  "remove",
] as const;
type FocusableCol = (typeof FOCUSABLE_COLS)[number];

const isCustomRow = (item: OrderItem) =>
  !!item.isCustom || (!item.productId && !!item.productName);

// ─── Row ──────────────────────────────────────────────────────────────────────
interface OrderItemRowProps {
  iva: boolean;
  item: OrderItem;
  index: number;
  onUpdate: (id: string, field: keyof OrderItem, value: unknown) => void;
  onRemove: (id: string) => void;
  onSelectProduct: (itemId: string, product: Product) => void;
  onCreateCustom: (itemId: string, name: string) => void;
  onPriceCommit: (item: OrderItem, newPrice: number) => void;
  products: ProductWithCategory[];
  focusedCell: [number, FocusableCol] | null;
  setFocusedCell: (cell: [number, FocusableCol] | null) => void;
  onKeyDown: (
    e: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    col: FocusableCol,
  ) => void;
}

function OrderItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  onSelectProduct,
  onCreateCustom,
  onPriceCommit,
  products,
  focusedCell,
  setFocusedCell,
  onKeyDown,
}: OrderItemRowProps) {
  const [slugQuery, setSlugQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [openSlug, setOpenSlug] = useState(false);
  const [openName, setOpenName] = useState(false);
  const [quantityValue, setQuantityValue] = useState(String(item.quantity));
  const priceOnFocus = useRef<number>(item.unitPrice);

  // Keep the displayed quantity in sync when it changes from outside (e.g. paste).
  useEffect(() => {
    setQuantityValue(String(item.quantity));
  }, [item.quantity]);

  const custom = isCustomRow(item);

  const filteredBySlug = useMemo(
    () => searchProducts(products, slugQuery, "slug", 30),
    [products, slugQuery],
  );

  const filteredByName = useMemo(
    () => searchProducts(products, nameQuery, "name", 40),
    [products, nameQuery],
  );

  const isActive = (col: FocusableCol) =>
    focusedCell?.[0] === index && focusedCell?.[1] === col;

  const cellCn = (col: FocusableCol) =>
    cn(
      "relative px-2 py-1 transition-colors",
      isActive(col) && "bg-primary/5 ring-1 ring-inset ring-primary/30",
    );

  // Float quantities (e.g. 1.5 kg) are allowed.
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQuantityValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) onUpdate(item.id, "quantity", parsed);
  };

  const handleQuantityBlur = () => {
    const parsed = parseFloat(quantityValue);
    if (isNaN(parsed) || parsed <= 0) {
      setQuantityValue("1");
      onUpdate(item.id, "quantity", 1);
    } else {
      setQuantityValue(String(parsed));
    }
  };

  const trimmedName = nameQuery.trim();

  return (
    <tr className="group border-b border-border/40 transition-colors hover:bg-muted/20">
      {/* Index */}
      <td className="select-none px-2 py-1 text-center text-xs tabular-nums text-muted-foreground/50">
        #{item.index}
      </td>
      <td className="hidden px-2 py-1 text-center sm:table-cell">
        <SafeImageWithModal
          src={item.imageUrl}
          alt={item.productName}
          className="mx-auto h-6 w-6 rounded-sm border border-border object-cover"
        />
      </td>

      {/* Cantidad */}
      <td className={cellCn("quantity")}>
        <Input
          data-cell={`${index}-quantity`}
          type="number"
          min="0"
          step="any"
          value={quantityValue}
          onChange={handleQuantityChange}
          onBlur={handleQuantityBlur}
          onFocus={() => setFocusedCell([index, "quantity"])}
          onKeyDown={(e) => onKeyDown(e, index, "quantity")}
          className="h-7 w-full border-0 bg-transparent p-0 text-center text-sm shadow-none focus-visible:ring-0"
        />
      </td>

      {/* Código */}
      <td className={cellCn("slug")}>
        {custom ? (
          <span className="block px-1 text-center text-xs text-muted-foreground/40">
            —
          </span>
        ) : (
          <Popover
            open={openSlug}
            onOpenChange={(open) => {
              setOpenSlug(open);
              if (!open) setSlugQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                data-cell={`${index}-slug`}
                variant="ghost"
                role="combobox"
                onFocus={() => setFocusedCell([index, "slug"])}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") return;
                  onKeyDown(e, index, "slug");
                }}
                className="h-7 w-full justify-between px-1 text-sm font-normal hover:bg-transparent focus-visible:ring-0"
              >
                <span className="truncate text-left">
                  {item.productSlug || (
                    <span className="text-muted-foreground/40">Código...</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-30" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por código..."
                  value={slugQuery}
                  onValueChange={setSlugQuery}
                />
                <CommandList>
                  <CommandEmpty>No hay productos.</CommandEmpty>
                  <CommandGroup>
                    {filteredBySlug.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => {
                          onSelectProduct(item.id, product);
                          setOpenSlug(false);
                          setSlugQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            item.productId === product.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {product.slug}
                            </span>
                            {product.catalog && (
                              <span className="rounded-sm bg-blue-100 px-1 py-0.5 text-[10px] font-medium leading-none text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                {product.catalog}
                              </span>
                            )}
                            {product.category && (
                              <span className="rounded-sm bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {product.name}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </td>

      {/* Nombre */}
      <td className={cellCn("name")}>
        {custom ? (
          <div className="flex items-center gap-1.5 px-1">
            <Input
              data-cell={`${index}-name`}
              value={item.productName}
              placeholder="Nombre del producto..."
              onChange={(e) => onUpdate(item.id, "productName", e.target.value)}
              onFocus={() => setFocusedCell([index, "name"])}
              className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <span className="shrink-0 rounded-sm bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase leading-none text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Manual
            </span>
            <label
              className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted-foreground"
              title="Guardar este producto en el catálogo"
            >
              <Checkbox
                checked={!!item.saveToCatalog}
                onCheckedChange={(v) =>
                  onUpdate(item.id, "saveToCatalog", v === true)
                }
                className="h-3.5 w-3.5"
              />
              Guardar
            </label>
          </div>
        ) : (
          <Popover
            open={openName}
            onOpenChange={(open) => {
              setOpenName(open);
              if (!open) setNameQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                data-cell={`${index}-name`}
                variant="ghost"
                role="combobox"
                onFocus={() => setFocusedCell([index, "name"])}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") return;
                  onKeyDown(e, index, "name");
                }}
                className="h-7 w-full justify-between px-1 text-sm font-normal hover:bg-transparent focus-visible:ring-0"
              >
                <span className="truncate text-left">
                  {item.productName ? (
                    <span className="gap-2 text-xs font-medium">
                      {item.productName}
                      <span className="ml-4 rounded-sm bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        {item.category}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">Nombre...</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-30" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar o crear producto..."
                  value={nameQuery}
                  onValueChange={setNameQuery}
                  onKeyDown={(e) => {
                    // Enter creates a custom product when nothing matches.
                    if (
                      e.key === "Enter" &&
                      trimmedName.length >= 2 &&
                      filteredByName.length === 0
                    ) {
                      e.preventDefault();
                      onCreateCustom(item.id, trimmedName);
                      setOpenName(false);
                      setNameQuery("");
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty>Escribí para buscar o crear.</CommandEmpty>
                  <CommandGroup>
                    {filteredByName.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => {
                          onSelectProduct(item.id, product);
                          setOpenName(false);
                          setNameQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            item.productId === product.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {product.name}
                            </span>
                            {product.catalog && (
                              <span
                                className={cn(
                                  "rounded-sm px-1 py-0.5 text-[10px] font-medium leading-none",
                                  product.catalog === "Gas"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700",
                                )}
                              >
                                {product.catalog}
                              </span>
                            )}
                            {product.category && (
                              <span className="rounded-sm bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {product.slug}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                </CommandList>
              </Command>
              {/* Plain button (not a CommandItem) so creating never depends on
                  cmdk selection state, which is unreliable when the value
                  changes on every keystroke. */}
              {trimmedName.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateCustom(item.id, trimmedName);
                    setOpenName(false);
                    setNameQuery("");
                  }}
                  className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    Crear{" "}
                    <span className="font-semibold">“{trimmedName}”</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      (sin registrar)
                    </span>
                  </span>
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </td>

      {/* Precio */}
      <td className={cellCn("unitPrice")}>
        <Input
          data-cell={`${index}-unitPrice`}
          type="number"
          step="any"
          value={item.unitPrice}
          onChange={(e) =>
            onUpdate(item.id, "unitPrice", parseFloat(e.target.value) || 0)
          }
          onFocus={() => {
            priceOnFocus.current = item.unitPrice;
            setFocusedCell([index, "unitPrice"]);
          }}
          onBlur={() => {
            if (item.unitPrice !== priceOnFocus.current) {
              onPriceCommit(item, item.unitPrice);
            }
          }}
          onKeyDown={(e) => onKeyDown(e, index, "unitPrice")}
          className="h-7 w-full border-0 bg-transparent p-0 text-right text-sm shadow-none focus-visible:ring-0"
        />
      </td>

      {/* Subtotal */}
      <td className="px-2 py-1 text-right text-sm tabular-nums text-muted-foreground">
        ${item.subtotal.toFixed(2)}
      </td>

      {/* Costo */}
      <td className="hidden px-2 py-1 text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
        ${item.costAtPurchase.toFixed(2)}
      </td>

      {/* Eliminar */}
      <td className={cn(cellCn("remove"), "text-center")}>
        <Button
          data-cell={`${index}-remove`}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          onFocus={() => setFocusedCell([index, "remove"])}
          onKeyDown={(e) => onKeyDown(e, index, "remove")}
          className="h-7 w-7 p-0 text-destructive/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
interface OrderItemsTableProps {
  iva: boolean;
  orderItems: OrderItem[];
  updateOrderItem: (id: string, field: keyof OrderItem, value: unknown) => void;
  removeOrderItem: (id: string) => void;
  selectProduct: (itemId: string, product: Product) => void;
  createCustomItem: (itemId: string, name: string) => void;
  products: ProductWithCategory[];
  addRow: () => void;
  onCatalogPriceUpdated?: (itemId: string, newBasePrice: number) => void;
}

export function OrderItemsTable({
  iva,
  orderItems,
  updateOrderItem,
  removeOrderItem,
  selectProduct,
  createCustomItem,
  products,
  addRow,
  onCatalogPriceUpdated,
}: OrderItemsTableProps) {
  const [focusedCell, setFocusedCell] = useState<[number, FocusableCol] | null>(
    null,
  );
  const tableRef = useRef<HTMLTableElement>(null);

  // ── Price-update modal state ──────────────────────────────────────────────
  const [priceModalItem, setPriceModalItem] = useState<OrderItem | null>(null);
  const [newBasePrice, setNewBasePrice] = useState("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [dontAskPrice, setDontAskPrice] = useState(false);

  const handlePriceCommit = useCallback(
    (item: OrderItem, newPrice: number) => {
      // Only registered products have a catalog price to update.
      if (!item.productId || dontAskPrice) return;
      setNewBasePrice(String(Math.round(newPrice * 100) / 100));
      setPriceModalItem(item);
    },
    [dontAskPrice],
  );

  const confirmPriceUpdate = async () => {
    if (!priceModalItem) return;
    const parsed = parseFloat(newBasePrice);
    if (isNaN(parsed) || parsed < 0) {
      toast({ title: "Precio inválido", description: "Ingresá un número válido." });
      return;
    }
    setIsSavingPrice(true);
    try {
      const res = await updateProductPartial({
        id: priceModalItem.productId,
        price: String(parsed),
      });
      if (res.status === 200) {
        toast({
          title: "Precio actualizado",
          description: `${priceModalItem.productName} → $${parsed}`,
        });
        onCatalogPriceUpdated?.(priceModalItem.id, parsed);
        setPriceModalItem(null);
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudo actualizar el precio.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPrice(false);
    }
  };

  const focusCell = useCallback((row: number, col: FocusableCol) => {
    setFocusedCell([row, col]);
    const el = tableRef.current?.querySelector(
      `[data-cell="${row}-${col}"]`,
    ) as HTMLElement | null;
    el?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");

      if (
        (isMac && e.metaKey && e.key.toLowerCase() === "h") ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === "h")
      ) {
        e.preventDefault();
        addRow();
      }
    };

    window.addEventListener("keydown", handleKeyDown as any);
    return () => window.removeEventListener("keydown", handleKeyDown as any);
  }, [addRow]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, rowIndex: number, col: FocusableCol) => {
      const colIndex = FOCUSABLE_COLS.indexOf(col);
      const totalRows = orderItems.length;

      // Enter / Escape → quitar foco completamente
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        setFocusedCell(null);
        (e.currentTarget as HTMLElement).blur();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = colIndex + 1;
        if (next < FOCUSABLE_COLS.length)
          focusCell(rowIndex, FOCUSABLE_COLS[next] as FocusableCol);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = colIndex - 1;
        if (prev >= 0)
          focusCell(rowIndex, FOCUSABLE_COLS[prev] as FocusableCol);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (rowIndex < totalRows - 1) focusCell(rowIndex + 1, col);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (rowIndex > 0) focusCell(rowIndex - 1, col);
        return;
      }
    },
    [orderItems.length, focusCell],
  );

  return (
    <div className="no-scrollbar max-h-[50vh] overflow-auto border border-border/60 sm:max-h-[35vh]">
      <table
        ref={tableRef}
        className="w-full min-w-[560px] border-collapse text-sm sm:min-w-full"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: "2rem" }} />
          <col className="hidden sm:table-column" style={{ width: "2.5rem" }} />
          <col style={{ width: "4rem" }} />
          <col style={{ width: "7rem" }} />
          <col />
          <col style={{ width: "5.5rem" }} />
          <col style={{ width: "5.5rem" }} />
          <col className="hidden sm:table-column" style={{ width: "6rem" }} />
          <col style={{ width: "2.5rem" }} />
        </colgroup>

        <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
          <tr className="border-b border-border/60">
            {(
              [
                [orderItems.length, "center"],
                ["", "center", "hidden sm:table-cell"],
                ["Cant.", "center"],
                ["Código", "left"],
                ["Nombre", "left"],
                ["Precio", "right"],
                ["Subtotal", "right"],
                ["Costo", "right", "hidden sm:table-cell"],
                ["", "center"],
              ] as const
            ).map(([label, align, extra], i) => (
              <th
                key={i}
                className={cn(
                  "px-2 py-1.5 text-xs font-medium text-muted-foreground",
                  extra,
                )}
                style={{ textAlign: align }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {orderItems
            .sort((a, b) => a.index - b.index)
            .map((item, index) => (
              <OrderItemRow
                key={item.id}
                iva={iva}
                item={item}
                index={index}
                onUpdate={updateOrderItem}
                onRemove={removeOrderItem}
                onSelectProduct={selectProduct}
                onCreateCustom={createCustomItem}
                onPriceCommit={handlePriceCommit}
                products={products}
                focusedCell={focusedCell}
                setFocusedCell={setFocusedCell}
                onKeyDown={handleKeyDown}
              />
            ))}
        </tbody>
      </table>

      {/* ── Update-catalog-price modal ── */}
      <Dialog
        open={!!priceModalItem}
        onOpenChange={(open) => !open && setPriceModalItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar precio de catálogo</DialogTitle>
          </DialogHeader>
          {priceModalItem && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {priceModalItem.productName}
                </span>{" "}
                — precio actual en catálogo:{" "}
                <span className="font-medium text-foreground">
                  ${priceModalItem.priceBusiness}
                </span>
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Nuevo precio de catálogo
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={newBasePrice}
                  autoFocus
                  onChange={(e) => setNewBasePrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPriceUpdate();
                  }}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={dontAskPrice}
                  onCheckedChange={(v) => setDontAskPrice(v === true)}
                />
                No volver a preguntar en esta sesión
              </label>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPriceModalItem(null)}
              disabled={isSavingPrice}
            >
              Solo esta factura
            </Button>
            <Button size="sm" onClick={confirmPriceUpdate} disabled={isSavingPrice}>
              {isSavingPrice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Actualizar catálogo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
