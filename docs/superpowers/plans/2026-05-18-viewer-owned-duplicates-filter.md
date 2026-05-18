# Filtro viewer-owned na aba "Faltam" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o checkbox booleano "Só as que tenho" da aba "Faltam" do perfil público (`/p/[username]`) por um toggle de 3 estados — `Todas` / `Que eu tenho` / `Que eu tenho repetidas` — para ajudar o viewer a localizar candidatas reais de troca sem depender só do sinalizador visual no card.

**Architecture:** Mudança em duas camadas. (1) SQL: renomear parâmetro `p_owned_only BOOLEAN` da função `get_public_stickers` para `p_viewer_filter TEXT` ('all' | 'owned' | 'duplicates') e estender o predicado da branch `missing`. (2) Cliente: trocar o estado boolean `ownedOnly` por uma união tipada `ViewerFilter` no `app/p/[username]/profile-stickers.tsx` e substituir o checkbox por um segmented control de 3 botões com `aria-pressed`. O único chamador em runtime do RPC é esse mesmo arquivo (confirmado por grep), então a renomeação do parâmetro é segura.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (Postgres + RPC), Tailwind v4. Sem framework de testes instalado — verificação é `tsc --noEmit` (via `next build` em modo type-check) + `next lint` + teste manual no navegador.

**Branch:** `feature/profile-missing-filter-repeats` (já criada; spec já commitado em `f1f2a3b`).

**Spec:** `docs/superpowers/specs/2026-05-18-viewer-owned-duplicates-filter-design.md`

---

## File Structure

- **Create:** `supabase/migrations/051_public_stickers_viewer_filter.sql` — nova migração que dropa e recria `get_public_stickers` com `p_viewer_filter TEXT`.
- **Modify:** `app/p/[username]/profile-stickers.tsx` — trocar estado, chamadas ao RPC, checkbox por segmented control, e mensagem de empty state.

Não há outros chamadores do RPC `get_public_stickers` no código de runtime (apenas docs/specs/plans antigos referenciam o nome). Não há testes automatizados a atualizar.

---

### Task 1: Nova migração SQL com `p_viewer_filter`

**Files:**
- Create: `supabase/migrations/051_public_stickers_viewer_filter.sql`

Esta tarefa cria a migração isolada. Não tocamos ainda o cliente — a função antiga assinatura deixa de existir, mas a próxima task ajusta o front antes de aplicar a migração ao banco. Aplicar a migração ao Supabase é manual (fora do escopo do plano), feito após o merge.

- [ ] **Step 1: Criar o arquivo da migração**

Crie `supabase/migrations/051_public_stickers_viewer_filter.sql` com o conteúdo exato abaixo:

```sql
-- 051_public_stickers_viewer_filter.sql
-- Replace boolean p_owned_only with a 3-state p_viewer_filter on the
-- `missing` tab of get_public_stickers:
--   * 'all'        -> no viewer-based restriction (default)
--   * 'owned'      -> stickers the viewer owns (>= 1 copy) — same as
--                     the previous p_owned_only=true behavior
--   * 'duplicates' -> stickers the viewer owns as duplicates (>= 2 copies)
-- Filter applies only when a viewer is present (p_viewer_id IS NOT NULL
-- AND p_viewer_id <> p_user_id) AND p_tab = 'missing'.
-- The `duplicates` tab is unchanged: it keeps the existing intersection
-- (owner's dupes that the viewer does NOT own).

DROP FUNCTION IF EXISTS get_public_stickers;

CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_viewer_id UUID DEFAULT NULL,
  p_viewer_filter TEXT DEFAULT 'all'
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  group_name TEXT,
  duplicate_count INT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total BIGINT;
  v_viewer_present BOOLEAN := p_viewer_id IS NOT NULL AND p_viewer_id <> p_user_id;
  v_apply_owned BOOLEAN := v_viewer_present AND p_viewer_filter = 'owned';
  v_apply_dupes BOOLEAN := v_viewer_present AND p_viewer_filter = 'duplicates';
BEGIN
  IF p_tab = 'missing' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_owned OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (NOT v_apply_dupes OR s.id IN (
      SELECT us.sticker_id
      FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      0 AS duplicate_count,
      v_total AS total_count
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_owned OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (NOT v_apply_dupes OR s.id IN (
      SELECT us.sticker_id
      FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;

  ELSIF p_tab = 'duplicates' THEN
    SELECT COUNT(*) INTO v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      (dupes.cnt - 1)::INT AS duplicate_count,
      v_total AS total_count
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;
```

