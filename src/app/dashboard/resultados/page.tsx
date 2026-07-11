"use server"
// Resultados: la métrica estrella. ¿Cuántos clientes volvieron después de
// contactarlos y cuánta plata trajo eso?
//
// DESHABILITADO POR AHORA: atribuir recuperos con precisión es difícil y
// preferimos no mostrar números discutibles. El cálculo sigue vivo en
// src/server/iman/engine.ts (y el badge "recuperado" en la lista). Para
// reactivar la pantalla: HABILITADO = true acá y descomentar el ítem de
// navegación en src/constants/data.ts.
import { getResultados } from "@/app/actions/iman";
import { formatARS, formatFecha } from "@/lib/format";
import { EstadoChip } from "@/components/iman/estado";
import type { EstadoCliente } from "@/server/iman/engine";
import { Magnet, MessageCircle, TrendingUp, Users } from "lucide-react";

const HABILITADO = false;

export default async function Page() {
  if (!HABILITADO) {
    return (
      <div className="no-scrollbar h-full w-full overflow-y-auto">
        <div className="mx-auto max-w-xl pb-24">
          <div className="rounded-xl border bg-card p-8 text-center">
            <h1 className="text-xl font-bold">Resultados está deshabilitado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Medir con precisión qué venta vino por cuál contacto es difícil,
              así que preferimos no mostrar números acá por ahora. Los
              contactos se siguen registrando igual.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const r = await getResultados();

  const tasa =
    r.tasaRecupero == null ? "—" : `${Math.round(r.tasaRecupero * 100)}%`;

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Un cliente cuenta como recuperado si compra dentro de los{" "}
            {r.ventanaDias} días de haberlo contactado estando en riesgo,
            dormido o perdido.
          </p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border-2 border-acento bg-acento-suave p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-acento">
              <Magnet className="h-3.5 w-3.5" />
              Clientes recuperados
            </p>
            <p className="mt-1 text-3xl font-bold">{r.clientesRecuperados}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Plata recuperada
            </p>
            <p className="mt-1 text-3xl font-bold">{formatARS(r.montoRecuperado)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Contactos enviados
            </p>
            <p className="mt-1 text-3xl font-bold">{r.totalContactos}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Tasa de recupero
            </p>
            <p className="mt-1 text-3xl font-bold">{tasa}</p>
          </div>
        </div>

        {/* Recuperos */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 font-semibold">Recuperos</p>
          {r.recuperos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay recuperos. Contactá clientes desde la pantalla
              principal y cuando vuelvan a comprar los vas a ver acá.
            </p>
          ) : (
            <div className="space-y-2">
              {r.recuperos.map((rec, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{rec.clienteNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Contactado el {formatFecha(rec.contactoFecha)} (
                      {rec.plantilla}) · volvió a comprar el{" "}
                      {formatFecha(rec.ventaFecha)}
                    </p>
                  </div>
                  <span className="font-bold text-sem-verde">
                    +{formatARS(rec.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contactos recientes */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 font-semibold">Últimos contactos</p>
          {r.contactosRecientes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no contactaste a nadie.
            </p>
          ) : (
            <div className="space-y-1.5">
              {r.contactosRecientes.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-medium">{c.clienteNombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.plantilla} · {formatFecha(c.fecha)}
                    </span>
                    <EstadoChip estado={c.estadoEntonces as EstadoCliente} />
                  </span>
                  {c.recupero ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-acento">
                      <Magnet className="h-3 w-3" />
                      recuperado
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">sin compra aún</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
