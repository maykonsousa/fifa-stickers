"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Loader2,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import { StickerImageEditor } from "@/components/sticker-image-editor";
import type { NavSticker } from "@/lib/collection/sticker-nav";

interface Props {
  open: boolean;
  onClose: () => void;
  sticker: NavSticker | null;
  userId: string;
  busy: boolean;
  wishlistBusy: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  navBusy: boolean;
  onPrev: () => void;
  onNext: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleWishlist: () => void;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
}

const SWIPE_THRESHOLD = 50;

export function StickerDetailModal({
  open,
  onClose,
  sticker,
  userId,
  busy,
  wishlistBusy,
  hasPrev,
  hasNext,
  navBusy,
  onPrev,
  onNext,
  onIncrement,
  onDecrement,
  onToggleWishlist,
  onImageUploaded,
  onImageRemoved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const stickerId = sticker?.id;

  // Ao trocar de figurinha, sai do modo "trocar foto".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditing(false);
  }, [stickerId]);

  // Navegação por teclado enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    if (editing || !sticker?.image_url) return; // não sequestrar navegação durante edição de foto
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, hasPrev, hasNext, onPrev, onNext, editing, sticker?.image_url]);

  if (!sticker) return null;

  const showEditor = editing || !sticker.image_url;

  const onPointerDown = (e: React.PointerEvent) => {
    if (showEditor) return; // não sequestrar gestos do cropper
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD && hasNext) onNext();
    else if (dx >= SWIPE_THRESHOLD && hasPrev) onPrev();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-white/15 text-white p-4"
      >
        {/* Header */}
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleWishlist}
              disabled={wishlistBusy}
              aria-pressed={sticker.wishlisted}
              aria-label={sticker.wishlisted ? "Remover da lista de desejo" : "Adicionar à lista de desejo"}
              className={`shrink-0 rounded-full p-2 transition-colors disabled:opacity-50 ${
                sticker.wishlisted ? "text-green-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {wishlistBusy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Star className="w-5 h-5" fill={sticker.wishlisted ? "currentColor" : "none"} />
              )}
            </button>
            <DialogTitle className="min-w-0 flex-1 text-center text-white text-base">
              {sticker.code}
              {sticker.title && (
                <span className="block text-xs font-normal text-gray-400 truncate mt-0.5">
                  {sticker.title}
                </span>
              )}
            </DialogTitle>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              aria-label="Fechar"
              className="shrink-0 rounded-full p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Foto + navegação */}
        <div className="relative" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Figurinha anterior"
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Próxima figurinha"
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {navBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <div className="px-8 py-2">
            {showEditor ? (
              <StickerImageEditor
                key={sticker.id}
                stickerId={sticker.id}
                stickerCode={sticker.code}
                userId={userId}
                canReplace={!!sticker.image_url}
                currentImageUrl={sticker.image_url}
                onSuccess={(url) => {
                  onImageUploaded(url);
                  setEditing(false);
                }}
                onRemove={() => {
                  onImageRemoved();
                  setEditing(false);
                }}
                onCancel={editing ? () => setEditing(false) : undefined}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`relative w-32 overflow-hidden rounded-lg bg-black ${
                    sticker.orientation === "landscape" ? "aspect-[5/3]" : "aspect-[49/63]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sticker.image_url!} alt={sticker.code} className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Trocar foto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quantidade */}
        <div className="py-2 text-center">
          <p className="text-xs text-gray-400">Quantidade no álbum</p>
          <p className="mt-1 text-3xl font-bold text-white tabular-nums">{sticker.owned_count}</p>
        </div>

        {/* Footer actions */}
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onDecrement}
            disabled={busy || sticker.owned_count === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Minus className="w-4 h-4" /> Remover 1</>}
          </button>
          <button
            type="button"
            onClick={onIncrement}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Adicionar 1</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
