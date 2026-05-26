"use client";

import { useState, useEffect } from "react";
import { ChevronsUpDown, Check, Search, BookOpen, List } from "lucide-react";
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
import { ProfileStickersList } from "./profile-stickers-list";
import { ProfileStickersAlbum } from "./profile-stickers-album";

interface Group {
  id: number;
  name: string;
  code: string;
}

type ViewMode = "list" | "album";

const VIEW_MODE_STORAGE_KEY = "profileViewMode";

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
  tradeDuplicatesCount = null,
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
  tradeDuplicatesCount?: number | null;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

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

  // Trade UI só faz sentido no modo lista — força lista quando trade está ativo.
  const effectiveViewMode: ViewMode = tradeUIEnabled ? "list" : viewMode;

  // Para o modo álbum, o "viewer" é a pessoa logada — seja ela o próprio dono
  // ou outra pessoa. A RPC do álbum aceita viewer == owner e devolve a contagem
  // certa pra renderizar o estado de posse do card.
  const albumViewerId: string | null =
    effectiveViewMode === "album" && isLoggedIn && viewerId === null
      ? userId
      : viewerId;

  return (
    <div className="space-y-4 pb-32">
      {/* Header com filtros compartilhados + toggle de view */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        {!tradeUIEnabled && (
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
        )}
      </div>

      {effectiveViewMode === "list" ? (
        <ProfileStickersList
          userId={userId}
          viewerId={viewerId}
          tradeUIEnabled={tradeUIEnabled}
          tradeFilterActive={tradeFilterActive}
          isLoggedIn={isLoggedIn}
          ownerUsername={ownerUsername}
          ownerHasTradeable={ownerHasTradeable}
          missingCount={missingCount}
          duplicatesCount={duplicatesCount}
          tradeDuplicatesCount={tradeDuplicatesCount}
          groupId={groupId}
          keyword={keyword}
        />
      ) : (
        <ProfileStickersAlbum
          userId={userId}
          viewerId={albumViewerId}
          groupId={groupId}
          keyword={keyword}
        />
      )}
    </div>
  );
}
