# Lista de Preciso — Wishlist por Álbum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma "lista de desejo" liga/desliga por álbum que se funde com os faltantes numa "lista de preciso" (coleção + lista do WhatsApp + scanner modo Troca).

**Architecture:** Nova tabela `album_wishlist (album_id, sticker_id)` com RLS por dono. Três RPCs existentes passam a enxergar a wishlist (`search_stickers`, `get_user_share_list`, `lookup_sticker_by_code`). A função pura `resolveScanAction` ganha o parâmetro `wishlisted`. A UI da coleção ganha um toggle ⭐, um novo filtro "Preciso" e um badge "tem N".

**Tech Stack:** Next.js (App Router) + React client components, Supabase Postgres (RPCs + RLS), Vitest, Tailwind, lucide-react.

## Global Constraints

- **NÃO editar migrations antigas.** Criar novos arquivos numerados: `111_*` e `112_*` em `supabase/migrations/`.
- **Desejo é por álbum.** Toda leitura/escrita usa `album_id`.
- **Sem meta de quantidade.** A wishlist é liga/desliga; a quantidade possuída é só exibida ("tem N").
- **Escopo:** coleção (modo lista), lista compartilhável do WhatsApp e scanner modo Troca. O modo Álbum (grid) e o perfil público/trocas online ficam **fora** de escopo.
- **`stickers.id` e `albums.id` são `INT`.** FKs e colunas de RPC usam `INT`.
- **Test runner:** Vitest. Rodar com `npm run test -- <arquivo>` (o binário local; `npx vitest` puxa versão errada). Requer `npm install` no worktree antes.
- **RLS pattern (copiar verbatim de `106_user_stickers_album_writes.sql`):** `EXISTS (SELECT 1 FROM albums a WHERE a.id = album_id AND a.user_id = auth.uid())`.
- **Cuidado de ambiente:** dev aponta pro Supabase hospedado (prod). Aplicar migrations é passo de deploy do usuário — este plano só escreve os arquivos `.sql`.

---

### Task 1: Migration 111 — tabela `album_wishlist` + RLS

**Files:**
- Create: `supabase/migrations/111_album_wishlist.sql`

**Interfaces:**
- Produces: tabela `public.album_wishlist(album_id INT, sticker_id INT, created_at TIMESTAMPTZ)`, PK `(album_id, sticker_id)`, com RLS `select`/`insert`/`delete` para o dono do álbum. Consumida pelas Tasks 2 e 7 (SQL) e pela Task 6 (client insert/delete).

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/111_album_wishlist.sql` com:

```sql
-- Lista de desejo por álbum: figurinhas que o usuário quer estocar mesmo já
-- tendo (alta demanda em trocas). Liga/desliga, sem quantidade.
CREATE TABLE public.album_wishlist (
  album_id   INT NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (album_id, sticker_id)
);

ALTER TABLE public.album_wishlist ENABLE ROW LEVEL SECURITY;

-- Só o dono do álbum lê/escreve a própria wishlist (mesmo padrão de user_stickers).
CREATE POLICY "album_wishlist_select_own"
  ON public.album_wishlist FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));

CREATE POLICY "album_wishlist_insert_own"
  ON public.album_wishlist FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));

CREATE POLICY "album_wishlist_delete_own"
  ON public.album_wishlist FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/111_album_wishlist.sql
git commit -m "feat(wishlist): tabela album_wishlist com RLS por dono"
```

---

### Task 2: Migration 112 — RPCs cientes da wishlist

**Files:**
- Create: `supabase/migrations/112_wishlist_reads.sql`

**Interfaces:**
- Consumes: `public.album_wishlist` (Task 1).
- Produces:
  - `search_stickers(...)` retorna nova coluna `wishlisted BOOLEAN` e aceita `p_status = 'preciso'` (`owned = 0` OU wishlisted).
  - `get_user_share_list(p_album_id INT, p_kind TEXT)`: `p_kind = 'missing'` passa a incluir figurinhas na wishlist (mesma forma de retorno).
  - `lookup_sticker_by_code(p_code TEXT, p_album_id INT)` retorna nova coluna `wishlisted BOOLEAN`.

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/112_wishlist_reads.sql` com os três blocos abaixo, na ordem.

