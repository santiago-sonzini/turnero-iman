import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Fredoka, Nunito } from "next/font/google";

import getUserServer from "@/lib/user";
import { ImanLogo } from "@/components/iman/logo";
import "../onboarding/onboarding.css";

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
  title: "Tu suscripción — Imán",
};

export default async function SuscripcionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const res = await getUserServer();
  if (!res?.userDb || res.userDb.role !== "ADMIN") redirect("/auth");

  return (
    <div className={`onb ${fredoka.variable} ${nunito.variable}`}>
      <div className="onb-wrap">
        <header className="flex items-center justify-center gap-2 py-4">
          <ImanLogo className="h-9 w-9" />
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "var(--onb-display)" }}
          >
            Im<span style={{ color: "#e8503a" }}>á</span>n
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
