import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import "@/styles/month.css";
import "@/styles/auth.css";
import "@/styles/landing.css";

import { type Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';

// Toda la app es un panel sobre datos vivos: nada se prerenderiza en build.
// (Clave en modo demo: PGlite no soporta instancias paralelas en build.)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "Imán Turnos",
  title: "Imán Turnos | Tu agenda, sin huecos",
  description: "Turnos online, clientes recurrentes y promos para comercios de servicios.",
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
