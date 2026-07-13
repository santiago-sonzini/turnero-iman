import { ImageResponse } from "next/og";
import { getPost, postSlugs } from "@/content/blog/posts";

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export const alt = "Imán Turnos — Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BlogOgImage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const post = getPost(slug);
  const title = post?.title ?? "Imán Turnos";
  const emoji = post?.emoji ?? "🧲";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#FBF6EE", color: "#33231A", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>🧲 Imán Turnos · Blog</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1 }}>{emoji}</div>
          <div style={{ display: "flex", fontSize: 62, lineHeight: 1.08, fontWeight: 900, maxWidth: 900 }}>{title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#6F5D50" }}>Ideas para llenar tu agenda · turnero.iman.ar</div>
      </div>
    ),
    size,
  );
}
