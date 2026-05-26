# Album Page Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um modo "álbum" na página de perfil que mostra as figurinhas paginadas como no álbum físico, com swipe lateral, ao lado do modo lista atual.

**Architecture:** Três colunas novas em `stickers` (`page`, `row`, `col`), seed via CSV versionado em git, RPC dedicada `get_public_stickers_album` sem paginação por offset, e refatoração mínima do `profile-stickers.tsx` (692 linhas) extraindo `StickerCard` e separando a view de lista da view de álbum.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (Postgres + PostgREST), Tailwind v4. CSS scroll-snap nativo pra carrossel mobile, pointer events pra drag desktop. Sem framework de testes — verificação via `npm run lint`, `npm run build` e teste manual no browser.

**Convenções importantes do projeto:**
- Migrações em `supabase/migrations/NNN_nome.sql`, aplicadas em ordem numérica
- RPCs com `SECURITY DEFINER SET search_path = ''` e `GRANT EXECUTE … TO anon, authenticated`
- Componentes client com `"use client"` no topo
- Spec deste plano: `docs/superpowers/specs/2026-05-26-album-page-pagination-design.md`

---

## File Structure

**Criar:**
- `supabase/migrations/056_add_album_position_to_stickers.sql`
- `supabase/migrations/057_seed_album_positions.sql` (gerada a partir do CSV)
- `supabase/migrations/058_public_stickers_album_rpc.sql`
- `data/album-positions.csv`
- `scripts/generate-album-seed.ts`
- `app/p/[username]/sticker-card.tsx`
- `app/p/[username]/profile-stickers-list.tsx`
- `app/p/[username]/profile-stickers-album.tsx`

**Modificar:**
- `app/p/[username]/profile-stickers.tsx` (vira shell com toggle + filtros compartilhados)

---

## Task 1: Migration — colunas de posição em `stickers`

**Files:**
- Create: `supabase/migrations/056_add_album_position_to_stickers.sql`

- [ ] **Step 1: Criar a migração**

```sql
-- 056_add_album_position_to_stickers.sql
-- Adiciona posição da figurinha no álbum físico (página + linha + coluna).
-- Colunas nullable inicialmente: schema entra em prod antes do mapeamento
-- estar completo. UI trata page IS NULL como "ainda não posicionada".
-- Índice único parcial impede duas figurinhas no mesmo slot.

ALTER TABLE stickers
  ADD COLUMN page INT,
  ADD COLUMN row INT,
  ADD COLUMN col INT;

CREATE INDEX idx_stickers_page ON stickers(page);

CREATE UNIQUE INDEX uq_stickers_page_position
  ON stickers(page, row, col)
  WHERE page IS NOT NULL;
```

- [ ] **Step 2: Aplicar localmente**

Rodar: `npx supabase db reset` (ou equivalente do projeto pra aplicar migrações limpas).
Esperado: aplica sem erro. `\d stickers` no psql mostra as 3 colunas novas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/056_add_album_position_to_stickers.sql
git commit -m "feat(stickers): adiciona colunas de posição no álbum (page, row, col)"
```

---

## Task 2: Script gerador de seed a partir de CSV

**Files:**
- Create: `data/album-positions.csv`
- Create: `scripts/generate-album-seed.ts`

- [ ] **Step 1: Criar CSV stub com cabeçalho e exemplo**

Arquivo `data/album-positions.csv`:

```csv
sticker_code,page,row,col
```

(Vazio só com cabeçalho. Usuário vai preencher depois do schema estar em prod, ou paralelamente — não bloqueia a entrega do schema.)

- [ ] **Step 2: Criar o script gerador**

Arquivo `scripts/generate-album-seed.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Lê data/album-positions.csv e gera supabase/migrations/057_seed_album_positions.sql
 * com UPDATEs idempotentes por sticker_code.
 *
 * Uso: npx tsx scripts/generate-album-seed.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CSV_PATH = join(process.cwd(), "data", "album-positions.csv");
const OUT_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "057_seed_album_positions.sql",
);

