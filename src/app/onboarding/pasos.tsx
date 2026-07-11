"use client";
import { usePathname } from "next/navigation";

const ORDEN = ["/onboarding", "/onboarding/revelacion", "/onboarding/plan"];

export function Pasos() {
  const pathname = usePathname();
  const actual = ORDEN.findIndex((p) => pathname === p);
  return (
    <div className="onb-pasos" aria-label={`Paso ${actual + 1} de 3`}>
      {ORDEN.map((p, i) => (
        <span key={p} className={`onb-paso ${i <= actual ? "activo" : ""}`} />
      ))}
    </div>
  );
}
