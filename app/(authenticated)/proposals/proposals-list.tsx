"use client";

import type { ProposalListRow, ProposalTab } from "./lib/types";
import { ProposalCard } from "./proposal-card";

export function ProposalsList({ rows, tab }: { rows: ProposalListRow[]; tab: ProposalTab }) {
  if (rows.length === 0) {
    const message =
      tab === "received"
        ? "Nenhuma proposta ainda. Quando alguém propor uma troca, ela aparece aqui."
        : "Você ainda não enviou nenhuma proposta. Visite o perfil de um colecionador pra começar.";
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ProposalCard key={row.id} row={row} />
      ))}
    </div>
  );
}
