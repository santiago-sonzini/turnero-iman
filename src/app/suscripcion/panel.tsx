"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  activarPago,
  cambiarPlan,
  cancelarSuscripcion,
} from "@/app/actions/billing";
import type { PlanTier } from "@prisma/client";

type Props = {
  plan: { tier: PlanTier; nombre: string; precio: string } | null;
  // Precios formateados de los planes self-serve (vienen de PLANES, server).
  precios: { SIMPLE: string; COMPLETO: string };
  acceso:
    | { estado: "pleno"; diasTrial?: number }
    | { estado: "gracia"; hasta: string }
    | { estado: "bloqueado"; motivo: string }
    | { estado: "onboarding" };
  tieneMp: boolean;
};

const MOTIVOS: Record<string, { titulo: string; detalle: string }> = {
  trial_vencido: {
    titulo: "Se terminó tu prueba gratis",
    detalle:
      "Para seguir usando Imán activá el débito mensual. Todo lo que cargaste está guardado y te espera.",
  },
  pago_vencido: {
    titulo: "No pudimos cobrar el último mes",
    detalle:
      "Reintentá el pago o actualizá el medio de pago en Mercado Pago. Tus datos están intactos.",
  },
  cancelado: {
    titulo: "Tu suscripción está cancelada",
    detalle:
      "Podés reactivarla cuando quieras: tus clientes, ventas y plantillas siguen acá.",
  },
};

export function Panel({ plan, precios, acceso, tieneMp }: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const irAMp = async () => {
    setCargando("mp");
    setError(null);
    const res = await activarPago();
    if (res.ok && res.initPoint) {
      window.location.href = res.initPoint;
      return;
    }
    setError(res.ok ? "Mercado Pago no está disponible ahora." : res.error);
    setCargando(null);
  };

  const cambiar = async (nuevo: PlanTier) => {
    setCargando(nuevo);
    setError(null);
    const res = await cambiarPlan(nuevo);
    if (!res.ok) setError(res.error);
    setCargando(null);
    router.refresh();
  };

  const cancelar = async () => {
    if (!confirm("¿Cancelar la suscripción? Tus datos quedan guardados igual.")) return;
    setCargando("cancelar");
    const res = await cancelarSuscripcion();
    if (!res.ok) setError(res.error);
    setCargando(null);
    router.refresh();
  };

  const bloqueado = acceso.estado === "bloqueado";
  const motivo = bloqueado ? MOTIVOS[(acceso as any).motivo] : null;

  return (
    <main className="space-y-5">
      <div className="text-center">
        <h1 className="text-3xl">
          {bloqueado ? motivo?.titulo : "Tu suscripción"}
        </h1>
        {bloqueado && <p className="onb-sub mt-2">{motivo?.detalle}</p>}
      </div>

      <div className="onb-card">
        <div className="flex items-center justify-between">
          <div>
            <span className="onb-badge">
              {plan ? `Plan ${plan.nombre}` : "Sin plan"}
            </span>
            {plan && <p className="mt-2 text-2xl font-bold">{plan.precio}</p>}
          </div>
          <EstadoChip acceso={acceso} />
        </div>

        {acceso.estado === "pleno" && acceso.diasTrial != null && (
          <p className="onb-sub mt-2 text-sm">
            Te quedan <b>{acceso.diasTrial} días</b> de prueba gratis.
            {!tieneMp &&
              " Dejá el débito configurado ahora y no se corta nada cuando termine."}
          </p>
        )}
        {acceso.estado === "gracia" && (
          <p className="onb-sub mt-2 text-sm">
            Tenés tiempo hasta el{" "}
            <b>{new Date(acceso.hasta).toLocaleDateString("es-AR")}</b> para
            regularizar el pago antes de que se pause el acceso.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {(!tieneMp || acceso.estado !== "pleno") &&
            plan?.tier !== "PERSONALIZADO" && (
              <button
                className="onb-btn onb-btn-primario"
                onClick={irAMp}
                disabled={!!cargando}
              >
                {cargando === "mp"
                  ? "Abriendo Mercado Pago…"
                  : acceso.estado === "gracia" || bloqueado
                    ? "Reintentar el pago"
                    : "Configurar débito automático"}
              </button>
            )}
          {!bloqueado && (
            <Link href="/dashboard" className="onb-btn onb-btn-secundario">
              Volver al panel
            </Link>
          )}
        </div>
      </div>

      {plan && plan.tier !== "PERSONALIZADO" && (
        <div className="onb-card">
          <h3 className="text-lg">Cambiar de plan</h3>
          <p className="onb-sub text-sm">
            El cambio de precio rige desde el próximo mes; las funciones cambian
            ya mismo.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {plan.tier !== "SIMPLE" && (
              <button
                className="onb-btn onb-btn-secundario"
                disabled={!!cargando}
                onClick={() => cambiar("SIMPLE")}
              >
                Bajar a Simple ({precios.SIMPLE}/mes)
              </button>
            )}
            {plan.tier !== "COMPLETO" && (
              <button
                className="onb-btn onb-btn-primario"
                disabled={!!cargando}
                onClick={() => cambiar("COMPLETO")}
              >
                Subir a Completo ({precios.COMPLETO}/mes)
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-center text-sm font-bold text-[var(--rojo)]">{error}</p>
      )}

      {!bloqueado && tieneMp && (
        <p className="text-center">
          <button
            className="text-sm underline opacity-60"
            onClick={cancelar}
            disabled={!!cargando}
          >
            Cancelar suscripción
          </button>
        </p>
      )}
    </main>
  );
}

function EstadoChip({ acceso }: { acceso: Props["acceso"] }) {
  const map: Record<string, { txt: string; bg: string }> = {
    pleno: { txt: "Al día", bg: "var(--verde-ok)" },
    gracia: { txt: "Pago pendiente", bg: "var(--amarillo-neu)" },
    bloqueado: { txt: "Pausada", bg: "var(--rojo)" },
    onboarding: { txt: "En onboarding", bg: "var(--acento)" },
  };
  const e = map[acceso.estado]!;
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-extrabold uppercase text-white"
      style={{ background: e.bg }}
    >
      {e.txt}
    </span>
  );
}
