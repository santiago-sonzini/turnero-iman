import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { allPosts } from "@/content/blog/posts";
import { activePublicBusinessSlugs } from "@/server/queries";

export const revalidate = 3600; // refrescá el sitemap cada hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/ayuda`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const blogEntries: MetadataRoute.Sitemap = allPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Páginas públicas de reservas de cada negocio. Si la DB no está disponible
  // (build sin conexión), el sitemap igual sale con las rutas estáticas.
  let businessEntries: MetadataRoute.Sitemap = [];
  try {
    const businesses = await activePublicBusinessSlugs();
    businessEntries = businesses.map((b) => ({
      url: `${base}/${b.slug}/turnos`,
      lastModified: b.updatedAt ?? now,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    businessEntries = [];
  }

  return [...staticEntries, ...blogEntries, ...businessEntries];
}
