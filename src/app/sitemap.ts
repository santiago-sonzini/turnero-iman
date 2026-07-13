import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return ["", "/ayuda", "/privacidad"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