- [ ] **Step 2: Confirmar que não há outros chamadores do nome de parâmetro antigo**

Run: `grep -rn "p_owned_only" /Users/maykonsousa/conductor/workspaces/fifa-stickers/porto --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.js"`
Expected: matches APENAS em `supabase/migrations/050_public_stickers_owned_only.sql`, `app/p/[username]/profile-stickers.tsx` (será atualizado na próxima task), e arquivos sob `docs/superpowers/` (specs/plans antigos — não tocar).
Se aparecer em outro arquivo de runtime, pare e investigue antes de seguir.

- [ ] **Step 3: Commit da migração**

```bash
git add supabase/migrations/051_public_stickers_viewer_filter.sql
git commit -m "feat(db): viewer_filter param on get_public_stickers missing tab"
```

---

### Task 2: Atualizar tipos e estado do filtro no cliente

**Files:**
- Modify: `app/p/[username]/profile-stickers.tsx`

Renomeia o estado e a derivação. Sem mudar UI ainda — só o estado interno e as chamadas ao RPC, para que o cliente fique alinhado ao novo parâmetro `p_viewer_filter`. Após esta task, type-check deve passar.

- [ ] **Step 1: Adicionar o tipo `ViewerFilter` e substituir o estado**

Abra `app/p/[username]/profile-stickers.tsx`. Localize a linha:

```ts
  const [ownedOnly, setOwnedOnly] = useState(isLoggedIn);
```

Substitua por:

```ts
  const [viewerFilter, setViewerFilter] = useState<ViewerFilter>(
    isLoggedIn ? "duplicates" : "all",
  );
```

E adicione, logo após os imports (antes da declaração de `interface Group`):

```ts
type ViewerFilter = "all" | "owned" | "duplicates";
```

- [ ] **Step 2: Substituir a derivação `effectiveOwnedOnly`**

Localize:

```ts
  // The owned-only filter only makes sense on the missing tab with a logged viewer.
  const effectiveOwnedOnly = tab === "missing" && isLoggedIn && ownedOnly;
```

Substitua por:

```ts
  // The viewer filter only applies on the missing tab with a logged viewer.
  const effectiveViewerFilter: ViewerFilter =
    tab === "missing" && isLoggedIn ? viewerFilter : "all";
```

- [ ] **Step 3: Atualizar as duas chamadas ao RPC**

Localize a primeira chamada (carga inicial), no `useEffect` da linha ~119. Troque o argumento:

```ts
        p_owned_only: effectiveOwnedOnly,
```

por:

```ts
        p_viewer_filter: effectiveViewerFilter,
```

Faça o mesmo na segunda chamada (infinite scroll, no `useEffect` da linha ~148).

Atualize também as arrays de dependências dos dois `useEffect`: troque `effectiveOwnedOnly` por `effectiveViewerFilter`.

- [ ] **Step 4: Atualizar a mensagem de empty state**

Localize (linha ~376-386):

```tsx
      {/* Empty */}
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 text-sm">
            {tab === "missing" && effectiveOwnedOnly
              ? "Você não tem nenhuma das figurinhas que faltam pra ele. Desmarque o filtro pra ver todas."
              : tab === "duplicates" && tradeFilterActive
                ? "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria."
                : "Nenhuma figurinha encontrada."}
          </p>
        </div>
      )}
```

Substitua por:

```tsx
      {/* Empty */}
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 text-sm">
            {tab === "missing" && effectiveViewerFilter === "duplicates"
              ? "Nenhuma repetida sua bate com o que falta pra ele. Mude o filtro pra ver mais."
              : tab === "missing" && effectiveViewerFilter === "owned"
                ? "Você não tem nenhuma das figurinhas que faltam pra ele. Mude o filtro pra ver todas."
                : tab === "duplicates" && tradeFilterActive
                  ? "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria."
                  : "Nenhuma figurinha encontrada."}
          </p>
        </div>
      )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros. Se reclamar de `ownedOnly` órfão ou `setOwnedOnly` indefinido, é porque ainda há referência no JSX do checkbox — siga para a próxima task antes de tipar como concluída esta. Pode haver erro em `effectiveOwnedOnly` na referência da empty state se algo ficou para trás — corrija inline.

Nota: a referência ao checkbox em JSX nas linhas ~344-354 ainda usa `ownedOnly`/`setOwnedOnly` e vai falhar no type-check. **Isso é esperado** — a próxima task substitui esse bloco. Apenas confirme que o único erro restante é nesse bloco.

- [ ] **Step 6: Commit parcial**

```bash
git add app/p/[username]/profile-stickers.tsx
git commit -m "refactor(profile): viewer-filter state replaces ownedOnly boolean"
```

---

### Task 3: Substituir checkbox por segmented control de 3 estados

**Files:**
- Modify: `app/p/[username]/profile-stickers.tsx`

Troca o JSX do checkbox por um grupo de 3 botões com `aria-pressed`, preservando a visibilidade condicional (`tab === "missing" && tradeUIEnabled && isLoggedIn`).

- [ ] **Step 1: Substituir o bloco do checkbox**

Localize (linhas ~344-354):

```tsx
        {tab === "missing" && tradeUIEnabled && isLoggedIn && (
          <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              className="accent-green-500"
            />
            Só as que tenho
          </label>
        )}
