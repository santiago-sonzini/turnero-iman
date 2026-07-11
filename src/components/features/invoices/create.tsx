"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Plus, Check, ChevronsUpDown, Printer, ClipboardCopy, ClipboardPaste, Pen, Eye } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { getAllProductsAction, getProductsAction, ProductWithCategory, quickCreateProduct } from "@/app/actions/products";
import { createClient, getClientsAction } from "@/app/actions/clients";
import { createOrder, deleteOrderAction } from "@/app/actions/orders";
import { createInvoice, updateInvoice } from "@/app/actions/invoices";
import Link from "next/link";
import { Client, PaymentStatus } from "@prisma/client";
import { formatARS } from "@/lib/format";
import { getBusinessProfile, type BusinessInfo } from "@/app/actions/business";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SafeImageWithModal } from "./safe-image";
import { OrderItemsTable } from "./table";
import ClientSelectorAccordion from "./client-selector";
import { ProductSearchPanel } from "./product-search-panel";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  cost: number;
  images: string[];
  category: string;
}

export interface OrderItem {
  id: string;
  index: number;
  imageUrl: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  costAtPurchase: number;
  realCost: number; // ← costo real siempre guardado
  priceBusiness: number;
  category: string;
  // Free-text ("custom") line items that are not registered products.
  isCustom?: boolean;
  saveToCatalog?: boolean;
  customName?: string | null;
}

interface OrderCreateFormProps {
  onSubmit?: (items: OrderItem[]) => Promise<void>;
  clientId?: string;
}

