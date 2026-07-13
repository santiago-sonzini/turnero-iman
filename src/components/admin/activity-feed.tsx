import Link from "next/link";
import { Activity, BadgeCheck, CircleDollarSign, CreditCard, UserPlus, XCircle } from "lucide-react";

const eventMeta: Record<string, { label: string; icon: typeof Activity; tone: string }> = {
  negocio_creado: { label: "Nuevo negocio", icon: UserPlus, tone: "text-sky-300 bg-sky-400/10" },
  cuenta_creada: { label: "Cuenta creada", icon: UserPlus, tone: "text-sky-300 bg-sky-400/10" },
  suscripcion_iniciada: { label: "Checkout iniciado", icon: CreditCard, tone: "text-amber-300 bg-amber-400/10" },
  suscripcion_autorizada: { label: "Suscripción autorizada", icon: BadgeCheck, tone: "text-emerald-300 bg-emerald-400/10" },
  pago_aprobado: { label: "Pago aprobado", icon: CircleDollarSign, tone: "text-emerald-300 bg-emerald-400/10" },
  pago_rechazado: { label: "Pago rechazado", icon: XCircle, tone: "text-red-300 bg-red-400/10" },
};
const relative = (iso: string) => new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000), "hour");

export function ActivityFeed({ rows }: { rows: Array<{ id: string; event: string; tenantName: string; slug: string; createdAt: string }> }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-4"><h2 className="text-lg text-zinc-100">Actividad reciente</h2><p className="text-sm text-zinc-500">Últimos movimientos de la plataforma</p></div><div className="max-h-[440px] space-y-1 overflow-y-auto pr-1">
    {rows.map((row) => { const meta = eventMeta[row.event] ?? { label: row.event.replaceAll("_", " "), icon: Activity, tone: "text-zinc-300 bg-white/[.06]" }; const Icon = meta.icon; return <Link href={`/admin/negocios/${row.slug}`} key={row.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[.05]"><span className={`rounded-lg p-2 ${meta.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-zinc-200">{meta.label}</b><small className="block truncate text-zinc-600">{row.tenantName}</small></span><time className="text-xs text-zinc-600">{relative(row.createdAt)}</time></Link>; })}
    {!rows.length ? <p className="py-12 text-center text-sm text-zinc-600">Todavía no hay actividad</p> : null}
  </div></section>;
}
