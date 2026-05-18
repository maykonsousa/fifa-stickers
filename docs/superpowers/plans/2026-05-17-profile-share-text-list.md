# Profile Share Text List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o dono do perfil público (`/p/:username`) gere uma lista em texto pronta pra colar no WhatsApp — uma das figurinhas que **faltam**, outra das **repetidas** — com agrupamento por seleção/grupo e emojis de bandeira.

**Architecture:** Função pura `formatStickerList` em `lib/` (testável manualmente, zero dependências), Server Action que monta a estrutura a partir do Supabase, e um Client Component `ShareListButton` reutilizável que chama a action, copia para clipboard (com fallback `navigator.share`) e mostra toast. O Hero do perfil ganha dois botões logo abaixo do "COMPARTILHAR" atual.

**Tech Stack:** Next.js 16 Server Actions, Supabase, React 19, sonner (toast), lucide-react.

---

## Decisões de produto (consolidadas)

- **Dois botões separados** no Hero: "Faltam (texto)" e "Repetidas (texto)" — só aparecem quando há figurinhas na respectiva categoria.
- **Sem quantidade nas repetidas** — só lista o código uma vez por figurinha repetida (decisão explícita do usuário).
- **Sempre o álbum inteiro** agrupado por sticker_group, independente do filtro ativo na UI.
- **Emojis** no header e em cada grupo (bandeiras via mapa estático code→emoji).
- **Header** inclui nome do dono + handle; **footer** inclui link `https://faltauma.com/p/<username>`.

## Formato de saída (target)

Para **Faltam**:

```
🏆 *faltaUma* — álbum do @joao
👤 João Silva

📋 Faltam (47):
─────────────

🇲🇽 *México* (MEX)
- MEX1 - Guillermo Ochoa
- MEX3 - Hirving Lozano
- MEX12 - Edson Álvarez

🇿🇦 *África do Sul* (RSA)
- RSA3 - Ronwen Williams
- RSA14 - Themba Zwane

─────────────
💬 Bora trocar? 🤝
🔗 https://faltauma.com/p/joao
```

Para **Repetidas** (mesma estrutura, sem `(xN)`):

```
🏆 *faltaUma* — álbum do @joao
👤 João Silva

📦 Repetidas (12):
─────────────

🇧🇷 *Brasil* (BRA)
- BRA5 - Vinícius Júnior
- BRA8 - Casemiro

─────────────
💬 Bora trocar? 🤝
🔗 https://faltauma.com/p/joao
```

Notas:
- Stickers sem `title` viram apenas `- BRA5`.
- Grupos vazios não entram na saída.
- Ordem dos grupos = `sticker_groups.id` ASC (ordem do álbum).
- Ordem dos códigos dentro do grupo = `stickers.number` ASC.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/sticker-group-emojis.ts` (novo) | Mapa estático `code → emoji` + helper `getGroupEmoji(code, type)`. |
| `lib/format-sticker-list.ts` (novo) | Função pura `formatStickerList(input)` que recebe a estrutura agrupada e devolve string. |
| `app/p/[username]/lib/get-shareable-list.ts` (novo) | Server Action `"use server"` — busca dados do Supabase, monta estrutura, chama formatter. |
| `app/p/[username]/share-list-button.tsx` (novo) | Client Component reutilizável (variant `missing` / `duplicates`). |
| `app/p/[username]/profile-hero.tsx` (modificar) | Renderizar os dois novos botões abaixo do `ShareProfileButton`. |
| `app/p/[username]/page.tsx` (modificar) | Passar `username`, `displayName`, contagens já calculadas como props (já estão). |

---

## Task 1: Mapa de emojis dos grupos

**Files:**
- Create: `lib/sticker-group-emojis.ts`

- [ ] **Step 1: Criar o arquivo com o mapa completo**

```ts
// lib/sticker-group-emojis.ts

// Mapa code (sticker_groups.code) → emoji.
// Times: bandeira ISO. Especiais: FWC (troféu) e CC (lata).
export const STICKER_GROUP_EMOJIS: Record<string, string> = {
  FWC: "🏆",
  CC: "🥤",
  MEX: "🇲🇽",
  RSA: "🇿🇦",
  KOR: "🇰🇷",
  CZE: "🇨🇿",
  CAN: "🇨🇦",
  BIH: "🇧🇦",
  QAT: "🇶🇦",
  SUI: "🇨🇭",
  BRA: "🇧🇷",
  MAR: "🇲🇦",
  HAI: "🇭🇹",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸",
  PAR: "🇵🇾",
  AUS: "🇦🇺",
  TUR: "🇹🇷",
  GER: "🇩🇪",
  CUW: "🇨🇼",
  CIV: "🇨🇮",
  ECU: "🇪🇨",
  NED: "🇳🇱",
  JPN: "🇯🇵",
  SWE: "🇸🇪",
  TUN: "🇹🇳",
  BEL: "🇧🇪",
  EGY: "🇪🇬",
  IRN: "🇮🇷",
  NZL: "🇳🇿",
  ESP: "🇪🇸",
  CPV: "🇨🇻",
  KSA: "🇸🇦",
  URU: "🇺🇾",
  FRA: "🇫🇷",
  SEN: "🇸🇳",
  IRQ: "🇮🇶",
  NOR: "🇳🇴",
  ARG: "🇦🇷",
  ALG: "🇩🇿",
  AUT: "🇦🇹",
  JOR: "🇯🇴",
  POR: "🇵🇹",
  COD: "🇨🇩",
  UZB: "🇺🇿",
  COL: "🇨🇴",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  CRO: "🇭🇷",
  GHA: "🇬🇭",
  PAN: "🇵🇦",
};

