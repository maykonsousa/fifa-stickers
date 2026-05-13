import type { Metadata } from "next";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "faltaUma — álbum colecionável 2026",
  description:
    "Cada figurinha colada é uma vitória. Acompanhe seu álbum, encontre trocas e cole a última que falta.",
  metadataBase: new URL("https://faltauma.com"),
  openGraph: {
    title: "faltaUma — álbum colecionável 2026",
    description:
      "Cada figurinha colada é uma vitória. Cole a última que falta.",
    url: "https://faltauma.com",
    siteName: "faltaUma",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "faltaUma",
    description: "Cada figurinha colada é uma vitória.",
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
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="font-body min-h-full flex flex-col">{children}</body>
    </html>
  );
}
