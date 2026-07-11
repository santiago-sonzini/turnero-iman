import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Client, Order } from "@prisma/client";
import { ClientSelector } from "../orders/client-selector";
import OrderMultiCombobox from "./order-select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPayment } from "@/app/actions/payments";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { formatARS } from "@/lib/format";

// Saldo pendiente de una orden derivado del % pagado.
const saldoDe = (o: Order) =>
  Number(o.total) * (1 - (o.percentageofPayment ?? 0) / 100);

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
] as const;

export default function PaymentCard({
  client,
  update,
}: {
  client: Client;
  update: () => void;
}) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(client);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [manualTotal, setManualTotal] = useState<string>("");
  const [method, setMethod] = useState<string>("efectivo");

  const [completeMode, setCompleteMode] = useState<"fecha" | "orden">("fecha");

  // El total automático suma SALDOS pendientes (no totales completos).
  const autoTotal = selectedOrders.reduce((sum, o) => sum + saldoDe(o), 0);
  const finalTotal = manualTotal ? Number(manualTotal) : autoTotal;

  const removeOrder = (orderId: string) => {
    setSelectedOrders(selectedOrders.filter((o) => o.id !== orderId));
  };

  // Reglas del switch
  const canUseOrderMode = selectedOrders.length > 1;

  // Si no puede usar modo “orden”, lo forzamos a “fecha”
  useEffect(() => {
    if (!canUseOrderMode && completeMode === "orden") {
      setCompleteMode("fecha");
    }
  }, [canUseOrderMode, completeMode]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast({
        title: "Cliente requerido",
        description: "Seleccioná un cliente antes de registrar el pago.",
      });
      return;
    }

    setLoading(true);
    const res = await createPayment({
      clientId: selectedClient.id,
      orderIds: selectedOrders.map((o) => o.id),
      total: finalTotal,
      byDate: completeMode === "fecha",
      paymentMethod: method,
    });

    if (res.status !== 200) {
      toast({ title: "Error", description: res.message });
    } else {
      toast({
        title: "Pago registrado",
        description: "El pago se registró correctamente.",
      });
      setSelectedOrders([]);
      setManualTotal("");
    }
    if (update) update();
    setLoading(false);
  };

  return (
    <Card className="my-2 w-full border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="items-start gap-4">
          {/* Cliente */}
          <div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Cliente
              </Label>
              <ClientSelector
                selectedClient={selectedClient}
                onSelectClient={(c) => setSelectedClient(c)}
                disabled
              />
            </div>

            {/* Órdenes */}
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Órdenes con saldo pendiente
              </Label>

              <div className="flex flex-col gap-2">
                {selectedClient && (
                  <OrderMultiCombobox
                    client={selectedClient}
                    selectedOrders={selectedOrders}
                    setSelectedOrders={setSelectedOrders}
                  />
                )}

                {selectedOrders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrders.map((order) => (
                      <Badge
                        key={order.id}
                        variant="secondary"
                        className="gap-1 py-0.5 pl-2 pr-1 text-xs"
                      >
                        #{order.orderNumber} · saldo {formatARS(saldoDe(order))}
                        <button
                          onClick={() => removeOrder(order.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Switch de completar */}
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Completar
            </Label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Por fecha</span>

              <Switch
                checked={completeMode === "orden"}
                onCheckedChange={(checked) => {
                  if (checked && !canUseOrderMode) return; // ⛔ bloqueado
                  setCompleteMode(checked ? "orden" : "fecha");
                }}
                disabled={!canUseOrderMode}
              />

              <span className="text-xs text-muted-foreground">
                Por orden de selección
              </span>
            </div>

            {!canUseOrderMode && (
              <p className="text-[10px] text-muted-foreground">
                Necesitás seleccionar 2 o más órdenes para habilitar esta opción.
              </p>
            )}
          </div>

          {/* Método + Total */}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Método de pago
              </Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Total
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={autoTotal ? autoTotal.toFixed(2) : "0"}
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  className="h-9 w-28 text-sm"
                />
                <div className="text-lg font-bold">{formatARS(finalTotal)}</div>
              </div>
            </div>
          </div>

          {/* Botón enviar */}
          <div className="mt-6">
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full"
              disabled={!selectedClient || loading || finalTotal <= 0}
            >
              {loading ? <LoadingSpinner /> : "Guardar pago"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
