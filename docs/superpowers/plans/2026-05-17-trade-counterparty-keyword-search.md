# Trade Counterparty Keyword Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir, no passo "com quem você trocou?" do wizard de trocas, a busca exata por email por uma busca live por keyword (nome ou email) com debounce de 700ms, mínimo de 4 caracteres, lista de sugestões e form de lead com pré-preenchimento inteligente.

**Architecture:** Nova RPC `search_users(keyword, limit, include_leads)` em Postgres (genérica, reaproveitável). No frontend, hook `useDebouncedValue` reutilizável aplica debounce ao input; um `useEffect` dispara a chamada da server action quando a keyword passa de 4 chars. Resultados aparecem em lista clicável; estado vazio mostra botão "Criar lead" que abre o form (com novo campo email obrigatório) pré-preenchido a partir da keyword.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Supabase (Postgres RPC + SSR client), Tailwind 4, lucide-react.

**Sem testes automatizados:** o projeto não tem suíte. Verificação por `npx tsc --noEmit` (type-check), `npm run lint`, `npm run dev` (smoke manual), e queries SQL diretas no Supabase SQL Editor após cada migration.

**Spec:** `docs/superpowers/specs/2026-05-17-trade-counterparty-keyword-search-design.md`

---

## File Structure

### Criar
- `supabase/migrations/051_search_users.sql` — RPC `search_users`
- `supabase/migrations/052_drop_find_counterparty_by_email.sql` — limpeza da RPC antiga
- `lib/hooks/use-debounced-value.ts` — hook reutilizável de debounce

### Modificar
- `app/(authenticated)/trades/lib/search-counterparty.ts` — substitui server action por `searchUsers(keyword)` retornando lista
- `app/(authenticated)/trades/new/step-counterparty.tsx` — reescrita do componente com debounce, lista, form de lead com email

### Manter sem mudança
- `app/(authenticated)/trades/lib/types.ts` — tipos `Counterparty*` continuam servindo (email do lead já é `required`)
- Demais steps do wizard (`step-items.tsx`, `step-review.tsx`, `wizard.tsx`)

---

## Task 1: Migration `051_search_users.sql`

**Files:**
- Create: `supabase/migrations/051_search_users.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Busca genérica de usuários (membros), com opção de incluir leads
-- não-convertidos. Pensada para reuso: trade counterparty (com leads),
-- futura @menção/busca de amigos (sem leads).
--
-- Regras de matching:
--   - Keyword normalizada para lower(trim()).
--   - Se contém '@' → busca prefix em email.
--   - Senão → ILIKE substring em display_name OR prefix em email.
-- Ordenação:
--   - Membros antes de leads.
--   - Match exato de email > prefix de email > substring de nome.
--   - Alfabético por display_name como desempate.
-- Quando include_leads=true e o email do lead já existe em profiles,
-- o lead é omitido (precedência ao membro).

CREATE OR REPLACE FUNCTION search_users(
  p_keyword TEXT,
  p_limit INT DEFAULT 10,
  p_include_leads BOOLEAN DEFAULT false
)
RETURNS TABLE (
  kind TEXT,
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_kw TEXT := lower(trim(p_keyword));
  v_is_email BOOLEAN := position('@' in v_kw) > 0;
BEGIN
  IF length(v_kw) < 4 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT
      'member'::TEXT AS kind,
      p.id,
      p.display_name,
      p.avatar_url,
      u.email::TEXT AS email,
      CASE
        WHEN lower(u.email) = v_kw THEN 0
        WHEN lower(u.email) LIKE v_kw || '%' THEN 1
        ELSE 2
      END AS rank
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE
      (v_is_email AND lower(u.email) LIKE v_kw || '%')
      OR (NOT v_is_email AND (
            lower(p.display_name) LIKE '%' || v_kw || '%'
         OR lower(u.email)        LIKE v_kw || '%'
      ))
  ),
  leads_filtered AS (
    SELECT
      'lead'::TEXT AS kind,
      l.id,
      l.name AS display_name,
      NULL::TEXT AS avatar_url,
      l.email,
      CASE
        WHEN lower(l.email) = v_kw THEN 0
        WHEN lower(l.email) LIKE v_kw || '%' THEN 1
        ELSE 2
      END AS rank
    FROM leads l
    WHERE
      p_include_leads
      AND l.converted_to_profile_id IS NULL
      AND (
        (v_is_email AND lower(l.email) LIKE v_kw || '%')
        OR (NOT v_is_email AND (
              lower(l.name)  LIKE '%' || v_kw || '%'
           OR lower(l.email) LIKE v_kw || '%'
        ))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u2
        WHERE lower(u2.email) = lower(l.email)
      )
  )
  SELECT m.kind, m.id, m.display_name, m.avatar_url, m.email
  FROM members m
  UNION ALL
  SELECT l.kind, l.id, l.display_name, l.avatar_url, l.email
  FROM leads_filtered l
  ORDER BY
    CASE WHEN kind = 'member' THEN 0 ELSE 1 END,
    rank,
    display_name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users(TEXT, INT, BOOLEAN) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON profiles ((lower(display_name)));

CREATE INDEX IF NOT EXISTS idx_leads_name_lower
  ON leads ((lower(name)));
```

