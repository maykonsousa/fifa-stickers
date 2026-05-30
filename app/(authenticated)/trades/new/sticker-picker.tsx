"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import { ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { StickerOption } from "../lib/types";

interface Group {
  id: number;
  name: string;
  code: string;
}

interface StickerRow extends StickerOption {
  total_count: number;
  viewer_owned_count?: number;
}

type StatusFilter = "owned" | "missing" | "duplicate" | null;

interface StickerPickerProps {
  trigger: React.ReactNode;
  ownerUserId: string | null; // null = catálogo puro (lead)
  ownerLabel?: string;
  /** Quando definido (e diferente do dono), cards já em poder do viewer ficam desabilitados. */
  viewerUserId?: string;
  /** Status default ao abrir; cai pra null se ownerUserId for null e nada for passado. */
  defaultStatus?: StatusFilter;
  selectedStickerIds: number[];
  onToggle: (sticker: StickerOption) => void;
}

const PAGE_SIZE = 20;

export function StickerPicker({
  trigger,
  ownerUserId,
  ownerLabel,
  viewerUserId,
  defaultStatus,
  selectedStickerIds,
  onToggle,
}: StickerPickerProps) {
  const initialStatus: StatusFilter =
    defaultStatus !== undefined ? defaultStatus : ownerUserId ? "duplicate" : null;
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [keyword, setKeyword] = useState("");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [statusOpen, setStatusOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<StickerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const canShowStatus = !!ownerUserId;
  const hasMore = results.length < totalCount;
  const selectedSet = new Set(selectedStickerIds);

  // Busca grupos uma vez ao abrir
  useEffect(() => {
    if (!open || groups.length > 0) return;
    const supabase = createClient();
    supabase
      .from("sticker_groups")
      .select("id, name, code")
      .order("id")
      .then(({ data }) => {
        if (data) setGroups(data as Group[]);
      });
  }, [open, groups.length]);

  // Status default acompanha mudanças nos props (raro, mas mantém coerência)
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const fetchStickers = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("search_stickers", {
        p_user_id: ownerUserId ?? "00000000-0000-0000-0000-000000000000",
        p_keyword: keyword || null,
        p_group_id: groupId,
        p_status: canShowStatus ? status : null,
        p_page: pageNum,
        p_page_size: PAGE_SIZE,
        p_viewer_user_id: viewerUserId ?? null,
      });
      if (data && (data as StickerRow[]).length > 0) {
        const typed = data as StickerRow[];
        setResults((prev) => (append ? [...prev, ...typed] : typed));
        setTotalCount(Number(typed[0].total_count));
      } else if (!append) {
        setResults([]);
        setTotalCount(0);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [ownerUserId, keyword, groupId, status, canShowStatus, viewerUserId],
  );

  // Refetch quando filtros mudam (e drawer aberto)
  useEffect(() => {
    if (!open) return;
    setPage(1);
    fetchStickers(1, false);
  }, [open, fetchStickers]);

  // Carrega próximas páginas
  useEffect(() => {
    if (page > 1 && open) {
      fetchStickers(page, true);
    }
  }, [page, open, fetchStickers]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, open]);

  function handleToggleSticker(sticker: StickerRow) {
    onToggle({
      id: sticker.id,
      group_id: sticker.group_id,
      code: sticker.code,
      number: sticker.number,
      title: sticker.title,
      image_url: sticker.image_url,
      owned_count: sticker.owned_count,
    });
  }

  const statusLabel =
    status === "owned"
      ? "Tenho"
      : status === "missing"
        ? "Faltam"
        : status === "duplicate"
          ? "Repetidas"
          : "Todas";

  const drawerContentRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={isDesktop ? "right" : "bottom"}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        ref={drawerContentRef}
        className="bg-gray-900 text-white border-white/10 data-[vaul-drawer-direction=bottom]:h-[92vh] data-[vaul-drawer-direction=bottom]:max-h-[92vh] overscroll-contain data-[vaul-drawer-direction=right]:sm:max-w-2xl"
      >
        <DrawerHeader className="pb-6">
          <DrawerTitle className="font-sans text-white text-base font-medium">
            Selecionar figurinhas
          </DrawerTitle>
          {ownerLabel && <p className="text-xs text-gray-400">{ownerLabel}</p>}
        </DrawerHeader>

        <div className="px-4 pb-4 flex flex-col gap-3 flex-1 min-h-0">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Buscar por código ou nome..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
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
                <PopoverContent className="w-64 p-0" align="start" container={drawerContentRef}>
                  <Command
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
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
                          <Check
                            className={`mr-2 h-4 w-4 ${groupId === null ? "opacity-100" : "opacity-0"}`}
                          />
                          Todos os grupos
                        </CommandItem>
                        {[...groups]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((g) => (
                            <CommandItem
                              key={g.id}
                              value={`${g.code} ${g.name}`}
                              onSelect={() => {
                                setGroupId(g.id);
                                setGroupOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${groupId === g.id ? "opacity-100" : "opacity-0"}`}
                              />
                              {g.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {canShowStatus && (
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger className="flex w-full sm:w-36 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                    <span>{statusLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                  </PopoverTrigger>
                  <PopoverContent className="w-36 p-1" align="end" container={drawerContentRef}>
                    {(
                      [
                        { value: null, label: "Todas" },
                        { value: "owned", label: "Tenho" },
                        { value: "missing", label: "Faltam" },
                        { value: "duplicate", label: "Repetidas" },
                      ] as { value: StatusFilter; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setStatus(opt.value);
                          setStatusOpen(false);
                        }}
                        className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${status === opt.value ? "opacity-100" : "opacity-0"}`}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Grid */}
            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 -mx-1 px-1">
              {loading && results.length === 0 ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-grass" />
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                  <p className="text-sm text-gray-400">Nenhuma figurinha encontrada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                  {results.map((sticker) => {
                    const viewerHas = (sticker.viewer_owned_count ?? 0) > 0;
                    const disabled = !!viewerUserId && viewerHas;
                    return (
                      <StickerCard
                        key={sticker.id}
                        sticker={sticker}
                        ownerUserId={ownerUserId}
                        isSelected={selectedSet.has(sticker.id)}
                        isDisabled={disabled}
                        onClick={() => handleToggleSticker(sticker)}
                      />
                    );
                  })}
                </div>
              )}
              <div ref={sentinelRef} className="h-1" />
              {loadingMore && (
                <div className="py-4 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-grass" />
                </div>
              )}
            </div>
        </div>

        <DrawerFooter className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-lg bg-brand-grass px-4 py-3 text-sm font-medium text-gray-900 hover:bg-brand-grass/90 transition-colors"
          >
            {selectedStickerIds.length > 0
              ? `Concluir (${selectedStickerIds.length} ${selectedStickerIds.length === 1 ? "selecionada" : "selecionadas"})`
              : "Concluir"}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function StickerCard({
  sticker,
  ownerUserId,
  isSelected,
  isDisabled,
  onClick,
}: {
  sticker: StickerRow;
  ownerUserId: string | null;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  const hasIt = sticker.owned_count > 0;
  const isDuplicate = sticker.owned_count > 1;
  const showOwnership = !!ownerUserId;

  const borderClass =
    showOwnership && hasIt
      ? isDuplicate
        ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
      : "";

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="group relative text-left disabled:cursor-not-allowed"
      title={isDisabled ? "Você já tem essa figurinha" : undefined}
    >
      <div
        className={`rounded-lg p-[2px] transition-all ${
          isDisabled
            ? ""
            : isSelected
              ? "ring-2 ring-brand-grass ring-offset-2 ring-offset-gray-900"
              : showOwnership && hasIt
                ? borderClass
                : ""
        }`}
      >
        <div
          className={`relative aspect-[49/63] overflow-hidden rounded-lg ${
            isDisabled
              ? "bg-gray-800/40 border border-white/5 opacity-40 grayscale"
              : showOwnership && !hasIt
                ? "bg-gray-800/50 border border-white/10 opacity-60"
                : "bg-gray-800"
          }`}
        >
          {sticker.image_url ? (
            <Image
              src={sticker.image_url}
              alt={sticker.code}
              fill
              sizes="(max-width: 640px) 30vw, 160px"
              className={`object-cover ${showOwnership && !hasIt ? "grayscale" : ""}`}
            />
          ) : (
            <div className="flex h-full flex-col items-start p-2">
              <span className="text-xs font-bold text-white/50">{sticker.code}</span>
              <div className="flex flex-1 w-full items-center justify-center">
                <svg className="h-12 w-12 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              {sticker.title && (
                <p className="w-full text-center text-[10px] font-bold text-white/80 truncate">
                  {sticker.title}
                </p>
              )}
            </div>
          )}

          {sticker.image_url && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-3">
              <span className="text-[10px] font-bold text-white">{sticker.code}</span>
            </div>
          )}

          {isDuplicate && !isSelected && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
              {sticker.owned_count - 1}
            </span>
          )}

          {isSelected && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-grass text-white shadow">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
