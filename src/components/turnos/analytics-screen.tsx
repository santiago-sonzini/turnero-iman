"use client";

import { useEffect, useTransition } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CalendarClock, CircleDollarSign, RotateCcw, UserRoundCheck, UsersRound } from "lucide-react";

import { getBusinessAnalytics } from "@/app/actions/analytics";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type Analytics = Awaited<ReturnType<typeof getBusinessAnalytics>>;
const money = (ars: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(ars);
const chartConfig = { realizedArs: { label: "Cobrado", color: "var(--acento)" }, projectedArs: { label: "Proyectado", color: "#E9B949" } } satisfies ChartConfig;

export function AnalyticsScreen({ data, setData }: { data: Analytics | null; setData: (data: Analytics) => void }) {
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (data) return;
    const to = new Date(); to.setHours(23, 59, 59, 999);
    const from = new Date(to); from.setDate(from.getDate() - 89); from.setHours(0, 0, 0, 0);
    startTransition(async () => setData(await getBusinessAnalytics(from.toISOString(), to.toISOString())));
  }, [data, setData]);
  if (!data || pending) return <AnalyticsSkeleton />;
  const cards = [
    ["Ingresos realizados", money(data.revenueArs), `${money(data.projectedRevenueArs)} proyectados`, CircleDollarSign],
    ["Ocupación", data.occupancyPct == null ? "—" : `${data.occupancyPct}%`, `${Math.round(data.bookedMinutes / 60)} h reservadas`, CalendarClock],
    ["Ausentismo", data.noShowPct == null ? "—" : `${data.noShowPct}%`, `${data.noShowCount} no asistieron`, RotateCcw],
    ["Clientes que vuelven", data.returningPct == null ? "—" : `${data.returningPct}%`, `${data.returningClients} recurrentes`, UserRoundCheck],
    ["Recuperables", String(data.recoverable), data.averageCycleDays ? `ciclo medio ${data.averageCycleDays} días` : "sin ciclo todavía", UsersRound],
  ] as const;
  return <div className="analytics-view"><div className="an-head"><div><p className="eyebrow">ÚLTIMOS 90 DÍAS</p><h1>Análisis del negocio</h1><p>Ingresos de turnos asistidos, demanda y recurrencia.</p></div></div>
    <div className="an-kpis">{cards.map(([label, value, detail, Icon]) => <div className="an-kpi" key={label}><span><Icon /></span><small>{label}</small><b>{value}</b><p>{detail}</p></div>)}</div>
    <section className="an-panel"><div className="an-section-head"><div><h2>Ingresos por mes</h2><p>Realizados vs. turnos futuros confirmados</p></div></div>{data.byMonth.length ? <ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto" role="img" aria-label="Ingresos mensuales realizados y proyectados"><AreaChart data={data.byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis width={55} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} /><ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-36 justify-between gap-4"><span>{name === "realizedArs" ? "Cobrado" : "Proyectado"}</span><b>{money(Number(value))}</b></div>} />} /><Area type="monotone" dataKey="projectedArs" stroke="var(--color-projectedArs)" fill="var(--color-projectedArs)" fillOpacity={.1} strokeDasharray="5 4" /><Area type="monotone" dataKey="realizedArs" stroke="var(--color-realizedArs)" fill="var(--color-realizedArs)" fillOpacity={.16} strokeWidth={2.5} /></AreaChart></ChartContainer> : <Empty />}</section>
    <div className="an-grid"><Breakdown title="Por servicio" rows={data.byService} />{data.byStaff.length ? <Breakdown title="Por profesional" rows={data.byStaff} /> : <section className="an-panel"><div className="an-section-head"><div><h2>Clientes</h2><p>Composición en el período</p></div></div><div className="an-client-split"><span><b>{data.newClients}</b><small>Nuevos</small></span><span><b>{data.returningClients}</b><small>Recurrentes</small></span></div></section>}</div>
  </div>;
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ name: string; revenueArs: number }> }) { const max = Math.max(1, ...rows.map((row) => row.revenueArs)); return <section className="an-panel"><div className="an-section-head"><div><h2>{title}</h2><p>Ingresos realizados</p></div></div><div className="an-bars">{rows.slice(0, 6).map((row) => <div key={row.name}><span><b>{row.name}</b><em>{money(row.revenueArs)}</em></span><i><u style={{ width: `${row.revenueArs / max * 100}%` }} /></i></div>)}{!rows.length ? <Empty /> : null}</div></section>; }
function AnalyticsSkeleton() { return <div className="analytics-view"><div className="an-head"><div><p className="eyebrow">PREPARANDO</p><h1>Análisis del negocio</h1><p>Calculando tus métricas…</p></div></div><div className="an-kpis">{Array.from({ length: 5 }, (_, index) => <div className="an-kpi an-loading" key={index} />)}</div><div className="an-panel an-loading" style={{ minHeight: 310 }} /></div>; }
function Empty() { return <p className="an-empty">Todavía no hay datos en este período.</p>; }