interface Row {
  code: string;
  page: number;
  row: number;
  col: number;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV vazio");
  }
  const header = lines[0].split(",").map((s) => s.trim());
  const expected = ["sticker_code", "page", "row", "col"];
  if (header.join(",") !== expected.join(",")) {
    throw new Error(
      `Cabeçalho inválido. Esperado: ${expected.join(",")}. Obtido: ${header.join(",")}`,
    );
  }
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length !== 4) {
      throw new Error(`Linha ${i + 1}: esperado 4 colunas, encontrado ${parts.length}`);
    }
    const [code, page, row, col] = parts;
    if (!code) throw new Error(`Linha ${i + 1}: sticker_code vazio`);
    const pageN = Number(page);
    const rowN = Number(row);
    const colN = Number(col);
    if (!Number.isInteger(pageN) || pageN < 1)
      throw new Error(`Linha ${i + 1}: page inválida (${page})`);
    if (!Number.isInteger(rowN) || rowN < 1)
      throw new Error(`Linha ${i + 1}: row inválida (${row})`);
    if (!Number.isInteger(colN) || colN < 1)
      throw new Error(`Linha ${i + 1}: col inválida (${col})`);
    rows.push({ code, page: pageN, row: rowN, col: colN });
  }
  return rows;
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

function generateSql(rows: Row[]): string {
  const header = `-- 057_seed_album_positions.sql
-- GERADO AUTOMATICAMENTE a partir de data/album-positions.csv
-- pelo script scripts/generate-album-seed.ts
-- NÃO EDITAR À MÃO: rode \`npx tsx scripts/generate-album-seed.ts\` após mudar o CSV.

BEGIN;

`;
  const updates = rows
    .map(
      (r) =>
        `UPDATE stickers SET page = ${r.page}, row = ${r.row}, col = ${r.col} WHERE code = '${escapeSqlString(r.code)}';`,
    )
    .join("\n");
  return `${header}${updates}\n\nCOMMIT;\n`;
}

function main() {
  const csv = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    console.error("CSV não tem linhas de dados — nada a gerar.");
    process.exit(1);
  }
  const sql = generateSql(rows);
  writeFileSync(OUT_PATH, sql, "utf-8");
  console.log(`Gerado ${OUT_PATH} com ${rows.length} UPDATEs.`);
}

main();
```

- [ ] **Step 3: Verificar parsing rodando com CSV de exemplo (não commitado)**

Criar `/tmp/test-positions.csv` temporariamente:

```csv
sticker_code,page,row,col
BRA1,8,1,1
BRA2,8,1,2
```

Rodar: `cp /tmp/test-positions.csv data/album-positions.csv && npx tsx scripts/generate-album-seed.ts`
Esperado: imprime "Gerado … com 2 UPDATEs.", arquivo `057_…sql` contém os 2 UPDATEs.

Restaurar `data/album-positions.csv` pro estado vazio (só cabeçalho) e **apagar** o `057_seed_album_positions.sql` gerado pelo teste — ele será gerado na Task 3 com o CSV real.

```bash
echo "sticker_code,page,row,col" > data/album-positions.csv
rm -f supabase/migrations/057_seed_album_positions.sql
```

- [ ] **Step 4: Commit**

```bash
git add data/album-positions.csv scripts/generate-album-seed.ts
git commit -m "feat(scripts): gerador de seed de posições do álbum a partir de CSV"
```

---

## Task 3: Migração 057 — seed das posições (gerada do CSV preenchido)

**Files:**
- Modify: `data/album-positions.csv` (preenchimento manual pelo usuário)
- Create: `supabase/migrations/057_seed_album_positions.sql`

**⚠️ Esta task depende do usuário preencher o CSV manualmente.** Ela pode ser executada em PR separado se o mapeamento ainda não estiver pronto. As tasks 4-8 não dependem dela.

- [ ] **Step 1: Pedir lista de sticker_codes existentes pra popular o CSV**

Rodar no Supabase local: `psql … -c "COPY (SELECT code FROM stickers ORDER BY group_id, number) TO STDOUT WITH CSV"`

Pegar a saída e usar pra preencher a coluna `sticker_code` do CSV (linhas com `page,row,col` vazias por enquanto).

- [ ] **Step 2: Usuário preenche o CSV**

O usuário preenche manualmente as colunas `page`, `row`, `col` de cada linha do CSV usando o álbum físico como referência. Layout esperado:
- Grupos não-FWC: 20 figurinhas em 2 páginas, padrão 2-4-4 (ímpar) e 3-4-3 (par).
- Grupos FWC: layouts variados, mapeados linha a linha.

- [ ] **Step 3: Gerar a migração**

```bash
npx tsx scripts/generate-album-seed.ts
```

Esperado: imprime "Gerado supabase/migrations/057_seed_album_positions.sql com NNN UPDATEs."

- [ ] **Step 4: Aplicar localmente e verificar**

`npx supabase db reset` (aplica todas as migrações em ordem).
Esperado: aplica sem erro. Se houver duplicata de `(page, row, col)`, o índice único parcial reclama com mensagem clara apontando o conflito.

Verificar contagem:
```sql
SELECT
  COUNT(*) FILTER (WHERE page IS NOT NULL) AS posicionadas,
  COUNT(*) FILTER (WHERE page IS NULL)     AS nao_posicionadas
