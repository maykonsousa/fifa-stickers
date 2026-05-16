"use client";

import { useState } from "react";
import { searchCounterpartyByEmail } from "../lib/search-counterparty";
import type { Counterparty } from "../lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  initial: Counterparty | null;
  onComplete: (c: Counterparty) => void;
}

type Found =
  | { kind: "member"; counterparty: Extract<Counterparty, { type: "member" }> }
  | { kind: "lead"; counterparty: Extract<Counterparty, { type: "lead" }> };

export function StepCounterparty({ initial, onComplete }: Props) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<Found | null>(
    initial?.type === "member"
      ? { kind: "member", counterparty: initial }
      : initial?.type === "lead" && initial.id
        ? { kind: "lead", counterparty: initial }
        : null,
  );
  const [leadFields, setLeadFields] = useState({
    name: initial?.type === "lead" ? initial.name : "",
    city: initial?.type === "lead" ? initial.city ?? "" : "",
    state: initial?.type === "lead" ? initial.state ?? "" : "",
    whatsapp: initial?.type === "lead" ? initial.whatsapp ?? "" : "",
  });

  async function handleSearch() {
    setSearching(true);
    setSearched(false);
    setFound(null);
    const result = await searchCounterpartyByEmail(email);
    if (result?.kind === "member") {
      setFound({
        kind: "member",
        counterparty: {
          type: "member",
          id: result.id,
          display_name: result.display_name,
          avatar_url: result.avatar_url,
          email: result.email,
        },
      });
    } else if (result?.kind === "lead") {
      setFound({
        kind: "lead",
        counterparty: {
          type: "lead",
          id: result.id,
          email: result.email,
          name: result.name,
        },
      });
    }
    setSearched(true);
    setSearching(false);
  }

  function handleFoundContinue() {
    if (found) onComplete(found.counterparty);
  }

  function handleLeadContinue() {
    if (!leadFields.name.trim()) return;
    onComplete({
      type: "lead",
      email: email.trim(),
      name: leadFields.name.trim(),
      city: leadFields.city.trim() || undefined,
      state: leadFields.state.trim() || undefined,
      whatsapp: leadFields.whatsapp.trim() || undefined,
    });
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Com quem você trocou?</h2>
        <p className="text-sm text-gray-400">Busque pelo email.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSearched(false);
            setFound(null);
          }}
          placeholder="email@exemplo.com"
          className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-brand-grass focus:ring-1 focus:ring-brand-grass"
        />
        <button
          onClick={handleSearch}
          disabled={!isEmailValid || searching}
          className="px-4 py-2 rounded-lg bg-brand-grass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {searched && found && (
        <div className="rounded-lg border border-brand-grass/20 bg-brand-grass/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {found.kind === "member" && found.counterparty.avatar_url ? (
              <img
                src={found.counterparty.avatar_url}
                alt={found.counterparty.display_name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass">
                {(found.kind === "member"
                  ? found.counterparty.display_name
                  : found.counterparty.name
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {found.kind === "member" ? found.counterparty.display_name : found.counterparty.name}
              </p>
              <p className="text-xs text-gray-400">{found.counterparty.email}</p>
              {found.kind === "lead" && (
                <span className="mt-1 inline-block text-[10px] uppercase tracking-wide bg-brand-gold/20 text-brand-gold rounded px-1.5 py-0.5">
                  lead já cadastrado
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleFoundContinue}
            className="w-full rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Continuar com{" "}
            {(found.kind === "member"
              ? found.counterparty.display_name
              : found.counterparty.name
            ).split(" ")[0]}
          </button>
        </div>
      )}

      {searched && !found && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-gray-300">
            Usuário não cadastrado. Forneça as informações básicas para iniciar a troca.
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
            onClick={handleLeadContinue}
            disabled={!leadFields.name.trim()}
            className="w-full rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}
