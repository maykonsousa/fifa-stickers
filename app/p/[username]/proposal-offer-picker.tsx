"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Search, Loader2, ChevronsUpDown, Check, X } from "lucide-react";
import { createProposalAction } from "@/app/(authenticated)/proposals/lib/create-proposal-action";
import type { ProposalItem } from "@/app/(authenticated)/proposals/lib/types";

interface Group {
  id: number;
  name: string;
  code: string;
}

interface StickerRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  group_name: string;
  duplicate_count: number;
  total_count: number;
}

export interface SelectedWant {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

interface SelectedOffer {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerUserId: string;
  ownerDisplayName: string;
  groups: Group[];
  viewerOwnedCounts: Record<number, number>;
  wants: SelectedWant[];
  isLoggedIn?: boolean;
}

const PAGE_SIZE = 24;

export function ProposalOfferPicker({
  open,
  onOpenChange,
  ownerUserId,
  ownerDisplayName,
  groups,
  viewerOwnedCounts,
  wants,
  isLoggedIn = true,
}: Props) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [rows, setRows] = useState<StickerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<SelectedOffer[]>([]);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const pageRef = useRef(1);
  const versionRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset selection and filters when drawer closes.
  useEffect(() => {
    if (!open) {
      setOffers([]);
      setKeyword("");
      setGroupId(null);
      setOnlyOwned(false);
      setError(null);
    }
  }, [open]);

