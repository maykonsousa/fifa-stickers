"use client";

import type { ReactNode } from "react";

// Ancora o conteúdo na base da viewport, sempre visível (independe de scroll),
// com um scrim escurecendo o resto. O scrim NÃO fecha ao toque — a decisão da
// confirmação é explícita (botões do conteúdo). Mobile-first, centralizado e
// limitado à largura do container em telas largas.
export function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </>
  );
}