Bloco 1 — `search_stickers` (recria por causa da nova coluna de retorno):

```sql
-- search_stickers passa a expor `wishlisted` e o status 'preciso' (faltam + desejos).
DROP FUNCTION IF EXISTS search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT);

CREATE FUNCTION search_stickers(
  p_album_id INT,
  p_keyword TEXT DEFAULT NULL,
  p_group_id INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  group_id INT,
  code TEXT,
  number INT,
  title TEXT,
  image_url TEXT,
  owned_count BIGINT,
  total_count BIGINT,
  viewer_owned_count BIGINT,
  wishlisted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  ),
  viewer_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE p_viewer_album_id IS NOT NULL AND us.album_id = p_viewer_album_id
    GROUP BY us.sticker_id
  ),
  wishlist AS (
    SELECT aw.sticker_id
    FROM album_wishlist aw
    WHERE aw.album_id = p_album_id
  )
  SELECT
    s.id,
    s.group_id,
    s.code,
    s.number,
    s.title,
    s.image_url,
    COALESCE(uc.cnt, 0) AS owned_count,
    COUNT(*) OVER() AS total_count,
    COALESCE(vc.cnt, 0) AS viewer_owned_count,
    (w.sticker_id IS NOT NULL) AS wishlisted
  FROM stickers s
  LEFT JOIN user_counts uc ON uc.sticker_id = s.id
  LEFT JOIN viewer_counts vc ON vc.sticker_id = s.id
  LEFT JOIN wishlist w ON w.sticker_id = s.id
  WHERE
    (p_keyword IS NULL OR unaccent(s.code) ILIKE '%' || unaccent(p_keyword) || '%' OR unaccent(COALESCE(s.title, '')) ILIKE '%' || unaccent(p_keyword) || '%')
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (
      p_status IS NULL
      OR (p_status = 'owned' AND COALESCE(uc.cnt, 0) > 0)
      OR (p_status = 'missing' AND COALESCE(uc.cnt, 0) = 0)
      OR (p_status = 'duplicate' AND COALESCE(uc.cnt, 0) > 1)
      OR (p_status = 'preciso' AND (COALESCE(uc.cnt, 0) = 0 OR w.sticker_id IS NOT NULL))
    )
  ORDER BY s.group_id, s.number
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT) TO authenticated;
```

Bloco 2 — `get_user_share_list` (`missing` inclui desejos):

```sql
-- get_user_share_list: a lista "faltam" vira "preciso" (faltantes + desejos).
DROP FUNCTION IF EXISTS get_user_share_list(INT, TEXT);

CREATE FUNCTION get_user_share_list(p_album_id INT, p_kind TEXT)
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT,
  count INT
)
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  WITH counts AS (
    SELECT sticker_id, COUNT(*)::INT AS cnt
    FROM public.user_stickers
    WHERE album_id = p_album_id
    GROUP BY sticker_id
  ),
  wishlist AS (
    SELECT sticker_id
    FROM public.album_wishlist
    WHERE album_id = p_album_id
  )
  SELECT
    s.group_id,
    g.name AS group_name,
    g.code AS group_code,
    s.id AS sticker_id,
    s.code AS sticker_code,
    s.number AS sticker_number,
    s.title AS sticker_title,
    COALESCE(c.cnt, 0) AS count
  FROM public.stickers s
  JOIN public.sticker_groups g ON g.id = s.group_id
  LEFT JOIN counts c ON c.sticker_id = s.id
  LEFT JOIN wishlist w ON w.sticker_id = s.id
  WHERE
    (p_kind = 'missing' AND (COALESCE(c.cnt, 0) = 0 OR w.sticker_id IS NOT NULL))
    OR (p_kind = 'duplicates' AND COALESCE(c.cnt, 0) >= 2)
  ORDER BY s.group_id, s.number;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_list(INT, TEXT) TO authenticated, anon;
```

Bloco 3 — `lookup_sticker_by_code` (expõe `wishlisted`):

