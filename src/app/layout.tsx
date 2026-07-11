import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';

// Toda la app es un panel sobre datos vivos: nada se prerenderiza en build.
// (Clave en modo demo: PGlite no soporta instancias paralelas en build.)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "Imán",
  title: "Imán | Vendé más con los clientes que ya tenés",
  description:
    "Facturación con inteligencia de clientes: semáforo por ciclo de compra, recupero por WhatsApp y medición de resultados.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${GeistSans.variable}`} suppressHydrationWarning>
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