- [ ] **Step 2: Aplicar a migration no banco local**

Run:
```bash
npx supabase db push
```

Expected: migration aplica sem erro. Se o projeto usa `supabase db reset` no fluxo local, rodar:
```bash
npx supabase db reset
```

- [ ] **Step 3: Smoke test SQL — busca por nome**

No Supabase SQL Editor, rodar (substituir por um nome conhecido):

```sql
SELECT * FROM search_users('joao', 10, true);
```

Expected: lista de até 10 linhas; membros aparecem antes de leads; coluna `kind` reflete origem.

- [ ] **Step 4: Smoke test SQL — busca por email parcial**

```sql
SELECT * FROM search_users('joao@', 10, true);
```

Expected: matches por prefix em email; membro com email exato (se houver) vem primeiro.

- [ ] **Step 5: Smoke test SQL — keyword com menos de 4 chars**

```sql
SELECT * FROM search_users('jo', 10, true);
```

Expected: 0 linhas (guard interno).

- [ ] **Step 6: Smoke test SQL — `include_leads=false`**

```sql
SELECT * FROM search_users('joao', 10, false);
```

Expected: apenas linhas com `kind = 'member'`.

- [ ] **Step 7: Smoke test SQL — precedência membro sobre lead**

Pré-condição: criar manualmente um `lead` cujo `email` coincide com o email de um `profile` existente (em ambiente de dev), e então:

```sql
SELECT kind, email FROM search_users('email-em-conflito@exemplo.com', 10, true);
```

