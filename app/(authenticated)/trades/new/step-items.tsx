"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { StickerPicker } from "./sticker-picker";
import type { Counterparty, StickerOption, Swap } from "../lib/types";

function ScoreSide({
  label,
  value,
  onSelect,
  ownerUserId,
  ownerLabel,
}: {
  label: string;
  value: number;
  onSelect: (sticker: StickerOption, quantity: number) => void;
  ownerUserId: string | null;
  ownerLabel?: string;
}) {
  return (
    <StickerPicker
      ownerUserId={ownerUserId}
      ownerLabel={ownerLabel}
      onSelect={onSelect}
      trigger={
        <button
          type="button"
          className="text-center rounded-md hover:bg-white/5 active:bg-white/10 px-4 py-2 transition-colors"
        >
          <div className="font-display text-4xl text-white tabular-nums leading-none">{value}</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1 flex items-center justify-center gap-1">
            {label} <Plus className="w-3 h-3" />
          </div>
        </button>
      }
    />
  );
}

interface Props {
  counterparty: Counterparty;
  initiatorUserId: string;
  initial: Swap[];
  onComplete: (swaps: Swap[]) => void;
  onBack: () => void;
}

export function StepItems({ counterparty, initiatorUserId, initial, onComplete, onBack }: Props) {
  const [swaps, setSwaps] = useState<Swap[]>(
    initial.length ? initial : [{ given: [], received: [] }],
  );

  const counterpartyId = counterparty.type === "member" ? counterparty.id : null;
  const counterpartyLabel =
    counterparty.type === "member" ? `Coleção de ${counterparty.display_name.split(" ")[0]}` : undefined;

  function updateSwap(index: number, patch: Partial<Swap>) {
    setSwaps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSticker(swapIndex: number, side: "given" | "received", sticker: StickerOption, quantity: number) {
    const swap = swaps[swapIndex];
    const existing = swap[side].find((it) => it.sticker_id === sticker.id);
    const updated = existing
      ? swap[side].map((it) =>
          it.sticker_id === sticker.id ? { ...it, quantity: it.quantity + quantity } : it,
        )
      : [...swap[side], { sticker_id: sticker.id, quantity }];
    updateSwap(swapIndex, { [side]: updated });
  }

  function addSwap() {
    setSwaps((prev) => [...prev, { given: [], received: [] }]);
  }

  function removeSwap(index: number) {
    setSwaps((prev) => prev.filter((_, i) => i !== index));
  }

  const totalGiven = swaps.reduce((sum, s) => sum + s.given.reduce((a, b) => a + b.quantity, 0), 0);
  const totalReceived = swaps.reduce((sum, s) => sum + s.received.reduce((a, b) => a + b.quantity, 0), 0);
  const canContinue = totalGiven > 0 && totalReceived > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
        <p className="text-sm text-gray-400">
          Com: {counterparty.type === "member" ? counterparty.display_name : counterparty.name}
        </p>
      </div>

      <div className="space-y-3">
        {swaps.map((swap, idx) => {
          const givenSum = swap.given.reduce((a, b) => a + b.quantity, 0);
          const receivedSum = swap.received.reduce((a, b) => a + b.quantity, 0);
          return (
            <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Lançamento #{idx + 1}</p>
                {swaps.length > 1 && (
                  <button
                    onClick={() => removeSwap(idx)}
                    className="p-1 rounded hover:bg-white/10"
                    aria-label="Remover lançamento"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Placar — cada lado é o trigger da drawer */}
              <div className="flex items-center justify-center gap-4 py-1">
                <ScoreSide
                  label="Dei"
                  value={givenSum}
                  ownerUserId={initiatorUserId}
                  ownerLabel="Sua coleção"
                  onSelect={(s, q) => addSticker(idx, "given", s, q)}
                />
                <div className="text-2xl text-gray-500 leading-none">×</div>
                <ScoreSide
                  label="Recebi"
                  value={receivedSum}
                  ownerUserId={counterpartyId}
                  ownerLabel={counterpartyLabel}
                  onSelect={(s, q) => addSticker(idx, "received", s, q)}
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={addSwap}
          className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar lançamento
        </button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">
          ← Voltar
        </button>
        <button
          onClick={() => onComplete(swaps)}
          disabled={!canContinue}
          className="px-4 py-2 rounded-lg bg-brand-grass text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

