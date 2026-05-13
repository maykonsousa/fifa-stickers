"use client";

import { Construction } from "lucide-react";
import Link from "next/link";

export function UnderConstruction({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <Construction className="w-16 h-16 text-yellow-400 mb-6" />
      {title && (
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      )}
      <p className="text-zinc-400 max-w-sm">
        Essa página ainda está em construção. Em breve estará disponível para você.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 text-sm text-green-400 hover:text-green-300 transition-colors"
      >
        ← Voltar ao início
      </Link>
    </div>
  );
}
