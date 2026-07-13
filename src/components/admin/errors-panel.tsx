import { AlertTriangle, Ban, MessageSquareWarning, Webhook } from "lucide-react";

type IssueData = { whatsappFallback: number; unhealthyWhatsapp: number; stuckWebhooks: number; rejectedPayments: number; errors: Array<{ id: string; scope: string; message: string; createdAt: string }> };
export function ErrorsPanel({ data }: { data: IssueData }) {
  const counters = [
    ["WA fallback", data.whatsappFallback, MessageSquareWarning], ["WA degradado", data.unhealthyWhatsapp, Ban],
    ["Webhooks trabados", data.stuckWebhooks, Webhook], ["Pagos rechazados", data.rejectedPayments, AlertTriangle],
  ] as const;
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-4"><h2 className="text-lg text-zinc-100">Errores y señales</h2><p className="text-sm text-zinc-500">Últimos 30 días y fallas recientes</p></div><div className="mb-4 grid grid-cols-2 gap-2">{counters.map(([label, count, Icon]) => <div key={label} className="flex items-center gap-2 rounded-xl bg-black/20 p-3"><Icon className={`h-4 w-4 ${count ? "text-red-300" : "text-zinc-600"}`} /><span className="text-xs text-zinc-500">{label}</span><b className="ml-auto font-mono text-zinc-200">{count}</b></div>)}</div><div className="max-h-[300px] space-y-1 overflow-y-auto">{data.errors.map((row) => <div key={row.id} className="rounded-xl px-2 py-2.5 hover:bg-white/[.04]"><div className="flex items-center gap-2"><span className="rounded-md bg-red-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">{row.scope}</span><time className="ml-auto text-[10px] text-zinc-600">{new Date(row.createdAt).toLocaleString("es-AR")}</time></div><p className="mt-1.5 line-clamp-2 text-xs text-zinc-400">{row.message}</p></div>)}{!data.errors.length ? <p className="py-10 text-center text-sm text-zinc-600">Sin errores registrados</p> : null}</div></section>;
}
