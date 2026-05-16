"use client";

import { useState } from "react";
import type { TradeHistoryRow } from "./lib/types";
import { TradeDetailDrawer } from "./trade-detail-drawer";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradesList({ rows, userId }: { rows: TradeHistoryRow[]; userId: string }) {
  const [openTradeId, setOpenTradeId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
        <p className="text-gray-400">
          Nenhuma troca ainda. Comece a registrar suas trocas no próximo encontro.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((row) => (
          <button
            key={row.id}
            onClick={() => setOpenTradeId(row.id)}
            className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {row.other_avatar_url ? (
                <img
                  src={row.other_avatar_url}
                  alt={row.other_name}
                  className="h-10 w-10 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass flex-shrink-0">
                  {row.other_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{row.other_name}</p>
                  {row.is_unseen && (
                    <span className="inline-block w-2 h-2 rounded-full bg-brand-grass flex-shrink-0" />
                  )}
                  {row.other_kind === "lead" && (
                    <span className="text-[10px] uppercase tracking-wide bg-brand-gold/20 text-brand-gold rounded px-1.5 py-0.5 flex-shrink-0">
                      lead
                    </span>
                  )}
                  {row.other_kind === "removed" && (
                    <span className="text-[10px] uppercase tracking-wide bg-white/10 text-gray-400 rounded px-1.5 py-0.5 flex-shrink-0">
                      removido
                    </span>
                  )}
                </div>
                {row.other_email && (
                  <p className="text-xs text-gray-400 truncate">{row.other_email}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  Dei {row.given_count} · Recebi {row.received_count}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">
              {formatDateTime(row.created_at)}
            </div>
          </button>
        ))}
      </div>

      <TradeDetailDrawer
        tradeId={openTradeId}
        userId={userId}
        onClose={() => setOpenTradeId(null)}
      />
    </>
  );
}
