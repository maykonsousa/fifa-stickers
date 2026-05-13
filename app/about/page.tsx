import { UnderConstruction } from "@/components/under-construction";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quem somos — faltaUma",
  description: "Conheça a equipe por trás do faltaUma, a plataforma para colecionadores de figurinhas da Copa 2026.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-green-950">
      <UnderConstruction title="Quem somos" />
    </div>
  );
}
