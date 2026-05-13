import type { Metadata } from "next";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ContactWidget } from "@/components/contact-widget";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "faltaUma — Gerencie seu Álbum da Copa do Mundo de 2026",
  description:
    "Gerencie sua coleção de figurinhas da Copa 2026. Controle o que falta, encontre trocas com amigos e complete seu álbum.",
  metadataBase: new URL("https://faltauma.com"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "faltaUma",
  },
  openGraph: {
    title: "faltaUma — Gerencie seu Álbum da Copa do Mundo de 2026",
    description:
      "Gerencie sua coleção de figurinhas da Copa 2026. Controle o que falta, encontre trocas com amigos e complete seu álbum.",
    url: "https://faltauma.com",
    siteName: "faltaUma",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "faltaUma",
    description: "Gerencie sua coleção de figurinhas da Copa 2026. Controle o que falta, encontre trocas com amigos e complete seu álbum.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivoBlack.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0a3d2a" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="font-body min-h-full flex flex-col">
        {children}
        <ContactWidget />
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
