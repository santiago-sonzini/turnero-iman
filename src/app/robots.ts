import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url;
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/ayuda", "/privacidad", "/terminos", "/*/turnos"],
        disallow: ["/app", "/onboarding", "/suscripcion", "/admin", "/api", "/auth"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