  // Initial / filter-change fetch.
  useEffect(() => {
    if (!open) return;
    const v = ++versionRef.current;
    pageRef.current = 1;
    setRows([]);
    setTotalCount(0);
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers", {
        p_user_id: ownerUserId,
        p_tab: "missing",
        p_group_id: groupId,
        p_keyword: keyword || null,
        p_page: 1,
        p_page_size: PAGE_SIZE,
        p_viewer_id: null,
      })
      .then(({ data }) => {
        if (v !== versionRef.current) return;
        const list = (data as StickerRow[] | null) ?? [];
        setRows(list);
        setTotalCount(list[0]?.total_count ?? 0);
        setLoading(false);
      });
  }, [open, ownerUserId, groupId, keyword]);

  const hasMore = rows.length < totalCount;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const v = ++versionRef.current;
        const nextPage = pageRef.current + 1;
        setLoading(true);
        const supabase = createClient();
        supabase
          .rpc("get_public_stickers", {
            p_user_id: ownerUserId,
            p_tab: "missing",
            p_group_id: groupId,
            p_keyword: keyword || null,
            p_page: nextPage,
            p_page_size: PAGE_SIZE,
            p_viewer_id: null,
          })
          .then(({ data }) => {
            if (v !== versionRef.current) return;
            const list = (data as StickerRow[] | null) ?? [];
            pageRef.current = nextPage;
            setRows((prev) => [...prev, ...list]);
            setLoading(false);
          });
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, ownerUserId, groupId, keyword]);

  const toggleOffer = (sticker: StickerRow) => {
    setOffers((prev) => {
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

  const removeOffer = (stickerId: number) => {
    setOffers((prev) => prev.filter((x) => x.sticker_id !== stickerId));
  };

  const submit = () => {
    if (wants.length === 0 || offers.length === 0 || submitting) return;
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    setError(null);
    const items: ProposalItem[] = [
      ...wants.map((x) => ({ sticker_id: x.sticker_id, direction: "want" as const, quantity: 1 })),
      ...offers.map((x) => ({ sticker_id: x.sticker_id, direction: "offer" as const, quantity: 1 })),
    ];
    startTransition(async () => {
      try {
        const id = await createProposalAction({ ownerUserId, items });
        router.push(`/proposals/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao enviar proposta");
      }
    });
  };


  const visibleRows = onlyOwned
    ? rows.filter((s) => (viewerOwnedCounts[s.id] ?? 0) > 0)
    : rows;

  const selectedIds = new Set(offers.map((o) => o.sticker_id));

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-white/10 max-h-[92vh]">
        <DrawerHeader className="pb-3">
          <DrawerTitle className="text-white text-base">
            O que você oferece pra {ownerDisplayName}?
          </DrawerTitle>
          <p className="text-xs text-gray-400 mt-1">
            Só aparecem figurinhas que faltam no álbum dele.
          </p>
        </DrawerHeader>

        <div className="px-4 pb-32 space-y-3 overflow-y-auto">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
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
              <PopoverTrigger className="flex w-full sm:w-44 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
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
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={onlyOwned}
                onChange={(e) => setOnlyOwned(e.target.checked)}
                className="accent-green-500"
              />
              Só as que tenho
            </label>
          </div>

          {/* Selected offers list */}
          {offers.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-xs font-medium text-white">Selecionadas ({offers.length})</p>
              <ul className="space-y-1.5">
                {offers.map((item) => (
                  <li key={item.sticker_id} className="flex items-center gap-2">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.code} className="h-8 w-6 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-6 rounded bg-white/10" />
                    )}
                    <p className="flex-1 text-xs text-white truncate">
                      #{item.code} {item.title ?? ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeOffer(item.sticker_id)}
                      className="h-6 w-6 rounded text-gray-400 hover:text-red-400 flex items-center justify-center"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
            {visibleRows.map((sticker) => {
              const isSelected = selectedIds.has(sticker.id);
              const ownedCount = viewerOwnedCounts[sticker.id] ?? 0;
              const hasIt = ownedCount > 0;
              const isDuplicate = ownedCount > 1;
              const ownershipBorder = hasIt
                ? isDuplicate
                  ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
                  : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
                : "bg-white/10";
              return (
                <button
                  type="button"
                  key={sticker.id}
                  onClick={() => toggleOffer(sticker)}
                  aria-pressed={isSelected}
                  className={`relative rounded-lg p-[2px] overflow-hidden transition-all ${ownershipBorder} ${
                    isSelected ? "ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900" : "hover:opacity-90"
                  }`}
                >
                  <div className={`relative aspect-[2/3] overflow-hidden rounded-md ${hasIt ? "bg-gray-800" : "bg-gray-800/50 opacity-60"}`}>
                    {sticker.image_url ? (
                      <img
                        src={sticker.image_url}
                        alt={sticker.code}
                        className={`h-full w-full object-cover ${!hasIt ? "grayscale" : ""}`}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-1">
                        <svg className="h-8 w-8 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-1.5">
                      <span className="text-[9px] font-bold text-white">{sticker.code}</span>
                    </div>
                    {isDuplicate && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow">
                        {ownedCount - 1}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white shadow">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!loading && visibleRows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              {onlyOwned
                ? "Você não tem nenhuma figurinha que falta pra ele com esses filtros."
                : "Nenhuma figurinha encontrada."}
            </p>
          )}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            </div>
          )}
        </div>

        {/* Sticky submit bar */}
        <div className="absolute bottom-0 inset-x-0 border-t border-white/10 bg-gray-900/95 backdrop-blur px-4 py-3 space-y-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              {wants.length} {wants.length === 1 ? "figurinha" : "figurinhas"} por {offers.length}{" "}
              {offers.length === 1 ? "figurinha" : "figurinhas"}
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={offers.length === 0 || submitting}
              className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Enviando..." : "Enviar proposta"}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>

    <AlertDialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
      <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Quase lá! Faça login pra enviar a proposta
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Trocas no faltaUma só rolam entre colecionadores cadastrados. Crie sua conta
            grátis em segundos, monte seu álbum e mande sua proposta pra{" "}
            <span className="font-medium text-white">{ownerDisplayName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
            Agora não
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => router.push("/login")}
            className="bg-yellow-400 text-zinc-900 hover:bg-yellow-300"
          >
            Entrar e começar meu álbum
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
