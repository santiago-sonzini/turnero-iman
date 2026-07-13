import { ImageResponse } from "next/og";

export const alt = "Imán Turnos — Tu agenda, sin huecos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#FBF6EE", color: "#33231A", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>🧲 Imán Turnos</div>
      <div style={{ display: "flex", marginTop: 34, fontSize: 78, lineHeight: 1.05, fontWeight: 900, maxWidth: 980 }}>Tu agenda llena, sin perseguir a nadie.</div>
      <div style={{ display: "flex", marginTop: 34, fontSize: 30, color: "#6F5D50" }}>Reservas online, clientes que vuelven y cada hueco convertido en oportunidad.</div>
    </div>,
    size,
  );
}
