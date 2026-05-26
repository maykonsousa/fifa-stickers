"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
import { ChevronsUpDown, Check, Loader2, BookOpen, List } from "lucide-react";
import { StickerImageUpload } from "@/components/sticker-image-upload";
import { StickerCard } from "@/app/p/[username]/sticker-card";
import { ProfileStickersAlbum } from "@/app/p/[username]/profile-stickers-album";
import { StickerLegend } from "@/app/p/[username]/sticker-legend";
import { StickerActionsModal } from "./sticker-actions-modal";

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
}

type ViewMode = "list" | "album";

const PAGE_SIZE = 20;
const VIEW_MODE_STORAGE_KEY = "collectionViewMode";

export function CollectionView({
  groups,
  userId,
}: {
  groups: Group[];
  userId: string;
}) {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group");
  const initialGroupId = initialGroup
    ? groups.find((g) => g.code === initialGroup)?.id ?? null
    : null;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [keyword, setKeyword] = useState("");
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
  const [uploadSticker, setUploadSticker] = useState<StickerResult | null>(null);
  const [actionsSticker, setActionsSticker] = useState<{
    id: number;
    code: string;
    title: string | null;
    owned_count: number;
  } | null>(null);
  const [albumRefreshKey, setAlbumRefreshKey] = useState(0);
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
      p_user_id: userId,
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
  }, [userId, keyword, groupId, status]);

  // Fetch list data quando filtros mudam (mesmo em modo álbum mantemos a lista
  // sincronizada pra otimista update funcionar quando voltar).
  useEffect(() => {
    setPage(1);
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

  const incrementLocal = (stickerId: number) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, owned_count: s.owned_count + 1 } : s)
    );
    setAlbumRefreshKey((k) => k + 1);
  };

  const decrementLocal = (stickerId: number) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, owned_count: Math.max(0, s.owned_count - 1) } : s)
    );
    setAlbumRefreshKey((k) => k + 1);
  };

  const setImageLocal = (stickerId: number, imageUrl: string) => {
    setResults((prev) =>
      prev.map((s) => s.id === stickerId ? { ...s, image_url: imageUrl } : s)
    );
    setAlbumRefreshKey((k) => k + 1);
  };

  const doIncrement = async (stickerId: number) => {
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, sticker_id: stickerId });
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
      .eq("user_id", userId)
      .eq("sticker_id", stickerId)
      .limit(1);
    if (rows && rows.length > 0) {
      await supabase.from("user_stickers").delete().eq("id", rows[0].id);
    }
    decrementLocal(stickerId);
    setAdding(false);
    toast.success("Figurinha removida!");
  };

  // Lógica central de clique no card:
  // 1. Já possui (owned >= 1) → abre modal de ações (+1/-1).
  // 2. Não possui + sem imagem → abre modal de upload.
  // 3. Não possui + com imagem → +1 direto.
  const handleCardClick = (sticker: { id: number; code: string; title: string | null; image_url: string | null; owned_count: number }) => {
    if (adding) return;
    if (sticker.owned_count >= 1) {
      setActionsSticker({
        id: sticker.id,
        code: sticker.code,
        title: sticker.title,
        owned_count: sticker.owned_count,
      });
      return;
    }
    if (!sticker.image_url) {
      // Reaproveita o tipo StickerResult — caller passa o objeto completo da lista.
      // No modo álbum, montamos um stub equivalente.
      const full = results.find((s) => s.id === sticker.id);
      if (full) {
        setUploadSticker(full);
      } else {
        // Fallback: cria stub minimamente válido.
        setUploadSticker({
          id: sticker.id,
          group_id: 0,
          code: sticker.code,
          number: 0,
          title: sticker.title,
          image_url: sticker.image_url,
          owned_count: 0,
          total_count: 0,
        });
      }
      return;
    }
    void doIncrement(sticker.id);
  };

  // Quando a modal de ações dispara +1 ou -1.
  const handleActionsIncrement = async () => {
    if (!actionsSticker) return;
    await doIncrement(actionsSticker.id);
    setActionsSticker((prev) => prev ? { ...prev, owned_count: prev.owned_count + 1 } : null);
  };

  const handleActionsDecrement = async () => {
    if (!actionsSticker) return;
    await doDecrement(actionsSticker.id);
    setActionsSticker((prev) => {
      if (!prev) return null;
      const next = prev.owned_count - 1;
      return next <= 0 ? null : { ...prev, owned_count: next };
    });
  };

  // Quando o upload modal finaliza (com ou sem foto).
  const handleSkipUpload = async () => {
    if (!uploadSticker) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, sticker_id: uploadSticker.id });
    incrementLocal(uploadSticker.id);
    const code = uploadSticker.code;
    setUploadSticker(null);
    setAdding(false);
    toast.success(`Figurinha ${code} adicionada!`);
  };

  const handleUploadSuccess = async (imageUrl: string) => {
    if (!uploadSticker) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, sticker_id: uploadSticker.id });
    incrementLocal(uploadSticker.id);
    setImageLocal(uploadSticker.id, imageUrl);
    const code = uploadSticker.code;
    setUploadSticker(null);
    setAdding(false);
    toast.success(`Figurinha ${code} adicionada com foto!`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Coleção</h1>
        <p className="mt-1 text-sm text-gray-400">
          Clique numa figurinha pra adicionar — se já tiver, abre opções de + / − e remover.
        </p>
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
                {status === "owned" ? "Tenho" : status === "missing" ? "Faltam" : status === "duplicate" ? "Repetidas" : "Todas"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {[
                { value: null, label: "Todas" },
                { value: "owned", label: "Tenho" },
                { value: "missing", label: "Faltam" },
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
          userId={userId}
          viewerId={userId}
          groupId={groupId}
          keyword={keyword}
          refreshKey={albumRefreshKey}
          onStickerClick={(s) =>
            handleCardClick({
              id: s.id,
              code: s.code,
              title: s.title,
              image_url: s.image_url,
              owned_count: s.viewer_owned_count,
            })
          }
        />
      )}

      <StickerImageUpload
        open={!!uploadSticker}
        onClose={() => setUploadSticker(null)}
        stickerId={uploadSticker?.id ?? 0}
        stickerCode={uploadSticker?.code ?? ""}
        userId={userId}
        onSuccess={handleUploadSuccess}
        onSkip={uploadSticker?.image_url ? undefined : handleSkipUpload}
        currentImageUrl={uploadSticker?.image_url}
        onRemove={() => fetchStickers(1, false).then(() => setPage(1))}
      />

      <StickerActionsModal
        open={!!actionsSticker}
        onClose={() => setActionsSticker(null)}
        stickerCode={actionsSticker?.code ?? ""}
        stickerTitle={actionsSticker?.title ?? null}
        ownedCount={actionsSticker?.owned_count ?? 0}
        busy={adding}
        onIncrement={handleActionsIncrement}
        onDecrement={handleActionsDecrement}
      />
    </div>
  );
}
