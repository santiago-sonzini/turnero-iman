"use client";
// Pantalla principal: lista de clientes con semáforo, ordenada por días sin
// comprar. La idea: en 30 segundos sabés a quién escribirle hoy.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageTemplate } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatARS, formatFecha, haceDias } from "@/lib/format";
import type { ClienteSemaforo } from "@/app/actions/iman";
import type { EstadoCliente } from "@/server/iman/engine";
import { ESTADOS, EstadoChip, EstadoDot } from "./estado";
import { WhatsAppDialog } from "./whatsapp-dialog";
import { FusionesBanner, type Fusion } from "./fusiones-banner";
import { ImportDialog } from "./import-dialog";
import { ClientForm } from "@/components/features/client/client-form";
import { Magnet, MessageCircle, Plus, Search, Upload } from "lucide-react";

type Orden = "dias" | "nombre" | "ciclo" | "promedio" | "total";

interface SemaforoProps {
  clientes: ClienteSemaforo[];
  fusiones: Fusion[];
  negocioNombre: string;
  plantillas: MessageTemplate[];
  waConectado?: boolean;
  /** Vocabulario del pack de demo ("Clientes" | "Comercios"). */
  titulo?: string;
}

export function SemaforoClientes({ clientes, fusiones, negocioNombre, plantillas, waConectado, titulo }: SemaforoProps) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todos" | EstadoCliente>("todos");
  const [orden, setOrden] = useState<Orden>("dias");
  const [busqueda, setBusqueda] = useState("");
  const [waCliente, setWaCliente] = useState<ClienteSemaforo | null>(null);
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todos: clientes.length, activo: 0, riesgo: 0, dormido: 0, perdido: 0 };
    for (const cl of clientes) c[cl.estado] = (c[cl.estado] ?? 0) + 1;
    return c;
  }, [clientes]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let l = clientes.filter(
      (c) =>
        (filtro === "todos" || c.estado === filtro) &&
        (!q || c.name.toLowerCase().includes(q)),
    );
    const cmp: Record<Orden, (a: ClienteSemaforo, b: ClienteSemaforo) => number> = {
      dias: (a, b) => (b.dias ?? -1) - (a.dias ?? -1),
      nombre: (a, b) => a.name.localeCompare(b.name),
      ciclo: (a, b) => a.ciclo - b.ciclo,
      promedio: (a, b) => b.promedio - a.promedio,
      total: (a, b) => b.total - a.total,
    };
    return [...l].sort(cmp[orden]);
  }, [clientes, filtro, orden, busqueda]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo ?? "Clientes"}</h1>
          <p className="text-sm text-muted-foreground">
            Ordenados por días sin comprar. Escribile primero a los de arriba.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Importar ventas
          </Button>
          <Button size="sm" onClick={() => setNuevoClienteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar cliente
          </Button>
        </div>
      </div>

      <FusionesBanner fusiones={fusiones} />

      {/* Filtros por estado */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <FiltroChip
          activo={filtro === "todos"}
          onClick={() => setFiltro("todos")}
          label={`Todos (${cuentas.todos})`}
        />
        {ESTADOS.map((e) => (
          <FiltroChip
            key={e.id}
            activo={filtro === e.id}
            onClick={() => setFiltro(filtro === e.id ? "todos" : e.id)}
            label={`${e.plural} (${cuentas[e.id] ?? 0})`}
            dot={<EstadoDot estado={e.id} className="h-2.5 w-2.5" />}
          />
        ))}
      </div>

      {/* Búsqueda y orden */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <Select value={orden} onValueChange={(v) => setOrden(v as Orden)}>
          <SelectTrigger className="w-52 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dias">Días sin comprar</SelectItem>
            <SelectItem value="nombre">Nombre</SelectItem>
            <SelectItem value="ciclo">Ciclo de compra</SelectItem>
            <SelectItem value="promedio">Gasto promedio</SelectItem>
            <SelectItem value="total">Gasto total</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {lista.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay clientes que coincidan con el filtro.
          </div>
        )}
        {lista.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/25 sm:p-4"
          >
            <Link
              href={`/dashboard/clients/${c.id}`}
              className="flex min-w-0 flex-1 items-start gap-3"
            >
              <EstadoDot estado={c.estado} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-semibold">{c.name}</span>
                  <EstadoChip estado={c.estado} />
                  {c.recuperado && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-acento-suave px-2 py-0.5 text-xs font-semibold text-acento">
                      <Magnet className="h-3 w-3" />
                      recuperado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {c.compras === 0 ? (
                    "Sin compras registradas"
                  ) : (
                    <>
                      Última compra: {formatFecha(c.ultima)} · compra cada ~{c.ciclo} días
                      {c.cicloEstimado && " (estimado)"}
                    </>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.compras > 0 && (
                    <>
                      Promedio {formatARS(c.promedio)} · Total {formatARS(c.total)}
                    </>
                  )}
                  {c.ultimoContacto && (
                    <span className="text-foreground/70">
                      {c.compras > 0 && " · "}✉️ contactado{" "}
                      {haceDias(
                        Math.floor(
                          (Date.now() - new Date(c.ultimoContacto.fecha).getTime()) / 86400000,
                        ),
                      )}
                    </span>
                  )}
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={cn(
                  "whitespace-nowrap text-right text-sm font-bold tabular-nums",
                  c.estado === "activo" ? "text-sem-verde" : "",
                  c.estado === "riesgo" ? "text-sem-amarillo" : "",
                  c.estado === "dormido" ? "text-sem-naranja" : "",
                  c.estado === "perdido" ? "text-sem-rojo" : "",
                )}
              >
                {c.dias == null ? "—" : haceDias(c.dias)}
              </span>
              <Button
                size="sm"
                className="bg-wa text-white hover:bg-wa-hover"
                onClick={() => setWaCliente(c)}
              >
                <MessageCircle className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <WhatsAppDialog
        cliente={waCliente}
        plantillas={plantillas}
        negocioNombre={negocioNombre}
        waConectado={waConectado}
        onClose={() => setWaCliente(null)}
        onEnviado={() => router.refresh()}
      />

      <ClientForm
        open={nuevoClienteOpen}
        onOpenChange={setNuevoClienteOpen}
        onSuccess={() => router.refresh()}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function FiltroChip({
  activo,
  onClick,
  label,
  dot,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  dot?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        activo
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground hover:bg-accent",
      )}
    >
      {dot}
      {label}
    </button>
  );
}
