"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StickerCard } from "./sticker-card";

// Grade fixa pra todas as páginas do álbum.
const GRID_COLS = 4;
const GRID_ROWS = 3;

interface AlbumSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  page: number;
  row: number;
  col: number;
  orientation: "portrait" | "landscape";
  group_id: number;
  group_name: string;
  duplicate_count: number;
  viewer_owned_count: number;
}

interface AlbumPage {
  page: number;
  groupName: string;
  stickers: AlbumSticker[];
}

function groupByPage(rows: AlbumSticker[]): AlbumPage[] {
  const byPage = new Map<number, AlbumSticker[]>();
  for (const r of rows) {
    const arr = byPage.get(r.page) ?? [];
    arr.push(r);
    byPage.set(r.page, arr);
  }
  const pages: AlbumPage[] = [];
  for (const [page, stickers] of byPage) {
    // Grupo predominante: o grupo com mais figurinhas na página.
    const groupTally = new Map<string, number>();
    for (const s of stickers) {
      groupTally.set(s.group_name, (groupTally.get(s.group_name) ?? 0) + 1);
    }
    let topGroup = "";
    let topCount = -1;
    for (const [name, count] of groupTally) {
      if (count > topCount) {
        topGroup = name;
        topCount = count;
      }
    }
    pages.push({ page, groupName: topGroup, stickers });
  }
  pages.sort((a, b) => a.page - b.page);
  return pages;
}

// Traduz o número de página do álbum (campo `page`, ex.: 23) para o índice
// correspondente no carrossel. Retorna -1 quando não existe página com esse número.
function resolvePageIndex(pages: { page: number }[], pageNumber: number): number {
  return pages.findIndex((p) => p.page === pageNumber);
}

export interface AlbumOverride {
  ownedDelta?: number;
  imageUrl?: string | null;
}

export function ProfileStickersAlbum({
  userId,
  viewerId,
  groupId,
  keyword,
  onStickerClick,
  overrides,
}: {
  userId: string;
  viewerId: string | null;
  groupId: number | null;
  keyword: string;
  onStickerClick?: (sticker: AlbumSticker) => void;
  overrides?: Record<number, AlbumOverride>;
}) {
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pageInput, setPageInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fetchVersionRef = useRef(0);
  const isLoggedIn = viewerId !== null;

  // Buscar dados sempre que filtros mudarem. Updates de contagem/imagem vêm
  // via `overrides` pra não refetchar e perder a página atual.
  useEffect(() => {
    const myVersion = ++fetchVersionRef.current;
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers_album", {
        p_user_id: userId,
        p_group_id: groupId,
        p_keyword: keyword || null,
        p_viewer_id: viewerId,
      })
      .then(({ data }) => {
        if (myVersion !== fetchVersionRef.current) return;
        const rows = (data as AlbumSticker[] | null) ?? [];
        setPages(groupByPage(rows));
        setCurrentIdx(0);
        setLoading(false);
      });
  }, [userId, viewerId, groupId, keyword]);

  const displayPages = useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) return pages;
    return pages.map((p) => ({
      ...p,
      stickers: p.stickers.map((s) => {
        const ov = overrides[s.id];
        if (!ov) return s;
        return {
          ...s,
          viewer_owned_count: Math.max(0, s.viewer_owned_count + (ov.ownedDelta ?? 0)),
          image_url: ov.imageUrl !== undefined ? ov.imageUrl : s.image_url,
        };
      }),
    }));
  }, [pages, overrides]);

  // Sincronizar currentIdx com scroll do carrossel.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const handler = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w === 0) return;
        const idx = Math.round(el.scrollLeft / w);
        setCurrentIdx((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      cancelAnimationFrame(frame);
    };
  }, [pages.length]);

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number.parseInt(pageInput, 10);
    if (Number.isNaN(n)) {
      setPageInput("");
      return;
    }
    const idx = resolvePageIndex(displayPages, n);
    if (idx === -1) {
      // Página inexistente: no-op silencioso, campo volta ao estado vazio.
      setPageInput("");
      return;
    }
    goTo(idx);
    setPageInput("");
  };

  // Setas de teclado — ignora quando foco está num input/textarea
  // pra não roubar a navegação de cursor da busca do shell.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goTo(currentIdx - 1);
      else if (e.key === "ArrowRight") goTo(currentIdx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, pages.length]);

  // Drag com mouse no desktop.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      isDown = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      el.scrollLeft = startScroll - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      // Snap pra página mais próxima.
      const w = el.clientWidth;
      const idx = Math.round(el.scrollLeft / w);
      el.scrollTo({ left: idx * w, behavior: "smooth" });
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [pages.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (displayPages.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
        Nenhuma página encontrada com esses filtros. Algumas figurinhas ainda
        podem não ter sido posicionadas no álbum — use o modo lista pra ver
        todas.
      </div>
    );
  }

  const current = displayPages[currentIdx];

  return (
    <div className="space-y-3">
      {/* Header da página */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Página {current.page}</p>
          <p className="truncate text-base font-semibold text-white">{current.groupName}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <form onSubmit={handleGoToPage} className="flex items-center gap-1">
            <label htmlFor="album-goto-desktop" className="text-xs text-gray-400">
              Ir para
            </label>
            <input
              id="album-goto-desktop"
              type="number"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder={String(current.page)}
              className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-white/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="submit"
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
            >
              Ir
            </button>
          </form>
          <button
            type="button"
            aria-label="Página anterior"
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400 tabular-nums">
            {currentIdx + 1} / {displayPages.length}
          </span>
          <button
            type="button"
            aria-label="Próxima página"
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx === displayPages.length - 1}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carrossel */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x rounded-lg border border-white/10 bg-black/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Páginas do álbum"
      >
        {displayPages.map((p) => (
          <AlbumPageView
            key={p.page}
            page={p}
            isLoggedIn={isLoggedIn}
            onStickerClick={onStickerClick}
          />
        ))}
      </div>

      {/* Indicador + ir para página (mobile) */}
      <div className="sm:hidden flex items-center justify-center gap-3">
        <p className="text-xs text-gray-400 tabular-nums">
          Página {currentIdx + 1} de {displayPages.length}
        </p>
        <form onSubmit={handleGoToPage} className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder={String(current.page)}
            aria-label="Ir para a página"
            className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-white/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="submit"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
          >
            Ir
          </button>
        </form>
      </div>
    </div>
  );
}

function AlbumPageView({
  page,
  isLoggedIn,
  onStickerClick,
}: {
  page: AlbumPage;
  isLoggedIn: boolean;
  onStickerClick?: (sticker: AlbumSticker) => void;
}) {
  return (
    <div className="snap-center snap-always shrink-0 w-full p-4">
      <div
        className="grid gap-2 w-full mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, auto)`,
          maxWidth: "min(64rem, calc(100vw - 2rem))", // max-w-4xl ou largura da viewport
        }}
      >
        {page.stickers.map((s) => {
          const span = s.orientation === "landscape" ? 2 : 1;
          return (
            <div
              key={s.id}
              className="self-center"
              style={{
                gridRow: s.row,
                gridColumn: `${s.col} / span ${span}`,
              }}
            >
              <StickerCard
                sticker={s}
                orientation={s.orientation}
                ownedCount={isLoggedIn ? s.viewer_owned_count : null}
                onClick={onStickerClick ? () => onStickerClick(s) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
