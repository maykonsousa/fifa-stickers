"use client";

import { useState, useEffect, useRef } from "react";
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

export function ProfileStickersAlbum({
  userId,
  viewerId,
  groupId,
  keyword,
}: {
  userId: string;
  viewerId: string | null;
  groupId: number | null;
  keyword: string;
}) {
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fetchVersionRef = useRef(0);
  const isLoggedIn = viewerId !== null;

  // Buscar dados sempre que filtros mudarem.
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

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
        Nenhuma página encontrada com esses filtros. Algumas figurinhas ainda
        podem não ter sido posicionadas no álbum — use o modo lista pra ver
        todas.
      </div>
    );
  }

  const current = pages[currentIdx];

  return (
    <div className="space-y-3">
      {/* Header da página */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Página {current.page}</p>
          <p className="truncate text-base font-semibold text-white">{current.groupName}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
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
            {currentIdx + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="Próxima página"
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx === pages.length - 1}
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
        {pages.map((p) => (
          <AlbumPageView key={p.page} page={p} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {/* Indicador mobile (texto simples) */}
      <p className="sm:hidden text-center text-xs text-gray-400 tabular-nums">
        Página {currentIdx + 1} de {pages.length}
      </p>
    </div>
  );
}

function AlbumPageView({
  page,
  isLoggedIn,
}: {
  page: AlbumPage;
  isLoggedIn: boolean;
}) {
  return (
    <div className="snap-center snap-always shrink-0 w-full p-4">
      <div
        className="grid gap-2 w-full"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, auto)`,
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
