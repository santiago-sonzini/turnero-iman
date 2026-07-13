import type { CSSProperties } from "react";
import { MagnetLogo } from "@/components/turnos/magnet-logo";

// Cada chip es un "turno" que el imán atrae hacia sus polos: entra desde una
// dirección distinta (--sx/--sy) con su propia demora para que el flujo sea continuo.
const CHIPS: { s: string; sx: number; sy: number; delay: number; rot: number }[] = [
  { s: "✂", sx: -84, sy: 26, delay: 0, rot: -18 },
  { s: "✦", sx: 88, sy: -6, delay: 0.6, rot: 14 },
  { s: "●", sx: -64, sy: -48, delay: 1.2, rot: -8 },
  { s: "✂", sx: 78, sy: 52, delay: 1.8, rot: 20 },
  { s: "✦", sx: 6, sy: 84, delay: 2.4, rot: -12 },
];

export default function Loading() {
  return (
    <main className="loading-screen" role="status" aria-busy="true">
      <div className="loading-stage" aria-hidden="true">
        <div className="loading-rings">
          <span />
          <span />
          <span />
        </div>
        <div className="loading-orbit">
          {CHIPS.map((c, i) => (
            <i
              key={i}
              style={{ "--sx": `${c.sx}px`, "--sy": `${c.sy}px`, "--r": `${c.rot}deg`, animationDelay: `${c.delay}s` } as CSSProperties}
            >
              {c.s}
            </i>
          ))}
        </div>
        <MagnetLogo />
      </div>

      <div className="loading-copy">
        <p className="eyebrow">CARGANDO</p>
        <h1>
          Preparando tu agenda
          <span className="loading-dots" aria-hidden="true">
            <i>.</i>
            <i>.</i>
            <i>.</i>
          </span>
        </h1>
        <p className="loading-sub">Ordenando turnos, clientes y recordatorios…</p>
      </div>
    </main>
  );
}
