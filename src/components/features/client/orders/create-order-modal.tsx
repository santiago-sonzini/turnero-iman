"use client";

// Modal para crear un PEDIDO a nombre de un cliente. Estética de "crear
// factura" pero recortada: sin costo, ganancia, márgenes, IVA, descuento ni
// estado de pago. Se usa en el dashboard (scopeado al cliente) y en la página
// pública del cliente.
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { formatARS } from "@/lib/format";
import {
  getAllProductsAction,
  type ProductWithCategory,
} from "@/app/actions/products";
import { createClientOrder } from "@/app/actions/orders";
import { ProductSearchPanel } from "@/components/features/invoices/product-search-panel";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  costAtPurchase: number;
}

interface CreateOrderModalProps {
  clientId: string;
  clientName?: string;
  onCreated?: () => void;
  /** Estilo del disparador. "card" para la maqueta pública, "button" para el dashboard. */
  trigger?: "button" | "card";
}

export function CreateOrderModal({
  clientId,
  clientName,
  onCreated,
  trigger = "button",
}: CreateOrderModalProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || products.length > 0) return;
    setLoadingProducts(true);
    getAllProductsAction()
      .then((data) => setProducts(data ?? []))
      .finally(() => setLoadingProducts(false));
  }, [open]);

  const addProduct = (product: ProductWithCategory) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: `temp-${product.id}-${prev.length}`,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          quantity: 1,
          unitPrice: product.price,
          costAtPurchase: product.cost,
        },
      ];
    });
  };

  const updateItem = (id: string, field: "quantity" | "unitPrice", value: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [items],
  );

  const addedIds = useMemo(
    () => new Set(items.map((i) => i.productId)),
    [items],
  );

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: "Agregá al menos un producto." });
      return;
    }
    setSubmitting(true);
    const res = await createClientOrder(
      clientId,
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costAtPurchase: i.costAtPurchase,
      })),
    );
    setSubmitting(false);

    if (res.status !== 201) {
      toast({ title: "Error", description: res.message });
      return;
    }
    toast({
      title: "Pedido creado",
      description: `El pedido ${res.data?.orderNumber ?? ""} fue creado correctamente.`,
    });
    setItems([]);
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger === "card" ? (
          <button
            type="button"
            className="group flex items-start justify-between rounded-lg border border-primary p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <h3 className="text-base font-medium text-text">Nuevo pedido</h3>
              <p className="mt-1 text-sm text-text">Armá tu pedido</p>
            </div>
            <Plus className="text-text opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-60" />
          </button>
        ) : (
          <Button type="button" className="h-10">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo pedido
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nuevo pedido{clientName ? ` — ${clientName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-4">
          {/* Acciones */}
          <div className="flex items-center gap-2">
            <ProductSearchPanel
              products={products}
              onAdd={addProduct}
              formatPrice={(base) => base}
              addedIds={addedIds}
            />
            {loadingProducts && (
              <span className="text-xs text-muted-foreground">Cargando productos…</span>
            )}
          </div>

          {/* Items */}
          <div className="max-h-[45vh] overflow-y-auto overflow-x-auto rounded-lg border">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Todavía no agregaste productos. Usá “Buscar productos”.
              </p>
            ) : (
              <table className="w-full min-w-[420px] text-sm">
                <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Código</th>
                    <th className="w-20 px-3 py-2 text-center font-medium">Cant.</th>
                    <th className="w-28 px-3 py-2 text-right font-medium">Precio</th>
                    <th className="hidden w-28 px-3 py-2 text-right font-medium sm:table-cell">Subtotal</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {item.productName}
                        <span className="mt-0.5 block text-right text-xs font-normal tabular-nums text-muted-foreground sm:hidden">
                          {formatARS(item.quantity * item.unitPrice)}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
                        {item.productSlug}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-right text-sm"
                        />
                      </td>
                      <td className="hidden px-3 py-2 text-right font-medium tabular-nums sm:table-cell">
                        {formatARS(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer: total + crear */}
        <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Total:{" "}
            <span className="text-lg font-bold text-foreground">
              {formatARS(total)}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0}
            className="h-10 min-w-40"
          >
            {submitting ? <LoadingSpinner /> : "Crear pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
