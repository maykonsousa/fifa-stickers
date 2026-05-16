"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Search, Loader2 } from "lucide-react";

export type PickerMode = "want" | "offer";

interface StickerRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  group_name: string;
  duplicate_count: number;
  total_count: number;
}

interface SelectedItem {
  sticker_id: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: PickerMode;
  ownerUserId: string;
  selected: SelectedItem[];
  onToggle: (sticker: StickerRow) => void;
  /** Mapa sticker_id → quantos o viewer tem na coleção dele. Pra badges visuais. */
  viewerOwnedCounts: Record<number, number>;
}

const PAGE_SIZE = 20;

export function ProposalStickerPicker({
  open, onOpenChange, mode, ownerUserId, selected, onToggle, viewerOwnedCounts,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<StickerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const versionRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tab = mode === "want" ? "duplicates" : "missing";

  useEffect(() => {
    if (!open) return;
    const v = ++versionRef.current;
    pageRef.current = 1;
    setRows([]);
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers", {
        p_user_id: ownerUserId,
        p_tab: tab,
        p_group_id: null,
        p_keyword: keyword || null,
        p_page: 1,
        p_page_size: PAGE_SIZE,
        p_viewer_id: null, // queremos a lista BRUTA do dono, sem interseção
      })
      .then(({ data }) => {
        if (v !== versionRef.current) return;
        const list = (data as StickerRow[] | null) ?? [];
        setRows(list);
        setTotalCount(list[0]?.total_count ?? 0);
        setLoading(false);
      });
  }, [open, ownerUserId, tab, keyword]);

  const hasMore = rows.length < totalCount;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      const v = ++versionRef.current;
      const nextPage = pageRef.current + 1;
      setLoading(true);
      const supabase = createClient();
      supabase
        .rpc("get_public_stickers", {
          p_user_id: ownerUserId,
          p_tab: tab,
          p_group_id: null,
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
    }, { rootMargin: "200px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, ownerUserId, tab, keyword]);

  const selectedIds = new Set(selected.map((s) => s.sticker_id));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-white/10 max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="text-white">
            {mode === "want" ? "Escolha o que você quer" : "Escolha o que você oferece"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-3 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Buscar por código..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {rows.map((sticker) => {
              const isSelected = selectedIds.has(sticker.id);
              const viewerHas = viewerOwnedCounts[sticker.id] ?? 0;
              let badgeLabel: string;
              if (viewerHas === 0) badgeLabel = "Falta";
              else if (viewerHas === 1) badgeLabel = "Você tem";
              else badgeLabel = `Repetida ×${viewerHas - 1}`;

              return (
                <button
                  type="button"
                  key={sticker.id}
                  onClick={() => onToggle(sticker)}
                  className={`relative rounded-lg border overflow-hidden transition-all ${
                    isSelected
                      ? "border-brand-grass ring-2 ring-brand-grass"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="aspect-[2/3] bg-gray-800">
                    {sticker.image_url ? (
                      <img src={sticker.image_url} alt={sticker.code} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/30 text-xs">{sticker.code}</div>
                    )}
                  </div>
                  <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                    {badgeLabel}
                  </div>
                  {mode === "want" && sticker.duplicate_count > 0 && (
                    <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
                      ×{sticker.duplicate_count}
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-2">
                    <span className="text-[10px] font-bold text-white">{sticker.code}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            </div>
          )}

          {!loading && rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Nenhuma figurinha encontrada.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