export function getGroupEmoji(code: string): string {
  return STICKER_GROUP_EMOJIS[code] ?? "⚽";
}
```

- [ ] **Step 2: Verificar tipo**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a esse arquivo.

- [ ] **Step 3: Commit**

```bash
git add lib/sticker-group-emojis.ts
git commit -m "feat(share): add sticker group emoji map for WhatsApp share"
```

---

## Task 2: Formatter puro

**Files:**
- Create: `lib/format-sticker-list.ts`

Função pura, sem dependências (nem Supabase, nem React). Recebe estrutura agrupada e devolve string final.

- [ ] **Step 1: Criar o arquivo**

```ts
// lib/format-sticker-list.ts
import { getGroupEmoji } from "./sticker-group-emojis";

export type ShareKind = "missing" | "duplicates";

export interface ShareStickerItem {
  code: string;
  title: string | null;
}

export interface ShareStickerGroup {
  name: string;
  code: string;
  stickers: ShareStickerItem[];
}

export interface FormatShareListInput {
  kind: ShareKind;
  displayName: string;
  username: string;
  totalCount: number;
  groups: ShareStickerGroup[];
  profileUrl: string;
}

const SEPARATOR = "─────────────";

const HEADER_LABEL: Record<ShareKind, string> = {
  missing: "📋 Faltam",
  duplicates: "📦 Repetidas",
};

