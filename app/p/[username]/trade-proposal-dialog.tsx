"use client";

import { Construction } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TradeProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-400" />
            Em construção
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm text-gray-300">
          Em breve você vai poder selecionar as figurinhas pra oferecer e as que
          quer receber, e enviar uma proposta de troca direto por aqui.
        </DialogDescription>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
