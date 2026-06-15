"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { decideProposalAction } from "../lib/decide-proposal-action";
import { cancelProposalAction } from "../lib/cancel-proposal-action";

interface Props {
  proposalId: string;
  isOwner: boolean;
  isProposer: boolean;
  isPending: boolean;
}

type PendingAction = "accept" | "reject" | "cancel" | null;

export function ProposalActions({ proposalId, isOwner, isProposer, isPending }: Props) {
  const [open, setOpen] = useState<PendingAction>(null);
  const [submitting, startTransition] = useTransition();

  if (!isPending) return null;

  const confirm = () => {
    startTransition(async () => {
      try {
        if (open === "accept") await decideProposalAction(proposalId, true);
        else if (open === "reject") await decideProposalAction(proposalId, false);
        else if (open === "cancel") await cancelProposalAction(proposalId);
        setOpen(null);
      } catch (e) {
        console.error(e);
        setOpen(null);
      }
    });
  };

  const titles: Record<Exclude<PendingAction, null>, { title: string; desc: string; cta: string }> = {
    accept: { title: "Aceitar proposta?", desc: "O proponente será notificado. Vocês podem combinar o encontro pelo chat.", cta: "Aceitar" },
    reject: { title: "Recusar proposta?", desc: "O proponente será notificado. Sem ação adicional.", cta: "Recusar" },
    cancel: { title: "Cancelar proposta?", desc: "O dono será notificado. Você pode propor de novo depois se quiser.", cta: "Cancelar proposta" },
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-gray-900/80 backdrop-blur p-3 -mx-3 rounded-lg border border-white/10">
        {isOwner && (
          <>
            <button
              onClick={() => setOpen("accept")}
              className="flex-1 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              Aceitar
            </button>
            <button
              onClick={() => setOpen("reject")}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              Recusar
            </button>
          </>
        )}
        {isProposer && (
          <button
            onClick={() => setOpen("cancel")}
            className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            Cancelar proposta
          </button>
        )}
      </div>

      <AlertDialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <AlertDialogContent>
          {open && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{titles[open].title}</AlertDialogTitle>
                <AlertDialogDescription>{titles[open].desc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={confirm} disabled={submitting}>
                  {titles[open].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