```sql
-- lookup_sticker_by_code passa a informar se a figurinha está na wishlist do álbum.
DROP FUNCTION IF EXISTS lookup_sticker_by_code(TEXT, INT);

CREATE FUNCTION lookup_sticker_by_code(p_code TEXT, p_album_id INT)
RETURNS TABLE (
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  owned_count INT,
  wishlisted BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    (
      SELECT COUNT(*)::INT
      FROM public.user_stickers us
      WHERE us.sticker_id = s.id AND us.album_id = p_album_id
    ) AS owned_count,
    EXISTS (
      SELECT 1 FROM public.album_wishlist aw
      WHERE aw.sticker_id = s.id AND aw.album_id = p_album_id
    ) AS wishlisted
  FROM public.stickers s
  WHERE s.code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_sticker_by_code(TEXT, INT) TO authenticated, anon;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/112_wishlist_reads.sql
git commit -m "feat(wishlist): RPCs cientes da wishlist (search/share/lookup)"
```

---

### Task 3: `resolveScanAction` — parâmetro `wishlisted` (TDD)

**Files:**
- Modify: `lib/scanner/resolve-scan-action.ts:22-53`
- Test: `lib/scanner/resolve-scan-action.test.ts:32-48`

**Interfaces:**
- Produces: `resolveScanAction(mode: ScanMode, ownedCount: number, wishlisted?: boolean): ScanActionResult`. No modo `troca`, `ownedCount >= 1 && wishlisted` → `{ color: "green", action: "add", message: "Você quer mais dessa — pega! (tem N)", actionLabel: "Pegar" }`. Consumido pela Task 4.

- [ ] **Step 1: Corrigir o teste `troca` desatualizado e adicionar os casos de wishlist**

O teste atual em `lib/scanner/resolve-scan-action.test.ts:41-48` está desatualizado (espera vermelho "Você já tem — pula", mas a implementação retorna amarelo). Substituir o bloco das linhas 41-48:

```ts
  it("troca: já tem → vermelho, none, Próxima", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "red",
      action: "none",
      message: "Você já tem — pula",
      actionLabel: "Próxima",
    });
  });
```

por:

```ts
  it("troca: já tem e fora da wishlist → amarelo, none, Próxima", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Você tem 1 figurinha",
      actionLabel: "Próxima",
    });
  });

  it("troca: já tem 2 e fora da wishlist → amarelo, none, plural", () => {
    expect(resolveScanAction("troca", 2)).toEqual({
      color: "yellow",
      action: "none",
      message: "Você tem 2 figurinhas",
      actionLabel: "Próxima",
    });
  });

  it("troca: já tem e na wishlist → verde, add, Pegar (mostra quantidade)", () => {
    expect(resolveScanAction("troca", 2, true)).toEqual({
      color: "green",
      action: "add",
      message: "Você quer mais dessa — pega! (tem 2)",
      actionLabel: "Pegar",
    });
  });

  it("troca: não tem, wishlisted não muda nada → verde, add, Pegar, 'Nova'", () => {
    expect(resolveScanAction("troca", 0, true)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
      actionLabel: "Pegar",
    });
  });
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npm run test -- lib/scanner/resolve-scan-action.test.ts`
Expected: FAIL — os novos casos de wishlist falham (a assinatura ainda ignora o 3º argumento e não há ramo wishlist).

- [ ] **Step 3: Implementar**

Em `lib/scanner/resolve-scan-action.ts`, trocar a assinatura e o ramo `troca`. Substituir as linhas 22 e 33-40.

Linha 22 (assinatura) — de:

```ts
export function resolveScanAction(mode: ScanMode, ownedCount: number): ScanActionResult {
```

para:

```ts
export function resolveScanAction(
  mode: ScanMode,
  ownedCount: number,
  wishlisted = false,
): ScanActionResult {
```

Ramo `troca` (linhas 33-40) — de:

