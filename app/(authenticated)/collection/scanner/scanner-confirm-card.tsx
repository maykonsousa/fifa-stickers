"use client";

import { Check, X, Search, Loader2 } from "lucide-react";
import type { ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";

interface Props {
  sticker: ScannedSticker;
  busy: boolean;
  onLancar: () => void;
  onDescartar: () => void;
  onBuscarManual: () => void;
}

export function ScannerConfirmCard({
  sticker,
  busy,
  onLancar,
  onDescartar,
  onBuscarManual,
}: Props) {
  const owns = sticker.owned_count > 0;

  return (
    <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4 shadow-2xl">
      <div className="flex gap-3">
        <div className="relative h-28 w-[87px] shrink-0 overflow-hidden rounded-lg bg-black">
          {sticker.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sticker.image_url} alt={sticker.code} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-500">
              sem foto
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-lg font-bold text-white">{sticker.code}</p>
          {sticker.title && <p className="text-sm text-gray-300">{sticker.title}</p>}
          <p className={`mt-1 text-sm ${owns ? "text-yellow-400" : "text-gray-400"}`}>
            {owns ? `Você já tem: ${sticker.owned_count}` : "Você ainda não tem"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onLancar}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {owns ? "Lançar repetida" : "Lançar"}
        </button>
        <button
          onClick={onDescartar}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" /> Descartar
        </button>
      </div>
      <button
        onClick={onBuscarManual}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 disabled:opacity-50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" /> Não é essa? Buscar manualmente
      </button>
    </div>
  );
}
