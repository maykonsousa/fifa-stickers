"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Search, X } from "lucide-react";
import type { StickerOption } from "../lib/types";

interface StickerPickerProps {
  trigger: React.ReactNode;
  ownerUserId: string | null;  // Se null, sem hint de coleção (catálogo puro)
  ownerLabel?: string;          // "Sua coleção" ou "Coleção de Pedro"
  onSelect: (sticker: StickerOption, quantity: number) => void;
}

export function StickerPicker({ trigger, ownerUserId, ownerLabel, onSelect }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<StickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StickerOption | null>(null);
  const [quantity, setQuantity] = useState(1);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_stickers", {
      p_user_id: ownerUserId ?? "00000000-0000-0000-0000-000000000000",
      p_keyword: q || null,
      p_group_id: null,
      p_status: null,
      p_page: 1,
      p_page_size: 30,
    });
    if (!error) {
      setResults((data ?? []) as StickerOption[]);
    }
    setLoading(false);
  }, [ownerUserId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(keyword), 250);
    return () => clearTimeout(t);
  }, [keyword, open, search]);

  function handleConfirm() {
    if (!selected) return;
    onSelect(selected, quantity);
    setOpen(false);
    setSelected(null);
    setQuantity(1);
    setKeyword("");
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Selecionar figurinha</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Buscar por número ou nome..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          {!selected ? (
            <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
              {ownerLabel && (
                <p className="text-xs uppercase tracking-wide text-gray-500 pt-2">{ownerLabel}</p>
              )}
              {loading && <p className="text-sm text-gray-400 py-4 text-center">Buscando...</p>}
              {!loading && results.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum resultado.</p>
              )}
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10 flex items-center gap-3"
                >
                  <span className="text-sm font-mono text-gray-300">#{s.code}</span>
                  <span className="text-sm text-white flex-1 truncate">{s.title ?? `Sticker ${s.number}`}</span>
                  {ownerUserId && s.owned_count > 0 && (
                    <span className="text-xs text-green-400">
                      {s.owned_count} {s.owned_count === 1 ? "cópia" : "cópias"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-gray-300">#{selected.code}</p>
                  <p className="text-base text-white truncate">{selected.title ?? `Sticker ${selected.number}`}</p>
                  {ownerUserId && (
                    <p className="text-xs text-gray-400">
                      {selected.owned_count} {selected.owned_count === 1 ? "cópia disponível" : "cópias disponíveis"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-md hover:bg-white/10 flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500">Quantidade</label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center px-2 py-2 rounded-md border border-white/10 bg-white/5 text-white"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
