"use client";
// Cabecera de inteligencia del cliente: estado, ciclo, gasto, productos
// frecuentes, historial de contactos y botón de WhatsApp.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageTemplate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { formatARS, formatFecha, haceDias } from "@/lib/format";
import type { ClienteIntel, ClienteSemaforo } from "@/app/actions/iman";
import { EstadoChip, EstadoDot } from "./estado";
import { WhatsAppDialog } from "./whatsapp-dialog";
import { Magnet, MessageCircle } from "lucide-react";

interface Props {
  intel: ClienteIntel;
  plantillas: MessageTemplate[];
  negocioNombre: string;
  waConectado?: boolean;
}

export function ClienteIntelCard({ intel, plantillas, negocioNombre, waConectado }: Props) {
  const router = useRouter();
  const [waOpen, setWaOpen] = useState(false);
  const { cliente, stats, productosFrecuentes, timeline } = intel;

  // El diálogo de WhatsApp trabaja con la forma del semáforo
  const comoSemaforo: ClienteSemaforo = {
    id: cliente.id,
    name: cliente.name,
    phone: cliente.phone,
    email: cliente.email,
    notes: cliente.notes,
    estado: stats.estado,
    dias: stats.dias,
    ultima: stats.ultima,
    ciclo: stats.ciclo,
    cicloEstimado: stats.cicloEstimado,
    compras: stats.compras,
    total: stats.total,
    promedio: stats.promedio,
    ultimoContacto: null,
    recuperado: false,
  };

  return (
    <div className="mx-auto mb-4 w-full max-w-5xl space-y-3">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <EstadoDot estado={stats.estado} className="h-4 w-4" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{cliente.name}</h1>
            <p className="text-sm text-muted-foreground">
              <EstadoChip estado={stats.estado} className="mr-2" />
              {stats.dias != null
                ? `${haceDias(stats.dias)} que no compra`
                : "sin compras registradas"}
              {cliente.notes && <> · {cliente.notes}</>}
            </p>
          </div>
        </div>
        <Button className="bg-wa text-white hover:bg-wa-hover" onClick={() => setWaOpen(true)}>
          <MessageCircle className="mr-1.5 h-4 w-4" />
          WhatsApp
        </Button>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Última compra" valor={stats.ultima ? formatFecha(stats.ultima) : "—"} />
        <Stat
          label="Compra cada"
          valor={`~${stats.ciclo} días${stats.cicloEstimado ? " (est.)" : ""}`}
        />
        <Stat label="Gasto promedio" valor={formatARS(stats.promedio)} />
        <Stat label={`Total (${stats.compras} compras)`} valor={formatARS(stats.total)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Productos frecuentes */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Lo que más compra</p>
          {productosFrecuentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin compras con detalle.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {productosFrecuentes.map((p) => (
                <li key={p.nombre} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{p.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {p.veces}× · últ. {formatFecha(p.ultimaVez)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Historial</p>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos.</p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm">
              {timeline.slice(0, 20).map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border-b pb-1.5 last:border-b-0">
                  {t.tipo === "venta" ? (
                    <>
                      <span className="min-w-0">
                        <span className="font-medium">Compra</span>
                        {t.detalle && (
                          <span className="ml-1 text-muted-foreground">({t.detalle})</span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium">{formatARS(t.monto)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatFecha(t.fecha)}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-wa" />
                        <span>
                          Contacto · {t.plantilla}
                          {t.recupero && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-acento">
                              <Magnet className="h-3 w-3" />
                              recuperó
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatFecha(t.fecha)}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <WhatsAppDialog
        cliente={waOpen ? comoSemaforo : null}
        plantillas={plantillas}
        negocioNombre={negocioNombre}
        waConectado={waConectado}
        onClose={() => setWaOpen(false)}
        onEnviado={() => router.refresh()}
      />
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-lg font-bold">{valor}</p>
    </div>
  );
}
