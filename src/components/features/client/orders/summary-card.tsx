// Tarjeta de resumen de cuenta (saldo, facturado, pagado, pedidos).
// Compartida entre la página de cliente del dashboard y la pública.
import React from "react";

export function SummaryCard({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30"
          : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={`mt-1.5 text-xl font-bold tabular-nums ${
          highlight ? "text-amber-700 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