export function InvoiceCreateForm({ onSubmit }: OrderCreateFormProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [facturaId, setFacturaId] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [printAs, setPrintAs] = useState<"remito" | "presupuesto" | "factura" | "pedido">("remito");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    PaymentStatus.PAID,
  );
  const [showCreateClientForm, setShowCreateClientForm] = useState(false); // ← nuevo
  const [iva, setIva] = useState<boolean>(false);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getAllProductsAction()

      setProducts(data ?? []);
      setLoadingProducts(false);
    };

    load();
    getBusinessProfile().then(setBusiness).catch(() => setBusiness(null));
  }, []);

  const onSelectClient = (client: Client | null) => {
    setSelectedClient(client);
    setDiscount(client?.discount || 0);
    setShowCreateClientForm(false); // ← al seleccionar vuelve al selector
  };

  const clearOrderItems = () => {
    setOrderItems([]);
    // Limpiar = arrancar una factura nueva: se ocultan las acciones de la creada.
    setIsCreated(false);
    setFacturaId(null);
  };



  const printInvoice = () => {
    if (!selectedClient || orderItems.length === 0) return;

    const validItems = orderItems.filter(
      (item) =>
        (item.productId || (item.isCustom && item.productName?.trim())) &&
        item.quantity > 0,
    );

    const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal * (1 - discount / 100);
    const fecha = new Date().toLocaleDateString("es-AR");

    const invoiceWindow = window.open("", "_blank");

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura${facturaId ? ` - ${facturaId}` : ""}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              color: #333;
              background: white;
            }
            .invoice-container { max-width: 850px; margin: 0 auto; }
            .logo-section {
              display: flex;
              justify-content: center;
              margin-bottom: 32px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 24px;
              border-bottom: 3px solid #221d16;
            }
            .company-info h1 {
              font-size: 34px;
              color: #221d16;
              margin-bottom: 6px;
            }
            .company-info p {
              color: #666;
              font-size: 14px;
              line-height: 1.6;
            }
            .invoice-info { text-align: right; }
            .invoice-info h2 {
              font-size: 34px;
              color: #4d5056;
              margin-bottom: 12px;
            }
            .invoice-info p {
              color: #555;
              font-size: 14px;
              margin: 4px 0;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 600;
              background: #fde8e9;
              color: #221d16;
              margin-top: 10px;
            }
            .details-section {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin: 40px 0;
            }
            .detail-box {
              background: #ffffff;
              padding: 22px;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .detail-box h3 {
              font-size: 13px;
              color: #4d5056;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-bottom: 15px;
              font-weight: 700;
            }
            .detail-box p {
              margin: 6px 0;
              font-size: 14px;
            }
            .detail-box strong { color: #111827; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              border-radius: 10px;
              overflow: hidden;
            }
            thead { background: #f3f4f6; }
            th {
              padding: 14px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              color: #4d5056;
              text-transform: uppercase;
              border-bottom: 2px solid #221d16;
            }
            td {
              padding: 14px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            tbody tr:nth-child(even) { background: #fafafa; }
            .text-right { text-align: right; }
            .totals {
              margin-top: 35px;
              display: flex;
              justify-content: flex-end;
            }
            .totals-box {
              width: 360px;
              background: #f9fafb;
              padding: 22px;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 14px;
            }
            .total-row.final {
              margin-top: 16px;
              padding-top: 14px;
              border-top: 2px solid #221d16;
              font-size: 18px;
              font-weight: 700;
              color: #221d16;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info" style="display: flex; align-items: center; gap: 16px;">
                ${business?.logoUrl ? `<img src="${business.logoUrl}" alt="${business?.name ?? ""}" style="height: 80px; object-fit: contain;" />` : ""}
                <div>
                  <h1>${business?.name?.toUpperCase() ?? "MI NEGOCIO"}</h1>
                  <p>
                    ${business?.address ? `${business.address}<br>` : ""}
                    ${business?.phone ? `Tel: ${business.phone}<br>` : ""}
                    ${business?.cuit ? `CUIT: ${business.cuit}<br>` : ""}
                  </p>
                </div>
              </div>
              <div class="invoice-info">
                <h2>${printAs.toUpperCase()}</h2>
                ${facturaId ? `<p><strong>N°:</strong> ${facturaId}</p>` : ""}
                <p><strong>Fecha:</strong> ${fecha}</p>
                <span class="status-badge">${printAs === "factura" ? "EMITIDA" : "EMITIDO"}</span>
              </div>
            </div>
            <div class="details-section">
              <div class="detail-box">
                <h3>Cliente</h3>
                <p><strong>Nombre:</strong> ${selectedClient.name ?? ""}</p>
                ${selectedClient.email ? `<p><strong>Email:</strong> ${selectedClient.email}</p>` : ""}
               
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Precio Unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${validItems
        .map(
          (item) => `
                  <tr>
                    <td>
                      ${item.productName}
                      ${item.category ? `<span style="display:inline-block; margin-left:8px; padding:2px 6px; border-radius:4px; background:#ede9fe; color:#6d28d9; font-size:10px; font-weight:600; vertical-align:middle;">${item.category}</span>` : ""}
                    </td>
                    <td style="color:#4d5056; font-size:12px">${item.productSlug}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatARS(item.unitPrice)}</td>
                    <td class="text-right"><strong>${formatARS(item.subtotal)}</strong></td>
                  </tr>
                `,
        )
        .join("")}
              </tbody>
            </table>
            <div class="totals">
              <div class="totals-box">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${formatARS(validItems.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                </div>
                ${discount > 0
        ? `
                <div class="total-row" style="color: #16a34a;">
                  <span>Descuento (${discount}%):</span>
                  <span>-${formatARS(validItems.reduce((sum, item) => sum + item.subtotal, 0) * (discount / 100))}</span>
                </div>
                `
        : ""
      }
                <div class="total-row final">
                  <span>TOTAL:</span>
                  <span>${formatARS(total)}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Gracias por su compra</p>
              <p>Este documento fue generado electrónicamente y es válido sin firma</p>
            </div>
          </div>
        </body>
      </html>
    `;

    invoiceWindow?.document.write(invoiceHTML);
    invoiceWindow?.document.close();

    if (invoiceWindow) {
      invoiceWindow.onload = () => {
        setTimeout(() => {
          invoiceWindow?.print();
        }, 250);
      };
    }
  };

  // const handleCreateOrder = async (items: any[]) => {
  //   try {
  //     if (!selectedClient) {
  //       throw new Error("No se ha seleccionado un cliente");
  //     }

  //     const res = await createInvoice(
  //       selectedClient?.id,
  //       items,
  //       discount,
  //       paymentStatus,
  //     );

  //     if (res.status !== 201) {
  //       throw new Error("Error al crear la factura");
  //     }

  //     toast({
  //       title: "Factura creada",
  //       description: `La factura ${res.data.id ?? ""} fue creada correctamente.`,
  //     });
  //     setIsCreated(true);
  //     setFacturaId(res.data.id);
  //   } catch (error: any) {
  //     console.error("Error creando factura:", error);
  //     toast({
  //       title: "Error",
  //       description: error.message || "No se pudo crear la factura.",
  //     });
  //     throw error;
  //   }
  // };

  const handleCreateOrder = async (items: OrderItem[]) => {
    try {
      if (!selectedClient) {
        throw new Error("No se ha seleccionado un cliente");
      }

      // Resolve custom lines flagged "save to catalog" by creating real
      // products first; attach customName to the remaining free-text lines.
      const resolved = await Promise.all(
        items.map(async (item) => {
          if (item.isCustom && item.saveToCatalog && item.productName?.trim()) {
            const created = await quickCreateProduct({
              name: item.productName.trim(),
              price: item.priceBusiness > 0 ? item.priceBusiness : item.unitPrice,
              cost: item.realCost || 0,
              category:
                item.category && item.category !== "Manual"
                  ? item.category
                  : undefined,
            });
            if (created.status === 200 && created.data) {
              return {
                ...item,
                productId: created.data.id,
                productSlug: created.data.slug,
                isCustom: false,
                saveToCatalog: false,
                customName: null,
                priceBusiness: created.data.price,
              };
            }
          }
          return {
            ...item,
            customName: item.productId ? null : (item.productName ?? null),
          };
        }),
      );

      const res = await createInvoice(
        selectedClient?.id,
        resolved,
        discount,
        paymentStatus,
        iva,
      );

      if (res.status !== 201) {
        throw new Error("Error al crear la factura");
      }

      toast({
        title: "Factura creada",
        description: `La factura ${res.data.id ?? ""} fue creada correctamente.`,
      });
      setIsCreated(true);
      setFacturaId(res.data.id);
    } catch (error: any) {
      console.error("Error creando factura:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura.",
      });
      throw error;
    }
  };

  const handleUpdateOrder = async (items: OrderItem[]) => {
    setIsUpdating(true);
    const validItems = items.filter(
      (item) =>
        (item.productId || (item.isCustom && item.productName?.trim())) &&
        item.quantity > 0,
    );
    const res = await updateInvoice(facturaId!, {
      discount,
      paymentStatus,
      iva,
      items: validItems.map((item) => ({
        productId: item.productId || null,
        customName: item.productId ? null : (item.productName ?? null),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costAtPurchase: item.costAtPurchase,
      })),
    });

    if (res.status !== 200) throw new Error("Error al actualizar la factura");

    toast({
      title: "Factura actualizada",
      description: `La factura ${facturaId} fue actualizada correctamente.`,
    });
    setIsUpdating(false);
  };

  const handleDeleteInvoice = async (id: string) => {
    setIsDeleting(true);
    const res = await deleteOrderAction(id);

    if (!res.success || res.error) {
      toast({
        title: "Error",
        description: res.error || "Error al eliminar la factura",
      });
      return;
    }

    toast({
      title: "Factura eliminada",
      description: `La factura ${id} fue eliminada correctamente.`,
    });
    setIsDeleting(false);
  };

  const addOrderItem = () => {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      productId: "",
      imageUrl: "",
      productName: "",
      productSlug: "",
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      costAtPurchase: 0,
      realCost: 0,
      priceBusiness: 0,
      category: "",
      index:  orderItems.length + 1,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const removeOrderItem = (id: string) => {
    const filtered = orderItems.filter((item) => item.id !== id);
    const reindexed = filtered.map((item, i) => ({ ...item, index: i + 1 }));
    setOrderItems(reindexed);
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity") {
            updated.subtotal = updated.quantity * updated.unitPrice;
          }
          // ← agregar esto:
          if (field === "unitPrice") {
            updated.subtotal = updated.quantity * (iva ? updated.unitPrice * 1.21 : updated.unitPrice);
          }
          return updated;
        }
        return item;
      }),
    );
  };
  const selectProduct = (itemId: string, product: Product) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            imageUrl: product.images[0] ?? "",
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            unitPrice: product.price,
            subtotal: item.quantity * product.price,
            costAtPurchase: product.cost,
            realCost: product.cost,
            priceBusiness: product.price,
            category: product.category,
            isCustom: false,
            saveToCatalog: false,
            customName: null,
          };
        }
        return item;
      }),
    );
  };

  // Add a product straight to the invoice from the search side panel.
  // If the product is already a line item, bump its quantity instead of
  // creating a duplicate row.
  const addProductToOrder = (product: Product) => {
    const existing = orderItems.find((item) => item.productId === product.id);
    if (existing) {
      updateOrderItem(existing.id, "quantity", existing.quantity + 1);
      return;
    }

    const unitPrice = product.price;
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      index: orderItems.length + 1,
      imageUrl: product.images[0] ?? "",
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quantity: 1,
      unitPrice,
      subtotal: unitPrice,
      costAtPurchase: product.cost,
      realCost: product.cost,
      priceBusiness: product.price,
      category: product.category,
      isCustom: false,
      saveToCatalog: false,
      customName: null,
    };
    setOrderItems([...orderItems, newItem]);
  };

  // Turn a row into a free-text ("custom") line item from a typed name.
  const createCustomItem = (itemId: string, name: string) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isCustom: true,
              productId: "",
              productName: name,
              productSlug: "",
              imageUrl: "",
              category: "Manual",
              customName: name,
            }
          : item,
      ),
    );
  };

  // After the price-update modal persists a new catalog price, keep the row's
  // base price in sync so future invoice-type toggles use the new value.
  const handleCatalogPriceUpdated = (itemId: string, newBasePrice: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, priceBusiness: newBasePrice } : item,
      ),
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (iva ? item.subtotal * 1.21 : item.subtotal), 0);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast({
        title: "Cliente requerido",
        description:
          "Por favor seleccioná un cliente antes de crear el pedido.",
      });
      return;
    }

    const validItems = orderItems.filter(
      (item) =>
        (item.productId || (item.isCustom && item.productName?.trim())) &&
        item.quantity > 0,
    );

    if (validItems.length === 0) {
      toast({
        title: "Productos requeridos",
        description: "Agregá al menos un producto al pedido.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await handleCreateOrder(validItems);
    } catch (error) {
      console.error("Error creando pedido:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleCopyItems = async () => {
    try {
      const itemsJson = JSON.stringify(orderItems, null, 2);
      await copyToClipboard(itemsJson);
      toast({ title: "Copiado", description: "Items copiados al portapapeles" });
    } catch (e) {
      console.error("Error copiando items:", e);
      toast({
        title: "Error",
        description: "No se pudieron copiar los items",
        variant: "destructive",
      });
    }
  };

  const handlePasteItems = async () => {
    try {
      // Try modern API first
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        applyPastedItems(text);
        return;
      }

      // Fallback: listen for the native paste event (Ctrl+V / Cmd+V)
      const onPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData("text/plain") ?? "";
        applyPastedItems(text);
        window.removeEventListener("paste", onPaste);
      };

      window.addEventListener("paste", onPaste, { once: true });
      toast({
        title: "Listo para pegar",
        description: "Presioná Ctrl+V (o Cmd+V) para restaurar los items",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo acceder al portapapeles",
        variant: "destructive",
      });
    }
  };

  const applyPastedItems = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setOrderItems(parsed);
        toast({ title: "Pegado", description: "Items restaurados correctamente" });
      } else {
        throw new Error("Not an array");
      }
    } catch {
      toast({
        title: "Error",
        description: "El formato del portapapeles no es válido",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "m") {
        e.preventDefault();
        addOrderItem();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addOrderItem]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-1 pb-28 sm:px-2">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva factura</h1>
        <p className="text-sm text-muted-foreground">
          Cada venta registrada alimenta el semáforo de clientes.
        </p>
      </div>

      {/* Cliente + totales + acciones (al lado si entra, si no debajo) */}
      <section className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <ClientSelectorAccordion
              iva={iva}
              setIva={setIva}
              discount={discount}
              setDiscount={setDiscount}
              paymentStatus={paymentStatus}
              setPaymentStatus={setPaymentStatus}
              selectedClient={selectedClient}
              onSelectClient={onSelectClient}
              showCreateForm={showCreateClientForm}
              onToggleCreateForm={() => setShowCreateClientForm((prev) => !prev)}
            />
          </div>

          <div className="w-full shrink-0 space-y-3 border-t pt-3 lg:w-72 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            {/* Totales */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal:</span>
                <span>{formatARS(calculateTotal())}</span>
              </div>
              {iva && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>IVA (21%):</span>
                  <span>{formatARS(calculateTotal() * 0.21)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-sem-verde">
                  <span>Descuento ({discount}%):</span>
                  <span>-{formatARS((calculateTotal() * discount) / 100)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
                <span>Total:</span>
                <span>{formatARS(calculateTotal() * (1 - discount / 100))}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              {/* Fila 1: crear factura + imprimir (ícono, cuando ya está creada) */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isDeleting || isSubmitting || isUpdating || !selectedClient || orderItems.length === 0}
                  className="h-10 flex-1"
                >
                  {isSubmitting ? <LoadingSpinner /> : "Crear factura"}
                </Button>
                {isCreated && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={printInvoice}
                    className="h-10 w-10 shrink-0 p-0"
                    title="Imprimir"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Fila 2: actualizar / ver / eliminar (íconos, cuando ya está creada) */}
              {isCreated && facturaId && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleUpdateOrder(orderItems)}
                    className="h-10 flex-1"
                    disabled={isDeleting || isSubmitting || isUpdating || !selectedClient}
                    title="Actualizar factura"
                  >
                    {isUpdating ? <LoadingSpinner /> : <Pen className="h-4 w-4" />}
                  </Button>
                  <Link target="_blank" href={`/dashboard/invoices/${facturaId}`} className="flex-1">
                    <Button type="button" variant="outline" className="h-10 w-full" title="Ver factura">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDeleteInvoice(facturaId!)}
                    className="h-10 flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={isDeleting || isSubmitting || isUpdating || !selectedClient}
                    title="Eliminar factura"
                  >
                    {isDeleting ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Barra de acciones */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="default"
          onClick={addOrderItem}
          className="h-9 w-full sm:w-auto"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar producto
        </Button>

        <ProductSearchPanel
          products={products}
          onAdd={addProductToOrder}
          formatPrice={(base) => base}
          addedIds={new Set(orderItems.map((i) => i.productId).filter(Boolean))}
        />

        <Select value={printAs} onValueChange={(value) => setPrintAs(value as "remito" | "presupuesto" | "factura" | "pedido")}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Imprimir como" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remito">Remito</SelectItem>
            <SelectItem value="presupuesto">Presupuesto</SelectItem>
            <SelectItem value="factura">Factura</SelectItem>
            <SelectItem value="pedido">Pedido</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={handleCopyItems}
          className="h-9 w-full sm:w-auto"
          size="sm"
        >
          <ClipboardCopy className="mr-2 h-4 w-4" />
          Copiar
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handlePasteItems}
          className="h-9 w-full sm:w-auto"
          size="sm"
        >
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Pegar
        </Button>

        {orderItems.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={clearOrderItems}
            className="col-span-2 h-9 w-full sm:w-auto sm:shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Detalle de productos */}
      <section className="overflow-x-auto rounded-xl border bg-card p-2 sm:p-3">
        <OrderItemsTable
          addRow={addOrderItem}
          iva={iva}
          orderItems={orderItems.sort((a, b) => a.category.localeCompare(b.category))}
          updateOrderItem={updateOrderItem}
          removeOrderItem={removeOrderItem}
          selectProduct={selectProduct}
          createCustomItem={createCustomItem}
          onCatalogPriceUpdated={handleCatalogPriceUpdated}
          products={products}
        />
      </section>

    </div>
  );
}