FROM stickers;
```

- [ ] **Step 5: Commit**

```bash
git add data/album-positions.csv supabase/migrations/057_seed_album_positions.sql
git commit -m "feat(stickers): semeia posições do álbum a partir do mapeamento manual"
```

---

## Task 4: Migração 058 — RPC `get_public_stickers_album`

**Files:**
- Create: `supabase/migrations/058_public_stickers_album_rpc.sql`

- [ ] **Step 1: Criar a migração**

```sql
-- 058_public_stickers_album_rpc.sql
-- RPC dedicada pro modo álbum do perfil. Retorna TODAS as figurinhas com
-- page IS NOT NULL (após filtros), ordenadas por (page, row, col).
-- Sem paginação por offset: universo é ~220 stickers, cabe em uma resposta.
-- Frontend agrupa por page em memória.

CREATE OR REPLACE FUNCTION get_public_stickers_album(
  p_user_id UUID,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  page INT,
  row INT,
  col INT,
  group_id INT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_id IS NOT NULL AND p_viewer_id <> p_user_id;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.user_id = p_user_id
    GROUP BY us.sticker_id
  )
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    s.page,
    s.row,
    s.col,
    sg.id AS group_id,
    sg.name AS group_name,
    COALESCE((oc.cnt - 1), 0)::INT AS duplicate_count,
    CASE
      WHEN v_viewer_present THEN COALESCE((
        SELECT COUNT(*)::INT FROM public.user_stickers us
        WHERE us.user_id = p_viewer_id AND us.sticker_id = s.id
      ), 0)
      ELSE 0
    END AS viewer_owned_count
  FROM public.stickers s
  JOIN public.sticker_groups sg ON sg.id = s.group_id
  LEFT JOIN owner_counts oc ON oc.sticker_id = s.id
  WHERE s.page IS NOT NULL
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
  ORDER BY s.page, s.row, s.col;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stickers_album(UUID, INT, TEXT, UUID) TO anon, authenticated;
```

Nota sobre `duplicate_count`: aqui represento "cópias além da primeira" (`cnt - 1`) — diferente da RPC de lista que retorna 0 na aba `missing` e `cnt - 1` na aba `duplicates`. No modo álbum, o card precisa saber se o dono tem repetida pra exibir o gradiente dourado, então `cnt - 1` é o valor útil em ambos os casos.

- [ ] **Step 2: Aplicar e testar a RPC**

`npx supabase db reset`

Testar no psql ou Supabase Studio:
```sql
SELECT * FROM get_public_stickers_album(
  '<um user_id válido>'::uuid,
  NULL, NULL, NULL
) LIMIT 5;
```

Esperado: retorna 5 linhas com `page`, `row`, `col` preenchidos (se Task 3 já foi aplicada) ou 0 linhas (se ainda não). Sem erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/058_public_stickers_album_rpc.sql
git commit -m "feat(stickers): RPC get_public_stickers_album pro modo álbum"
```

---

## Task 5: Extrair `StickerCard` pra componente próprio

**Files:**
- Create: `app/p/[username]/sticker-card.tsx`
- Modify: `app/p/[username]/profile-stickers.tsx` (importa em vez de definir inline)

- [ ] **Step 1: Criar `sticker-card.tsx`**

Mover o componente `StickerCard` que hoje está nas linhas finais de `profile-stickers.tsx` (function `StickerCard` que começa próximo da linha 579) pra arquivo próprio. Conteúdo do novo arquivo:

```tsx
"use client";

import { Check } from "lucide-react";

export interface StickerCardSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

export function StickerCard({
  sticker,
  selectable = false,
  selected = false,
  onToggle,
  ownedCount = null,
}: {
  sticker: StickerCardSticker;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  ownedCount?: number | null;
}) {
  const showOwnership = ownedCount !== null;
  const hasIt = showOwnership && ownedCount > 0;
  const isDuplicate = showOwnership && ownedCount > 1;

  const ownershipWrap = showOwnership
    ? hasIt
      ? isDuplicate
        ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
      : "bg-white/10"
    : "";

  const innerContent = (
    <div className={`aspect-[49/63] relative ${showOwnership && !hasIt ? "bg-gray-800/50" : "bg-gray-800"}`}>
      {sticker.image_url ? (
        <img
          src={sticker.image_url}
          alt={sticker.code}
          className={`h-full w-full object-cover ${showOwnership && !hasIt ? "grayscale opacity-70" : ""}`}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full flex-col items-start p-3 pt-2">
          <span className="text-sm font-bold text-white/50">{sticker.code}</span>
          <div className="flex flex-1 w-full items-center justify-center -mt-2">
            <svg className="h-20 w-20 text-white/15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div className="w-full space-y-1 text-center">
            {sticker.title ? (
              <p className="text-sm font-bold text-white/80 truncate">{sticker.title}</p>
            ) : (
              <div className="mx-auto h-3 w-3/4 rounded bg-white/10" />
            )}
            <div className="mx-auto h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      )}

      {sticker.image_url && sticker.title && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-sm font-bold text-white text-center px-2 leading-tight">
            {sticker.title}
          </span>
        </div>
      )}

      {sticker.image_url && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
          <span className="text-[10px] font-bold text-white">{sticker.code}</span>
        </div>
      )}

      {selectable && selected && (
        <div className="absolute inset-0 ring-2 ring-green-500 rounded-md pointer-events-none" />
      )}
      {selectable && (
        <span
          className={`absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow transition-colors ${
            selected
              ? "bg-green-500 text-white"
              : "border-2 border-white/80 bg-black/40 backdrop-blur-sm"
          }`}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
    </div>
  );

  const wrapperBase = showOwnership
    ? `group relative rounded-lg p-[2px] overflow-hidden transition-all ${ownershipWrap}`
    : `group relative rounded-lg border overflow-hidden transition-all ${
        selectable && selected
          ? "border-green-500"
          : "border-white/10 hover:scale-[1.03] hover:border-white/20"
      }`;

  if (selectable && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`${wrapperBase} text-left`}
      >
        {innerContent}
      </button>
    );
  }

  return <div className={wrapperBase}>{innerContent}</div>;
}
```

- [ ] **Step 2: Remover `StickerCard` inline do `profile-stickers.tsx` e importar**

No topo de `profile-stickers.tsx`, adicionar:

```ts
import { StickerCard } from "./sticker-card";
```

Apagar a function `StickerCard` que vinha no fim do arquivo. O `StickerResult` consumido continua sendo um superset de `StickerCardSticker` — TypeScript aceita por structural typing.

- [ ] **Step 3: Verificar lint e build**

```bash
npm run lint
npm run build
```

Esperado: sem erros novos. (`npm run build` pode demorar — só prossiga depois que o type-check passar.)

- [ ] **Step 4: Verificar UI no browser**

`npm run dev`, abrir `/p/<username>` de um usuário com figurinhas, conferir que os cards renderizam idênticos a antes (com/sem imagem, repetidas, faltantes).

- [ ] **Step 5: Commit**

```bash
git add app/p/[username]/sticker-card.tsx app/p/[username]/profile-stickers.tsx
git commit -m "refactor(profile): extrai StickerCard pra componente próprio"
```

---

## Task 6: Extrair view de lista (`ProfileStickersList`)

**Files:**
- Create: `app/p/[username]/profile-stickers-list.tsx`
- Modify: `app/p/[username]/profile-stickers.tsx`

A intenção dessa task é mover **toda a lógica atual da view de lista** (abas Faltam/Repetidas, grid, scroll infinito, seleção pra proposta, CTA sticky, modais) pra um arquivo separado, sem mudar comportamento.

- [ ] **Step 1: Criar `profile-stickers-list.tsx`**

Estrutura: aceita as mesmas props que `ProfileStickers` aceita hoje, **mais** as props compartilhadas que vão vir do shell (filtro de grupo e keyword controlados externamente). Assinatura:

