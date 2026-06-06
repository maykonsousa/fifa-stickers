"use client";

import { Check, X, Search, Loader2 } from "lucide-react";
import type { ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import type { ScanActionResult } from "@/lib/scanner/resolve-scan-action";

interface Props {
  sticker: ScannedSticker;
  result: ScanActionResult;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onManual?: () => void;
}

const BORDER: Record<ScanActionResult["color"], string> = {
  green: "border-green-400",
  yellow: "border-yellow-400",
  red: "border-red-500",
};

const DOT: Record<ScanActionResult["color"], string> = {
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

export function ScannerConfirmCard({ sticker, result, busy, onConfirm, onReject, onManual }: Props) {
  return (
    <div className={`rounded-xl border-2 bg-zinc-900/95 p-4 shadow-2xl ${BORDER[result.color]}`}>
      <div className="flex gap-3">
        <div className="relative h-28 w-[87px] shrink-0 overflow-hidden rounded-lg bg-black">
          {sticker.image_url ? (
            // next/image exige domínios conhecidos; as URLs vêm do Supabase storage.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sticker.image_url}
              alt={sticker.title ?? sticker.code}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-500">
              sem foto
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-lg font-bold text-white">{sticker.code}</p>
          {sticker.title && <p className="text-sm text-gray-300">{sticker.title}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
            <span className={`inline-block h-2 w-2 rounded-full ${DOT[result.color]}`} />
            {result.message}
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">É essa a figurinha que você tem?</p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          É essa
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" /> Não é essa
        </button>
      </div>
      {onManual && (
        <button
          type="button"
          onClick={onManual}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 disabled:opacity-50 transition-colors"
        >
          <Search className="h-3.5 w-3.5" /> Digitar código manualmente
        </button>
      )}
    </div>
  );
}
