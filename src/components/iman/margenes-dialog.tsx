"use client";
// Márgenes y aumentos por grupo (categoría / catálogo). Para cada grupo:
// - Margen %: fija precio = costo × (1+margen) en todo el grupo y lo recuerda.
// - Aumento %: sube el precio actual de todo el grupo.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  aumentarPreciosGrupo,
  getGruposPrecios,
  guardarYAplicarMargen,
  type GrupoPrecio,
} from "@/app/actions/precios";
import { Percent, SlidersHorizontal, TrendingUp } from "lucide-react";

export function MargenesDialog({ onAplicado }: { onAplicado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [categorias, setCategorias] = useState<GrupoPrecio[]>([]);
  const [catalogos, setCatalogos] = useState<GrupoPrecio[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const res = await getGruposPrecios();
    setCategorias(res.categorias);
    setCatalogos(res.catalogos);
    setCargando(false);
  };

  useEffect(() => {
    if (open) cargar();
  }, [open]);

  const trasAplicar = () => {
    cargar();
    onAplicado?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-md border-neutral-300 bg-transparent text-sm dark:border-neutral-700"
        >
          <SlidersHorizontal className="mr-2 size-3.5" />
          Márgenes / Aumentos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Precios por grupo</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categorias">
          <TabsList>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          </TabsList>
          <TabsContent value="categorias">
            <Lista grupos={categorias} tipo="categoria" cargando={cargando} onAplicado={trasAplicar} />
          </TabsContent>
          <TabsContent value="catalogos">
            <Lista grupos={catalogos} tipo="catalogo" cargando={cargando} onAplicado={trasAplicar} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Lista({
  grupos,
  tipo,
  cargando,
  onAplicado,
}: {
  grupos: GrupoPrecio[];
  tipo: "categoria" | "catalogo";
  cargando: boolean;
  onAplicado: () => void;
}) {
  if (cargando) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>;
  }
  if (!grupos.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No hay grupos con productos.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        <strong>Margen:</strong> fija precio = costo × (1+margen). <strong>Aumento:</strong> sube
        el precio actual. Ambos aplican a todo el grupo.
      </p>
      {grupos.map((g) => (
        <FilaGrupo key={g.key} grupo={g} tipo={tipo} onAplicado={onAplicado} />
      ))}
    </div>
  );
}

function FilaGrupo({
  grupo,
  tipo,
  onAplicado,
}: {
  grupo: GrupoPrecio;
  tipo: "categoria" | "catalogo";
  onAplicado: () => void;
}) {
  const [margen, setMargen] = useState(grupo.margin != null ? String(grupo.margin) : "");
  const [aumento, setAumento] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const aplicarMargen = async () => {
    const n = parseFloat(margen.replace(",", "."));
    if (!isFinite(n)) return toast({ title: "Margen inválido", description: "Poné un número." });
    setOcupado(true);
    const res = await guardarYAplicarMargen({ tipo, key: grupo.key, margin: n });
    setOcupado(false);
    if (res.status === 200) {
      toast({ title: "Margen aplicado", description: res.message });
      onAplicado();
    } else toast({ title: "Error", description: res.message, variant: "destructive" });
  };

  const aplicarAumento = async () => {
    const n = parseFloat(aumento.replace(",", "."));
    if (!isFinite(n)) return toast({ title: "Aumento inválido", description: "Poné un número." });
    setOcupado(true);
    const res = await aumentarPreciosGrupo({ tipo, key: grupo.key, pct: n });
    setOcupado(false);
    if (res.status === 200) {
      toast({ title: "Aumento aplicado", description: res.message });
      setAumento("");
      onAplicado();
    } else toast({ title: "Error", description: res.message, variant: "destructive" });
  };

  return (
    <div className="rounded-lg border p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{grupo.label}</span>
        <span className="text-xs text-muted-foreground">{grupo.count} productos</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            inputMode="decimal"
            value={margen}
            onChange={(e) => setMargen(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="margen"
            className="h-8 w-20"
          />
          <Button size="sm" variant="outline" className="h-8" disabled={ocupado} onClick={aplicarMargen}>
            Aplicar margen
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            inputMode="decimal"
            value={aumento}
            onChange={(e) => setAumento(e.target.value.replace(/[^\d.,-]/g, ""))}
            placeholder="+%"
            className="h-8 w-16"
          />
          <Button size="sm" variant="outline" className="h-8" disabled={ocupado} onClick={aplicarAumento}>
            Aumentar
          </Button>
        </div>
      </div>
    </div>
  );
}
