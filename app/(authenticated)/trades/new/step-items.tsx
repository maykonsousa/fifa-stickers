"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { StickerPicker } from "./sticker-picker";
import type { Counterparty, StickerOption, Swap } from "../lib/types";

function ScoreSide({
  label,
  value,
  selectedStickerIds,
  onToggle,
  ownerUserId,
  ownerLabel,
}: {
  label: string;
  value: number;
  selectedStickerIds: number[];
  onToggle: (sticker: StickerOption) => void;
  ownerUserId: string | null;
  ownerLabel?: string;
}) {
  return (
    <StickerPicker
      ownerUserId={ownerUserId}
      ownerLabel={ownerLabel}
      selectedStickerIds={selectedStickerIds}
      onToggle={onToggle}
      trigger={
        <button
          type="button"
          className="flex-1 text-center rounded-lg hover:bg-white/5 active:bg-white/10 px-4 sm:px-6 py-4 transition-colors"
        >
          <div className="font-display text-6xl sm:text-7xl text-white tabular-nums leading-none">
            {value}
          </div>
          <div className="text-xs sm:text-sm uppercase tracking-wider text-gray-300 mt-2 flex items-center justify-center gap-1 truncate">
            {label} <Plus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          </div>
        </button>
      }
    />
  );
}

interface Props {
  counterparty: Counterparty;
  initiatorUserId: string;
  initiatorName: string;
  initial: Swap[];
  onComplete: (swaps: Swap[]) => void;
  onBack: () => void;
}

export function StepItems({
  counterparty,
  initiatorUserId,
  initiatorName,
  initial,
  onComplete,
  onBack,
}: Props) {
  const [swaps, setSwaps] = useState<Swap[]>(
    initial.length ? initial : [{ given: [], received: [] }],
  );

  const counterpartyId = counterparty.type === "member" ? counterparty.id : null;
  const counterpartyFullName =
    counterparty.type === "member" ? counterparty.display_name : counterparty.name;
  const initiatorFirstName = initiatorName.split(" ")[0];
  const counterpartyFirstName = counterpartyFullName.split(" ")[0];
  const counterpartyLabel =
    counterparty.type === "member" ? `Coleção de ${counterpartyFirstName}` : undefined;

  function updateSwap(index: number, patch: Partial<Swap>) {
    setSwaps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggleSticker(swapIndex: number, side: "given" | "received", sticker: StickerOption) {
    const swap = swaps[swapIndex];
    const existing = swap[side].find((it) => it.sticker_id === sticker.id);
    const updated = existing
      ? swap[side].filter((it) => it.sticker_id !== sticker.id)
      : [...swap[side], { sticker_id: sticker.id, quantity: 1 }];
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

      <div className="space-y-4">
        {swaps.map((swap, idx) => {
          const givenSum = swap.given.reduce((a, b) => a + b.quantity, 0);
          const receivedSum = swap.received.reduce((a, b) => a + b.quantity, 0);
          return (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-gray-400">Lançamento #{idx + 1}</p>
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
              <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
                <ScoreSide
                  label={initiatorFirstName}
                  value={givenSum}
                  selectedStickerIds={swap.given.map((it) => it.sticker_id)}
                  ownerUserId={initiatorUserId}
                  ownerLabel="Sua coleção"
                  onToggle={(s) => toggleSticker(idx, "given", s)}
                />
                <div className="font-display text-3xl sm:text-4xl text-gray-500 leading-none">×</div>
                <ScoreSide
                  label={counterpartyFirstName}
                  value={receivedSum}
                  selectedStickerIds={swap.received.map((it) => it.sticker_id)}
                  ownerUserId={counterpartyId}
                  ownerLabel={counterpartyLabel}
                  onToggle={(s) => toggleSticker(idx, "received", s)}
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

