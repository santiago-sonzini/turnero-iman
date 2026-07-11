"use client";
// Sección de Ajustes: conexión con proveedor / distribuidora.
// - Compartir stock con mi distribuidora (opt-in, expone /api/partner/stock).
// - Soy distribuidora: exponer lista de precios (opt-in, /api/partner/pricelist).
// - Mi proveedor: URL + token para traer actualizaciones de precios.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { copyToClipboard } from "@/lib/utils";
import {
  regeneratePartnerToken,
  updatePartnerConfig,
  type PartnerConfig,
} from "@/app/actions/partner";
import type { DemoPackFeatures } from "@/server/demo/packs/types";
import { Copy, RefreshCw } from "lucide-react";

export function PartnerConfigSection({
  config,
  features,
}: {
  config: PartnerConfig;
  // En modo demo, el pack decide qué lado de la conexión se muestra
  // (distribuidora expone lista; comercio conecta proveedor). Sin features
  // (deploy real) se muestra todo, como siempre.
  features?: DemoPackFeatures | null;
}) {
  const verLadoDistribuidora = features ? features.compartirPartner : true;
  const verLadoComercio = features ? features.conexionProveedor : true;
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [supplierUrl, setSupplierUrl] = useState(config.supplierUrl ?? "");
  const [supplierToken, setSupplierToken] = useState(config.supplierToken ?? "");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const toggle = async (
    key: "shareStockEnabled" | "sharePricelistEnabled",
    value: boolean,
  ) => {
    const res = await updatePartnerConfig({ [key]: value });
    if (res.status === 200) router.refresh();
    else toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
  };

  const guardarProveedor = async () => {
    setSavingSupplier(true);
    const res = await updatePartnerConfig({ supplierUrl, supplierToken });
    setSavingSupplier(false);
    if (res.status === 200) {
      toast({ title: "Guardado", description: "Datos del proveedor actualizados." });
      router.refresh();
    }
  };

  const regenerar = async () => {
    const res = await regeneratePartnerToken();
    if (res.status === 200) {
      toast({ title: "Token regenerado", description: "Volvé a compartir la URL nueva." });
      router.refresh();
    }
  };

  const copiar = async (texto: string) => {
    await copyToClipboard(texto);
    toast({ title: "Copiado", description: texto });
  };

  const urlStock = origin ? `${origin}/api/partner/stock?token=${config.partnerToken ?? ""}` : "";
  const urlPricelist = origin
    ? `${origin}/api/partner/pricelist?token=${config.partnerToken ?? ""}`
    : "";

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <p className="font-semibold">Conexión con proveedor / distribuidora</p>
        <p className="text-sm text-muted-foreground">
          Cada negocio es su propia instalación. La conexión se hace por URL con
          un token, y solo comparte lo que cada uno habilita.
        </p>
      </div>

      {/* Compartir stock (comercio → distribuidora) */}
      {verLadoComercio && (
      <div className="rounded-lg border p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Compartir stock con mi distribuidora</p>
            <p className="text-xs text-muted-foreground">
              Expone el stock de los productos que importaste del proveedor.
            </p>
          </div>
          <Switch
            checked={config.shareStockEnabled}
            onCheckedChange={(v) => toggle("shareStockEnabled", v)}
          />
        </div>
        {config.shareStockEnabled && (
          <UrlBox label="URL de stock (pasásela a tu distribuidora)" value={urlStock} onCopy={copiar} />
        )}
      </div>
      )}

      {/* Exponer lista de precios (distribuidora → comercios) */}
      {verLadoDistribuidora && (
      <div className="rounded-lg border p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Soy distribuidora: exponer lista de precios</p>
            <p className="text-xs text-muted-foreground">
              Tus comercios pueden traer tus precios desde esta URL.
            </p>
          </div>
          <Switch
            checked={config.sharePricelistEnabled}
            onCheckedChange={(v) => toggle("sharePricelistEnabled", v)}
          />
        </div>
        {config.sharePricelistEnabled && (
          <UrlBox label="URL de lista de precios (pasásela a tus comercios)" value={urlPricelist} onCopy={copiar} />
        )}
      </div>
      )}

      {(config.shareStockEnabled || config.sharePricelistEnabled) && config.partnerToken && (
        <Button variant="outline" size="sm" onClick={regenerar}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Regenerar token
        </Button>
      )}

      {/* Mi proveedor (comercio ← distribuidora) */}
      {verLadoComercio && (
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">Mi proveedor</p>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">URL de lista de precios del proveedor</Label>
            <Input
              value={supplierUrl}
              onChange={(e) => setSupplierUrl(e.target.value)}
              placeholder="https://miproveedor.iman.app/api/partner/pricelist?token=…"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Token (si el proveedor lo pide aparte)</Label>
            <Input
              value={supplierToken}
              onChange={(e) => setSupplierToken(e.target.value)}
              placeholder="opcional"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La actualización de precios se corre desde <strong>Productos</strong>, con
            confirmación de cada cambio.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={guardarProveedor} disabled={savingSupplier}>
              {savingSupplier ? "Guardando…" : "Guardar proveedor"}
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function UrlBox({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="mt-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={() => onCopy(value)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
