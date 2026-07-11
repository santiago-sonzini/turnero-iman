// Paso 2: el "aha" — el resultado del motor sobre SUS datos, antes de
// hablar de precios.
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRevelacion } from "@/app/actions/onboarding";
import { formatARS } from "@/lib/format";

const COLORES: Record<string, string> = {
  activo: "#1e9e55",
  riesgo: "#d99e00",
  dormido: "#e2691b",
  perdido: "#cf3d3d",
};

export default async function Revelacion() {
  const r = await getRevelacion();
  if (r.totalClientes === 0) redirect("/onboarding");

  const enfriandose = r.enRiesgo + r.dormidos;
  const titulo =
    enfriandose > 0
      ? `Tenés ${enfriandose} ${enfriandose === 1 ? "cliente" : "clientes"} enfriándose ahora mismo`
      : `Tus ${r.totalClientes} clientes, ordenados por cómo vienen comprando`;

  return (
    <main className="space-y-6">
      <div className="text-center">
        <span className="onb-badge">Esto salió de TUS ventas</span>
        <h1 className="mt-3 text-3xl">{titulo}</h1>
        {enfriandose > 0 && r.plataEnJuego > 0 && (
          <p className="onb-sub mt-2">
            Entre todos te compraron {formatARS(r.plataEnJuego)}. Un mensaje a
            tiempo suele traerlos de vuelta.
          </p>
        )}
      </div>

      <div className="onb-sem">
        {(
          [
            ["activo", "Activos", r.activos],
            ["riesgo", "En riesgo", r.enRiesgo],
            ["dormido", "Dormidos", r.dormidos],
            ["perdido", "Perdidos", r.perdidos],
          ] as const
        ).map(([clave, label, n]) => (
          <div key={clave} className="onb-sem-item">
            <div className="num" style={{ color: COLORES[clave] }}>
              {n}
            </div>
            <div className="tag" style={{ color: COLORES[clave] }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {r.topClientes.length > 0 && (
        <div className="onb-card">
          <h3 className="text-lg">Tus mejores clientes</h3>
          <ul className="mt-2 divide-y divide-[rgba(51,35,26,.08)] text-sm">
            {r.topClientes.slice(0, 5).map((c, i) => (
              <li key={c.name} className="flex justify-between py-2">
                <span>
                  <b>{i + 1}.</b> {c.name}
                </span>
                <span className="font-bold">{formatARS(c.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.whatsapp && (
        <div className="onb-card">
          <h3 className="text-lg">
            Tu primer mensaje ya está listo
            <span className="onb-sub block text-sm font-normal">
              Para {r.whatsapp.cliente}
              {r.whatsapp.dias ? ` — hace ${r.whatsapp.dias} días que no compra` : ""}
            </span>
          </h3>
          <div className="onb-chat mt-3">
            <div className="onb-burbuja">{r.whatsapp.mensaje}</div>
          </div>
          {r.whatsapp.link && (
            <a
              className="onb-btn onb-btn-wa mt-3 w-full"
              href={r.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mandarlo por WhatsApp ahora
            </a>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href="/onboarding/plan" className="onb-btn onb-btn-primario w-full sm:w-auto">
          Quiero seguir viéndolos así →
        </Link>
        <p className="onb-sub mt-2 text-xs">
          14 días de prueba gratis. Tus datos ya quedaron guardados.
        </p>
      </div>
    </main>
  );
}
