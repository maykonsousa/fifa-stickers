"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { searchUsers, type UserMatch } from "../lib/search-counterparty";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Counterparty } from "../lib/types";

interface Props {
  initial: Counterparty | null;
  onComplete: (c: Counterparty) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialKeyword(initial: Counterparty | null): string {
  if (!initial) return "";
  if (initial.type === "member") return initial.display_name;
  return initial.name || initial.email;
}

function initialSelected(initial: Counterparty | null): UserMatch | null {
  if (!initial) return null;
  if (initial.type === "member") {
    return {
      kind: "member",
      id: initial.id,
      display_name: initial.display_name,
      avatar_url: initial.avatar_url,
      email: initial.email,
    };
  }
  if (initial.type === "lead" && initial.id) {
    return {
      kind: "lead",
      id: initial.id,
      display_name: initial.name,
      email: initial.email,
    };
  }
  return null;
}

export function StepCounterparty({ initial, onComplete }: Props) {
  const [keyword, setKeyword] = useState(initialKeyword(initial));
  const debounced = useDebouncedValue(keyword, 700);
  const [results, setResults] = useState<UserMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserMatch | null>(initialSelected(initial));
  const [creatingLead, setCreatingLead] = useState(
    initial?.type === "lead" && !initial.id,
  );
  const [leadFields, setLeadFields] = useState({
    name: initial?.type === "lead" ? initial.name : "",
    email: initial?.type === "lead" ? initial.email : "",
    city: initial?.type === "lead" ? initial.city ?? "" : "",
    state: initial?.type === "lead" ? initial.state ?? "" : "",
    whatsapp: initial?.type === "lead" ? initial.whatsapp ?? "" : "",
  });

  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed.length < 4) {
      setResults(null);
      setLoading(false);
      return;
    }
    if (selected) return;
    let cancelled = false;
    setLoading(true);
    searchUsers(trimmed).then((rows) => {
      if (cancelled) return;
      setResults(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, selected]);

  function handleKeywordChange(value: string) {
    setKeyword(value);
    setSelected(null);
    setCreatingLead(false);
  }

  function handleSelect(match: UserMatch) {
    setSelected(match);
    setResults(null);
  }

  function handleClearSelection() {
    setSelected(null);
  }

  function handleConfirmSelected() {
    if (!selected) return;
    if (selected.kind === "member") {
      onComplete({
        type: "member",
        id: selected.id,
        display_name: selected.display_name,
        avatar_url: selected.avatar_url,
        email: selected.email,
      });
    } else {
      onComplete({
        type: "lead",
        id: selected.id,
        email: selected.email,
        name: selected.display_name,
      });
    }
  }

  function handleStartCreateLead() {
    const isEmail = keyword.includes("@");
    setLeadFields((prev) => ({
      ...prev,
      name: isEmail ? prev.name : keyword.trim(),
      email: isEmail ? keyword.trim() : prev.email,
    }));
    setCreatingLead(true);
  }

  function handleConfirmLead() {
    const name = leadFields.name.trim();
    const email = leadFields.email.trim();
    if (!name) return;
    if (!EMAIL_REGEX.test(email)) return;
    onComplete({
      type: "lead",
      email,
      name,
      city: leadFields.city.trim() || undefined,
      state: leadFields.state.trim() || undefined,
      whatsapp: leadFields.whatsapp.trim() || undefined,
    });
  }

  const showEmptyState =
    !loading &&
    !selected &&
    !creatingLead &&
    results !== null &&
    results.length === 0;

  const showList =
    !loading &&
    !selected &&
    !creatingLead &&
    results !== null &&
    results.length > 0;

  const showHint = keyword.trim().length < 4 && !selected && !creatingLead;
  const leadValid = leadFields.name.trim().length > 0 && EMAIL_REGEX.test(leadFields.email.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Com quem você trocou?</h2>
        <p className="text-sm text-gray-400">Busque por nome ou email.</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="nome ou email"
          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {showHint && (
        <p className="text-xs text-gray-500">Digite ao menos 4 caracteres (nome ou email).</p>
      )}

      {showList && (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
          {results!.map((match) => (
            <li key={`${match.kind}-${match.id}`}>
              <button
                type="button"
                onClick={() => handleSelect(match)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
              >
                {match.kind === "member" && match.avatar_url ? (
                  <img
                    src={match.avatar_url}
                    alt={match.display_name}
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass">
                    {match.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{match.display_name}</p>
                  <p className="truncate text-xs text-gray-400">{match.email}</p>
                </div>
                {match.kind === "lead" && (
                  <span className="text-[10px] uppercase tracking-wide bg-brand-gold/20 text-brand-gold rounded px-1.5 py-0.5">
                    lead
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-lg border border-brand-grass/20 bg-brand-grass/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {selected.kind === "member" && selected.avatar_url ? (
              <img
                src={selected.avatar_url}
                alt={selected.display_name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass">
                {selected.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{selected.display_name}</p>
              <p className="text-xs text-gray-400">{selected.email}</p>
              {selected.kind === "lead" && (
                <span className="mt-1 inline-block text-[10px] uppercase tracking-wide bg-brand-gold/20 text-brand-gold rounded px-1.5 py-0.5">
                  lead já cadastrado
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmSelected}
              className="flex-1 rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110"
            >
              Continuar com {selected.display_name.split(" ")[0]}
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
            >
              Trocar
            </button>
          </div>
        </div>
      )}

      {showEmptyState && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-gray-300">Nenhum resultado encontrado.</p>
          <button
            type="button"
            onClick={handleStartCreateLead}
            className="w-full rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Criar lead
          </button>
        </div>
      )}

      {creatingLead && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-gray-300">
            Forneça as informações básicas para iniciar a troca.
          </p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Nome *</span>
              <input
                type="text"
                value={leadFields.name}
                onChange={(e) => setLeadFields({ ...leadFields, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Email *</span>
              <input
                type="email"
                value={leadFields.email}
                onChange={(e) => setLeadFields({ ...leadFields, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Cidade</span>
              <input
                type="text"
                value={leadFields.city}
                onChange={(e) => setLeadFields({ ...leadFields, city: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Estado</span>
              <input
                type="text"
                value={leadFields.state}
                onChange={(e) => setLeadFields({ ...leadFields, state: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">WhatsApp</span>
              <input
                type="tel"
                value={leadFields.whatsapp}
                onChange={(e) => setLeadFields({ ...leadFields, whatsapp: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleConfirmLead}
            disabled={!leadValid}
            className="w-full rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}