Expected: somente uma linha, `kind = 'member'`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/051_search_users.sql
git commit -m "feat(db): add search_users RPC for keyword search"
```

---

## Task 2: Hook `useDebouncedValue`

**Files:**
- Create: `lib/hooks/use-debounced-value.ts`

- [ ] **Step 1: Criar o arquivo do hook**

```ts
"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: sem erros (arquivo isolado, só deps de React).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-debounced-value.ts
git commit -m "feat(hooks): add useDebouncedValue hook"
```

---

## Task 3: Server action `searchUsers`

**Files:**
- Modify: `app/(authenticated)/trades/lib/search-counterparty.ts` (substituição completa)

- [ ] **Step 1: Reescrever o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserMatchMember {
  kind: "member";
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

export interface UserMatchLead {
  kind: "lead";
  id: string;
  display_name: string;
  email: string;
}

export type UserMatch = UserMatchMember | UserMatchLead;

const LIKE_SPECIAL = /[%_\\]/g;

export async function searchUsers(keyword: string): Promise<UserMatch[]> {
  const trimmed = keyword.trim();
  if (trimmed.length < 4) return [];

  // Escapa wildcards de ILIKE — a RPC usa LIKE com '%' || kw || '%'.
  const escaped = trimmed.replace(LIKE_SPECIAL, "\\$&");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_users", {
    p_keyword: escaped,
    p_limit: 10,
    p_include_leads: true,
  });

  if (error) {
    console.error("searchUsers error", error);
    return [];
  }

  const rows = (data ?? []) as {
    kind: "member" | "lead";
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
  }[];

  return rows.map((r) =>
    r.kind === "member"
      ? {
          kind: "member",
          id: r.id,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
          email: r.email,
        }
      : {
          kind: "lead",
          id: r.id,
          display_name: r.display_name,
          email: r.email,
        },
  );
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: erro em `app/(authenticated)/trades/new/step-counterparty.tsx` (ainda usa `searchCounterpartyByEmail` e `CounterpartyMatch`). Esperado — corrigido nas próximas tasks.

- [ ] **Step 3: Commit (parcial, código ainda quebrado por design)**

> ⚠️ Este commit deixa o build quebrado intencionalmente. As tasks 4 e 5 corrigem em sequência. Se preferir commits atômicos, agrupar com as tasks seguintes; aqui mantemos por clareza de revisão.

```bash
git add app/\(authenticated\)/trades/lib/search-counterparty.ts
git commit -m "refactor(trades): replace email-only search with searchUsers"
```

---

## Task 4: Refatorar `step-counterparty.tsx` — busca live + lista

**Files:**
- Modify: `app/(authenticated)/trades/new/step-counterparty.tsx` (substituição completa)

- [ ] **Step 1: Reescrever o componente**

```tsx
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
  const [creatingLead, setCreatingLead] = useState(false);
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
    if (selected) return; // não buscar enquanto há resultado selecionado
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint
```

Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/trades/new/step-counterparty.tsx
git commit -m "feat(trades): keyword search with debounce for counterparty"
```

---

## Task 5: Migration de limpeza `052_drop_find_counterparty_by_email.sql`

**Files:**
- Create: `supabase/migrations/052_drop_find_counterparty_by_email.sql`

- [ ] **Step 1: Verificar que não há outros callers**

Run:
```bash
rg "find_counterparty_by_email" -n
```

Expected: nenhum hit fora de `supabase/migrations/039_*.sql` (a migration original). Se aparecer em código aplicação, parar e investigar.

- [ ] **Step 2: Criar arquivo de migration**

```sql
-- Remove RPC antiga substituída por search_users.
DROP FUNCTION IF EXISTS find_counterparty_by_email(TEXT);
```

- [ ] **Step 3: Aplicar migration**

Run:
```bash
npx supabase db push
```

Expected: aplica sem erro.

- [ ] **Step 4: Confirmar remoção via SQL**

```sql
SELECT proname FROM pg_proc WHERE proname = 'find_counterparty_by_email';
```

