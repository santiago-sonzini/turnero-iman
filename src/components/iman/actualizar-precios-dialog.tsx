"use client";
// Actualización de precios desde la distribuidora, semi-automática: trae la
// lista del proveedor, muestra qué costos cambian y el margen resultante, y
// el usuario confirma cuáles aplicar. Precio de venta no se toca.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { formatARS } from "@/lib/format";
import {
  aplicarActualizacionesPrecios,
  buscarActualizacionesPrecios,
  getPartnerConfig,
  type DiffPrecio,
} from "@/app/actions/partner";
import { ArrowRight, RefreshCw } from "lucide-react";

export function ActualizarPreciosDialog({ onAplicado }: { onAplicado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tieneProveedor, setTieneProveedor] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [diffs, setDiffs] = useState<DiffPrecio[] | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPartnerConfig().then((c) => setTieneProveedor(!!c.supplierUrl)).catch(() => {});
  }, []);

  const buscar = async () => {
    setOpen(true);
    setCargando(true);
    setDiffs(null);
    const res = await buscarActualizacionesPrecios();
    setCargando(false);
    if (res.status !== 200) {
      toast({ title: "No se pudo actualizar", description: res.message, variant: "destructive" });
      setOpen(false);
      return;
    }
    setDiffs(res.diffs ?? []);
    setElegidos(new Set((res.diffs ?? []).map((d) => d.productId)));
  };

  const aplicar = async () => {
    if (!diffs) return;
    const cambios = diffs
      .filter((d) => elegidos.has(d.productId))
      .map((d) => ({ productId: d.productId, costNuevo: d.costNuevo }));
    setAplicando(true);
    const res = await aplicarActualizacionesPrecios(cambios);
    setAplicando(false);
    if (res.status === 200) {
      toast({ title: "Precios actualizados", description: res.message });
      setOpen(false);
      onAplicado?.();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const seleccionados = useMemo(() => (diffs ?? []).filter((d) => elegidos.has(d.productId)).length, [diffs, elegidos]);

  const margen = (price: number, cost: number) =>
    price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={buscar}
        disabled={!tieneProveedor}
        title={tieneProveedor ? undefined : "Cargá la URL de tu proveedor en Ajustes"}
      >
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Actualizar precios del proveedor
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Actualización de precios del proveedor</DialogTitle>
          </DialogHeader>

          {cargando && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Trayendo la lista del proveedor…
            </p>
          )}

          {!cargando && diffs?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tus costos ya coinciden con la lista del proveedor. Nada que actualizar.
            </p>
          )}

          {!cargando && !!diffs?.length && (
            <>
              <p className="text-sm text-muted-foreground">
                El precio del proveedor es tu <strong>costo</strong>. Elegí qué cambios
                aplicar; el precio de venta no se toca (mirá el margen que queda).
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 border-b px-1 pb-1 text-xs font-medium text-muted-foreground">
                  <span className="w-6" />
                  <span className="flex-1">Producto</span>
                  <span className="w-44 text-right">Costo</span>
                  <span className="w-20 text-right">Margen</span>
                </div>
                {diffs.map((d) => {
                  const nuevoMargen = margen(d.price, d.costNuevo);
                  return (
                    <label
                      key={d.productId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={elegidos.has(d.productId)}
                        onCheckedChange={(v) => {
                          setElegidos((prev) => {
                            const s = new Set(prev);
                            if (v === true) s.add(d.productId);
                            else s.delete(d.productId);
                            return s;
                          });
                        }}
                        className="w-6"
                      />
                      <span className="flex-1 truncate text-sm">{d.name}</span>
                      <span className="flex w-44 items-center justify-end gap-1.5 text-sm tabular-nums">
                        <span className="text-muted-foreground line-through">{formatARS(d.costActual)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={d.costNuevo > d.costActual ? "font-semibold text-sem-rojo" : "font-semibold text-sem-verde"}>
                          {formatARS(d.costNuevo)}
                        </span>
                      </span>
                      <span
                        className={`w-20 text-right text-sm font-medium tabular-nums ${
                          nuevoMargen < 15 ? "text-sem-rojo" : "text-muted-foreground"
                        }`}
                      >
                        {nuevoMargen}%
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {seleccionados} de {diffs.length} seleccionados
                </span>
                <Button onClick={aplicar} disabled={aplicando || seleccionados === 0}>
                  {aplicando ? "Aplicando…" : `Aplicar ${seleccionados}`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