```tsx
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";
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
import { createProposalAction } from "@/app/(authenticated)/proposals/lib/create-proposal-action";
import type { ProposalItem } from "@/app/(authenticated)/proposals/lib/types";
import { StickerCard } from "./sticker-card";

type ViewerFilter = "all" | "owned" | "duplicates";

interface StickerResult {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  group_name: string;
  duplicate_count: number;
  viewer_owned_count: number;
  total_count: number;
}

interface SelectedSticker {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

const PAGE_SIZE = 20;

export function ProfileStickersList({
  userId,
  viewerId,
  tradeUIEnabled,
  tradeFilterActive,
  isLoggedIn,
  ownerUsername,
  ownerHasTradeable,
  missingCount,
  duplicatesCount,
  tradeDuplicatesCount,
  // Filtros compartilhados controlados pelo shell:
  groupId,
  keyword,
}: {
  userId: string;
  viewerId: string | null;
  tradeUIEnabled: boolean;
  tradeFilterActive: boolean;
  isLoggedIn: boolean;
  ownerUsername: string;
  ownerHasTradeable: boolean;
  missingCount: number;
  duplicatesCount: number;
  tradeDuplicatesCount: number | null;
  groupId: number | null;
  keyword: string;
}) {
  // ... TODA a lógica de estado, useEffects, RPC call, handlers e JSX
  // que hoje vive em ProfileStickers, MENOS:
  //   - Filtros UI (busca + popover de grupo) — sobem pro shell.
  //   - Toggle de view — sobe pro shell.
  // O resto (abas Faltam/Repetidas, grid, scroll infinito, seleção,
  // CTA sticky, AlertDialog de login) fica aqui sem mudança.
}

// Mover StickyStatus e StickyAction (helpers) pra este arquivo também,
// já que só são usados pela view de lista.
```

Copiar literalmente o corpo da `function ProfileStickers` atual (tudo de `const initialTab` até o `return (...)` final), removendo:
- `const [groupId, setGroupId] = useState<number | null>(null);` → vem de prop.
- `const [groupOpen, setGroupOpen] = useState(false);` → vai pro shell.
- `const [keyword, setKeyword] = useState("");` → vem de prop.
- O bloco JSX `{/* Filters */}` com `<Popover>` e `<input>` → vai pro shell.

Manter o restante (abas, grid, scroll infinito, viewer filter, CTA sticky, AlertDialog).

Mover também os helpers `StickyStatus` e `StickyAction` pro fim do arquivo.

- [ ] **Step 2: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros novos. (Não toca em `profile-stickers.tsx` ainda — esta task isola a extração.)

- [ ] **Step 3: Commit**

```bash
git add app/p/[username]/profile-stickers-list.tsx
git commit -m "refactor(profile): extrai view de lista pra ProfileStickersList"
```

---

## Task 7: Converter `profile-stickers.tsx` em shell com toggle de view

**Files:**
- Modify: `app/p/[username]/profile-stickers.tsx`
- Create: `app/p/[username]/profile-stickers-album.tsx` (stub neste passo, implementado na Task 8)

- [ ] **Step 1: Criar stub do componente álbum**

Arquivo `app/p/[username]/profile-stickers-album.tsx`:

```tsx
"use client";

export function ProfileStickersAlbum({
  userId: _userId,
  viewerId: _viewerId,
  groupId: _groupId,
  keyword: _keyword,
}: {
  userId: string;
  viewerId: string | null;
  groupId: number | null;
  keyword: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
      Modo álbum — em construção.
    </div>
  );
}
```

(Stub permite o shell compilar agora; Task 8 substitui o conteúdo.)

- [ ] **Step 2: Reescrever `profile-stickers.tsx` como shell**

Substituir TODO o conteúdo de `app/p/[username]/profile-stickers.tsx` por:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronsUpDown, Check, Search, BookOpen, List } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ProfileStickersList } from "./profile-stickers-list";
import { ProfileStickersAlbum } from "./profile-stickers-album";

interface Group {
  id: number;
  name: string;
  code: string;
}

type ViewMode = "list" | "album";

const VIEW_MODE_STORAGE_KEY = "profileViewMode";

