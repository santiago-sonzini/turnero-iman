import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import "@/styles/month.css";
import "@/styles/auth.css";
import "@/styles/landing.css";

import { type Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';
import { env } from "@/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Imán Turnos",
  title: { default: "Imán Turnos | Tu agenda, sin huecos", template: "%s | Imán Turnos" },
  description: "Turnos online, clientes recurrentes y promos para comercios de servicios.",
  openGraph: { title: "Imán Turnos", description: "Tu agenda, sin huecos.", type: "website", locale: "es_AR" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body>
        <NextTopLoader color="#e8503a" showSpinner={false} />
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
