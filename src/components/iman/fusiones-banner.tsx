"use client";
// Sugerencias de clientes duplicados con fusión en un click.
// La fusión reasigna ventas, pagos y contactos al cliente que queda.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { fusionarClientes } from "@/app/actions/iman";
import { Users, X } from "lucide-react";

export interface Fusion {
  score: number;
  a: { id: string; name: string; phone: string | null; ordenes: number };
  b: { id: string; name: string; phone: string | null; ordenes: number };
}

export function FusionesBanner({ fusiones }: { fusiones: Fusion[] }) {
  const router = useRouter();
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  const [fusionando, setFusionando] = useState<string | null>(null);

  const visibles = fusiones.filter((f) => !descartadas.has(f.a.id + f.b.id)).slice(0, 3);
  if (!visibles.length) return null;

  const fusionar = async (f: Fusion) => {
    // Queda el que tiene más ventas (o teléfono); el otro se absorbe.
    const [keep, merge] =
      f.a.ordenes >= f.b.ordenes ? [f.a, f.b] : [f.b, f.a];
    setFusionando(f.a.id + f.b.id);
    const res = await fusionarClientes(keep.id, merge.id);
    setFusionando(null);
    if (res.status === 200) {
      toast({ title: "Clientes fusionados", description: res.message });
      router.refresh();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border border-sem-amarillo bg-sem-amarillo-suave p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4" />
        Parece que hay clientes repetidos
      </p>
      <div className="space-y-2">
        {visibles.map((f) => {
          const key = f.a.id + f.b.id;
          const [keep, merge] = f.a.ordenes >= f.b.ordenes ? [f.a, f.b] : [f.b, f.a];
          return (
            <div
              key={key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 p-2 text-sm dark:bg-background/50"
            >
              <span className="min-w-0">
                <strong>{merge.name}</strong> ({merge.ordenes} ventas) →{" "}
                <strong>{keep.name}</strong> ({keep.ordenes} ventas)
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-white dark:bg-background"
                  disabled={fusionando === key}
                  onClick={() => fusionar(f)}
                >
                  {fusionando === key ? "Fusionando…" : "Unir"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setDescartadas(new Set([...descartadas, key]))}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  No son el mismo
                </Button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
