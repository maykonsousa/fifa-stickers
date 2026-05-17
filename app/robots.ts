import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/collection", "/colecionadores", "/trades", "/profile", "/admin"],
      },
    ],
    sitemap: "https://faltauma.com/sitemap.xml",
  };
}
