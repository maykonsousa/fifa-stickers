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
      <DialogContent className="sm:max-w-md bg-brand-field border border-white/15 shadow-2xl text-white p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Construction className="h-5 w-5 text-brand-gold" />
            Em construção
          </DialogTitle>
          <DialogDescription className="text-sm text-white/80">
            Essa funcionalidade ainda está sendo desenvolvida. Aproveite para
            convidar os seus amigos, pois quanto mais amigos usando, mais útil
            se torna a plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
