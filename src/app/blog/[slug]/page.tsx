import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, postSlugs, allPosts } from "@/content/blog/posts";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, articleLd, faqLd, breadcrumbLd } from "@/lib/seo";

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) return { title: "Nota no encontrada", robots: { index: false, follow: false } };
  const title = post.seoTitle ?? post.title;
  const url = `/blog/${post.slug}`;
  return {
    title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title,
      description: post.description,
      type: "article",
      url,
      locale: SITE.locale,
      siteName: SITE.name,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title, description: post.description },
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = allPosts().filter((p) => p.slug !== post.slug).slice(0, 2);

  const ld = [
    articleLd({
      slug: post.slug,
      title: post.seoTitle ?? post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated,
      author: post.author,
      keywords: post.keywords,
    }),
    breadcrumbLd([
      { name: "Inicio", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    ...(post.faq && post.faq.length ? [faqLd(post.faq)] : []),
  ];

  return (
    <main className="docs-page blog-article">
      <JsonLd data={ld} />
      <Link className="bk-volver" href="/blog">← Todas las notas</Link>

      <article>
        <header className="blog-article-head">
          <div className="blog-card-tags">{post.tags.map((t) => <span key={t}>{t}</span>)}</div>
          <h1>{post.title}</h1>
          <p className="docs-lead">{post.excerpt}</p>
          <small className="blog-meta">
            {post.author} · {formatDate(post.date)} · {post.readingMinutes} min de lectura
          </small>
        </header>

        <div className="blog-prose">
          <post.Body />
        </div>

        {post.faq && post.faq.length > 0 && (
          <section className="blog-faq">
            <h2>Preguntas frecuentes</h2>
            {post.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        )}
      </article>

      <aside className="blog-cta">
        <b>🧲 Tu agenda, sin huecos.</b>
        <p>Reservas online con tu marca, recordatorios por WhatsApp y clientes que vuelven.</p>
        <Link className="landing-button primary" href="/auth?modo=signup">Probalo gratis →</Link>
      </aside>

      {related.length > 0 && (
        <section className="blog-related">
          <h2>Seguí leyendo</h2>
          <ul className="blog-list">
            {related.map((p) => (
              <li key={p.slug}>
                <Link className="blog-card" href={`/blog/${p.slug}`}>
                  <span className="blog-card-emoji" aria-hidden>{p.emoji}</span>
                  <div className="blog-card-body">
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
