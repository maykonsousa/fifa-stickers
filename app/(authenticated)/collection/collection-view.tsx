"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, Loader2, BookOpen, List, ScanLine } from "lucide-react";
import { StickerCard } from "@/app/p/[username]/sticker-card";
import { ProfileStickersAlbum, type AlbumOverride } from "@/app/p/[username]/profile-stickers-album";
import { StickerLegend } from "@/app/p/[username]/sticker-legend";
import { StickerDetailModal } from "./sticker-detail-modal";
import {
  listToNavList,
  albumToNavList,
  canGoPrev,
  canGoNext,
  resolveNext,
} from "@/lib/collection/sticker-nav";

interface Group {
  id: number;
  name: string;
  code: string;
  type: string;
  sticker_count: number;
}

interface StickerResult {
  id: number;
  group_id: number;
  code: string;
  number: number;
  title: string | null;
  image_url: string | null;
  owned_count: number;
  total_count: number;
  wishlisted: boolean;
}

type ViewMode = "list" | "album";

type AlbumPageForNav = {
  page: number;
  stickers: {
    id: number;
    code: string;
    title: string | null;
    image_url: string | null;
    orientation: "portrait" | "landscape";
    row: number;
    col: number;
    viewer_owned_count: number;
  }[];
};

const PAGE_SIZE = 20;
const VIEW_MODE_STORAGE_KEY = "collectionViewMode";

