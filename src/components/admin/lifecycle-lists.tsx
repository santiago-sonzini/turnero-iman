import Link from "next/link";
import { CalendarClock, CircleOff, LogOut } from "lucide-react";

type Row = { id: string; name: string; slug: string; trialEndsAt: string | null; cancellationEffectiveAt: string | null };
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "America/Argentina/Buenos_Aires" }) : "—";

function List({ title, empty, rows, dateKey, icon: Icon }: { title: string; empty: string; rows: Row[]; dateKey: "trialEndsAt" | "cancellationEffectiveAt"; icon: typeof CalendarClock }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-5">
    <div className="mb-4 flex items-center gap-2 text-zinc-200"><Icon className="h-4 w-4 text-orange-300" /><h3 className="text-sm">{title}</h3><span className="ml-auto rounded-full bg-white/[.06] px-2 py-0.5 font-mono text-xs text-zinc-400">{rows.length}</span></div>
    <div className="space-y-1">{rows.length ? rows.slice(0, 7).map((row) => <Link href={`/admin/negocios/${row.slug}`} key={row.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[.05]"><span className="min-w-0 flex-1"><b className="block truncate text-sm text-zinc-200">{row.name}</b><small className="text-zinc-600">/{row.slug}</small></span><time className="font-mono text-xs text-zinc-400">{fmt(row[dateKey])}</time></Link>) : <p className="py-6 text-center text-sm text-zinc-600">{empty}</p>}</div>
  </div>;
}

export function LifecycleLists({ data }: { data: { trialsEnding: Row[]; trialQuits: Row[]; subscriptionsEnding: Row[] } }) {
  return <section><div className="mb-4"><h2 className="text-lg text-zinc-100">Ciclo de vida</h2><p className="text-sm text-zinc-500">Qué necesita atención en los próximos días</p></div><div className="grid gap-4 lg:grid-cols-3">
    <List title="Trials por vencer" empty="Ningún trial vence esta semana" rows={data.trialsEnding} dateKey="trialEndsAt" icon={CalendarClock} />
    <List title="Trials abandonados" empty="No hay trials vencidos" rows={data.trialQuits} dateKey="trialEndsAt" icon={CircleOff} />
    <List title="Suscripciones por terminar" empty="No hay bajas programadas" rows={data.subscriptionsEnding} dateKey="cancellationEffectiveAt" icon={LogOut} />
  </div></section>;
}
