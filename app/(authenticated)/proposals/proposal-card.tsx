"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/format-datetime";
import type { ProposalListRow, ProposalStatus } from "./lib/types";

const statusLabel: Record<ProposalStatus, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const statusClasses: Record<ProposalStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  accepted: "bg-green-500/20 text-green-300",
  rejected: "bg-white/10 text-gray-300",
  cancelled: "bg-white/10 text-gray-300",
};

export function ProposalCard({ row }: { row: ProposalListRow }) {
  return (
    <Link
      href={`/proposals/${row.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {row.other_avatar_url ? (
          <img src={row.other_avatar_url} alt={row.other_name} className="h-10 w-10 rounded-full flex-shrink-0" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass flex-shrink-0">
            {row.other_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{row.other_name}</p>
            <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0 ${statusClasses[row.status]}`}>
              {statusLabel[row.status]}
            </span>
            {row.is_unseen && (
              <span className="inline-block w-2 h-2 rounded-full bg-brand-grass flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Quero {row.want_count} · Ofereço {row.offer_count}
          </p>
        </div>
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0">
        {formatDateTime(row.last_activity_at)}
      </div>
    </Link>
  );
}
