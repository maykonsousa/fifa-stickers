import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://faltauma.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://faltauma.com/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://faltauma.com/privacy", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://faltauma.com/terms", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://faltauma.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at");

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `https://faltauma.com/p/${p.username}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...profilePages];
}
