"use client"
import { ProductWithCategory } from "@/app/actions/products";
import { updateProductPartial } from "@/app/actions/products";
import { useState, useMemo, useRef } from "react";

const fmt = (n: number | null) =>
  n != null ? "$" + Math.round(n).toLocaleString("es-AR") : "—";
const pct = (a: number, b: number) =>
  b ? ((a - b) / b * 100).toFixed(1) : null;

type SeedProduct = {
  name: string;
  slug: string;
  price: number;
  cost: number;
  catalog?: string;
  categorySlug?: string;
  isActive?: boolean;
};

type Row = {
  id: string;
  slug: string;
  name: string;
  catalog: string;
  oldPrice: number | null;
  newPrice: number;
  newCost: number;
  status: "up" | "down" | "same" | "new";
  checked: boolean;
};

type UpdateStatus = "idle" | "loading" | "success" | "error";

const BADGE: Record<Row["status"], { label: string; cls: string }> = {
  up:   { label: "↑ Subió",    cls: "bg-green-100 text-green-800" },
  down: { label: "↓ Bajó",     cls: "bg-red-100 text-red-800" },
  same: { label: "Sin cambio", cls: "bg-gray-100 text-gray-500" },
  new:  { label: "Nuevo",      cls: "bg-blue-100 text-blue-700" },
};

