import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function KpiCard({ label, value, detail, trend, icon: Icon }: {
  label: string; value: string; detail?: string; trend?: number | null; icon: LucideIcon;
}) {
  const TrendIcon = trend == null || trend === 0 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;
  return <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4 shadow-2xl shadow-black/10">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-zinc-500">{label}</p>
      <span className="rounded-xl bg-white/[.06] p-2 text-orange-300"><Icon className="h-4 w-4" /></span>
    </div>
    <p className="mt-4 font-mono text-2xl font-semibold tracking-tight text-zinc-50">{value}</p>
    <div className="mt-2 flex min-h-5 items-center gap-1.5 text-xs text-zinc-500">
      {trend !== undefined ? <><TrendIcon className="h-3.5 w-3.5" /><span>{trend == null ? "Sin base anterior" : `${trend > 0 ? "+" : ""}${trend}%`}</span></> : null}
      {detail ? <span>{detail}</span> : null}
    </div>
  </div>;
}