```ts
  if (mode === "troca") {
    if (ownedCount === 0)
      return { color: "green", action: "add", message: "Nova — pega!", actionLabel: "Pegar" };
    // Mostra a quantidade para o usuário decidir se quer pegar para trocas futuras.
    // Se quiser, pode lançar depois pela aba de lançamentos.
    const qty = ownedCount === 1 ? "1 figurinha" : `${ownedCount} figurinhas`;
    return { color: "yellow", action: "none", message: `Você tem ${qty}`, actionLabel: "Próxima" };
  }
```

para:

```ts
  if (mode === "troca") {
    if (ownedCount === 0)
      return { color: "green", action: "add", message: "Nova — pega!", actionLabel: "Pegar" };
    // Está na lista de desejo: quer estocar mesmo já tendo (alta demanda). Pega!
    if (wishlisted)
      return {
        color: "green",
        action: "add",
        message: `Você quer mais dessa — pega! (tem ${ownedCount})`,
        actionLabel: "Pegar",
      };
    // Já tem e não é desejo: só confere e segue.
    const qty = ownedCount === 1 ? "1 figurinha" : `${ownedCount} figurinhas`;
    return { color: "yellow", action: "none", message: `Você tem ${qty}`, actionLabel: "Próxima" };
  }
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npm run test -- lib/scanner/resolve-scan-action.test.ts`
Expected: PASS — todos os casos (lançamento, troca com/sem wishlist, baixa).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/resolve-scan-action.ts lib/scanner/resolve-scan-action.test.ts
git commit -m "feat(wishlist): resolveScanAction sinaliza 'pega!' para desejo no modo troca"
```

---

### Task 4: Scanner lê `wishlisted` e repassa

**Files:**
- Modify: `lib/scanner/lookup-sticker-by-code.ts:3-9,28-34`
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx:168,582`

**Interfaces:**
- Consumes: `resolveScanAction(mode, ownedCount, wishlisted)` (Task 3), `lookup_sticker_by_code` retornando `wishlisted` (Task 2).
- Produces: `ScannedSticker` ganha `wishlisted: boolean`.

- [ ] **Step 1: Adicionar `wishlisted` ao tipo e ao mapeamento em `lookup-sticker-by-code.ts`**

Na interface `ScannedSticker` (linhas 3-9), adicionar o campo após `owned_count`:

```ts
export interface ScannedSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
  wishlisted: boolean;
}
```

No return do `lookupStickerByCode` (linhas 28-34), adicionar o campo:

```ts
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    image_url: row.image_url,
    owned_count: row.owned_count ?? 0,
    wishlisted: row.wishlisted ?? false,
  };
```

- [ ] **Step 2: Passar `wishlisted` nas duas chamadas de `resolveScanAction` no scanner**

Em `scanner-view.tsx:168`, de:

```ts
      const { color, action, message } = resolveScanAction(activeMode, sticker.owned_count);
```

para:

```ts
      const { color, action, message } = resolveScanAction(activeMode, sticker.owned_count, sticker.wishlisted);
```

Em `scanner-view.tsx:582`, de:

```ts
            result={resolveScanAction(phase.mode, phase.sticker.owned_count)}
```

para:

```ts
            result={resolveScanAction(phase.mode, phase.sticker.owned_count, phase.sticker.wishlisted)}
```

- [ ] **Step 3: Verificar type-check**

Run: `npm run build`
Expected: build passa (sem erro de tipo em `ScannedSticker`/`resolveScanAction`).

- [ ] **Step 4: Commit**

```bash
git add lib/scanner/lookup-sticker-by-code.ts "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(wishlist): scanner troca lê wishlist e sinaliza pegar"
```

---

### Task 5: `StickerCard` badge ⭐ + `StickerActionsModal` toggle (apresentacional)

**Files:**
- Modify: `app/p/[username]/sticker-card.tsx:1-3,13-29,105-112`
- Modify: `app/(authenticated)/collection/sticker-actions-modal.tsx:9,11-31,81`

**Interfaces:**
- Produces:
  - `StickerCard` aceita `wishlisted?: boolean`. Quando `true` e `ownedCount != null`, renderiza um badge ⭐ com a quantidade no canto superior esquerdo.
  - `StickerActionsModal` aceita `wishlisted?: boolean`, `onToggleWishlist?: () => void`, `wishlistBusy?: boolean`. Renderiza o botão de toggle só quando `wishlisted !== undefined`.
