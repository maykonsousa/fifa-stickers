"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronsUpDown, Check, Search } from "lucide-react";
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
import { PaginationControl } from "@/components/ui/pagination";
import { TradeProposalDialog } from "./trade-proposal-dialog";

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
  tradeFilterActive = false,
  ownerUsername,
  groups,
  missingCount,
  duplicatesCount,
  tradeMissingCount = null,
  tradeDuplicatesCount = null,
}: {
  userId: string;
  viewerId?: string | null;
  tradeFilterActive?: boolean;
  ownerUsername: string;
  groups: Group[];
  missingCount: number;
  duplicatesCount: number;
  tradeMissingCount?: number | null;
  tradeDuplicatesCount?: number | null;
}) {
  const [tab, setTab] = useState<"missing" | "duplicates">("missing");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<StickerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const [tradeOpen, setTradeOpen] = useState(false);

  const effectiveMissingCount = tradeFilterActive
    ? tradeMissingCount ?? 0
    : missingCount;
  const effectiveDuplicatesCount = tradeFilterActive
    ? tradeDuplicatesCount ?? 0
    : duplicatesCount;

  const tradeButtonDisabled =
    (tradeMissingCount ?? 0) + (tradeDuplicatesCount ?? 0) === 0;

  const fetchStickers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_public_stickers", {
      p_user_id: userId,
      p_tab: tab,
      p_group_id: groupId,
      p_keyword: keyword || null,
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_viewer_id: viewerId,
    });

    if (data && data.length > 0) {
      setResults(data as StickerResult[]);
      setTotalCount((data as StickerResult[])[0].total_count);
    } else {
      setResults([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [userId, tab, groupId, keyword, page, viewerId]);

  useEffect(() => {
    fetchStickers();
  }, [fetchStickers]);

  useEffect(() => {
    setPage(1);
  }, [tab, groupId, keyword]);

  return (
    <div className="space-y-4">
      {tradeFilterActive && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-white">
            Quer trocar com <span className="font-semibold">@{ownerUsername}</span>?
          </p>
          <button
            type="button"
            disabled={tradeButtonDisabled}
            title={tradeButtonDisabled ? "Sem trocas viáveis no momento" : undefined}
            onClick={() => setTradeOpen(true)}
            className="w-full sm:w-auto rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:bg-gray-600 transition-colors"
          >
            Propor troca
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab("missing")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "missing" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Faltam ({effectiveMissingCount})
          {tab === "missing" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setTab("duplicates")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "duplicates" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Repetidas ({effectiveDuplicatesCount})
          {tab === "duplicates" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </button>
      </div>

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
                    onSelect={() => { setGroupId(null); setGroupOpen(false); }}
                  >
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

      {tradeFilterActive && (
        <p className="text-xs text-gray-400">
          Mostrando só figurinhas que combinam com seu álbum.
        </p>
      )}

      {/* Grid */}
      <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {results.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} tab={tab} />
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

      {/* Pagination */}
      <PaginationControl
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={loading}
      />

      <TradeProposalDialog open={tradeOpen} onOpenChange={setTradeOpen} />
    </div>
  );
}

function StickerCard({ sticker, tab }: { sticker: StickerResult; tab: string }) {
  return (
    <div className="group relative rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:scale-[1.03] hover:border-white/20 transition-all">
      <div className="aspect-[2/3] relative">
        {sticker.image_url ? (
          <img
            src={sticker.image_url}
            alt={sticker.code}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gray-800/50">
            <svg className="h-12 w-12 text-white/15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            <span className="text-xs text-white/40 mt-1">{sticker.code}</span>
          </div>
        )}

        {/* Player name overlay on hover */}
        {sticker.image_url && sticker.title && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="text-sm font-bold text-white text-center px-2 leading-tight">
              {sticker.title}
            </span>
          </div>
        )}

        {/* Code badge */}
        {sticker.image_url && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
            <span className="text-[10px] font-bold text-white">{sticker.code}</span>
          </div>
        )}

        {/* Duplicate badge */}
        {tab === "duplicates" && sticker.duplicate_count > 0 && (
          <span className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow">
            ×{sticker.duplicate_count}
          </span>
        )}
      </div>
    </div>
  );
}
