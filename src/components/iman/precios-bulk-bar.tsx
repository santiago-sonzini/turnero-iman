"use client";
// Barra flotante de acciones en masa para la selección de productos.
// Aumentar precio % o aplicar margen % (precio = costo × (1+margen)).
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  aplicarMargenSeleccion,
  aumentarPreciosSeleccion,
} from "@/app/actions/precios";
import { Percent, TrendingUp, X } from "lucide-react";

export function PreciosBulkBar({
  ids,
  onDone,
  onClear,
}: {
  ids: string[];
  onDone: () => void;
  onClear: () => void;
}) {
  const [modo, setModo] = useState<null | "aumento" | "margen">(null);
  const [valor, setValor] = useState("");
  const [aplicando, setAplicando] = useState(false);

  if (ids.length === 0) return null;

  const abrir = (m: "aumento" | "margen") => {
    setModo(m);
    setValor(m === "margen" ? "40" : "10");
  };

  const aplicar = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!isFinite(n)) {
      toast({ title: "Número inválido", description: "Poné un porcentaje." });
      return;
    }
    setAplicando(true);
    const res =
      modo === "aumento"
        ? await aumentarPreciosSeleccion(ids, n)
        : await aplicarMargenSeleccion(ids, n);
    setAplicando(false);
    if (res.status === 200) {
      toast({ title: "Listo", description: res.message });
      setModo(null);
      onDone();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border bg-card p-2 shadow-lg">
          <span className="px-2 text-sm font-medium">{ids.length} seleccionados</span>
          <Button size="sm" variant="outline" onClick={() => abrir("aumento")}>
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Aumentar precio %
          </Button>
          <Button size="sm" variant="outline" onClick={() => abrir("margen")}>
            <Percent className="mr-1.5 h-4 w-4" />
            Aplicar margen %
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="mr-1.5 h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      <Dialog open={modo !== null} onOpenChange={(o) => !o && setModo(null)}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {modo === "aumento" ? "Aumentar precio" : "Aplicar margen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {modo === "aumento"
                ? `Sube el precio de venta de los ${ids.length} productos seleccionados.`
                : `Fija el precio = costo × (1 + margen) en los ${ids.length} productos seleccionados.`}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Porcentaje</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  autoFocus
                  onChange={(e) => setValor(e.target.value.replace(/[^\d.,-]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && aplicar()}
                  className="max-w-28"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModo(null)}>
                Cancelar
              </Button>
              <Button onClick={aplicar} disabled={aplicando}>
                {aplicando ? "Aplicando…" : "Aplicar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
