"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TradeMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  they_have_i_need: number;
  i_have_they_need: number;
}

export function TradesView({
  matches,
  userId,
}: {
  matches: TradeMatch[];
  userId: string;
}) {
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [searchResults, setSearchResults] = useState<TradeMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  const states = [...new Set(matches.map((m) => m.state).filter(Boolean))].sort();

  const filteredMatches = matches.filter((m) => {
    if (stateFilter && m.state !== stateFilter) return false;
    if (cityFilter && !m.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    return true;
  });

  const handleManualSearch = async () => {
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_trade_matches", { current_user_id: userId });
    if (data) {
      const filtered = data.filter((m: TradeMatch) => {
        if (stateFilter && m.state !== stateFilter) return false;
        if (cityFilter && !m.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
        return true;
      });
      setSearchResults(filtered);
    }
    setSearching(false);
  };

  const displayMatches = searchResults ?? filteredMatches;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trocas</h1>
        <p className="mt-1 text-sm text-gray-400">
          Encontre colecionadores para trocar figurinhas.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4">
        <h2 className="text-sm font-semibold text-white">Filtrar por localização</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">Todos os estados</option>
            {states.map((s) => (
              <option key={s} value={s!}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filtrar por cidade..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleManualSearch}
            disabled={searching}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Results */}
      {displayMatches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
          <p className="text-gray-400">
            {matches.length === 0
              ? "Nenhum match encontrado ainda. Adicione figurinhas à sua coleção para encontrar trocas."
              : "Nenhum resultado para os filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {displayMatches.length} {displayMatches.length === 1 ? "match encontrado" : "matches encontrados"}
          </p>
          {displayMatches.map((match) => (
            <div
              key={match.user_id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-3">
                {match.avatar_url ? (
                  <img src={match.avatar_url} alt={match.display_name} className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                    {match.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{match.display_name}</p>
                  {match.city && match.state && (
                    <p className="text-xs text-gray-400">{match.city}, {match.state}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {match.they_have_i_need > 0 && (
                  <p className="text-xs text-green-400 font-medium">
                    Tem {match.they_have_i_need} que você precisa
                  </p>
                )}
                {match.i_have_they_need > 0 && (
                  <p className="text-xs text-blue-400 font-medium">
                    Precisa de {match.i_have_they_need} que você tem
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
