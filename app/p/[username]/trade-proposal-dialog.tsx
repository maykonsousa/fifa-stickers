"use client";

import { Construction } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TradeProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Construction className="h-5 w-5 text-yellow-400" />
            Em construção
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-300">
            Em breve você vai poder selecionar as figurinhas pra oferecer e as
            que quer receber, e enviar uma proposta de troca direto por aqui.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
