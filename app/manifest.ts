import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "faltaUma — álbum colecionável 2026",
    short_name: "faltaUma",
    description:
      "Cada figurinha colada é uma vitória. Acompanhe seu álbum, encontre trocas e cole a última que falta.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a3d2a",
    theme_color: "#0a3d2a",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