const FILTERS = [
  { key: "all",     label: "Todos" },
  { key: "changed", label: "Con cambios" },
  { key: "up",      label: "Subieron" },
  { key: "down",    label: "Bajaron" },
  { key: "new",     label: "Solo en JSON" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

function buildRows(db: ProductWithCategory[], seed: SeedProduct[]): Row[] {
  const dbMap = Object.fromEntries(db.map((p) => [p.slug, p]));
  const rows: Row[] = seed.map((s) => {
    const d = dbMap[s.slug];
    const status: Row["status"] = !d
      ? "new"
      : s.price === d.price ? "same"
      : s.price > d.price  ? "up"
      : "down";
    return {
      id: d?.id ?? "",
      slug: s.slug,
      name: s.name || d?.name || s.slug,
      catalog: s.catalog || d?.catalog || "",
      oldPrice: d?.price ?? null,
      newPrice: s.price,
      newCost: s.cost,
      status,
      checked: status !== "same",
    };
  });
  rows.sort(
    (a, b) =>
      ({ new: 0, up: 1, down: 2, same: 3 }[a.status] -
       { new: 0, up: 1, down: 2, same: 3 }[b.status])
  );
  return rows;
}

function PastePanel({
  label,
  onParsed,
  count,
}: {
  label: string;
  onParsed: (data: unknown[]) => void;
  count: number;
}) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const parse = (raw: string) => {
    setError("");
    try {
      const parsed = JSON.parse(raw.trim());
      const arr = Array.isArray(parsed)
        ? parsed
        : parsed.products
        ? parsed.products
        : null;
      if (!arr) throw new Error("Debe ser un array o { products: [...] }");
      onParsed(arr);
      if (textRef.current) textRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON inválido");
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const raw = e.clipboardData.getData("text");
    if (raw.trim().startsWith("[") || raw.trim().startsWith("{")) {
      e.preventDefault();
      parse(raw);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => parse(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
        dragging        ? "border-blue-400 bg-blue-50"
        : count > 0    ? "border-green-300 bg-green-50"
        : "border-gray-200 bg-gray-50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</span>
        {count > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            ✓ {count} productos
          </span>
        )}
      </div>
      {count === 0 ? (
        <>
          <textarea
            ref={textRef}
            rows={3}
            onPaste={onPaste}
            placeholder={`Pegá el JSON aquí o soltá un archivo .json\n(se procesa automáticamente al pegar)`}
            className="w-full text-xs font-mono bg-white border border-gray-200 rounded-lg p-2 resize-none text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400"
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v.startsWith("[") || v.startsWith("{")) parse(v);
            }}
          />
          {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
        </>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Arrastrá un archivo o</span>
          <button onClick={() => onParsed([])} className="text-xs text-red-500 hover:text-red-700 underline">
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

function DBStatusPanel({ count }: { count: number }) {
  return (
    <div className="border-2 border-green-300 bg-green-50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Base de datos (DB)</span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
          ✓ {count} productos
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-2">Cargado desde el servidor</p>
    </div>
  );
}

export default function PriceComparator({ products }: { products: ProductWithCategory[] }) {
  const [seedData, setSeedData]       = useState<SeedProduct[]>([]);
  const [rows, setRows]               = useState<Row[]>([]);
  const [filter, setFilter]           = useState<FilterKey>("all");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateLog, setUpdateLog]     = useState<{ slug: string; ok: boolean; msg?: string }[]>([]);
  const [showJSON, setShowJSON]       = useState(false);

  const ready = seedData.length > 0;

  const handleSeed = (data: unknown[]) => {
    const parsed = data as SeedProduct[];
    setSeedData(parsed);
    setRows(parsed.length > 0 ? buildRows(products, parsed) : []);
    setUpdateStatus("idle");
    setUpdateLog([]);
  };

  const toggle = (slug: string) =>
    setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, checked: !r.checked } : r));

  const toggleAll = (val: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, checked: val })));

  const filtered = useMemo(
    () => rows.filter((r) =>
      filter === "all"       ? true
      : filter === "changed" ? r.status !== "same"
      : r.status === filter
    ),
    [rows, filter]
  );

  const selected  = rows.filter((r) => r.checked);
  const payload   = selected.map((r) => ({ slug: r.slug, price: r.newPrice, cost: parseFloat(r.newCost.toFixed(2)) }));

  const summary = {
    total:   rows.length,
    changed: rows.filter((r) => r.status !== "same").length,
    up:      rows.filter((r) => r.status === "up").length,
    down:    rows.filter((r) => r.status === "down").length,
    nuevo:   rows.filter((r) => r.status === "new").length,
  };

  const handleConfirm = async () => {
    const toUpdate = rows.filter((r) => r.checked && r.id);
    if (!toUpdate.length) return;

    setUpdateStatus("loading");
    setUpdateLog([]);

    const results = await Promise.allSettled(
      toUpdate.map((r) =>
        updateProductPartial({
          id:    r.id,
          price: String(r.newPrice),
          cost:  String(r.newCost),
        })
      )
    );

    const log = toUpdate.map((r, i) => {
      const result = results[i];
      if (result?.status === "fulfilled" && result.value.status === 200) {
        return { slug: r.slug, ok: true };
      }
      const msg =
        result?.status === "rejected"
          ? String(result.reason)
          : result?.value.message;
      return { slug: r.slug, ok: false, msg };
    });

    setUpdateLog(log);
    setUpdateStatus(log.every((l) => l.ok) ? "success" : "error");

    // Mark updated rows as "same" so they reflect the new state
    setRows((prev) =>
      prev.map((r) => {
        const wasUpdated = log.find((l) => l.slug === r.slug && l.ok);
        return wasUpdated ? { ...r, status: "same", oldPrice: r.newPrice, checked: false } : r;
      })
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto text-sm">
      <h1 className="text-lg font-medium mb-1 text-gray-900">Comparador de precios</h1>
      <p className="text-xs text-gray-400 mb-5">Pegá el JSON del seed para comparar contra la DB</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <DBStatusPanel count={products.length} />
        <PastePanel label="Seed / Notion JSON" onParsed={handleSeed} count={seedData.length} />
      </div>

      {!ready && (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <div className="text-3xl mb-2">⇅</div>
          <p className="text-sm">Pegá el JSON del seed para ver la comparación</p>
        </div>
      )}

      {ready && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { label: "Total",        value: summary.total,   color: "" },
              { label: "Con cambios",  value: summary.changed, color: "" },
              { label: "Subieron",     value: summary.up,      color: "text-green-700" },
              { label: "Bajaron",      value: summary.down,    color: "text-red-700" },
              { label: "Solo en JSON", value: summary.nuevo,   color: "text-blue-700" },
            ].map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                <div className={`text-2xl font-medium ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Toolbar + confirm button */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  filter === f.key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => toggleAll(true)}  className="px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Sel. todos</button>
              <button onClick={() => toggleAll(false)} className="px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Des. todos</button>

              <button
                disabled={selected.length === 0 || updateStatus === "loading"}
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-default hover:bg-gray-700 transition-colors"
              >
                {updateStatus === "loading" ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Actualizando...
                  </>
                ) : "Confirmar actualización"}
                {updateStatus !== "loading" && (
                  <span className="bg-white/20 rounded px-1.5 py-0.5 text-xs">{selected.length}</span>
                )}
              </button>

              <button
                onClick={() => setShowJSON((v) => !v)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {showJSON ? "Ocultar JSON" : "Ver JSON"}
              </button>
            </div>
          </div>

          {/* Status banner */}
          {updateStatus === "success" && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-green-800 text-xs">
              ✓ {updateLog.filter((l) => l.ok).length} producto{updateLog.filter((l) => l.ok).length > 1 ? "s" : ""} actualizado{updateLog.filter((l) => l.ok).length > 1 ? "s" : ""} correctamente.
            </div>
          )}
          {updateStatus === "error" && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-red-800 text-xs space-y-1">
              <p className="font-medium">Algunos productos fallaron:</p>
              {updateLog.filter((l) => !l.ok).map((l) => (
                <p key={l.slug}>• <span className="font-mono">{l.slug}</span>: {l.msg}</p>
              ))}
            </div>
          )}

          {/* JSON preview */}
          {showJSON && (
            <pre className="mb-3 bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}

          {/* Table */}
          <div className="border border-gray-200 rounded-xl overflow-auto max-h-[60vh]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-9 p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.length === rows.length && rows.length > 0}
                      ref={(el) => {
                        if (el) el.indeterminate = selected.length > 0 && selected.length < rows.length;
                      }}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </th>
                  {["Slug","Nombre","Catálogo","Precio actual","Precio nuevo","Diferencia","Costo nuevo","Estado"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
                ) : (
                  filtered.map((r) => {
                    const diff    = r.oldPrice != null ? r.newPrice - r.oldPrice : null;
                    const absDiff = diff != null ? Math.abs(diff) : null;
                    const pctStr  = diff != null && r.oldPrice ? ` (${pct(r.newPrice, r.oldPrice)}%)` : "";
                    const diffColor =
                      diff == null ? "text-gray-400"
                      : diff > 0   ? "text-green-700 font-medium"
                      : diff < 0   ? "text-red-700 font-medium"
                      : "text-gray-400";

                    return (
                      <tr key={r.slug} className="border-b border-gray-100 last:border-none hover:bg-gray-50 transition-colors">
                        <td className="w-9 p-2 text-center">
                          <input type="checkbox" checked={r.checked} onChange={() => toggle(r.slug)} className="cursor-pointer" />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{r.slug}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[160px] truncate text-gray-800" title={r.name}>{r.name}</td>
                        <td className="px-3 py-2.5 text-gray-500">{r.catalog}</td>
                        <td className="px-3 py-2.5 text-gray-400 line-through">{r.oldPrice != null ? fmt(r.oldPrice) : "—"}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{fmt(r.newPrice)}</td>
                        <td className={`px-3 py-2.5 ${diffColor}`}>
                          {absDiff != null
                            ? (diff! > 0 ? "+" : diff! < 0 ? "-" : "") + "$" + Math.round(absDiff).toLocaleString("es-AR") + pctStr
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{fmt(r.newCost)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${BADGE[r.status].cls}`}>
                            {BADGE[r.status].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}