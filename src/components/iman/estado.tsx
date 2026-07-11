// Piezas visuales del semáforo de clientes: punto de color y chip de estado.
import { cn } from "@/lib/utils";
import type { EstadoCliente } from "@/server/iman/engine";

export const ESTADOS: Array<{
  id: EstadoCliente;
  label: string;
  plural: string;
}> = [
  { id: "activo", label: "Activo", plural: "Activos" },
  { id: "riesgo", label: "En riesgo", plural: "En riesgo" },
  { id: "dormido", label: "Dormido", plural: "Dormidos" },
  { id: "perdido", label: "Perdido", plural: "Perdidos" },
];

export const ESTADO_LABEL: Record<EstadoCliente, string> = {
  activo: "Activo",
  riesgo: "En riesgo",
  dormido: "Dormido",
  perdido: "Perdido",
};

const DOT: Record<EstadoCliente, string> = {
  activo: "bg-sem-verde",
  riesgo: "bg-sem-amarillo",
  dormido: "bg-sem-naranja",
  perdido: "bg-sem-rojo",
};

const CHIP: Record<EstadoCliente, string> = {
  activo: "bg-sem-verde-suave text-sem-verde",
  riesgo: "bg-sem-amarillo-suave text-sem-amarillo",
  dormido: "bg-sem-naranja-suave text-sem-naranja",
  perdido: "bg-sem-rojo-suave text-sem-rojo",
};

export function EstadoDot({ estado, className }: { estado: EstadoCliente; className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full", DOT[estado], className)}
      aria-label={ESTADO_LABEL[estado]}
    />
  );
}

export function EstadoChip({ estado, className }: { estado: EstadoCliente; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        CHIP[estado],
        className,
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