```

Substitua por:

```tsx
        {tab === "missing" && tradeUIEnabled && isLoggedIn && (
          <div
            role="radiogroup"
            aria-label="Filtrar pelas minhas figurinhas"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-sm"
          >
            {([
              { value: "all", label: "Todas" },
              { value: "owned", label: "Que eu tenho" },
              { value: "duplicates", label: "Que tenho repetidas" },
            ] as { value: ViewerFilter; label: string }[]).map((opt) => {
              const active = viewerFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setViewerFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-green-500 text-zinc-900 font-medium"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
```

- [ ] **Step 2: Type-check final**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sem erros nem warnings novos no arquivo modificado.

- [ ] **Step 4: Commit**

```bash
git add app/p/[username]/profile-stickers.tsx
git commit -m "feat(profile): 3-state viewer filter on missing tab"
```

---

### Task 4: Verificação manual no navegador

**Files:** nenhum — só validação visual e funcional.

Pré-requisito: a migração `051_public_stickers_viewer_filter.sql` precisa ter sido aplicada ao banco Supabase usado pelo `dev` (local ou remoto, conforme `.env`). Se ainda não foi aplicada, aplicar agora antes de iniciar o `dev` — o front passará `p_viewer_filter` que a função antiga (`p_owned_only`) não conhece, resultando em erro.

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

Run em terminal separado: `npm run dev`
Expected: servidor sobe em `http://localhost:3000`.

- [ ] **Step 2: Cenário 1 — logado, perfil alheio, aba "Faltam"**

1. Faça login com um usuário que tenha pelo menos algumas figurinhas repetidas.
2. Navegue para `/p/<outro-usuario>` (algum usuário diferente do logado).
3. Selecione a aba **Faltam**.
4. Verifique:
   - [ ] O segmented control aparece no lugar onde antes estava o checkbox.
   - [ ] Default selecionado é **"Que tenho repetidas"**.
   - [ ] Clicar em **"Todas"** retorna o universo completo de figurinhas que faltam ao dono do perfil; `total_count` exibido na aba reflete esse universo.
   - [ ] Clicar em **"Que eu tenho"** retorna apenas figurinhas que o viewer possui ≥1 cópia.
   - [ ] Clicar em **"Que tenho repetidas"** retorna apenas figurinhas que o viewer possui ≥2 cópias.
   - [ ] Em cada estado, a paginação reseta para a primeira página (rolar inicia da página 1).
   - [ ] Infinite scroll funciona em cada estado.
   - [ ] Sinalizador visual da borda do card continua correto (amarelo p/ repetida, cinza p/ 1 cópia, transparente p/ não tem).

- [ ] **Step 3: Cenário 2 — empty state**

1. Selecione um grupo onde o viewer não tenha nenhuma das que faltam ao dono.
2. Selecione **"Que eu tenho"** → empty state deve mostrar "Você não tem nenhuma das figurinhas que faltam pra ele. Mude o filtro pra ver todas."
3. Volte para grupo geral. Selecione **"Que tenho repetidas"** em um grupo onde o viewer tem 1 cópia mas não repetidas → empty state deve mostrar "Nenhuma repetida sua bate com o que falta pra ele. Mude o filtro pra ver mais."

- [ ] **Step 4: Cenário 3 — próprio perfil**

1. Navegue para o próprio perfil (`/p/<seu-usuario>` ou clique no link de perfil).
2. Aba "Faltam" → segmented control **NÃO** deve aparecer.

- [ ] **Step 5: Cenário 4 — deslogado**

1. Faça logout.
2. Navegue para `/p/<qualquer-usuario>`, aba "Faltam".
3. Segmented control **NÃO** deve aparecer.

- [ ] **Step 6: Cenário 5 — aba "Repetidas" inalterada**

1. Logado, perfil alheio, aba **Repetidas**.
2. Comportamento deve ser idêntico ao anterior (mostra repetidas do dono que o viewer não tem). Segmented control **NÃO** aparece nessa aba.

- [ ] **Step 7: Reportar resultado**

Se todos os cenários passarem, marque a task como concluída. Se algum falhar, retorne ao código, corrija e adicione um commit `fix: …`.

---

## Self-Review

**Spec coverage:**
- Substituição do checkbox por toggle 3-estados → Task 3.
- Tipo `ViewerFilter` no cliente → Task 2 Step 1.
- `effectiveViewerFilter` com regra `tab==="missing" && isLoggedIn` → Task 2 Step 2.
- Passar `p_viewer_filter` nas duas chamadas ao RPC + dependências dos useEffects → Task 2 Step 3.
- Default `"duplicates"` quando logado → Task 2 Step 1.
- Atualização da mensagem de empty state → Task 2 Step 4.
- Nova migração SQL `051_public_stickers_viewer_filter.sql` com drop + recreate e `p_viewer_filter TEXT DEFAULT 'all'` → Task 1.
- Predicado aplicado nas duas queries da branch `missing` (count e return) → Task 1 Step 1 (presente nas duas).
- Branch `duplicates` inalterada → Task 1 Step 1 (cópia exata).
- Visibilidade do controle (`tab==="missing" && tradeUIEnabled && isLoggedIn`) → Task 3 Step 1.
- `role="radiogroup"` e `aria-checked` → Task 3 Step 1.
- Critérios de aceitação 1-5 do spec → Task 4 (todos os cenários).

**Placeholder scan:** nenhum TBD/TODO; todo código completo; comandos exatos com saídas esperadas.

**Type consistency:** `ViewerFilter` definido uma vez (Task 2 Step 1) e referenciado com mesmo nome em Tasks 2 e 3. `effectiveViewerFilter` consistente entre Step 2 (definição), Step 3 (uso no RPC), Step 4 (uso na empty state) e Task 3 não usa (UI usa `viewerFilter`, não `effectiveViewerFilter` — correto, porque a UI sempre mostra o estado bruto). Valores `'all' | 'owned' | 'duplicates'` consistentes entre SQL e TypeScript.
