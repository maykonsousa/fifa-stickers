"use client";

import { Check } from "lucide-react";

export interface StickerCardSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

export function StickerCard({
  sticker,
  selectable = false,
  selected = false,
  onToggle,
  ownedCount = null,
  orientation = "portrait",
}: {
  sticker: StickerCardSticker;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  ownedCount?: number | null;
  orientation?: "portrait" | "landscape";
}) {
  // Retrato 3:4. Paisagem 5:3 — landscape um pouco mais baixo que portrait
  // numa linha mista: portrait_h = (4/3) * W ≈ 1.33W; landscape_h =
  // (3/5) * 2W = 1.2W. ~10% mais baixo.
  const aspectClass = orientation === "landscape" ? "aspect-[5/3]" : "aspect-[3/4]";
  const showOwnership = ownedCount !== null;
  const hasIt = showOwnership && ownedCount > 0;
  const isDuplicate = showOwnership && ownedCount > 1;

  const ownershipWrap = showOwnership
    ? hasIt
      ? isDuplicate
        ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
      : "bg-white/10"
    : "";

  const innerContent = (
    <div className={`${aspectClass} relative overflow-hidden rounded-[inherit] ${showOwnership && !hasIt ? "bg-gray-800/50" : "bg-gray-800"}`}>
      {sticker.image_url ? (
        orientation === "landscape" ? (
          // Imagem retrato natural (49:63) com transform rotate(90deg). Como
          // o container landscape tem aspect 63:49, a imagem rotacionada
          // (que vira 63:49 visualmente) bate exatamente com o container.
          // Width = container height post-rotation; height = container width.
          <img
            src={sticker.image_url}
            alt={sticker.code}
            className={`absolute left-1/2 top-1/2 max-w-none ${showOwnership && !hasIt ? "grayscale opacity-70" : ""}`}
            style={{
              // Pré-rotação: width = altura do container, height = largura do container.
              // Container landscape é 5:3, então altura = 3/5 da largura.
              // 100% width = largura do container; * 3/5 = altura.
              // 100% height = altura do container; * 5/3 = largura.
              width: "calc(100% * 3 / 5)",
              height: "calc(100% * 5 / 3)",
              objectFit: "cover",
              transform: "translate(-50%, -50%) rotate(90deg)",
              transformOrigin: "center",
            }}
            loading="lazy"
          />
        ) : (
          <img
            src={sticker.image_url}
            alt={sticker.code}
            className={`h-full w-full object-cover ${showOwnership && !hasIt ? "grayscale opacity-70" : ""}`}
            loading="lazy"
          />
        )
      ) : (
        <div className="flex h-full flex-col items-start p-3 pt-2">
          <span className="text-sm font-bold text-white/50">{sticker.code}</span>
          <div className="flex flex-1 w-full items-center justify-center -mt-2">
            <svg className="h-20 w-20 text-white/15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div className="w-full space-y-1 text-center">
            {sticker.title ? (
              <p className="text-sm font-bold text-white/80 truncate">{sticker.title}</p>
            ) : (
              <div className="mx-auto h-3 w-3/4 rounded bg-white/10" />
            )}
            <div className="mx-auto h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      )}

      {sticker.image_url && sticker.title && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-sm font-bold text-white text-center px-2 leading-tight">
            {sticker.title}
          </span>
        </div>
      )}

      {sticker.image_url && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
          <span className="text-[10px] font-bold text-white">{sticker.code}</span>
        </div>
      )}

      {selectable && selected && (
        <div className="absolute inset-0 ring-2 ring-green-500 rounded-md pointer-events-none" />
      )}
      {selectable && (
        <span
          className={`absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow transition-colors ${
            selected
              ? "bg-green-500 text-white"
              : "border-2 border-white/80 bg-black/40 backdrop-blur-sm"
          }`}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
    </div>
  );

  const wrapperBase = showOwnership
    ? `group relative rounded-lg p-[2px] overflow-hidden transition-all ${ownershipWrap}`
    : `group relative rounded-lg border overflow-hidden transition-all ${
        selectable && selected
          ? "border-green-500"
          : "border-white/10 hover:scale-[1.03] hover:border-white/20"
      }`;

  if (selectable && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`${wrapperBase} text-left`}
      >
        {innerContent}
      </button>
    );
  }

  return <div className={wrapperBase}>{innerContent}</div>;
}