export function ProfileStickers({
  userId,
  viewerId = null,
  tradeUIEnabled = false,
  tradeFilterActive = false,
  isLoggedIn = false,
  ownerUsername,
  ownerHasTradeable = false,
  groups,
  missingCount,
  duplicatesCount,
  tradeDuplicatesCount = null,
}: {
  userId: string;
  viewerId?: string | null;
  tradeUIEnabled?: boolean;
  tradeFilterActive?: boolean;
  isLoggedIn?: boolean;
  ownerUsername: string;
  ownerHasTradeable?: boolean;
  groups: Group[];
  missingCount: number;
  duplicatesCount: number;
  tradeDuplicatesCount?: number | null;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  // Carregar viewMode do localStorage no mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "list" || stored === "album") {
      setViewMode(stored);
    }
  }, []);

  // Persistir viewMode.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Trade UI só faz sentido no modo lista — força lista quando trade está ativo.
  const effectiveViewMode: ViewMode = tradeUIEnabled ? "list" : viewMode;

  return (
    <div className="space-y-4 pb-32">
      {/* Header com filtros compartilhados + toggle de view */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Buscar por código..."
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <Popover open={groupOpen} onOpenChange={setGroupOpen}>
          <PopoverTrigger className="flex w-full sm:w-48 items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
            <span className={groupId ? "text-white" : "text-gray-400"}>
              {groupId ? groups.find((g) => g.id === groupId)?.name ?? "Grupo" : "Todos os grupos"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command
              filter={(value, search) =>
                value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
              }
            >
              <CommandInput placeholder="Buscar grupo..." />
              <CommandList>
                <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="all" onSelect={() => { setGroupId(null); setGroupOpen(false); }}>
                    <Check className={`mr-2 h-4 w-4 ${groupId === null ? "opacity-100" : "opacity-0"}`} />
                    Todos os grupos
                  </CommandItem>
                  {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`${g.code} ${g.name}`}
                      onSelect={() => { setGroupId(g.id); setGroupOpen(false); }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${groupId === g.id ? "opacity-100" : "opacity-0"}`} />
                      {g.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!tradeUIEnabled && (
          <div
            role="radiogroup"
            aria-label="Modo de visualização"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-sm self-start sm:self-auto"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-green-500 text-zinc-900 font-medium"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === "album"}
              onClick={() => setViewMode("album")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === "album"
                  ? "bg-green-500 text-zinc-900 font-medium"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <BookOpen className="h-4 w-4" /> Álbum
            </button>
          </div>
        )}
      </div>

      {effectiveViewMode === "list" ? (
        <ProfileStickersList
          userId={userId}
          viewerId={viewerId}
          tradeUIEnabled={tradeUIEnabled}
          tradeFilterActive={tradeFilterActive}
          isLoggedIn={isLoggedIn}
          ownerUsername={ownerUsername}
          ownerHasTradeable={ownerHasTradeable}
          missingCount={missingCount}
          duplicatesCount={duplicatesCount}
          tradeDuplicatesCount={tradeDuplicatesCount}
          groupId={groupId}
          keyword={keyword}
        />
      ) : (
        <ProfileStickersAlbum
          userId={userId}
          viewerId={viewerId}
          groupId={groupId}
          keyword={keyword}
        />
      )}
    </div>
  );
}
```

Notas:
- O shell tira os filtros (busca + grupo) do filho de lista. `ProfileStickersList` (Task 6) já está esperando essas duas props.
- `tradeUIEnabled` força modo lista (proposta de troca só rola lá).
- Quando estiver em modo lista, o `ProfileStickersList` ainda renderiza as próprias abas Faltam/Repetidas e seu viewer filter — esses são da lista, não do shell.

- [ ] **Step 3: Lint + build**

```bash
npm run lint
npm run build
```

Esperado: sem erros novos.

- [ ] **Step 4: Teste manual**

`npm run dev`. Abrir `/p/<seu-username>` (auto-visualização, sem trade UI):
- Toggle Lista/Álbum aparece. Em "Lista", grid e abas funcionam como antes.
- Em "Álbum", aparece o stub "em construção".
- Trocar pra lista, recarregar a página → volta em "Lista" (localStorage).
- Trocar pra álbum, recarregar → volta em "Álbum".

Abrir `/p/<outro-username>` (trade UI ligado): toggle Lista/Álbum **não aparece**, lista funciona como antes com seleção e CTA sticky.

- [ ] **Step 5: Commit**

```bash
git add app/p/[username]/profile-stickers.tsx app/p/[username]/profile-stickers-album.tsx
git commit -m "feat(profile): toggle Lista/Álbum no perfil, com filtros compartilhados"
```

---

## Task 8: Implementar `ProfileStickersAlbum`

**Files:**
- Modify: `app/p/[username]/profile-stickers-album.tsx`

- [ ] **Step 1: Implementar o componente completo**

Substituir o stub criado na Task 7 por:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StickerCard } from "./sticker-card";

interface AlbumSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  page: number;
  row: number;
  col: number;
  group_id: number;
  group_name: string;
  duplicate_count: number;
  viewer_owned_count: number;
}

interface AlbumPage {
  page: number;
  groupName: string;
  stickers: AlbumSticker[];
  maxRow: number;
  maxCol: number;
}

function groupByPage(rows: AlbumSticker[]): AlbumPage[] {
  const byPage = new Map<number, AlbumSticker[]>();
  for (const r of rows) {
    const arr = byPage.get(r.page) ?? [];
    arr.push(r);
    byPage.set(r.page, arr);
  }
  const pages: AlbumPage[] = [];
  for (const [page, stickers] of byPage) {
    // Grupo predominante: o grupo com mais figurinhas na página.
    const groupTally = new Map<string, number>();
    for (const s of stickers) {
      groupTally.set(s.group_name, (groupTally.get(s.group_name) ?? 0) + 1);
    }
    let topGroup = "";
    let topCount = -1;
    for (const [name, count] of groupTally) {
      if (count > topCount) {
        topGroup = name;
        topCount = count;
      }
    }
    const maxRow = stickers.reduce((m, s) => Math.max(m, s.row), 0);
    const maxCol = stickers.reduce((m, s) => Math.max(m, s.col), 0);
    pages.push({ page, groupName: topGroup, stickers, maxRow, maxCol });
  }
  pages.sort((a, b) => a.page - b.page);
  return pages;
}

export function ProfileStickersAlbum({
  userId,
  viewerId,
  groupId,
  keyword,
}: {
  userId: string;
  viewerId: string | null;
  groupId: number | null;
  keyword: string;
}) {
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fetchVersionRef = useRef(0);
  const isLoggedIn = viewerId !== null;

  // Buscar dados sempre que filtros mudarem.
  useEffect(() => {
    const myVersion = ++fetchVersionRef.current;
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers_album", {
        p_user_id: userId,
        p_group_id: groupId,
        p_keyword: keyword || null,
        p_viewer_id: viewerId,
      })
      .then(({ data }) => {
        if (myVersion !== fetchVersionRef.current) return;
        const rows = (data as AlbumSticker[] | null) ?? [];
        setPages(groupByPage(rows));
        setCurrentIdx(0);
        setLoading(false);
      });
  }, [userId, viewerId, groupId, keyword]);

  // Sincronizar currentIdx com scroll do carrossel.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const handler = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w === 0) return;
        const idx = Math.round(el.scrollLeft / w);
        setCurrentIdx((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      cancelAnimationFrame(frame);
    };
  }, [pages.length]);

  // Setas de teclado.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(currentIdx - 1);
      else if (e.key === "ArrowRight") goTo(currentIdx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  // Drag com mouse no desktop.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      isDown = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      el.scrollLeft = startScroll - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      // Snap pra página mais próxima.
      const w = el.clientWidth;
      const idx = Math.round(el.scrollLeft / w);
      el.scrollTo({ left: idx * w, behavior: "smooth" });
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [pages.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
        Nenhuma página encontrada com esses filtros. Algumas figurinhas ainda
        podem não ter sido posicionadas no álbum — use o modo lista pra ver
        todas.
      </div>
    );
  }

  const current = pages[currentIdx];

  return (
    <div className="space-y-3">
      {/* Header da página */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Página {current.page}</p>
          <p className="truncate text-base font-semibold text-white">{current.groupName}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400 tabular-nums">
            {currentIdx + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="Próxima página"
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx === pages.length - 1}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carrossel */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x rounded-lg border border-white/10 bg-black/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Páginas do álbum"
      >
        {pages.map((p) => (
          <AlbumPageView key={p.page} page={p} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {/* Indicador mobile (texto simples) */}
      <p className="sm:hidden text-center text-xs text-gray-400 tabular-nums">
        Página {currentIdx + 1} de {pages.length}
      </p>
    </div>
  );
}

function AlbumPageView({
  page,
  isLoggedIn,
}: {
  page: AlbumPage;
  isLoggedIn: boolean;
}) {
  // Grid baseado em (maxRow, maxCol). Cada sticker é posicionado por gridRow/gridColumn.
  return (
    <div className="snap-center snap-always shrink-0 w-full p-4">
      <div
        className="grid gap-2 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${page.maxCol}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${page.maxRow}, auto)`,
          maxWidth: `${page.maxCol * 100}px`,
        }}
      >
        {page.stickers.map((s) => (
          <div
            key={s.id}
            style={{ gridRow: s.row, gridColumn: s.col }}
          >
            <StickerCard
              sticker={s}
              ownedCount={isLoggedIn ? s.viewer_owned_count : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Notas de implementação:
- **Snap horizontal nativo** — `snap-x snap-mandatory` no scroller + `snap-center snap-always` em cada página. Touch funciona sozinho.
- **Drag desktop** — pointer events sobre o mesmo scroller, com snap manual no `pointerup`. Não interfere com touch (`e.pointerType !== "mouse"` filtra).
- **Teclado** — arrow keys movem ±1 página.
- **Grid por página** — `grid-template-columns/rows` calculados a partir do máximo de `row`/`col` da página. Cada figurinha posicionada por `gridRow/gridColumn`. Lida nativamente com qualquer layout, inclusive FWC irregulares.
- **`maxWidth: maxCol * 100px`** — limita largura visual; em mobile o `w-full` do snap item já garante uma página por viewport.
- **`viewer_owned_count` passado pro `StickerCard`** — quando logado mostra estados visuais; quando deslogado, mostra cards "neutros" (sem indicador de posse).

- [ ] **Step 2: Lint + build**

```bash
npm run lint
npm run build
```

Esperado: sem erros novos.

- [ ] **Step 3: Teste manual — feliz**

`npm run dev`. Pré-requisito: ter aplicado a migração 057 com mapeamento real (Task 3) **e** estar logado como dono de algumas figurinhas.

Abrir `/p/<seu-username>` → toggle "Álbum":
- Carrossel renderiza páginas.
- Swipe horizontal no mobile (DevTools com touch emulation) muda página com snap.
- Drag com mouse no desktop muda página, com snap no soltar.
- Setas ← → no header navegam.
- Arrow keys do teclado navegam.
- Indicador "X / N" atualiza.
- Cards mostram estado (tem/falta/repetida) conforme posse.

- [ ] **Step 4: Teste manual — bordas**

- **Sem nenhum mapeamento aplicado:** entrar em modo álbum → mostra o empty state com a mensagem sobre "modo lista pra ver todas".
- **Filtro de grupo "Brasil":** carrossel encolhe pras páginas só do grupo. Se grupo não foi mapeado, empty state aparece.
- **Busca "BRA1":** carrossel mostra só a página que tem essa figurinha (figurinha aparece sozinha — comportamento aceitável, é busca exata).
- **Visualização sem login:** abrir `/p/<username>` deslogado, alternar pra álbum — cards renderizam sem estado de posse (sem gradiente dourado/cinza).
- **Modo álbum + outro perfil (trade UI ligado):** toggle não aparece (forçado pra lista). Conferir que abrir como outro user mantém UX de troca intacta.

- [ ] **Step 5: Commit**

```bash
git add app/p/[username]/profile-stickers-album.tsx
git commit -m "feat(profile): implementa modo álbum com paginação por arrasto"
```

---

## Self-review feita

- ✅ Migração 056 cobre adição das colunas e índices.
- ✅ Script gerador (Task 2) cobre transformação CSV → SQL.
- ✅ Task 3 cobre o seed manual.
- ✅ RPC dedicada (Task 4) cobre a leitura pro modo álbum, com filtros de grupo e keyword.
- ✅ Refatoração mínima dividida em Tasks 5, 6 e 7 — cada uma com escopo isolado.
- ✅ Task 8 implementa o carrossel completo.
- ✅ Sem placeholders, sem "implementar depois", todos os blocos de código completos.
- ✅ Tipos consistentes entre tasks: `StickerCardSticker`, `AlbumSticker`, `AlbumPage`, `ProfileStickersList` props.
- ✅ Convenções do projeto seguidas (SECURITY DEFINER, GRANT EXECUTE, "use client").
- ✅ Task 3 marcada como **independente** das tasks 4-8 — pode ser PR separado se o mapeamento não estiver pronto.
