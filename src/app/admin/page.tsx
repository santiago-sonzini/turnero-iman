import { Suspense } from "react";
import Link from "next/link";
import { Activity, BadgeDollarSign, Building2, CircleDollarSign, Mail, MessageCircle, TrendingDown, UserPlus, Users } from "lucide-react";

import { ActivityFeed } from "@/components/admin/activity-feed";
import { ErrorsPanel } from "@/components/admin/errors-panel";
import { HealthPanel } from "@/components/admin/health-panel";
import { KpiCard } from "@/components/admin/kpi-card";
import { LifecycleLists } from "@/components/admin/lifecycle-lists";
import { FunnelChart, SignupChart } from "@/components/admin/overview-charts";
import { TenantsTable } from "@/components/admin/tenants-table";
import { Skeleton } from "@/components/ui/skeleton";
import { getFunnel, getHealthPanel, getIssues, getLifecycle, getMessagingStats, getPlatformOverview, getRatios, getRecentActivity, getSignupSeries, listTenants } from "@/server/admin/metrics";
import { formatoArs } from "@/server/plans";

export default async function AdminPage() {
  const [overview, ratios, signupSeries, funnel, lifecycle, activity, messaging, issues, tenants] = await Promise.all([
    getPlatformOverview(), getRatios(90), getSignupSeries(90), getFunnel(90), getLifecycle(), getRecentActivity(), getMessagingStats(), getIssues(), listTenants(),
  ]);
  const pct = (value: number | null) => value == null ? "—" : `${value}%`;
  return <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-orange-300">Plataforma en vivo</p><h1 className="text-3xl tracking-tight text-white sm:text-4xl">El pulso de Imán</h1><p className="mt-2 text-sm text-zinc-500">Ingresos, crecimiento, riesgo y operación en una sola vista.</p></div><p className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Actualizado ahora</p></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard label="MRR comprometido" value={formatoArs(overview.committedArs)} detail={`ARR ${formatoArs(overview.arrArs)}`} icon={BadgeDollarSign} />
      <KpiCard label="Suscripciones activas" value={String(overview.activeCount)} detail={`ARPA ${formatoArs(overview.arpaArs)}`} icon={Users} />
      <KpiCard label="Altas este mes" value={String(overview.signupsThisMonth)} trend={overview.signupDeltaPct} detail="vs. mes anterior" icon={UserPlus} />
      <KpiCard label="Trial → pago" value={pct(ratios.conversionPct)} detail={`ventana ${ratios.windowDays}d`} icon={CircleDollarSign} />
      <KpiCard label="Churn aprox." value={pct(ratios.churnPct)} detail={`${ratios.churnCount} bajas`} icon={TrendingDown} />
      <KpiCard label="Ingreso en riesgo" value={formatoArs(overview.atRiskArs)} detail="PAST_DUE" icon={Activity} />
    </section>

    <section><div className="mb-4"><h2 className="text-lg text-zinc-100">Composición del MRR</h2><p className="text-sm text-zinc-500">Los buckets no se mezclan con el ingreso comprometido</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MoneyBand label="Comprometido" value={overview.committedArs} hint="ACTIVE" tone="text-emerald-300" />
      <MoneyBand label="Potencial" value={overview.potentialArs} hint="Trials vigentes" tone="text-sky-300" />
      <MoneyBand label="En riesgo" value={overview.atRiskArs} hint="PAST_DUE" tone="text-amber-300" />
      <MoneyBand label="Cancelando" value={overview.cancellingArs} hint="Fin de período pendiente" tone="text-red-300" />
    </div></section>

    <div className="grid gap-4 xl:grid-cols-[1.35fr_.9fr]"><SignupChart data={signupSeries} /><FunnelChart data={funnel} /></div>
    <LifecycleLists data={lifecycle} />
    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]"><ActivityFeed rows={activity} /><ErrorsPanel data={issues} /></div>

    <section><div className="mb-4"><h2 className="text-lg text-zinc-100">Mensajería este mes</h2><p className="text-sm text-zinc-500">Intentos registrados por canal</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ChannelCard icon={Mail} label="Emails enviados" value={messaging.emailsOk} /><ChannelCard icon={Mail} label="Emails fallidos" value={messaging.emailsFailed} alert={messaging.emailsFailed > 0} /><ChannelCard icon={MessageCircle} label="WhatsApp enviados" value={messaging.whatsappSent} /><ChannelCard icon={MessageCircle} label="WhatsApp fallback" value={messaging.whatsappFallback} alert={messaging.whatsappFallback > 0} />
    </div></section>

    <Suspense fallback={<Skeleton className="h-64 rounded-2xl bg-white/[.05]" />}><HealthSection /></Suspense>

    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-2 flex flex-wrap items-center gap-3"><div><h2 className="text-lg text-zinc-100">Negocios</h2><p className="text-sm text-zinc-500">Clientes, turnos, estado y aporte de MRR</p></div><Link href="/admin/negocios" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-orange-400 px-3 py-2 text-xs font-black text-zinc-950"><Building2 className="h-4 w-4" />Ver todos</Link></div><TenantsTable data={tenants.slice(0, 10)} /></section>
  </main>;
}

async function HealthSection() { return <HealthPanel data={await getHealthPanel()} />; }
function MoneyBand({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: string }) { return <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.055] to-transparent p-5"><p className="text-xs font-black uppercase tracking-[.14em] text-zinc-600">{label}</p><p className={`mt-3 font-mono text-2xl ${tone}`}>{formatoArs(value)}</p><p className="mt-1 text-xs text-zinc-600">{hint}</p></div>; }
function ChannelCard({ icon: Icon, label, value, alert = false }: { icon: typeof Mail; label: string; value: number; alert?: boolean }) { return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className={`rounded-xl p-2.5 ${alert ? "bg-red-400/10 text-red-300" : "bg-orange-400/10 text-orange-300"}`}><Icon className="h-5 w-5" /></span><span><small className="block text-zinc-600">{label}</small><b className="font-mono text-xl text-zinc-100">{value}</b></span></div>; }
