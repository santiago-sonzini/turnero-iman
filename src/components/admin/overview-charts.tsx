"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = { altas: { label: "Altas", color: "#fb923c" } } satisfies ChartConfig;

export function SignupChart({ data }: { data: Array<{ date: string; label: string; altas: number }> }) {
  const [range, setRange] = useState<30 | 90>(30);
  const shown = useMemo(() => data.slice(-range), [data, range]);
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg text-zinc-100">Altas por día</h2><p className="text-sm text-zinc-500">Nuevos negocios en hora Argentina</p></div>
      <div className="flex rounded-xl bg-black/30 p-1" aria-label="Rango del gráfico">
        {([30, 90] as const).map((days) => <button key={days} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${range === days ? "bg-orange-400 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"}`} onClick={() => setRange(days)}>{days}d</button>)}
      </div>
    </div>
    <ChartContainer config={config} className="h-[260px] w-full aspect-auto" role="img" aria-label={`Altas diarias durante los últimos ${range} días`}>
      <AreaChart data={shown} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs><linearGradient id="adminAltas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-altas)" stopOpacity={0.45} /><stop offset="95%" stopColor="var(--color-altas)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area type="monotone" dataKey="altas" stroke="var(--color-altas)" strokeWidth={2.5} fill="url(#adminAltas)" activeDot={{ r: 5 }} />
      </AreaChart>
    </ChartContainer>
  </section>;
}

const labels: Record<string, string> = {
  cuenta_creada: "Cuenta creada", plan_seleccionado: "Plan elegido", suscripcion_iniciada: "Checkout iniciado",
  suscripcion_autorizada: "Suscripción autorizada", pago_aprobado: "Primer pago",
};

export function FunnelChart({ data }: { data: Array<{ event: string; count: number; stepPct: number | null }> }) {
  const max = Math.max(1, ...data.map((row) => row.count));
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
    <div className="mb-5"><h2 className="text-lg text-zinc-100">Funnel de activación</h2><p className="text-sm text-zinc-500">Negocios únicos · últimos 90 días</p></div>
    <div className="space-y-4">
      {data.map((row, index) => <div key={row.event}>
        <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm"><span className="text-zinc-300">{labels[row.event] ?? row.event}</span><span className="font-mono text-zinc-100">{row.count} <em className="ml-1 not-italic text-zinc-600">{index ? `${row.stepPct ?? "—"}%` : "base"}</em></span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${Math.max(row.count ? 5 : 0, row.count / max * 100)}%` }} /></div>
      </div>)}
    </div>
  </section>;
}
