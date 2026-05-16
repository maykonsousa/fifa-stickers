"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { Counterparty, Swap, TradeItem } from "../lib/types";

interface Props {
  counterparty: Counterparty;
  swaps: Swap[];
  onBack: () => void;
  onConfirm: (items: TradeItem[]) => Promise<void>;
}

function flattenSwaps(swaps: Swap[]): TradeItem[] {
  const map = new Map<string, TradeItem>();
  for (const swap of swaps) {
    for (const it of swap.given) {
      const key = `given:${it.sticker_id}`;
      const prev = map.get(key);
      map.set(key, {
        sticker_id: it.sticker_id,
        direction: "given",
        quantity: (prev?.quantity ?? 0) + it.quantity,
      });
    }
    for (const it of swap.received) {
      const key = `received:${it.sticker_id}`;
      const prev = map.get(key);
      map.set(key, {
        sticker_id: it.sticker_id,
        direction: "received",
        quantity: (prev?.quantity ?? 0) + it.quantity,
      });
    }
  }
  return Array.from(map.values());
}

export function StepReview({ counterparty, swaps, onBack, onConfirm }: Props) {
  const items = useMemo(() => flattenSwaps(swaps), [swaps]);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLabels() {
      const supabase = createClient();
      const ids = Array.from(new Set(items.map((i) => i.sticker_id)));
      const { data } = await supabase.from("stickers").select("id, code, title").in("id", ids);
      const map: Record<number, string> = {};
      for (const s of data ?? []) {
        map[s.id as number] = `#${s.code}${s.title ? ` ${s.title}` : ""}`;
      }
      setLabels(map);
    }
    loadLabels();
  }, [items]);

  const given = items.filter((i) => i.direction === "given");
  const received = items.filter((i) => i.direction === "received");

  const totalGiven = given.reduce((sum, i) => sum + i.quantity, 0);
  const totalReceived = received.reduce((sum, i) => sum + i.quantity, 0);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(items);
    } finally {
      setSubmitting(false);
    }
  }

  const counterpartyName =
    counterparty.type === "member" ? counterparty.display_name : counterparty.name;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Confira antes de confirmar</h2>
        <p className="text-sm text-gray-400">Com: {counterpartyName}</p>
        <p className="text-xs text-gray-500">{counterparty.email}</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Você deu ({totalGiven} {totalGiven === 1 ? "figurinha" : "figurinhas"})
          </p>
          <ul className="mt-1 text-sm text-white space-y-1">
            {given.map((i) => (
              <li key={`g-${i.sticker_id}`}>
                {labels[i.sticker_id] ?? `#${i.sticker_id}`} ×{i.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Você recebeu ({totalReceived} {totalReceived === 1 ? "figurinha" : "figurinhas"})
          </p>
          <ul className="mt-1 text-sm text-white space-y-1">
            {received.map((i) => (
              <li key={`r-${i.sticker_id}`}>
                {labels[i.sticker_id] ?? `#${i.sticker_id}`} ×{i.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-brand-gold/20 bg-brand-gold/5 p-3 text-xs text-brand-gold">
        {counterparty.type === "member" ? (
          <>{counterpartyName.split(" ")[0]} vai ser notificado por email. Sua coleção será atualizada.</>
        ) : (
          <>Vamos enviar um email pra {counterpartyName.split(" ")[0]} convidando ela pro app. Sua coleção será atualizada.</>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-brand-grass text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar troca
        </button>
      </div>
    </div>
  );
}