export function CollectionView({
  groups,
  userId,
  albumId,
}: {
  groups: Group[];
  userId: string;
  albumId: number;
}) {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group");
  const router = useRouter();
  const initialKeyword = searchParams.get("q") ?? "";
  const initialGroupId = initialGroup
    ? groups.find((g) => g.code === initialGroup)?.id ?? null
    : null;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [keyword, setKeyword] = useState(initialKeyword);
  const [groupId, setGroupId] = useState<number | null>(initialGroupId);
  const [groupOpen, setGroupOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<StickerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [navIndex, setNavIndex] = useState<number | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [albumPages, setAlbumPages] = useState<AlbumPageForNav[]>([]);
  // Updates otimistas que o álbum aplica sem refetchar (pra não voltar pra
  // primeira página depois de adicionar/remover figurinha).
  const [albumOverrides, setAlbumOverrides] = useState<Record<number, AlbumOverride>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Carregar viewMode do localStorage no mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "list" || stored === "album") {
      setViewMode(stored);
    }
  }, []);

  // Persistir viewMode.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const hasMore = results.length < totalCount;

  const fetchStickers = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const supabase = createClient();
    const { data } = await supabase.rpc("search_stickers", {
      p_album_id: albumId,
      p_keyword: keyword || null,
      p_group_id: groupId,
      p_status: status,
      p_page: pageNum,
      p_page_size: PAGE_SIZE,
    });
    if (data && data.length > 0) {
      const typed = data as StickerResult[];
      setResults((prev) => append ? [...prev, ...typed] : typed);
      setTotalCount(typed[0].total_count);
    } else if (!append) {
      setResults([]);
      setTotalCount(0);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [albumId, keyword, groupId, status]);

  // Fetch list data quando filtros mudam (mesmo em modo álbum mantemos a lista
  // sincronizada pra otimista update funcionar quando voltar).
  useEffect(() => {
    setPage(1);
    setAlbumOverrides({});
    fetchStickers(1, false);
  }, [fetchStickers]);

  useEffect(() => {
    if (page > 1) {
      fetchStickers(page, true);
    }
  }, [page]);

  // Infinite scroll só no modo lista.
  useEffect(() => {
    if (viewMode !== "list") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, viewMode]);

  // Wishlist do álbum (uma vez por albumId), pra marcar as figurinhas no álbum.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("album_wishlist")
      .select("sticker_id")
      .eq("album_id", albumId)
      .then(({ data }) => {
        setWishlistedIds(new Set((data ?? []).map((r) => r.sticker_id as number)));
      });
  }, [albumId]);

  // Lista de navegação normalizada pra visão atual.
  const navList = useMemo(
    () =>
      viewMode === "list"
        ? listToNavList(results)
        : albumToNavList(albumPages, wishlistedIds),
    [viewMode, results, albumPages, wishlistedIds],
  );

  // Trocar entre lista/álbum fecha o modal (índices divergem entre as visões).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavIndex(null);
    setPendingAdvance(false);
  }, [viewMode]);

  const bumpOverride = (stickerId: number, delta: number) => {
    setAlbumOverrides((prev) => ({
      ...prev,
      [stickerId]: {
        ...prev[stickerId],
        ownedDelta: (prev[stickerId]?.ownedDelta ?? 0) + delta,
      },
    }));
  };

  const incrementLocal = (stickerId: number) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, owned_count: s.owned_count + 1 } : s)
    );
    bumpOverride(stickerId, 1);
  };

  const decrementLocal = (stickerId: number) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, owned_count: Math.max(0, s.owned_count - 1) } : s)
    );
    bumpOverride(stickerId, -1);
  };

  const setImageLocal = (stickerId: number, imageUrl: string | null) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, image_url: imageUrl } : s)
    );
    setAlbumOverrides((prev) => ({
      ...prev,
      [stickerId]: { ...prev[stickerId], imageUrl },
    }));
  };

  const doIncrement = async (stickerId: number) => {
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, album_id: albumId, sticker_id: stickerId });
    incrementLocal(stickerId);
    setAdding(false);
    toast.success("Figurinha adicionada!");
  };

  const doDecrement = async (stickerId: number) => {
    setAdding(true);
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("user_stickers")
      .select("id")
      .eq("album_id", albumId)
      .eq("sticker_id", stickerId)
      .limit(1);
    if (rows && rows.length > 0) {
      await supabase.from("user_stickers").delete().eq("id", rows[0].id);
    }
    decrementLocal(stickerId);
    setAdding(false);
    toast.success("Figurinha removida!");
  };

  // Todo clique numa figurinha abre o modal unificado no índice correspondente.
  const handleCardClick = (sticker: { id: number }) => {
    const idx = navList.findIndex((s) => s.id === sticker.id);
    if (idx >= 0) setNavIndex(idx);
  };

  // Navegação com load-more contínuo no modo lista.
  const hasMoreForNav = viewMode === "list" && hasMore;
  const currentSticker = navIndex !== null ? navList[navIndex] ?? null : null;
  const modalHasPrev = navIndex !== null && canGoPrev(navIndex);
  const modalHasNext =
    navIndex !== null && canGoNext(navIndex, navList.length, hasMoreForNav);

  const handleNavPrev = () => {
    if (navIndex !== null && canGoPrev(navIndex)) setNavIndex(navIndex - 1);
  };

  const handleNavNext = () => {
    if (navIndex === null) return;
    const action = resolveNext(navIndex, navList.length, hasMoreForNav);
    if (action.type === "move") {
      setNavIndex(action.index);
    } else if (action.type === "loadMore") {
      setPendingAdvance(true);
      setPage((p) => p + 1);
    }
  };

  // Quando a próxima página chega, avança o índice.
  useEffect(() => {
    if (!pendingAdvance) return;
    if (navIndex !== null && navIndex < navList.length - 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNavIndex(navIndex + 1);
      setPendingAdvance(false);
    } else if (!loadingMore) {
      // Página carregou e não cresceu o suficiente — desiste do avanço.
      setPendingAdvance(false);
    }
  }, [navList.length, loadingMore, pendingAdvance, navIndex]);

  const handleModalIncrement = async () => {
    if (!currentSticker) return;
    await doIncrement(currentSticker.id);
  };

  const handleModalDecrement = async () => {
    if (!currentSticker) return;
    await doDecrement(currentSticker.id);
  };

  const handleModalToggleWishlist = async () => {
    if (!currentSticker) return;
    const stickerId = currentSticker.id;
    const next = !currentSticker.wishlisted;
    setWishlistBusy(true);
    const supabase = createClient();
    if (next) {
      await supabase.from("album_wishlist").insert({ album_id: albumId, sticker_id: stickerId });
    } else {
      await supabase.from("album_wishlist").delete().eq("album_id", albumId).eq("sticker_id", stickerId);
    }
    setResults((prev) => prev.map((s) => (s.id === stickerId ? { ...s, wishlisted: next } : s)));
    setWishlistedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(stickerId);
      else copy.delete(stickerId);
      return copy;
    });
    setWishlistBusy(false);
    toast.success(next ? "Adicionada à lista de desejo!" : "Removida da lista de desejo!");
  };

  const handleModalImageUploaded = (imageUrl: string) => {
    if (!currentSticker) return;
    setImageLocal(currentSticker.id, imageUrl);
    toast.success("Foto atualizada!");
  };

  const handleModalImageRemoved = () => {
    if (!currentSticker) return;
    setImageLocal(currentSticker.id, null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Coleção</h1>
          <p className="mt-1 text-sm text-gray-400">
            Clique numa figurinha pra adicionar — se já tiver, abre opções de + / − e remover.
          </p>
        </div>
        <button
          onClick={() => router.push("/collection/scanner")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-green-400 transition-colors"
        >
          <ScanLine className="h-4 w-4" /> Escanear
        </button>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Buscar por código ou nome..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <Popover open={groupOpen} onOpenChange={setGroupOpen}>
          <PopoverTrigger className="flex w-full sm:w-52 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
            <span className={groupId ? "text-white" : "text-gray-400"}>
              {groupId
                ? groups.find((g) => g.id === groupId)?.name ?? "Grupo"
                : "Todos os grupos"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command filter={(value, search) => {
              if (value.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}>
              <CommandInput placeholder="Buscar grupo..." />
              <CommandList>
                <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setGroupId(null);
                      setGroupOpen(false);
                    }}
                  >
                    <Check className={`mr-2 h-4 w-4 ${groupId === null ? "opacity-100" : "opacity-0"}`} />
                    Todos os grupos
                  </CommandItem>
                  {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`${g.code} ${g.name}`}
                      onSelect={() => {
                        setGroupId(g.id);
                        setGroupOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${groupId === g.id ? "opacity-100" : "opacity-0"}`} />
                      {g.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {viewMode === "list" && (
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger className="flex w-full sm:w-36 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
              <span className={status ? "text-white" : "text-gray-400"}>
                {status === "owned" ? "Tenho" : status === "preciso" ? "Preciso" : status === "duplicate" ? "Repetidas" : "Todas"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {[
                { value: null, label: "Todas" },
                { value: "owned", label: "Tenho" },
                { value: "preciso", label: "Preciso" },
                { value: "duplicate", label: "Repetidas" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setStatus(opt.value);
                    setStatusOpen(false);
                  }}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent"
                >
                  <Check className={`mr-2 h-4 w-4 ${status === opt.value ? "opacity-100" : "opacity-0"}`} />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
        <div
          role="radiogroup"
          aria-label="Modo de visualização"
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-sm self-start sm:self-auto"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-green-500 text-zinc-900 font-medium"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "album"}
            onClick={() => setViewMode("album")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "album"
                ? "bg-green-500 text-zinc-900 font-medium"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Álbum
          </button>
        </div>
      </div>

      <StickerLegend />

      {viewMode === "list" ? (
        <>
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {results.map((sticker) => (
              <StickerCard
                key={sticker.id}
                sticker={sticker}
                ownedCount={sticker.owned_count}
                wishlisted={sticker.wishlisted}
                onClick={() => handleCardClick(sticker)}
              />
            ))}
          </div>

          {!loading && results.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-gray-400">Nenhuma figurinha encontrada para os filtros selecionados.</p>
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-green-400" />
            </div>
          )}
        </>
      ) : (
        <ProfileStickersAlbum
          albumId={albumId}
          viewerAlbumId={albumId}
          groupId={groupId}
          keyword={keyword}
          overrides={albumOverrides}
          onPagesChange={setAlbumPages}
          onStickerClick={(s) => handleCardClick({ id: s.id })}
        />
      )}

      <StickerDetailModal
        open={navIndex !== null}
        onClose={() => setNavIndex(null)}
        sticker={currentSticker}
        userId={userId}
        busy={adding}
        wishlistBusy={wishlistBusy}
        hasPrev={modalHasPrev}
        hasNext={modalHasNext}
        navBusy={pendingAdvance}
        onPrev={handleNavPrev}
        onNext={handleNavNext}
        onIncrement={handleModalIncrement}
        onDecrement={handleModalDecrement}
        onToggleWishlist={handleModalToggleWishlist}
        onImageUploaded={handleModalImageUploaded}
        onImageRemoved={handleModalImageRemoved}
      />
    </div>
  );
}
