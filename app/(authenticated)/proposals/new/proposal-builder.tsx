"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProposalAction } from "../lib/create-proposal-action";
import { ProposalStickerPicker, type PickerMode } from "./proposal-sticker-picker";
import type { ProposalItem } from "../lib/types";

interface SelectedSticker {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  quantity: number;
  /** Cap superior pra stepper (duplicate_count do dono). null = sem cap. */
  maxQuantity: number | null;
}

interface Props {
  ownerUserId: string;
  ownerDisplayName: string;
  ownerUsername: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  viewerUserId: string;
  viewerOwnedCounts: Record<number, number>;
}

export function ProposalBuilder({
  ownerUserId, ownerDisplayName, ownerUsername, viewerUserId: _viewerUserId, viewerOwnedCounts,
}: Props) {
  const router = useRouter();
  const [wantItems, setWantItems] = useState<SelectedSticker[]>([]);
  const [offerItems, setOfferItems] = useState<SelectedSticker[]>([]);
  const [pickerOpen, setPickerOpen] = useState<PickerMode | null>(null);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const togglePick = (side: PickerMode, sticker: {
    id: number;
    code: string;
    title: string | null;
    image_url: string | null;
    duplicate_count: number;
  }) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) => {
      const existing = prev.find((x) => x.sticker_id === sticker.id);
      if (existing) {
        return prev.filter((x) => x.sticker_id !== sticker.id);
      }
      return [
        ...prev,
        {
          sticker_id: sticker.id,
          code: sticker.code,
          title: sticker.title,
          image_url: sticker.image_url,
          quantity: 1,
          maxQuantity: side === "want" ? sticker.duplicate_count : null,
        },
      ];
    });
  };

  const setQuantity = (side: PickerMode, stickerId: number, qty: number) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) =>
      prev.map((x) =>
        x.sticker_id === stickerId
          ? { ...x, quantity: Math.max(1, Math.min(x.maxQuantity ?? 9, qty)) }
          : x
      )
    );
  };

  const removeItem = (side: PickerMode, stickerId: number) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) => prev.filter((x) => x.sticker_id !== stickerId));
  };

  const canSubmit = wantItems.length > 0 && offerItems.length > 0 && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    const items: ProposalItem[] = [
      ...wantItems.map((x) => ({ sticker_id: x.sticker_id, direction: "want" as const, quantity: x.quantity })),
      ...offerItems.map((x) => ({ sticker_id: x.sticker_id, direction: "offer" as const, quantity: x.quantity })),
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-white">Propor troca</h1>
        <p className="text-sm text-gray-400">Para: <span className="text-white">@{ownerUsername}</span> ({ownerDisplayName})</p>
      </header>

      <Section
        title="O que você quer"
        items={wantItems}
        onAdd={() => setPickerOpen("want")}
        onRemove={(id) => removeItem("want", id)}
        onQuantity={(id, q) => setQuantity("want", id, q)}
      />

      <Section
        title="O que você oferece"
        items={offerItems}
        onAdd={() => setPickerOpen("offer")}
        onRemove={(id) => removeItem("offer", id)}
        onQuantity={(id, q) => setQuantity("offer", id, q)}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-lg bg-brand-grass px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Enviando..." : "Enviar proposta"}
      </button>

      <ProposalStickerPicker
        open={pickerOpen !== null}
        onOpenChange={(v) => !v && setPickerOpen(null)}
        mode={pickerOpen ?? "want"}
        ownerUserId={ownerUserId}
        selected={(pickerOpen === "want" ? wantItems : offerItems).map((x) => ({ sticker_id: x.sticker_id, quantity: x.quantity }))}
        onToggle={(s) => togglePick(pickerOpen ?? "want", s)}
        viewerOwnedCounts={viewerOwnedCounts}
      />
    </div>
  );
}

function Section({
  title, items, onAdd, onRemove, onQuantity,
}: {
  title: string;
  items: SelectedSticker[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onQuantity: (id: number, qty: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-medium text-white mb-3">{title}</h2>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">Nenhuma figurinha adicionada.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {items.map((item) => (
            <li key={item.sticker_id} className="flex items-center gap-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.code} className="h-10 w-7 rounded object-cover" />
              ) : (
                <div className="h-10 w-7 rounded bg-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">#{item.code} {item.title ?? ""}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onQuantity(item.sticker_id, item.quantity - 1)}
                  className="h-6 w-6 rounded bg-white/10 text-white text-sm"
                  aria-label="Diminuir"
                >–</button>
                <span className="text-sm text-white w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onQuantity(item.sticker_id, item.quantity + 1)}
                  className="h-6 w-6 rounded bg-white/10 text-white text-sm"
                  aria-label="Aumentar"
                >+</button>
                <button
                  type="button"
                  onClick={() => onRemove(item.sticker_id)}
                  className="ml-2 h-6 w-6 rounded text-gray-400 hover:text-red-400"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 text-sm text-brand-grass hover:underline"
      >
        <Plus className="h-4 w-4" /> Adicionar figurinha
      </button>
    </div>
  );
}
