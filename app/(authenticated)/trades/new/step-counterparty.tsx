"use client";

import { useState } from "react";
import { searchCounterpartyByEmail } from "../lib/search-counterparty";
import type { Counterparty } from "../lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  initial: Counterparty | null;
  onComplete: (c: Counterparty) => void;
}

export function StepCounterparty({ initial, onComplete }: Props) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [member, setMember] = useState<Extract<Counterparty, { type: "member" }> | null>(
    initial?.type === "member" ? initial : null,
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
    setMember(null);
    const found = await searchCounterpartyByEmail(email);
    if (found) {
      setMember({
        type: "member",
        id: found.id,
        display_name: found.display_name,
        avatar_url: found.avatar_url,
        email: found.email,
      });
    }
    setSearched(true);
    setSearching(false);
  }

  function handleMemberContinue() {
    if (member) onComplete(member);
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
            setMember(null);
          }}
          placeholder="email@exemplo.com"
          className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <button
          onClick={handleSearch}
          disabled={!isEmailValid || searching}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {searched && member && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.display_name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                {member.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{member.display_name}</p>
              <p className="text-xs text-gray-400">{member.email}</p>
            </div>
          </div>
          <button
            onClick={handleMemberContinue}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Continuar com {member.display_name.split(" ")[0]}
          </button>
        </div>
      )}

      {searched && !member && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-gray-300">
            Esse email não tá cadastrado. Vamos criar um lead — quando essa pessoa
            criar conta, as figurinhas vão aparecer pra ela.
          </p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Nome *</span>
              <input
                type="text"
                value={leadFields.name}
                onChange={(e) => setLeadFields({ ...leadFields, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Cidade</span>
              <input
                type="text"
                value={leadFields.city}
                onChange={(e) => setLeadFields({ ...leadFields, city: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Estado</span>
              <input
                type="text"
                value={leadFields.state}
                onChange={(e) => setLeadFields({ ...leadFields, state: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">WhatsApp</span>
              <input
                type="tel"
                value={leadFields.whatsapp}
                onChange={(e) => setLeadFields({ ...leadFields, whatsapp: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
          </div>
          <button
            onClick={handleLeadContinue}
            disabled={!leadFields.name.trim()}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}
