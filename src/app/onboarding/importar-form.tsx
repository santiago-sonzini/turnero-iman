"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { parseCSV } from "@/lib/import-parse";
import {
  importarVentasOnboarding,
  usarDatosEjemplo,
} from "@/app/actions/onboarding";

export function ImportarForm() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState<"importar" | "ejemplo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filas = useMemo(() => parseCSV(texto), [texto]);
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim()).length;
  const descartadas = Math.max(0, lineas - filas.length);

  const leerArchivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const importar = async () => {
    setCargando("importar");
    setError(null);
    const res = await importarVentasOnboarding(filas);
    if (res.status === 200) {
      router.push("/onboarding/revelacion");
    } else {
      setError(res.message);
      setCargando(null);
    }
  };

  const ejemplo = async () => {
    setCargando("ejemplo");
    setError(null);
    const res = await usarDatosEjemplo();
    if (res.status === 200) {
      router.push("/onboarding/revelacion");
    } else {
      setError(res.message);
      setCargando(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv,.txt"
        onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
      />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={9}
        placeholder={
          "Kiosco La Esquina, 15/03/2026, $ 45.000\nAlmacén Don Cacho, 20/03/2026, 112.500, 11 5555-1234\nSúper El Trébol, 02/04/2026, 154000"
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="onb-sub">
          {filas.length > 0
            ? `${filas.length} ventas detectadas${descartadas ? ` · ${descartadas} filas ignoradas (encabezados o datos incompletos)` : ""}`
            : "Todavía no detectamos filas válidas"}
        </span>
      </div>

      {filas.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border-2 border-[rgba(51,35,26,.1)] text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase opacity-60">
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filas.slice(0, 30).map((fl, i) => (
                <tr key={i} className="border-t border-[rgba(51,35,26,.08)]">
                  <td className="px-3 py-1.5">{fl.cliente}</td>
                  <td className="px-3 py-1.5">{fl.fecha}</td>
                  <td className="px-3 py-1.5 text-right">
                    $ {fl.monto.toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-sm font-bold text-[var(--rojo)]">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          className="onb-btn onb-btn-secundario"
          onClick={ejemplo}
          disabled={!!cargando}
        >
          {cargando === "ejemplo" ? "Cargando…" : "Probar con datos de ejemplo"}
        </button>
        <button
          className="onb-btn onb-btn-primario"
          onClick={importar}
          disabled={!filas.length || !!cargando}
        >
          {cargando === "importar"
            ? "Importando…"
            : `Ver el resultado con mis ${filas.length || ""} ventas`}
        </button>
      </div>
    </div>
  );
}
