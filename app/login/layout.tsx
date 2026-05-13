import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar — faltaUma",
  description: "Faça login para gerenciar sua coleção de figurinhas da Copa do Mundo 2026.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
