import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Imán Turnos",
    short_name: "Imán",
    description: "Agenda y reservas online para comercios de servicios.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6EE",
    theme_color: "#E94F37",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
