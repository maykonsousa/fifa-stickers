"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { StickerPicker } from "./sticker-picker";
import type { Counterparty, StickerOption, Swap } from "../lib/types";

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

  function removeSticker(swapIndex: number, side: "given" | "received", stickerId: number) {
    updateSwap(swapIndex, {
      [side]: swaps[swapIndex][side].filter((it) => it.sticker_id !== stickerId),
    });
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
        {swaps.map((swap, idx) => (
          <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
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

            <SideEditor
              title="Dei"
              items={swap.given}
              ownerUserId={initiatorUserId}
              ownerLabel="Sua coleção"
              onAdd={(s, q) => addSticker(idx, "given", s, q)}
              onRemove={(stickerId) => removeSticker(idx, "given", stickerId)}
            />

            <SideEditor
              title="Recebi"
              items={swap.received}
              ownerUserId={counterpartyId}
              ownerLabel={counterpartyLabel}
              onAdd={(s, q) => addSticker(idx, "received", s, q)}
              onRemove={(stickerId) => removeSticker(idx, "received", stickerId)}
            />
          </div>
        ))}

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
          className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function SideEditor({
  title,
  items,
  ownerUserId,
  ownerLabel,
  onAdd,
  onRemove,
}: {
  title: string;
  items: { sticker_id: number; quantity: number }[];
  ownerUserId: string | null;
  ownerLabel?: string;
  onAdd: (sticker: StickerOption, quantity: number) => void;
  onRemove: (stickerId: number) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{title}</p>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.sticker_id} className="flex items-center justify-between px-2 py-1 rounded bg-white/5">
            <span className="text-sm text-white">
              <span className="font-mono text-gray-300">#{it.sticker_id}</span> ×{it.quantity}
            </span>
            <button
              onClick={() => onRemove(it.sticker_id)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Remover"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        ))}
        <StickerPicker
          ownerUserId={ownerUserId}
          ownerLabel={ownerLabel}
          onSelect={onAdd}
          trigger={
            <button className="text-xs text-green-400 hover:text-green-300 px-2 py-1">
              + figurinha
            </button>
          }
        />
      </div>
    </div>
  );
}
