"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { upsertBusinessProfile, type BusinessInfo } from "@/app/actions/business";

export function AjustesForm({ negocio }: { negocio: BusinessInfo }) {
  const router = useRouter();
  const [name, setName] = useState(negocio.name === "Mi negocio" && !negocio.id ? "" : negocio.name);
  const [phone, setPhone] = useState(negocio.phone ?? "");
  const [cuit, setCuit] = useState(negocio.cuit ?? "");
  const [address, setAddress] = useState(negocio.address ?? "");
  const [themeAccent, setThemeAccent] = useState(negocio.themeAccent ?? "#e8503a");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!name.trim()) {
      toast({ title: "Falta el nombre", description: "Poné el nombre de tu negocio." });
      return;
    }
    setGuardando(true);
    const res = await upsertBusinessProfile({ name, phone, cuit, address, themeAccent });
    setGuardando(false);
    if (res.status === 200) {
      toast({ title: "Guardado", description: "Datos del negocio actualizados." });
      router.refresh();
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <Label className="text-xs text-muted-foreground">Nombre del negocio</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Distribuidora El Faro" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Teléfono</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 5550 0000" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">CUIT</Label>
          <Input value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="30-12345678-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Dirección</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Siempreviva 742" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Color de la marca</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={themeAccent}
            onChange={(e) => setThemeAccent(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-md border bg-card"
            aria-label="Color de acento"
          />
          <Input
            value={themeAccent}
            onChange={(e) => setThemeAccent(e.target.value)}
            placeholder="#e8503a"
            className="max-w-40 font-mono"
          />
          <span className="text-xs text-muted-foreground">
            Se usa en el logo y los acentos. El resto de la paleta se ajusta en el código.
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
