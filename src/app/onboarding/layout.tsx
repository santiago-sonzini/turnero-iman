// Onboarding-first: mostrar valor con los datos del usuario ANTES de la
// pantalla de precios. Shell con la estética de la landing.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Fredoka, Nunito } from "next/font/google";

import getUserServer from "@/lib/user";
import { getCurrentTenant } from "@/server/tenant-context";
import { ImanLogo } from "@/components/iman/logo";
import { Pasos } from "./pasos";
import "./onboarding.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--onb-display",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--onb-cuerpo",
});

export const metadata: Metadata = {
  title: "Empezá con Imán",
  description: "Subí tus ventas y mirá qué clientes se están enfriando.",
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const res = await getUserServer();
  if (!res?.userDb || res.userDb.role !== "ADMIN") redirect("/auth");

  const tenant = await getCurrentTenant();
  // Ya eligió plan → el onboarding terminó.
  if (tenant.planStatus !== "ONBOARDING") redirect("/dashboard");

  return (
    <div className={`onb ${fredoka.variable} ${nunito.variable}`}>
      <div className="onb-wrap">
        <header className="flex items-center justify-center gap-2 pt-4">
          <ImanLogo className="h-9 w-9" />
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "var(--onb-display)" }}
          >
            Im<span style={{ color: "#e8503a" }}>á</span>n
          </span>
        </header>
        <Pasos />
        {children}
      </div>
    </div>
  );
}
