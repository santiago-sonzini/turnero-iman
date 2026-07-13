import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/ayuda", "/privacidad", "/*/turnos"], disallow: ["/app", "/onboarding", "/suscripcion", "/api"] },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
