"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { addStickersToCollectionAction } from "../lib/add-to-collection-action";
import type { TradeItem } from "../lib/types";

interface Props {
  receivedItems: TradeItem[];
  onDone: () => void;
}

interface StickerLabel {
  id: number;
  code: string;
  title: string | null;
}

export function StepAddToCollection({ receivedItems, onDone }: Props) {
  const [stickers, setStickers] = useState<StickerLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(receivedItems.map((it) => it.sticker_id)),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLabels() {
      const supabase = createClient();
      const ids = receivedItems.map((it) => it.sticker_id);
      const { data } = await supabase
        .from("stickers")
        .select("id, code, title")
        .in("id", ids);
      setStickers((data ?? []) as StickerLabel[]);
      setLoading(false);
    }
    loadLabels();
  }, [receivedItems]);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === receivedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(receivedItems.map((it) => it.sticker_id)));
    }
  }

  async function handleAdd() {
    if (selectedIds.size === 0) {
      onDone();
      return;
    }
    setSubmitting(true);
    try {
      await addStickersToCollectionAction(Array.from(selectedIds));
      toast.success(
        `${selectedIds.size} ${selectedIds.size === 1 ? "figurinha adicionada" : "figurinhas adicionadas"} ao álbum!`,
      );
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar figurinhas.";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const allSelected = selectedIds.size === receivedItems.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-grass text-white">
            <Check className="w-4 h-4" strokeWidth={3} />
          </span>
          <h2 className="text-lg font-semibold text-white">Troca registrada!</h2>
        </div>
        <p className="text-sm text-gray-400">
          Você recebeu {receivedItems.length}{" "}
          {receivedItems.length === 1 ? "figurinha" : "figurinhas"}. Adicionar ao seu álbum agora?
        </p>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-grass" />
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            {allSelected ? "Desmarcar todas" : "Marcar todas"}
          </button>

          <ul className="space-y-1">
            {stickers.map((s) => {
              const checked = selectedIds.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 text-left"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        checked
                          ? "bg-brand-grass border-brand-grass"
                          : "border-white/20"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-sm text-white">
                      <span className="font-mono text-gray-400">#{s.code}</span>
                      {s.title && <span className="ml-2">{s.title}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Adiciona só o que você já colou no álbum físico. O restante fica registrado no histórico
        da troca e pode ser adicionado depois em <span className="font-mono">/collection</span>.
      </p>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onDone}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          Adiciono depois →
        </button>
        <button
          onClick={handleAdd}
          disabled={submitting || noneSelected || loading}
          className="px-4 py-2 rounded-lg bg-brand-grass text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
        </button>
      </div>
    </div>
  );
}
