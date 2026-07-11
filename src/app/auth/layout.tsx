import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ingresá o creá tu cuenta — Imán Turnos",
  description: "Probá Imán Turnos durante 14 días. Sin tarjeta y listo en menos de 3 minutos.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