export function formatShareList(input: FormatShareListInput): string {
  const lines: string[] = [];

  lines.push(`🏆 *faltaUma* — álbum do @${input.username}`);
  lines.push(`👤 ${input.displayName}`);
  lines.push("");
  lines.push(`${HEADER_LABEL[input.kind]} (${input.totalCount}):`);
  lines.push(SEPARATOR);
  lines.push("");

  for (const group of input.groups) {
    if (group.stickers.length === 0) continue;
    const emoji = getGroupEmoji(group.code);
    lines.push(`${emoji} *${group.name}* (${group.code})`);
    for (const sticker of group.stickers) {
      lines.push(sticker.title ? `- ${sticker.code} - ${sticker.title}` : `- ${sticker.code}`);
    }
    lines.push("");
  }

  lines.push(SEPARATOR);
  lines.push("💬 Bora trocar? 🤝");
  lines.push(`🔗 ${input.profileUrl}`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Smoke test manual com Node**

Run:
```bash
npx tsx -e "
import { formatShareList } from './lib/format-sticker-list';
console.log(formatShareList({
  kind: 'missing',
  displayName: 'João Silva',
  username: 'joao',
  totalCount: 3,
  profileUrl: 'https://faltauma.com/p/joao',
  groups: [
    { name: 'México', code: 'MEX', stickers: [
      { code: 'MEX1', title: 'Guillermo Ochoa' },
      { code: 'MEX3', title: null },
    ]},
    { name: 'Brasil', code: 'BRA', stickers: [
      { code: 'BRA5', title: 'Vinícius Júnior' },
    ]},
  ],
}));
"
```

Expected output (parcial):
```
🏆 *faltaUma* — álbum do @joao
👤 João Silva

📋 Faltam (3):
─────────────

🇲🇽 *México* (MEX)
- MEX1 - Guillermo Ochoa
- MEX3

🇧🇷 *Brasil* (BRA)
- BRA5 - Vinícius Júnior

─────────────
💬 Bora trocar? 🤝
🔗 https://faltauma.com/p/joao
```

Se `tsx` não estiver instalado, rodar `npm install -D tsx` antes (descartar do commit se for instalação temporária — usar `--no-save`).

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add lib/format-sticker-list.ts
git commit -m "feat(share): add pure formatter for WhatsApp sticker list"
```

---

## Task 3: Server Action `getShareableStickerList`

**Files:**
- Create: `app/p/[username]/lib/get-shareable-list.ts`

Server-side, autentica via service role? Não — leitura é pública (mesmas RLS que `page.tsx` já usa). Reaproveita `createClient` de `lib/supabase/server.ts`.

- [ ] **Step 1: Criar o arquivo**

```ts
// app/p/[username]/lib/get-shareable-list.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  formatShareList,
  type ShareKind,
  type ShareStickerGroup,
} from "@/lib/format-sticker-list";

export async function getShareableStickerList(params: {
  username: string;
  kind: ShareKind;
}): Promise<{ ok: true; text: string; count: number } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", params.username)
    .single();

  if (profileErr || !profile) {
    return { ok: false, error: "Perfil não encontrado" };
  }

  const [{ data: userStickers }, { data: allStickers }] = await Promise.all([
    supabase.from("user_stickers").select("sticker_id").eq("user_id", profile.id),
    supabase
      .from("stickers")
      .select("id, code, number, title, group_id, sticker_groups(id, name, code)")
      .order("group_id", { ascending: true })
      .order("number", { ascending: true }),
  ]);

  // Conta posses do dono (sticker_id → count)
  const ownedCounts = new Map<number, number>();
  for (const us of userStickers ?? []) {
    ownedCounts.set(us.sticker_id, (ownedCounts.get(us.sticker_id) ?? 0) + 1);
  }

  // Filtra de acordo com o kind
  type StickerRow = {
    id: number;
    code: string;
    number: number;
    title: string | null;
    group_id: number;
    sticker_groups: { id: number; name: string; code: string } | null;
  };

  const rows = (allStickers ?? []) as unknown as StickerRow[];

  const filtered = rows.filter((s) => {
    const owned = ownedCounts.get(s.id) ?? 0;
    return params.kind === "missing" ? owned === 0 : owned >= 2;
  });

  // Agrupa por sticker_groups.id mantendo a ordem (já vem ordenado)
  const groupsMap = new Map<number, ShareStickerGroup>();
  for (const row of filtered) {
    const g = row.sticker_groups;
    if (!g) continue;
    let bucket = groupsMap.get(g.id);
    if (!bucket) {
      bucket = { name: g.name, code: g.code, stickers: [] };
      groupsMap.set(g.id, bucket);
    }
    bucket.stickers.push({ code: row.code, title: row.title });
  }

  const groups = Array.from(groupsMap.values());
  const totalCount = filtered.length;

  if (totalCount === 0) {
    return { ok: false, error: params.kind === "missing" ? "Não faltam figurinhas" : "Sem repetidas" };
  }

  const text = formatShareList({
    kind: params.kind,
    displayName: profile.display_name,
    username: profile.username,
    totalCount,
    profileUrl: `https://faltauma.com/p/${profile.username}`,
    groups,
  });

  return { ok: true, text, count: totalCount };
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/p/[username]/lib/get-shareable-list.ts
git commit -m "feat(share): add server action that builds shareable sticker list text"
```

---

## Task 4: Client component `ShareListButton`

**Files:**
- Create: `app/p/[username]/share-list-button.tsx`

Padrão: variant decide rótulo, ícone e cor. Tenta `navigator.share` primeiro (mobile); fallback copia para clipboard com toast.

- [ ] **Step 1: Criar o arquivo**

```tsx
// app/p/[username]/share-list-button.tsx
"use client";

import { useState, useTransition } from "react";
import { Layers, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getShareableStickerList } from "./lib/get-shareable-list";
import type { ShareKind } from "@/lib/format-sticker-list";

interface ShareListButtonProps {
  username: string;
  displayName: string;
  kind: ShareKind;
  disabled?: boolean;
  className?: string;
}

const LABEL: Record<ShareKind, string> = {
  missing: "FALTAM (TEXTO)",
  duplicates: "REPETIDAS (TEXTO)",
};

export function ShareListButton({ username, displayName, kind, disabled, className }: ShareListButtonProps) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (pending || disabled) return;
    startTransition(async () => {
      const result = await getShareableStickerList({ username, kind });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const shareTitle = kind === "missing"
        ? `Faltam pro ${displayName}`
        : `Repetidas do ${displayName}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: result.text });
          return;
        } catch {
          // usuário cancelou ou share falhou — cai pro clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(result.text);
        toast.success("Lista copiada! Cole no WhatsApp 💬");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Não foi possível copiar a lista");
      }
    });
  };

  const Icon = kind === "missing" ? AlertCircle : Layers;
  const iconColor = kind === "missing" ? "text-red-400" : "text-amber-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className ?? ""}`}
      style={{
        fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
        fontSize: 11,
        letterSpacing: 0.5,
      }}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className={`w-4 h-4 ${iconColor}`} />
      )}
      {copied ? "COPIADO" : LABEL[kind]}
    </button>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/p/[username]/share-list-button.tsx
