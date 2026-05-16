"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepCounterparty } from "./step-counterparty";
import { StepItems } from "./step-items";
import { StepReview } from "./step-review";
import { StepAddToCollection } from "./step-add-to-collection";
import { createTradeAction } from "../lib/create-trade-action";
import type { Counterparty, Swap, TradeItem } from "../lib/types";

export function NewTradeWizard({
  initiatorUserId,
  initiatorName,
}: {
  initiatorUserId: string;
  initiatorName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<TradeItem[]>([]);

  async function handleConfirm(items: TradeItem[]) {
    if (!counterparty) return;
    try {
      await createTradeAction({ counterparty, items });
      setConfirmedItems(items);
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar troca.";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {step < 4 ? (
          <button
            onClick={() => router.push("/trades")}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Cancelar
          </button>
        ) : (
          <span />
        )}
        <p className="text-xs text-gray-500">{step < 4 ? `Passo ${step}/3` : "Concluído"}</p>
      </div>

      {step === 1 && (
        <StepCounterparty
          initial={counterparty}
          onComplete={(c) => {
            setCounterparty(c);
            setStep(2);
          }}
        />
      )}

      {step === 2 && counterparty && (
        <StepItems
          counterparty={counterparty}
          initiatorUserId={initiatorUserId}
          initiatorName={initiatorName}
          initial={swaps}
          onComplete={(s) => {
            setSwaps(s);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && counterparty && (
        <StepReview
          counterparty={counterparty}
          swaps={swaps}
          onBack={() => setStep(2)}
          onConfirm={handleConfirm}
        />
      )}

      {step === 4 && (
        <StepAddToCollection
          receivedItems={confirmedItems.filter((it) => it.direction === "received")}
          onDone={() => router.push("/trades")}
        />
      )}
    </div>
  );
}