- Consumido pela Task 6.

- [ ] **Step 1: `StickerCard` — importar `Star` e aceitar `wishlisted`**

Em `app/p/[username]/sticker-card.tsx:3`, de:

```ts
import { Check } from "lucide-react";
```

para:

```ts
import { Check, Star } from "lucide-react";
```

Na assinatura do componente (linhas 13-29), adicionar `wishlisted` aos props e ao destructuring:

```ts
export function StickerCard({
  sticker,
  selectable = false,
  selected = false,
  onToggle,
  onClick,
  ownedCount = null,
  orientation = "portrait",
  wishlisted = false,
}: {
  sticker: StickerCardSticker;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  ownedCount?: number | null;
  orientation?: "portrait" | "landscape";
  wishlisted?: boolean;
}) {
```

- [ ] **Step 2: `StickerCard` — renderizar o badge ⭐ com a quantidade**

Logo após o bloco do badge de repetidas (depois da linha 112, dentro de `innerContent`, antes do `</div>` de fechamento na linha 113), inserir:

```tsx
      {wishlisted && ownedCount !== null && (
        <span
          className="absolute top-1 left-1 flex h-5 items-center gap-0.5 rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white shadow tabular-nums"
          aria-label={`Na lista de desejo — você tem ${ownedCount}`}
        >
          <Star className="h-3 w-3" fill="currentColor" strokeWidth={0} /> tem {ownedCount}
        </span>
      )}
```

- [ ] **Step 3: `StickerActionsModal` — adicionar props e o botão de toggle**

Em `sticker-actions-modal.tsx:9`, de:

```ts
import { Plus, Minus, Loader2 } from "lucide-react";
```

para:

```ts
import { Plus, Minus, Loader2, Star } from "lucide-react";
```

