import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import "@/styles/month.css";
import "@/styles/auth.css";
import "@/styles/landing.css";
import "@/styles/blog.css";

import { type Metadata } from "next";
import Script from "next/script";
import NextTopLoader from 'nextjs-toploader';
import { Analytics } from "@vercel/analytics/next";
import { env } from "@/env";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: SITE.name,
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "business software",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
        <Analytics />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18305633425"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18305633425');

            function gtag_report_conversion(url) {
              var callback = function () {
                if (typeof url !== 'undefined') {
                  window.location.href = url;
                }
              };
              gtag('event', 'conversion', {
                'send_to': 'AW-18305633425/ctkjCNW75tMcEJGZ55hE',
                'event_callback': callback
              });
              return false;
            }
          `}
        </Script>
      </body>
    </html>
  );
}
