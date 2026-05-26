"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Minus, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  stickerCode: string;
  stickerTitle: string | null;
  ownedCount: number;
  busy: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function StickerActionsModal({
  open,
  onClose,
  stickerCode,
  stickerTitle,
  ownedCount,
  busy,
  onIncrement,
  onDecrement,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-xs bg-zinc-900/95 backdrop-blur-xl border border-white/15 text-white p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-base">
            {stickerCode}
            {stickerTitle && (
              <span className="block text-xs font-normal text-gray-400 truncate mt-0.5">
                {stickerTitle}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">Quantidade no álbum</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{ownedCount}</p>
          </div>

          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onDecrement}
              disabled={busy || ownedCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Minus className="w-4 h-4" /> Remover 1
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onIncrement}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Adicionar 1
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