Na interface `Props` (linhas 11-20), adicionar:

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  stickerCode: string;
  stickerTitle: string | null;
  ownedCount: number;
  busy: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
  wishlistBusy?: boolean;
}
```

No destructuring do componente (linhas 22-31), adicionar os três novos campos:

```ts
export function StickerActionsModal({
  open,
  onClose,
  stickerCode,
  stickerTitle,
  ownedCount,
  busy,
  onIncrement,
  onDecrement,
  wishlisted,
  onToggleWishlist,
  wishlistBusy = false,
}: Props) {
```

Logo após o `</div>` que fecha a linha de botões +/- (linha 81), antes do `</div>` que fecha o container `flex flex-col` (linha 82), inserir o toggle (só quando `wishlisted` foi informado):

```tsx
          {wishlisted !== undefined && onToggleWishlist && (
            <button
              type="button"
              onClick={onToggleWishlist}
              disabled={wishlistBusy}
              aria-pressed={wishlisted}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                wishlisted
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "border border-white/15 text-gray-300 hover:bg-white/5"
              }`}
            >
              {wishlistBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Star className="w-4 h-4" fill={wishlisted ? "currentColor" : "none"} />
                  {wishlisted ? "Na lista de desejo — remover" : "Quero mais dessa"}
                </>
              )}
            </button>
          )}
```

- [ ] **Step 4: Verificar type-check**

Run: `npm run build`
Expected: build passa (props novos são opcionais; callers existentes não quebram).

- [ ] **Step 5: Commit**

```bash
git add app/p/\[username\]/sticker-card.tsx "app/(authenticated)/collection/sticker-actions-modal.tsx"
git commit -m "feat(wishlist): badge de desejo no card e toggle na modal de ações"
```

---

### Task 6: `CollectionView` — filtro "Preciso", flag `wishlisted` e wiring do toggle

**Files:**
- Modify: `app/(authenticated)/collection/collection-view.tsx:35-44,79,81-86,232-242,282,386,391-396,451-458,509-518`

**Interfaces:**
- Consumes: `search_stickers` com `wishlisted` + status `preciso` (Task 2), `album_wishlist` (Task 1), `StickerCard`/`StickerActionsModal` novos props (Task 5).
- Produces: coleção mostra o filtro "Preciso", o badge ⭐ nos cards e o toggle na modal, persistindo em `album_wishlist`.

- [ ] **Step 1: Adicionar `wishlisted` ao tipo `StickerResult`**

Em `collection-view.tsx:35-44`, adicionar o campo:

```ts
interface StickerResult {
  id: number;
  group_id: number;
  code: string;
  number: number;
  title: string | null;
  image_url: string | null;
  owned_count: number;
  total_count: number;
  wishlisted: boolean;
}
```

- [ ] **Step 2: Guardar `wishlisted` no estado `actionsSticker`**

Em `collection-view.tsx:81-86`, adicionar `wishlisted`:

```ts
  const [actionsSticker, setActionsSticker] = useState<{
    id: number;
    code: string;
    title: string | null;
    owned_count: number;
    wishlisted?: boolean;
  } | null>(null);
```

`wishlisted` é opcional de propósito: no modo álbum ele fica `undefined` e o toggle da modal some (fora de escopo).

- [ ] **Step 3: Trocar o filtro "Faltam" por "Preciso"**

Em `collection-view.tsx:386` (label do trigger), de:

```tsx
                {status === "owned" ? "Tenho" : status === "missing" ? "Faltam" : status === "duplicate" ? "Repetidas" : "Todas"}
```

para:

```tsx
                {status === "owned" ? "Tenho" : status === "preciso" ? "Preciso" : status === "duplicate" ? "Repetidas" : "Todas"}
```

E na lista de opções (linhas 391-396), de:

```tsx
              {[
                { value: null, label: "Todas" },
                { value: "owned", label: "Tenho" },
                { value: "missing", label: "Faltam" },
                { value: "duplicate", label: "Repetidas" },
              ].map((opt) => (
```

para:

```tsx
              {[
                { value: null, label: "Todas" },
                { value: "owned", label: "Tenho" },
                { value: "preciso", label: "Preciso" },
                { value: "duplicate", label: "Repetidas" },
              ].map((opt) => (
```

- [ ] **Step 4: Passar `wishlisted` do resultado ao `StickerCard`**

Em `collection-view.tsx:451-458`, adicionar a prop:

```tsx
            {results.map((sticker) => (
              <StickerCard
                key={sticker.id}
                sticker={sticker}
                ownedCount={sticker.owned_count}
                wishlisted={sticker.wishlisted}
                onClick={() => handleCardClick(sticker)}
              />
            ))}
```

- [ ] **Step 5: Passar `wishlisted` ao abrir a modal de ações (modo lista) e omitir no modo álbum**

Em `handleCardClick` (linhas 232-242), a assinatura ganha `wishlisted` opcional e repassa ao estado. Substituir as linhas 232-242:

```tsx
  const handleCardClick = (sticker: { id: number; code: string; title: string | null; image_url: string | null; owned_count: number }) => {
    if (adding) return;
    if (sticker.owned_count >= 1) {
      setActionsSticker({
        id: sticker.id,
        code: sticker.code,
        title: sticker.title,
        owned_count: sticker.owned_count,
      });
      return;
    }
```

por:

```tsx
  const handleCardClick = (sticker: { id: number; code: string; title: string | null; image_url: string | null; owned_count: number; wishlisted?: boolean }) => {
    if (adding) return;
    if (sticker.owned_count >= 1) {
      setActionsSticker({
        id: sticker.id,
        code: sticker.code,
        title: sticker.title,
        owned_count: sticker.owned_count,
        wishlisted: sticker.wishlisted,
      });
      return;
    }
```

Nota: no modo álbum (linhas 481-489) o objeto passado a `handleCardClick` não inclui `wishlisted`, então fica `undefined` — o toggle da modal fica escondido nesse modo (fora de escopo). Nenhuma mudança nas linhas 481-489.

- [ ] **Step 6: Adicionar o handler de toggle da wishlist com update otimista**

Adicionar `wishlistBusy` ao estado. Em `collection-view.tsx:79` (junto de `const [adding, setAdding] = useState(false);`), inserir depois:

```ts
  const [wishlistBusy, setWishlistBusy] = useState(false);
```

Adicionar a função logo após `handleActionsDecrement` (depois da linha 282):

```tsx
  const doToggleWishlist = async () => {
    if (!actionsSticker || actionsSticker.wishlisted === undefined) return;
    const stickerId = actionsSticker.id;
    const next = !actionsSticker.wishlisted;
    setWishlistBusy(true);
    const supabase = createClient();
    if (next) {
      await supabase.from("album_wishlist").insert({ album_id: albumId, sticker_id: stickerId });
    } else {
      await supabase
        .from("album_wishlist")
        .delete()
        .eq("album_id", albumId)
        .eq("sticker_id", stickerId);
    }
    setResults((prev) =>
      prev.map((s) => (s.id === stickerId ? { ...s, wishlisted: next } : s))
    );
    setActionsSticker((prev) => (prev ? { ...prev, wishlisted: next } : null));
    setWishlistBusy(false);
    toast.success(next ? "Adicionada à lista de desejo!" : "Removida da lista de desejo!");
  };
```

- [ ] **Step 7: Ligar os novos props na `StickerActionsModal`**

Em `collection-view.tsx:509-518`, adicionar as três props:

```tsx
      <StickerActionsModal
        open={!!actionsSticker}
        onClose={() => setActionsSticker(null)}
        stickerCode={actionsSticker?.code ?? ""}
        stickerTitle={actionsSticker?.title ?? null}
        ownedCount={actionsSticker?.owned_count ?? 0}
        busy={adding}
        onIncrement={handleActionsIncrement}
        onDecrement={handleActionsDecrement}
        wishlisted={actionsSticker?.wishlisted}
        onToggleWishlist={doToggleWishlist}
        wishlistBusy={wishlistBusy}
      />
```

- [ ] **Step 8: Verificar type-check/build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 9: Commit**

```bash
git add "app/(authenticated)/collection/collection-view.tsx"
git commit -m "feat(wishlist): filtro Preciso, badge e toggle de desejo na coleção"
```

---

### Task 7: Verificação end-to-end (manual)

**Files:** nenhum (validação).

**Interfaces:**
- Consumes: tudo acima. Requer as migrations 111/112 aplicadas no Supabase do projeto.

- [ ] **Step 1: Aplicar as migrations**

Aplicar `111` e `112` pelo processo de migration do projeto (Supabase). Atenção: o banco é compartilhado com prod — confirmar com o usuário antes de aplicar.

- [ ] **Step 2: Rodar a suíte de testes**

Run: `npm run test`
Expected: PASS (inclui `resolve-scan-action.test.ts`).

- [ ] **Step 3: Coleção**

- Abrir `/collection` no modo Lista. Numa figurinha que você já tem (owned ≥ 1), clicar → modal mostra "Quantidade no álbum: N" e o botão **"Quero mais dessa"**. Ligar.
- O card ganha o badge **⭐ tem N** (canto superior esquerdo).
- Trocar o filtro para **"Preciso"** → a figurinha desejada aparece junto com as faltantes.
- Reabrir a modal → botão vira **"Na lista de desejo — remover"**. Desligar → badge some.

- [ ] **Step 4: Lista compartilhável (WhatsApp)**

- Com pelo menos uma figurinha desejada ligada no álbum **público**, gerar a lista "faltam" no perfil → o número da figurinha desejada aparece no texto, junto com as faltantes.

- [ ] **Step 5: Scanner — modo Troca**

- Abrir `/collection/scanner`, escolher **Troca**.
- Escanear (ou digitar o código de) uma figurinha que você **já tem** e está **na wishlist** → sinal **verde**, mensagem **"Você quer mais dessa — pega! (tem N)"**, botão **"Pegar"**.
- Escanear uma que você tem mas **não** está na wishlist → amarelo "Você tem N", botão "Próxima".
- Escanear uma que você **não** tem → verde "Nova — pega!".

- [ ] **Step 6: Commit final (se algo foi ajustado na verificação)**

```bash
git add -A
git commit -m "test(wishlist): ajustes da verificação end-to-end"
```
