import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF (≈20% menor que WebP) com fallback WebP — reduz bytes servidos.
    formats: ["image/avif", "image/webp"],
    // Imagens são imutáveis por upload (URL leva cache-bust ?v=). Cache longo
    // do otimizador evita re-buscar o original no Supabase Storage (egress).
    minimumCacheTTL: 2678400, // 31 dias
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // `search` omitido de propósito: permite o cache-bust ?v= nas URLs.
        protocol: "https",
        hostname: "ryahywolbykyqrpiibmp.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/friends", destination: "/colecionadores", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
