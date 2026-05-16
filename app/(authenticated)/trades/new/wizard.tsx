"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepCounterparty } from "./step-counterparty";
import { StepItems } from "./step-items";
import { StepReview } from "./step-review";
import { createTradeAction } from "../lib/create-trade-action";
import type { Counterparty, Swap, TradeItem } from "../lib/types";

export function NewTradeWizard({ initiatorUserId }: { initiatorUserId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);

  async function handleConfirm(items: TradeItem[]) {
    if (!counterparty) return;
    try {
      await createTradeAction({ counterparty, items });
      toast.success("Troca registrada!");
      router.push("/trades");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar troca.";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/trades")}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Cancelar
        </button>
        <p className="text-xs text-gray-500">Passo {step}/3</p>
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
    </div>
  );
}
