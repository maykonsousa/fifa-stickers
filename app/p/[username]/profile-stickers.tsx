"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronsUpDown, Check, Search, Loader2 } from "lucide-react";
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
import { ProposalOfferPicker, type SelectedWant } from "./proposal-offer-picker";

interface Group {
  id: number;
  name: string;
  code: string;
}

interface StickerResult {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  group_name: string;
  duplicate_count: number;
  total_count: number;
}

const PAGE_SIZE = 20;

export function ProfileStickers({
  userId,
  viewerId = null,
  tradeUIEnabled = false,
  tradeFilterActive = false,
  isLoggedIn = false,
  ownerUsername,
  ownerHasTradeable = false,
  groups,
  missingCount,
  duplicatesCount,
  tradeMissingCount = null,
  tradeDuplicatesCount = null,
  viewerOwnedCounts = {},
}: {
  userId: string;
  viewerId?: string | null;
  tradeUIEnabled?: boolean;
  tradeFilterActive?: boolean;
  isLoggedIn?: boolean;
  ownerUsername: string;
  ownerHasTradeable?: boolean;
  groups: Group[];
  missingCount: number;
  duplicatesCount: number;
  tradeMissingCount?: number | null;
  tradeDuplicatesCount?: number | null;
  viewerOwnedCounts?: Record<number, number>;
}) {
  const initialTab: "missing" | "duplicates" = tradeUIEnabled ? "duplicates" : "missing";
  const [tab, setTab] = useState<"missing" | "duplicates">(initialTab);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<StickerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wants, setWants] = useState<SelectedWant[]>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const pageRef = useRef(1);
  const fetchVersionRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const effectiveMissingCount = tradeFilterActive
    ? tradeMissingCount ?? 0
    : missingCount;
  const effectiveDuplicatesCount = tradeFilterActive
    ? tradeDuplicatesCount ?? 0
    : duplicatesCount;

  const selectionEnabled = tradeUIEnabled && tab === "duplicates" && ownerHasTradeable;

  const hasMore = results.length < totalCount;
  const isInitialLoad = loading && results.length === 0;
  const isLoadingMore = loading && results.length > 0;

  // Reset and load page 1 whenever filters change.
  useEffect(() => {
    const myVersion = ++fetchVersionRef.current;
    pageRef.current = 1;
    setResults([]);
    setTotalCount(0);
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers", {
        p_user_id: userId,
        p_tab: tab,
        p_group_id: groupId,
        p_keyword: keyword || null,
        p_page: 1,
        p_page_size: PAGE_SIZE,
        p_viewer_id: viewerId,
      })
      .then(({ data }) => {
        if (myVersion !== fetchVersionRef.current) return;
        const rows = (data as StickerResult[] | null) ?? [];
        setResults(rows);
        setTotalCount(rows[0]?.total_count ?? 0);
        setLoading(false);
      });
  }, [userId, tab, groupId, keyword, viewerId]);

  // Infinite scroll.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        const myVersion = ++fetchVersionRef.current;
        const nextPage = pageRef.current + 1;
        setLoading(true);

        const supabase = createClient();
        supabase
          .rpc("get_public_stickers", {
            p_user_id: userId,
            p_tab: tab,
            p_group_id: groupId,
            p_keyword: keyword || null,
            p_page: nextPage,
            p_page_size: PAGE_SIZE,
            p_viewer_id: viewerId,
          })
          .then(({ data }) => {
            if (myVersion !== fetchVersionRef.current) return;
            const rows = (data as StickerResult[] | null) ?? [];
            pageRef.current = nextPage;
            setResults((prev) => [...prev, ...rows]);
            setLoading(false);
          });
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, userId, tab, groupId, keyword, viewerId]);

  const toggleWant = (sticker: StickerResult) => {
    setWants((prev) => {
      const existing = prev.find((x) => x.sticker_id === sticker.id);
      if (existing) return prev.filter((x) => x.sticker_id !== sticker.id);
      return [
        ...prev,
        {
          sticker_id: sticker.id,
          code: sticker.code,
          title: sticker.title,
          image_url: sticker.image_url,
        },
      ];
    });
  };

  const wantsSelectedIds = new Set(wants.map((w) => w.sticker_id));

  // Tabs: when trade UI is enabled, show Repetidas first.
  const tabsOrder: ("duplicates" | "missing")[] = tradeUIEnabled
    ? ["duplicates", "missing"]
    : ["missing", "duplicates"];

  return (
    <div className="space-y-4 pb-32">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabsOrder.map((t) => {
          const label = t === "missing" ? `Faltam (${effectiveMissingCount})` : `Repetidas (${effectiveDuplicatesCount})`;
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hint inside Repetidas when trade UI is enabled */}
      {tab === "duplicates" && tradeUIEnabled && ownerHasTradeable && (
        <p className="text-xs text-gray-400">
          Toque pra selecionar o que você quer trocar com{" "}
          <span className="font-medium text-white">@{ownerUsername}</span>.
          {tradeFilterActive && " Mostrando só figurinhas que combinam com seu álbum."}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Buscar por código..."
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <Popover open={groupOpen} onOpenChange={setGroupOpen}>
          <PopoverTrigger className="flex w-full sm:w-48 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
            <span className={groupId ? "text-white" : "text-gray-400"}>
              {groupId ? groups.find((g) => g.id === groupId)?.name ?? "Grupo" : "Todos os grupos"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command
              filter={(value, search) =>
                value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
              }
            >
              <CommandInput placeholder="Buscar grupo..." />
              <CommandList>
                <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="all" onSelect={() => { setGroupId(null); setGroupOpen(false); }}>
                    <Check className={`mr-2 h-4 w-4 ${groupId === null ? "opacity-100" : "opacity-0"}`} />
                    Todos os grupos
                  </CommandItem>
                  {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`${g.code} ${g.name}`}
                      onSelect={() => { setGroupId(g.id); setGroupOpen(false); }}
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
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 transition-opacity ${isInitialLoad ? "opacity-50" : ""}`}>
        {results.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            selectable={selectionEnabled}
            selected={wantsSelectedIds.has(sticker.id)}
            onToggle={selectionEnabled ? () => toggleWant(sticker) : undefined}
          />
        ))}
      </div>

      {/* Empty */}
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 text-sm">
            {tradeFilterActive
              ? "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria no momento."
              : "Nenhuma figurinha encontrada."}
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel + loader */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>
      )}

      {/* Sticky proposal CTA */}
      {tradeUIEnabled && (
        <div className="fixed bottom-0 inset-x-0 z-[60] border-t border-white/10 bg-gray-900/95 backdrop-blur px-4 py-3">
          <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {wants.length === 0 ? (
                <p className="text-xs text-gray-400">
                  {ownerHasTradeable
                    ? `Selecione na aba Repetidas pra propor troca com @${ownerUsername}.`
                    : `@${ownerUsername} não tem trocas viáveis no momento.`}
                </p>
              ) : (
                <p className="text-sm text-white">
                  <span className="font-semibold">{wants.length}</span>{" "}
                  {wants.length === 1 ? "figurinha selecionada" : "figurinhas selecionadas"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOfferOpen(true)}
              disabled={wants.length === 0}
              className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Propor troca
            </button>
          </div>
        </div>
      )}

      <ProposalOfferPicker
        open={offerOpen}
        onOpenChange={setOfferOpen}
        ownerUserId={userId}
        ownerDisplayName={`@${ownerUsername}`}
        groups={groups}
        viewerOwnedCounts={viewerOwnedCounts}
        wants={wants}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}

function StickerCard({
  sticker,
  selectable = false,
  selected = false,
  onToggle,
}: {
  sticker: StickerResult;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const innerContent = (
    <>
      <div className="aspect-[2/3] relative bg-gray-800">
        {sticker.image_url ? (
          <img
            src={sticker.image_url}
            alt={sticker.code}
            className="h-full w-full object-cover"
            loading="lazy"
          />
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
          <div className="absolute inset-0 ring-2 ring-green-500 rounded-lg pointer-events-none" />
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
    </>
  );

  if (selectable && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`group relative rounded-lg border overflow-hidden text-left transition-all ${
          selected
            ? "border-green-500"
            : "border-white/10 hover:scale-[1.03] hover:border-white/20"
        }`}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div className="group relative rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:scale-[1.03] hover:border-white/20 transition-all">
      {innerContent}
    </div>
  );
}
