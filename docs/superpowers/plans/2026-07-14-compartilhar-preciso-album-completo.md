# Compartilhar "Preciso" com álbum completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o botão de compartilhar do perfil público aparecer e divulgar a lista de desejos (wishlist) mesmo quando o álbum está completo, renomeando o botão para "Preciso".

**Architecture:** A RPC `get_user_share_list` já monta a lista "missing" incluindo os desejos. O gate do botão no front usa uma contagem que ignora a wishlist. A correção estende `get_profile_view_stats` com um contador de desejos-não-faltantes, soma no front (`totalNeeded`) e usa esse valor para o gate, a contagem e o rótulo do botão.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (Postgres RPC via `SECURITY DEFINER`), TypeScript, Tailwind.

## Global Constraints

- Migrations são arquivos SQL sequenciais em `supabase/migrations/NNN_nome.sql`; a próxima é `113_`.
- Funções Postgres usam `SECURITY DEFINER SET search_path = ''` e referenciam tabelas com prefixo `public.`; recriar via `DROP FUNCTION IF EXISTS` + `CREATE FUNCTION` e manter os `GRANT`.
- Não há testes de componente React nem de SQL no projeto; verificação é por `npx tsc --noEmit`, `npm run lint`, `npm run build` e cenários manuais.
- **Dev aponta para o Supabase de produção.** NÃO aplicar a migration automaticamente — a aplicação (via `supabase db push` ou dashboard) fica sob controle do usuário, para não mexer em dados/egress reais.
- Rótulo do botão: exatamente `"Preciso"`. Título da mensagem compartilhada permanece `"Faltam pro {displayName}"`.
- Nomes de figurinha/tamanho e regras de negócio existentes permanecem inalterados.

---

### Task 1: Migration — `wishlist_needed` em `get_profile_view_stats`

**Files:**
- Create: `supabase/migrations/113_profile_view_stats_wishlist.sql`

**Interfaces:**
- Consumes: tabelas `public.stickers`, `public.user_stickers`, `public.album_wishlist`.
- Produces: `get_profile_view_stats(p_album_id INT, p_viewer_album_id INT DEFAULT NULL)` retornando as colunas existentes **mais** `wishlist_needed BIGINT` — número de figurinhas na `album_wishlist` do álbum do dono que ele **já possui** (`owned_count >= 1`), i.e. desejos que não são faltantes. Consumido pela Task 2.

- [ ] **Step 1: Criar o arquivo da migration**

Criar `supabase/migrations/113_profile_view_stats_wishlist.sql` com o conteúdo abaixo. É a definição da 105 acrescida da CTE `owner_wishlist_owned` e da coluna `wishlist_needed`. `p_viewer_album_id` continua opcional.

```sql
-- get_profile_view_stats passa a expor wishlist_needed: figurinhas da lista de
-- desejos do dono que ele JÁ possui (owned >= 1). Faltantes que também estão na
-- wishlist já contam em owner_unique_owned como faltantes, então contamos só o
-- incremento para evitar dupla contagem no gate de "Preciso".
DROP FUNCTION IF EXISTS get_profile_view_stats(INT, INT);

CREATE FUNCTION get_profile_view_stats(
  p_album_id INT,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  total_stickers BIGINT,
  owner_unique_owned BIGINT,
  owner_total_duplicates BIGINT,
  trade_duplicates_count BIGINT,
  wishlist_needed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_album_id IS NOT NULL AND p_viewer_album_id <> p_album_id;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  ),
  owner_dupes AS (
    SELECT sticker_id FROM owner_counts WHERE cnt > 1
  ),
  owner_wishlist_owned AS (
    SELECT aw.sticker_id
    FROM public.album_wishlist aw
    JOIN owner_counts oc ON oc.sticker_id = aw.sticker_id
    WHERE aw.album_id = p_album_id AND oc.cnt >= 1
  ),
  viewer_owned AS (
    SELECT DISTINCT us.sticker_id
    FROM public.user_stickers us
    WHERE v_viewer_present AND us.album_id = p_viewer_album_id
  )
  SELECT
    (SELECT COUNT(*) FROM public.stickers)::BIGINT AS total_stickers,
    (SELECT COUNT(*) FROM owner_counts)::BIGINT AS owner_unique_owned,
    (SELECT COUNT(*) FROM owner_dupes)::BIGINT AS owner_total_duplicates,
    CASE
      WHEN v_viewer_present THEN (
        SELECT COUNT(*)
        FROM owner_dupes od
        WHERE NOT EXISTS (
          SELECT 1 FROM viewer_owned vo WHERE vo.sticker_id = od.sticker_id
        )
      )::BIGINT
      ELSE NULL
    END AS trade_duplicates_count,
    (SELECT COUNT(*) FROM owner_wishlist_owned)::BIGINT AS wishlist_needed;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_view_stats(INT, INT) TO anon, authenticated;
```

- [ ] **Step 2: Revisar o SQL**

