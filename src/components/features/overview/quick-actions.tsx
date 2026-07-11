"use client";

// Barra de acciones rápidas del Resumen. Combina modales (agregar cliente /
// producto en segundos) con accesos directos a los flujos más usados.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  PackagePlus,
  FileText,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/app/actions/clients";
import { quickCreateProduct } from "@/app/actions/products";

interface QuickActionsProps {
  // Vocabulario del pack de demo ("Clientes" | "Comercios").
  labelCliente?: string;
}

export function QuickActions({ labelCliente = "cliente" }: QuickActionsProps) {
  const router = useRouter();
  const [openClient, setOpenClient] = useState(false);
  const [openProduct, setOpenProduct] = useState(false);

  const singular = labelCliente.toLowerCase();

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Acciones rápidas
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ActionTile
          icon={<UserPlus className="h-5 w-5" />}
          label={`Agregar ${singular}`}
          onClick={() => setOpenClient(true)}
          accent="emerald"
        />
        <ActionTile
          icon={<FileText className="h-5 w-5" />}
          label="Crear factura"
          href="/dashboard/invoices/create"
          accent="sky"
        />
        <ActionTile
          icon={<Megaphone className="h-5 w-5" />}
          label="Crear promo"
          href="/dashboard/promos"
          accent="violet"
        />
        <ActionTile
          icon={<PackagePlus className="h-5 w-5" />}
          label="Agregar producto"
          onClick={() => setOpenProduct(true)}
          accent="amber"
        />
        <ActionTile
          icon={<MessageCircle className="h-5 w-5" />}
          label="A quién contactar"
          href="/dashboard"
          accent="rose"
        />
      </div>

      <QuickClientDialog
        open={openClient}
        onOpenChange={setOpenClient}
        singular={singular}
        onCreated={() => router.refresh()}
      />
      <QuickProductDialog
        open={openProduct}
        onOpenChange={setOpenProduct}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  emerald: "text-emerald-600 group-hover:border-emerald-400 dark:text-emerald-400",
  sky: "text-sky-600 group-hover:border-sky-400 dark:text-sky-400",
  violet: "text-violet-600 group-hover:border-violet-400 dark:text-violet-400",
  amber: "text-amber-600 group-hover:border-amber-400 dark:text-amber-400",
  rose: "text-rose-600 group-hover:border-rose-400 dark:text-rose-400",
};

function ActionTile({
  icon,
  label,
  onClick,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  accent: string;
}) {
  const inner = (
    <div className="group flex h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border bg-background p-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full border bg-muted transition-colors ${ACCENTS[accent]}`}>
        {icon}
      </div>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="w-full">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full">
      {inner}
    </button>
  );
}

// ── Modal: agregar cliente (solo nombre + teléfono) ─────────────────────────
function QuickClientDialog({
  open,
  onOpenChange,
  singular,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  singular: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresá un nombre." });
      return;
    }
    setLoading(true);
    const res = await createClient({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });
    setLoading(false);

    if (res.status !== 200) {
      toast({ title: "Error", description: res.message });
      return;
    }
    toast({ title: "Cliente agregado", description: `${name.trim()} quedó cargado.` });
    setName("");
    setPhone("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="capitalize">Agregar {singular}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              autoFocus
              placeholder="Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Teléfono</Label>
            <Input
              placeholder="+54 9 11 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !name.trim()}>
            {loading ? <LoadingSpinner /> : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: agregar producto (nombre + precio) ───────────────────────────────
function QuickProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresá un nombre." });
      return;
    }
    setLoading(true);
    const res = await quickCreateProduct({
      name: name.trim(),
      price: parseFloat(price) || 0,
    });
    setLoading(false);

    if (res.status !== 200) {
      toast({ title: "Error", description: res.message });
      return;
    }
    toast({ title: "Producto agregado", description: `${name.trim()} quedó cargado.` });
    setName("");
    setPrice("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Agregar producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              autoFocus
              placeholder="Coca-Cola 2,25 L"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Precio</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !name.trim()}>
            {loading ? <LoadingSpinner /> : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
