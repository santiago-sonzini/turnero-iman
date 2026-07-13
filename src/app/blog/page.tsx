import type { Metadata } from "next";
import Link from "next/link";
import { allPosts } from "@/content/blog/posts";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, abs, breadcrumbLd } from "@/lib/seo";

const TITLE = "Blog — Ideas para llenar tu agenda";
const DESCRIPTION =
  "Consejos prácticos para barberías, peluquerías y negocios de servicios: cómo llenar huecos, reducir ausencias, fidelizar clientes y sacarle jugo a los turnos online.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION, type: "website", url: "/blog", locale: SITE.locale },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default function BlogIndex() {
  const posts = allPosts();
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${abs("/blog")}#blog`,
    name: `${SITE.name} — Blog`,
    description: DESCRIPTION,
    url: abs("/blog"),
    inLanguage: SITE.lang,
    publisher: { "@id": `${SITE.url}/#organization` },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/blog/${p.slug}`), datePublished: p.date })),
  };

  return (
    <main className="docs-page blog-index">
      <JsonLd data={[blogLd, breadcrumbLd([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog" }])]} />
      <Link className="bk-volver" href="/">← Volver</Link>
      <p className="eyebrow">BLOG</p>
      <h1>Ideas para llenar tu agenda</h1>
      <p className="docs-lead">{DESCRIPTION}</p>

      <ul className="blog-list">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link className="blog-card" href={`/blog/${p.slug}`}>
              <span className="blog-card-emoji" aria-hidden>{p.emoji}</span>
              <div className="blog-card-body">
                <div className="blog-card-tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <h2>{p.title}</h2>
                <p>{p.excerpt}</p>
                <small>{formatDate(p.date)} · {p.readingMinutes} min de lectura</small>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
