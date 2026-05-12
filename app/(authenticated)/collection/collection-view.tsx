"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { ChevronsUpDown, Check } from "lucide-react";
import { PaginationControl } from "@/components/ui/pagination";

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

const PAGE_SIZE = 10;

export function CollectionView({
  groups,
  userId,
}: {
  groups: Group[];
  userId: string;
}) {
  const [keyword, setKeyword] = useState("");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<StickerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchStickers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("search_stickers", {
      p_user_id: userId,
      p_keyword: keyword || null,
      p_group_id: groupId,
      p_status: status,
      p_page: page,
      p_page_size: PAGE_SIZE,
    });
    if (data && data.length > 0) {
      setResults(data as StickerResult[]);
      setTotalCount((data as StickerResult[])[0].total_count);
    } else {
      setResults([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [userId, keyword, groupId, status, page]);

  useEffect(() => {
    fetchStickers();
  }, [fetchStickers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleFilterChange = (setter: () => void) => {
    setter();
    setPage(1);
  };

  const handleAdd = async (stickerId: number) => {
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, sticker_id: stickerId });
    await fetchStickers();
    setAdding(false);
  };

  const handleRemove = async (stickerId: number) => {
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
    await fetchStickers();
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Coleção</h1>
        <p className="mt-1 text-sm text-gray-400">
          Navegue pela lista e gerencie suas figurinhas.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Buscar por código ou nome..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <Popover open={groupOpen} onOpenChange={setGroupOpen}>
          <PopoverTrigger
            className="flex w-full sm:w-52 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          >
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
                      handleFilterChange(() => setGroupId(null));
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
                        handleFilterChange(() => setGroupId(g.id));
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
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger
            className="flex w-full sm:w-36 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          >
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
                  handleFilterChange(() => setStatus(opt.value));
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
      </div>

      {/* Sticker grid */}
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {results.map((sticker) => {
          const hasIt = sticker.owned_count > 0;
          const isDuplicate = sticker.owned_count > 1;

          const borderClass = hasIt
            ? isDuplicate
              ? "border-2 border-transparent bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
              : "border-2 border-transparent bg-gradient-to-br from-gray-300 via-white to-gray-400"
            : "border border-white/10";

          return (
            <div
              key={sticker.id}
              className="group relative"
            >
              {/* Outer border (gradient for metallic effect) */}
              <div
                className={`rounded-lg p-[2px] cursor-pointer ${hasIt ? borderClass : ""}`}
                onClick={() => !adding && handleAdd(sticker.id)}
              >
                <div
                  className={`relative aspect-[2/3] overflow-hidden rounded-lg ${
                    hasIt ? "bg-gray-800" : "bg-gray-800/50 border border-white/10 opacity-50"
                  }`}
                >
                  {/* Content */}
                  {sticker.image_url ? (
                    <img
                      src={sticker.image_url}
                      alt={sticker.code}
                      className={`h-full w-full object-cover ${!hasIt ? "grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-start p-3 pt-2">
                      {/* Top: code */}
                      <span className="text-sm font-bold text-white/50">{sticker.code}</span>

                      {/* Center: person icon */}
                      <div className="flex flex-1 w-full items-center justify-center -mt-2">
                        <svg className="h-20 w-20 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                      </div>

                      {/* Bottom: name and description */}
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

                  {/* Code badge (when has image) */}
                  {sticker.image_url && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                      <span className="text-[10px] font-bold text-white">{sticker.code}</span>
                    </div>
                  )}

                  {/* Duplicate badge */}
                  {isDuplicate && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
                      {sticker.owned_count - 1}
                    </span>
                  )}

                  {/* Hover shine effect */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-2 flex justify-center gap-2">
                <button
                  onClick={() => handleAdd(sticker.id)}
                  disabled={adding}
                  className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                >
                  +
                </button>
                {hasIt && (
                  <button
                    onClick={() => handleRemove(sticker.id)}
                    disabled={adding}
                    className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                  >
                    −
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">Nenhuma figurinha encontrada para os filtros selecionados.</p>
        </div>
      )}

      {/* Pagination */}
      <PaginationControl
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={loading}
      />
    </div>
  );
}