Conferir: coluna nova é a **última** do `RETURNS TABLE` (não quebra os índices `stats.*` já usados); `owner_wishlist_owned` filtra `cnt >= 1`; `GRANT` presente; `DROP` casa a assinatura `(INT, INT)`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/113_profile_view_stats_wishlist.sql
git commit -m "feat(db): expõe wishlist_needed em get_profile_view_stats"
```

- [ ] **Step 4: (Usuário) Aplicar a migration**

A aplicação em produção é manual e fica sob controle do usuário (dev = Supabase prod). Sinalizar que a migration precisa ser aplicada antes de validar os cenários da Task 2. Não executar automaticamente.

---

### Task 2: Front — gate, contagem e rótulo "Preciso"

**Files:**
- Modify: `app/p/[username]/page.tsx:85-95,107-122`
- Modify: `app/p/[username]/profile-hero.tsx:5-42,69-76`
- Modify: `app/p/[username]/share-menu.tsx:17-31,142-151`

**Interfaces:**
- Consumes: `get_profile_view_stats` agora retorna `wishlist_needed` (Task 1).
- Produces: `ShareMenu` recebe `totalNeeded: number`; o MenuItem "Preciso" é renderizado quando `totalNeeded > 0`. `ProfileHero` ganha a prop `totalNeeded: number`.

- [ ] **Step 1: `page.tsx` — ler `wishlist_needed` e calcular `totalNeeded`**

No fallback de `stats` (linhas ~85-90) adicionar o campo novo:

```ts
  const stats = statsRows?.[0] ?? {
    total_stickers: 0,
    owner_unique_owned: 0,
    owner_total_duplicates: 0,
    trade_duplicates_count: null,
    wishlist_needed: 0,
  };
```

Logo após `const totalMissing = total - uniqueOwned;` (linha ~95) adicionar:

```ts
  const wishlistNeeded = Number(stats.wishlist_needed ?? 0);
  const totalNeeded = totalMissing + wishlistNeeded;
```

- [ ] **Step 2: `page.tsx` — passar `totalNeeded` ao `ProfileHero`**

No JSX do `<ProfileHero ... />` (linhas ~107-122), adicionar a prop mantendo `totalMissing`:

```tsx
          totalOwned={uniqueOwned}
          totalMissing={totalMissing}
          totalNeeded={totalNeeded}
          totalDuplicates={totalDuplicates}
```

- [ ] **Step 3: `profile-hero.tsx` — nova prop e repasse ao `ShareMenu`**

Na interface `ProfileHeroProps` (após `totalMissing: number;`) adicionar:

```ts
  totalNeeded: number;
```

Adicionar `totalNeeded,` na desestruturação dos parâmetros (junto de `totalMissing,`).

No `<ShareMenu ... />` (linhas ~69-75) trocar a prop `totalMissing` por `totalNeeded`:

```tsx
        <ShareMenu
          username={username}
          displayName={displayName}
          totalNeeded={totalNeeded}
          totalDuplicates={totalDuplicates}
          className="sm:ml-auto shrink-0"
        />
```

O array `stats` (card "Faltam", linha ~40) continua usando `totalMissing` — não alterar.

- [ ] **Step 4: `share-menu.tsx` — prop, gate, rótulo e hint**

Na interface `ShareMenuProps` (linhas 17-23) renomear `totalMissing` → `totalNeeded`:

```ts
interface ShareMenuProps {
  username: string;
  displayName: string;
  totalNeeded: number;
  totalDuplicates: number;
  className?: string;
}
```

Na desestruturação (linhas 25-31) trocar `totalMissing,` por `totalNeeded,`.

Substituir o bloco do MenuItem de faltantes (linhas 142-151) por:

```tsx
        {totalNeeded > 0 && (
          <MenuItem
            icon={AlertCircle}
            iconColor="text-red-400"
            label="Preciso"
            hint={`${totalNeeded} ${totalNeeded === 1 ? "figurinha" : "figurinhas"}`}
            busy={activeAction === "missing"}
            onClick={() => shareList("missing")}
          />
        )}
```

`shareList("missing")` e o `shareTitle` `"Faltam pro ${displayName}"` (linha ~87) permanecem inalterados.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros. (Se `stats.wishlist_needed` acusar tipo, é porque o tipo do retorno da RPC vem de `any`/gerado — o `Number(stats.wishlist_needed ?? 0)` já cobre.)

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 8: Commit**

```bash
git add app/p/[username]/page.tsx app/p/[username]/profile-hero.tsx app/p/[username]/share-menu.tsx
git commit -m "feat(profile): botão Preciso considera lista de desejos no álbum completo"
```

- [ ] **Step 9: Verificação manual (após migration aplicada)**

No perfil público, validar os cenários do spec:
1. Álbum completo + wishlist com desejos → botão "Preciso" aparece; clicar traz os desejos.
2. Álbum incompleto sem wishlist → "Preciso" com contagem de faltantes reais.
3. Álbum incompleto + wishlist → contagem = faltantes + desejos, sem dupla contagem.
4. Álbum completo sem wishlist → botão some.
5. Visitante (não dono) → vê nas mesmas condições.

---

## Self-Review

- **Cobertura do spec:** Migration 113 (`wishlist_needed`) → Task 1. `page.tsx`/`profile-hero.tsx`/`share-menu.tsx` (gate, `totalNeeded`, rótulo "Preciso", hint) → Task 2. Card "Faltam" inalterado, título da mensagem inalterado, visibilidade pra todos → preservados na Task 2. Backend da lista já correto → sem tarefa. ✔
- **Placeholders:** nenhum; todo SQL/TSX está explícito. ✔
- **Consistência de tipos:** `totalNeeded: number` definido em `ShareMenuProps` e `ProfileHeroProps`, produzido em `page.tsx` a partir de `Number(stats.wishlist_needed ?? 0) + totalMissing`; coluna `wishlist_needed BIGINT` retornada pela RPC. ✔