git commit -m "feat(share): add ShareListButton client component"
```

---

## Task 5: Wire-up no Hero

**Files:**
- Modify: `app/p/[username]/profile-hero.tsx`

Renderizar os dois novos botões logo abaixo do `ShareProfileButton` atual. Só mostrar quando o respectivo count > 0.

- [ ] **Step 1: Importar o componente**

No topo do arquivo, depois do import de `ShareProfileButton`:

```tsx
import { ShareListButton } from "./share-list-button";
```

- [ ] **Step 2: Mudar o bloco de identity para incluir os botões**

Substituir o bloco atual (linhas 47-74):

```tsx
{/* Identity */}
<div className="flex flex-col sm:flex-row sm:items-center gap-4">
  <div className="flex items-center gap-4 min-w-0">
    {avatarUrl ? (
      <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-full ring-2 ring-white/10 shrink-0" />
    ) : (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-white/10 text-2xl font-bold text-green-400 shrink-0">
        {displayName.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="min-w-0">
      <h1
        className="text-2xl text-white truncate"
        style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
      >
        {displayName}
      </h1>
      <p className="text-sm text-gray-400 truncate">@{username}</p>
      {city && state && (
        <p className="text-sm text-gray-400 truncate">{city}, {state}</p>
      )}
    </div>
  </div>
  <div className="sm:ml-auto flex flex-wrap gap-2 shrink-0">
    <ShareProfileButton username={username} displayName={displayName} />
    {totalMissing > 0 && (
      <ShareListButton username={username} displayName={displayName} kind="missing" />
    )}
    {totalDuplicates > 0 && (
      <ShareListButton username={username} displayName={displayName} kind="duplicates" />
    )}
  </div>
</div>
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 5: Validação manual no browser**

Run: `npm run dev`

Casos a verificar:
1. Acessar `/p/<usuario-que-tem-repetidas-e-faltas>` — devem aparecer 3 botões: COMPARTILHAR, FALTAM (TEXTO), REPETIDAS (TEXTO).
2. Acessar `/p/<usuario-100-completo>` — só COMPARTILHAR + REPETIDAS (se tiver).
3. Acessar `/p/<usuario-novo-sem-stickers>` — só COMPARTILHAR.
4. Clicar em "FALTAM (TEXTO)" no desktop → toast "Lista copiada!" e o conteúdo do clipboard bate com o formato esperado.
5. No DevTools (Chrome → Sensors → mobile) ou no mobile real, clicar em "REPETIDAS (TEXTO)" → abre share-sheet nativo.
6. Visitante anônimo (logout) — botões aparecem normalmente (a lista é dados do dono, não do viewer).

- [ ] **Step 6: Commit**

```bash
git add app/p/[username]/profile-hero.tsx
git commit -m "feat(share): wire ShareListButton into public profile hero"
```

---

## Self-Review

**Spec coverage:**
- ✅ Botão "Faltam (texto)" — Task 4 + Task 5
- ✅ Botão "Repetidas (texto)" — Task 4 + Task 5
- ✅ Sem quantidade de repetidas — formatter em Task 2 imprime só `- CODE - title`
- ✅ Emojis (bandeiras + header) — Task 1 mapa + Task 2 formatter
- ✅ Agrupado por sticker_group, ordem do álbum — Task 3 ordena por `group_id, number`
- ✅ Link do perfil no rodapé — Task 2 inclui `profileUrl`

**Placeholders:** nenhum bloco com "TODO/TBD". Todo código está completo.

**Type consistency:** `ShareKind`, `ShareStickerGroup`, `ShareStickerItem`, `FormatShareListInput` definidos em `lib/format-sticker-list.ts` e reusados em `get-shareable-list.ts` e `share-list-button.tsx`. Sem renomeação intermediária.

---

## Backlog separado — Melhorias da análise anterior

Não fazem parte deste PR. Listadas para um plano futuro:

1. **Consolidar stats do hero numa RPC `get_profile_stats`** — hoje `page.tsx:67-74` faz 2 queries; viraria 1 round-trip.
2. **Extrair `computeProfileStats(profile.id)`** compartilhado entre `page.tsx` e `opengraph-image.tsx` (DRY).
3. **Unificar chamada de `get_public_stickers`** em `profile-stickers.tsx:128-145` e `163-179` (page 1 + page N duplicam).
4. **`NEXT_PUBLIC_APP_URL` env** para substituir `https://faltauma.com` hardcoded em `share-profile-button.tsx`, `page.tsx:32` e na server action nova.
5. **Remover `auth.getUser()` redundante em `public-header.tsx`** — `page.tsx` já decide entre `NavBar` e `PublicHeader`; o header não precisa re-checar.
6. **`next/image` no avatar do hero** — substituir `<img>` em `profile-hero.tsx:50`.
7. **Cache de `count(stickers)`** — `unstable_cache` ou view materializada (mudanças raras justificam).
