import { Activity, CircleCheck, CircleX } from "lucide-react";

type Service = "db" | "mercadopago" | "smtp" | "wa_server";
type Live = { service: Service; ok: boolean; latencyMs: number; detail: string | null };
const labels: Record<Service, string> = { db: "Base de datos", mercadopago: "Mercado Pago", smtp: "Email SMTP", wa_server: "WhatsApp" };

export function HealthPanel({ data }: { data: { live: Live[]; uptime24h: Record<Service, number | null>; uptime7d: Record<Service, number | null>; uptime30d: Record<Service, number | null> } }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-5 flex items-center gap-2"><Activity className="h-5 w-5 text-orange-300" /><div><h2 className="text-lg text-zinc-100">Estado del sistema</h2><p className="text-sm text-zinc-500">Checks en vivo e histórico persistido</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {data.live.map((row) => <div key={row.service} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center gap-2">{row.ok ? <CircleCheck className="h-4 w-4 text-emerald-400" /> : <CircleX className="h-4 w-4 text-red-400" />}<b className="text-sm text-zinc-200">{labels[row.service]}</b><span className="ml-auto font-mono text-xs text-zinc-600">{row.latencyMs}ms</span></div><p className="mt-2 truncate text-xs text-zinc-600">{row.detail ?? (row.ok ? "Operativo" : "Sin detalle")}</p><div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[.06] pt-3 text-center"><Uptime label="24h" value={data.uptime24h[row.service]} /><Uptime label="7d" value={data.uptime7d[row.service]} /><Uptime label="30d" value={data.uptime30d[row.service]} /></div></div>)}
  </div></section>;
}
function Uptime({ label, value }: { label: string; value: number | null }) { return <span><b className="block font-mono text-xs text-zinc-300">{value == null ? "—" : `${value}%`}</b><small className="text-[10px] text-zinc-600">{label}</small></span>; }
