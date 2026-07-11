// order-row.tsx
"use client";

import { deleteOrderAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "@/components/ui/use-toast";
import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface OrderRowData {
  id: string;
  orderNumber: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | string;
  paymentStatus: "PENDING" | "PAID" | "PARTIAL" | string;
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  percentageofPayment: number;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  client?: { id: string; name?: string | null } | null;
  type: "BUSINESS" | "PERSONAL" | string;
}

interface OrderRowProps {
  order: OrderRowData;
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  PAID:    "bg-green-100 text-green-700",
  PARTIAL: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  PAID:      "Pagado",
  PARTIAL:   "Parcial",
};

export function OrderRow({ order }: OrderRowProps) {
  const profitPct =
    order.total > 0
      ? ((order.profit / order.total) * 100).toFixed(1)
      : null;

  const date = new Date(order.createdAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const [loading, setLoading] = useState(false);

  const deleteOrder = async () => {
    setLoading(true);
    try {
      const response = await deleteOrderAction(order.id);
      if (!response.success) {
        throw new Error("Error al eliminar la orden.");
      }
      toast({
        title: "Factura eliminada",
        description: "La orden se ha eliminado correctamente.",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="block group">
      <div className="grid grid-cols-[40px_1fr_110px_110px_110px_90px_100px_80px_80px] items-center gap-4 px-4 py-3 border-b border-border transition-all hover:bg-muted/30">

        {/* Icon */}
        <div className="w-8 h-8 bg-muted flex items-center justify-center border border-border shrink-0">
          <FileText className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Order # + Client */}
        <div className="flex flex-col min-w-0">
          <Link href={`/dashboard/invoices/${order.id}`} className="font-medium  text-foreground text-sm truncate group-hover:underline">
            #{order.orderNumber}
          </Link>
          {order.client?.name && (
            <span className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 truncate">
              {order.client.name}
            </span>
          )}
        </div>

        {/* Date */}
        <div className="text-xs text-muted-foreground">{date}</div>

        {/* Order status */}
        <div>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ORDER_STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {/* Payment status */}
        <div>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${PAYMENT_STATUS_STYLES[order.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>

        {/* Discount */}
        <div className="text-right text-sm text-muted-foreground">
          {order.discount > 0 ? `-$${order.discount.toFixed(2)}` : "—"}
        </div>

        {/* Total */}
        <div className="text-right">
          <span className="text-sm font-semibold">${order.total.toFixed(2)}</span>
        </div>

        {/* Profit % */}
        <div className="text-right">
          {profitPct !== null ? (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              parseFloat(profitPct) >= 40 ? "bg-green-100 text-green-700"
              : parseFloat(profitPct) >= 20 ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
            }`}>
              {profitPct}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div>
          <div className="flex gap-2">
           
            <Button
              variant="destructive"
              size="icon"
              onClick={() => deleteOrder()}
              className="h-9 w-9"
            >
              {loading ? <LoadingSpinner/> : <Trash2 className="h-4 w-4" />}
            </Button>
            </div>
        </div>

      </div>
    </div>
  );
}