Expected: 0 linhas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/052_drop_find_counterparty_by_email.sql
git commit -m "chore(db): drop find_counterparty_by_email rpc"
```

---

## Task 6: Smoke manual no dev server

**Files:** nenhuma alteração.

- [ ] **Step 1: Build de produção**

Run:
```bash
npm run build
```

Expected: build conclui sem erros.

- [ ] **Step 2: Subir dev server**

Run:
```bash
npm run dev
```

- [ ] **Step 3: QA do fluxo — abrir `/trades/new`**

Logar como usuário de teste, ir até `/trades/new`. O passo "Com quem você trocou?" deve estar visível.

- [ ] **Step 4: QA — hint de < 4 caracteres**

Digitar 1-3 caracteres no input. Esperado: hint "Digite ao menos 4 caracteres (nome ou email)" aparece; nenhuma chamada de rede.

- [ ] **Step 5: QA — debounce e busca por nome**

Digitar um nome conhecido (4+ chars). Esperado: spinner aparece ~700ms após parar de digitar; lista é renderizada com membros (avatar) e leads (badge "lead").

- [ ] **Step 6: QA — debounce: digitação rápida não dispara busca prematura**

Digitar e apagar rapidamente caracteres. Esperado: nenhuma busca dispara enquanto o usuário não para por 700ms; o cleanup do effect cancela respostas obsoletas.

- [ ] **Step 7: QA — busca por email parcial**

Digitar `email@dominio` (parcial). Esperado: matches por prefix em email aparecem; match exato (se existir) vem primeiro na lista.

- [ ] **Step 8: QA — selecionar membro**

Clicar em um membro na lista. Esperado: card de confirmação com avatar/nome/email + botão "Continuar com X" + botão "Trocar".

- [ ] **Step 9: QA — botão "Trocar"**

Clicar em "Trocar" no card. Esperado: card some, lista volta a aparecer com os mesmos resultados (ou nova busca é disparada se o input mudou).

- [ ] **Step 10: QA — selecionar lead já cadastrado**

Repetir steps 5-8 com keyword que matchar um lead. Esperado: badge "lead já cadastrado", botão "Continuar com X" prossegue o wizard com `type: "lead"` e `id` preenchido.

- [ ] **Step 11: QA — nenhum resultado → criar lead (pré-preenchimento por nome)**

Digitar nome inexistente como `zzzzznaoexiste`. Esperado: "Nenhum resultado encontrado" + botão "Criar lead". Clicar em "Criar lead" abre o form com **nome pré-preenchido** com `zzzzznaoexiste` e **email vazio**.

- [ ] **Step 12: QA — nenhum resultado → criar lead (pré-preenchimento por email)**

Digitar email inexistente como `naoexiste@dominio.com`. Esperado: ao clicar "Criar lead", form abre com **email pré-preenchido** e **nome vazio**.

- [ ] **Step 13: QA — validação do form de lead**

Sem nome ou com email inválido, o botão "Continuar →" deve estar desabilitado. Preencher ambos corretamente → botão habilita.

- [ ] **Step 14: QA — wizard prossegue com lead novo**

Submeter o form de lead. Esperado: avança para o passo de items, e ao concluir a troca, lead é criado no banco (verificar via SQL: `SELECT * FROM leads WHERE email = '...';`).

- [ ] **Step 15: QA — `initial` pré-existente (re-edição do passo)**

Voltar do passo seguinte para o counterparty. Esperado: estado restaurado (selected populado se já havia member/lead, ou form de lead aberto com campos preenchidos).

---

## Task 7: Atualizar PR / push

**Files:** nenhuma alteração.

- [ ] **Step 1: Push da branch**

Run:
```bash
git push -u origin feature/trade-user-search-debounce
```

- [ ] **Step 2: Abrir PR (se ainda não existir)**

Confirmar com o usuário antes de abrir. Comando sugerido:

```bash
gh pr create --base main --title "feat(trades): keyword search por nome ou email com debounce" --body "$(cat <<'EOF'
## Summary
- Adiciona RPC `search_users(keyword, limit, include_leads)` para busca live por nome ou email
- Substitui input de email + botão "Buscar" por busca automática com debounce de 700ms e mínimo de 4 caracteres no passo de contraparte do wizard de trocas
- Lista de sugestões com membros e leads não-convertidos; botão "Criar lead" no estado vazio
- Form de lead ganha campo email obrigatório; keyword é pré-preenchida no campo apropriado (nome ou email)

## Test plan
- [ ] `npm run build` passa
- [ ] Buscar por nome → lista aparece com debounce
- [ ] Buscar por email parcial → prefix match
- [ ] Selecionar membro → card de confirmação
- [ ] Botão "Trocar" volta para lista
- [ ] Nenhum resultado → "Criar lead" pré-preenche corretamente
- [ ] Criar lead com email inédito → fluxo completa
- [ ] Re-edição do passo restaura estado

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notas de execução

- **Ordem de tasks importa:** task 3 deixa o build temporariamente quebrado; task 4 resolve. Se for executar com subagent-driven-development, considerar fundir tasks 3 e 4 em um único subagent run.
- **`npx supabase db push` vs `db reset`:** depende de como o time gerencia o banco local. Se o ambiente é compartilhado, prefira `db push`; se é descartável, `db reset` aplica tudo limpo.
- **Caso a build com Next 16 acuse algo de React 19 strict mode sobre o `useEffect` de busca:** revisar o cleanup; o flag `cancelled` é o padrão para esse caso.
- **Privacidade:** confirmado com o stakeholder que busca de membros por nome é aberta. Caso isso mude no futuro, o ponto único de mudança é a RPC `search_users` — filtrar `WHERE profiles.public = true` (ou flag equivalente) resolveria.
