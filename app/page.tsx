import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "faltaUma",
  url: "https://faltauma.com",
  description: "Plataforma para gerenciar sua coleção de figurinhas da Copa do Mundo 2026. Acompanhe seu álbum, encontre trocas e cole a última que falta.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://faltauma.com/p/{search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </>
  );
}
