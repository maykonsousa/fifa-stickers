"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createProposalAction } from "@/app/(authenticated)/proposals/lib/create-proposal-action";
import type { ProposalItem } from "@/app/(authenticated)/proposals/lib/types";

type ViewerFilter = "all" | "owned" | "duplicates";

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

interface SelectedSticker {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
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
  tradeDuplicatesCount?: number | null;
  viewerOwnedCounts?: Record<number, number>;
}) {
  const router = useRouter();
  const initialTab: "missing" | "duplicates" = tradeUIEnabled ? "duplicates" : "missing";
  const [tab, setTab] = useState<"missing" | "duplicates">(initialTab);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [viewerFilter, setViewerFilter] = useState<ViewerFilter>(
    isLoggedIn ? "duplicates" : "all",
  );
  const [results, setResults] = useState<StickerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wants, setWants] = useState<SelectedSticker[]>([]);
  const [offers, setOffers] = useState<SelectedSticker[]>([]);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pageRef = useRef(1);
  const fetchVersionRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tabDuplicatesCount = tradeFilterActive
    ? tradeDuplicatesCount ?? 0
    : duplicatesCount;

  const wantsSelectable = tradeUIEnabled && tab === "duplicates" && ownerHasTradeable;
  const offersSelectable = tradeUIEnabled && tab === "missing" && missingCount > 0;

  const hasMore = results.length < totalCount;
  const isInitialLoad = loading && results.length === 0;
  const isLoadingMore = loading && results.length > 0;

  // The viewer filter only applies on the missing tab with a logged viewer.
  const effectiveViewerFilter: ViewerFilter =
    tab === "missing" && isLoggedIn ? viewerFilter : "all";

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
        p_viewer_filter: effectiveViewerFilter,
      })
      .then(({ data }) => {
        if (myVersion !== fetchVersionRef.current) return;
        const rows = (data as StickerResult[] | null) ?? [];
        setResults(rows);
        setTotalCount(rows[0]?.total_count ?? 0);
        setLoading(false);
      });
  }, [userId, tab, groupId, keyword, viewerId, effectiveViewerFilter]);

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
            p_viewer_filter: effectiveViewerFilter,
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
  }, [loading, hasMore, userId, tab, groupId, keyword, viewerId, effectiveViewerFilter]);

  const toPicked = (sticker: StickerResult): SelectedSticker => ({
    sticker_id: sticker.id,
    code: sticker.code,
    title: sticker.title,
    image_url: sticker.image_url,
  });

  const toggleWant = (sticker: StickerResult) => {
    setWants((prev) => {
      const exists = prev.some((x) => x.sticker_id === sticker.id);
      return exists
        ? prev.filter((x) => x.sticker_id !== sticker.id)
        : [...prev, toPicked(sticker)];
    });
  };

  const toggleOffer = (sticker: StickerResult) => {
    setOffers((prev) => {
      const exists = prev.some((x) => x.sticker_id === sticker.id);
      return exists
        ? prev.filter((x) => x.sticker_id !== sticker.id)
        : [...prev, toPicked(sticker)];
    });
  };

  const selectedIds = tab === "duplicates"
    ? new Set(wants.map((x) => x.sticker_id))
    : new Set(offers.map((x) => x.sticker_id));

  const handleCardToggle = (sticker: StickerResult) => {
    if (tab === "duplicates") toggleWant(sticker);
    else toggleOffer(sticker);
  };

  const goToOffersStep = () => {
    setTab("missing");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submitProposal = () => {
    if (wants.length === 0 || offers.length === 0 || submitting) return;
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    setSubmitError(null);
    const items: ProposalItem[] = [
      ...wants.map((x) => ({ sticker_id: x.sticker_id, direction: "want" as const, quantity: 1 })),
      ...offers.map((x) => ({ sticker_id: x.sticker_id, direction: "offer" as const, quantity: 1 })),
    ];
    startTransition(async () => {
      try {
        const id = await createProposalAction({ ownerUserId: userId, items });
        router.push(`/proposals/${id}`);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Erro ao enviar proposta");
      }
    });
  };

  // Tabs: when trade UI is enabled, show Repetidas first.
  const tabsOrder: ("duplicates" | "missing")[] = tradeUIEnabled
    ? ["duplicates", "missing"]
    : ["missing", "duplicates"];

  return (
    <div className="space-y-4 pb-32">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabsOrder.map((t) => {
          const label = t === "missing"
            ? `Faltam (${missingCount})`
            : `Repetidas (${tabDuplicatesCount})`;
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

      {/* Step hints */}
      {tab === "duplicates" && tradeUIEnabled && ownerHasTradeable && (
        <p className="text-xs text-gray-400">
          <span className="font-medium text-white">1.</span> Toque pra selecionar o que você quer trocar com{" "}
          <span className="font-medium text-white">@{ownerUsername}</span>.
          {tradeFilterActive && " Mostrando só repetidas dele que você ainda não tem."}
        </p>
      )}
      {tab === "missing" && tradeUIEnabled && (
        <p className="text-xs text-gray-400">
          <span className="font-medium text-white">2.</span> Toque pra selecionar o que você oferece pra{" "}
          <span className="font-medium text-white">@{ownerUsername}</span>.
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
        {tab === "missing" && tradeUIEnabled && isLoggedIn && (
          <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              className="accent-green-500"
            />
            Só as que tenho
          </label>
        )}
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 transition-opacity ${isInitialLoad ? "opacity-50" : ""}`}>
        {results.map((sticker) => {
          const selectable = tab === "duplicates" ? wantsSelectable : offersSelectable;
          const showOwnership = tab === "missing" && isLoggedIn;
          return (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              selectable={selectable}
              selected={selectedIds.has(sticker.id)}
              onToggle={selectable ? () => handleCardToggle(sticker) : undefined}
              ownedCount={showOwnership ? viewerOwnedCounts[sticker.id] ?? 0 : null}
            />
          );
        })}
      </div>

      {/* Empty */}
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 text-sm">
            {tab === "missing" && effectiveViewerFilter === "duplicates"
              ? "Nenhuma repetida sua bate com o que falta pra ele. Mude o filtro pra ver mais."
              : tab === "missing" && effectiveViewerFilter === "owned"
                ? "Você não tem nenhuma das figurinhas que faltam pra ele. Mude o filtro pra ver todas."
                : tab === "duplicates" && tradeFilterActive
                  ? "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria."
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
          <div className="mx-auto max-w-4xl flex flex-col gap-2">
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <StickyStatus
                  tab={tab}
                  wantsCount={wants.length}
                  offersCount={offers.length}
                  ownerUsername={ownerUsername}
                  ownerHasTradeable={ownerHasTradeable}
                />
              </div>
              <StickyAction
                tab={tab}
                wantsCount={wants.length}
                offersCount={offers.length}
                submitting={submitting}
                onNext={goToOffersStep}
                onSubmit={submitProposal}
              />
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Quase lá! Faça login pra enviar a proposta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Trocas no faltaUma só rolam entre colecionadores cadastrados. Crie sua conta
              grátis em segundos, monte seu álbum e mande sua proposta pra{" "}
              <span className="font-medium text-white">@{ownerUsername}</span>.
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
    </div>
  );
}

function StickyStatus({
  tab,
  wantsCount,
  offersCount,
  ownerUsername,
  ownerHasTradeable,
}: {
  tab: "missing" | "duplicates";
  wantsCount: number;
  offersCount: number;
  ownerUsername: string;
  ownerHasTradeable: boolean;
}) {
  if (tab === "duplicates") {
    if (!ownerHasTradeable) {
      return (
        <p className="text-xs text-gray-400">
          @{ownerUsername} não tem trocas viáveis no momento.
        </p>
      );
    }
    if (wantsCount === 0) {
      return (
        <p className="text-xs text-gray-400">
          Selecione o que você quer trocar com @{ownerUsername}.
        </p>
      );
    }
    return (
      <p className="text-sm text-white">
        <span className="font-semibold">{wantsCount}</span>{" "}
        {wantsCount === 1 ? "figurinha selecionada" : "figurinhas selecionadas"}
      </p>
    );
  }

  // missing tab
  if (wantsCount === 0) {
    return (
      <p className="text-xs text-gray-400">
        Volte pra aba <span className="font-medium text-white">Repetidas</span> e selecione o que quer.
      </p>
    );
  }
  if (offersCount === 0) {
    return (
      <p className="text-xs text-gray-400">
        Agora selecione o que você oferece pra @{ownerUsername}.
      </p>
    );
  }
  return (
    <p className="text-sm text-white">
      <span className="font-semibold">{wantsCount}</span> por{" "}
      <span className="font-semibold">{offersCount}</span>{" "}
      {offersCount === 1 ? "figurinha" : "figurinhas"}
    </p>
  );
}

function StickyAction({
  tab,
  wantsCount,
  offersCount,
  submitting,
  onNext,
  onSubmit,
}: {
  tab: "missing" | "duplicates";
  wantsCount: number;
  offersCount: number;
  submitting: boolean;
  onNext: () => void;
  onSubmit: () => void;
}) {
  if (tab === "duplicates") {
    return (
      <button
        type="button"
        onClick={onNext}
        disabled={wantsCount === 0}
        className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        Próximo
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={wantsCount === 0 || offersCount === 0 || submitting}
      className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
    >
      {submitting ? "Enviando..." : "Enviar proposta"}
    </button>
  );
}

function StickerCard({
  sticker,
  selectable = false,
  selected = false,
  onToggle,
  ownedCount = null,
}: {
  sticker: StickerResult;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  ownedCount?: number | null;
}) {
  const showOwnership = ownedCount !== null;
  const hasIt = showOwnership && ownedCount > 0;
  const isDuplicate = showOwnership && ownedCount > 1;

  const ownershipWrap = showOwnership
    ? hasIt
      ? isDuplicate
        ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
      : "bg-white/10"
    : "";

  const innerContent = (
    <>
      <div className={`aspect-[2/3] relative ${showOwnership && !hasIt ? "bg-gray-800/50" : "bg-gray-800"}`}>
        {sticker.image_url ? (
          <img
            src={sticker.image_url}
            alt={sticker.code}
            className={`h-full w-full object-cover ${showOwnership && !hasIt ? "grayscale opacity-70" : ""}`}
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
          <div className="absolute inset-0 ring-2 ring-green-500 rounded-md pointer-events-none" />
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

  const wrapperBase = showOwnership
    ? `group relative rounded-lg p-[2px] overflow-hidden transition-all ${ownershipWrap}`
    : `group relative rounded-lg border overflow-hidden transition-all ${
        selectable && selected
          ? "border-green-500"
          : "border-white/10 hover:scale-[1.03] hover:border-white/20"
      }`;

  if (selectable && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`${wrapperBase} text-left`}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div className={wrapperBase}>
      {innerContent}
    </div>
  );
}
