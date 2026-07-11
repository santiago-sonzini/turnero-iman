"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { elegirPlan } from "@/app/actions/billing";
import type { PlanTier } from "@prisma/client";

type PlanCard = {
  tier: PlanTier;
  nombre: string;
  descripcion: string;
  precioArs: number;
};

const FEATURES_UI: Record<string, string[]> = {
  SIMPLE: [
    "Import de tu Excel/CSV asistido",
    "Semáforo de clientes (activo / en riesgo / dormido / perdido)",
    "Mensajes de WhatsApp listos con plantillas",
    "Promos por email",
  ],
  COMPLETO: [
    "Todo lo de Simple",
    "Presupuestos, remitos y tickets en PDF",
    "Productos y listas de precios",
    "Sincronizado en la nube, en todos tus dispositivos",
  ],
};

export function PlanPicker({ planes }: { planes: PlanCard[] }) {
  const router = useRouter();
  // La pregunta que decide la recomendación: ¿solo recuperar clientes o
  // también manejar el mostrador?
  const [quiereMostrador, setQuiereMostrador] = useState<boolean | null>(null);
  const recomendado: PlanTier = quiereMostrador ? "COMPLETO" : "SIMPLE";
  const [cargando, setCargando] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegir = async (tier: PlanTier, conPago: boolean) => {
    setCargando(tier);
    setError(null);
    const res = await elegirPlan(tier, { conPago });
    if (!res.ok) {
      setError(res.error);
      setCargando(null);
      return;
    }
    if (res.initPoint) {
      // A Mercado Pago a autorizar el débito mensual (vuelve a /suscripcion/retorno).
      window.location.href = res.initPoint;
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="mt-6">
      <div className="onb-card">
        <p className="font-bold">
          Además de recuperar clientes, ¿querés hacer recibos y manejar
          productos y precios acá?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className={`onb-btn ${quiereMostrador === false ? "onb-btn-primario" : "onb-btn-secundario"}`}
            onClick={() => setQuiereMostrador(false)}
          >
            No, solo recuperar ventas
          </button>
          <button
            className={`onb-btn ${quiereMostrador === true ? "onb-btn-primario" : "onb-btn-secundario"}`}
            onClick={() => setQuiereMostrador(true)}
          >
            Sí, el mostrador también
          </button>
        </div>
      </div>

      <div className="onb-planes mt-4">
        {planes.map((p) => {
          const esRecomendado = quiereMostrador !== null && p.tier === recomendado;
          return (
            <div
              key={p.tier}
              className={`onb-plan ${esRecomendado ? "elegido" : ""}`}
            >
              {esRecomendado && (
                <span className="onb-recomendado">Para vos</span>
              )}
              <h3 className="text-xl">{p.nombre}</h3>
              <div className="precio mt-1">
                $ {p.precioArs.toLocaleString("es-AR")}
                <small> /mes</small>
              </div>
              <ul>
                {FEATURES_UI[p.tier]?.map((fl) => <li key={fl}>{fl}</li>)}
              </ul>
              <button
                className="onb-btn onb-btn-primario mt-4 w-full"
                disabled={!!cargando}
                onClick={() => elegir(p.tier, true)}
              >
                {cargando === p.tier
                  ? "Preparando…"
                  : "Empezar 14 días gratis"}
              </button>
              <button
                className="mt-2 w-full text-center text-sm underline opacity-70"
                disabled={!!cargando}
                onClick={() => elegir(p.tier, false)}
              >
                Probar sin cargar el pago todavía
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm font-bold text-[var(--rojo)]">
          {error}
        </p>
      )}
    </div>
  );
}
