# Collectors Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o slot "Amigos" (nunca lançado) por `/colecionadores` — diretório rankeado por compatibilidade de troca, com filtros por coleção e proximidade.

**Architecture:** Server component lê `searchParams` e chama a RPC nova `get_collector_matches`, que retorna `(user_id, profile, match_count, preview_sticker_ids, total_count)`. Client component só pros filtros (`router.replace` na URL). Limpeza do grafo social: drop tabelas, funções, UI órfã e rotas obsoletas, com redirect 301 de `/friends` → `/colecionadores`.

**Tech Stack:** Next.js 15 (server components, async searchParams), Supabase Postgres (RPC via `SECURITY DEFINER`), Tailwind, lucide-react. Pattern de página segue `/proposals` (`export const dynamic = "force-dynamic"`).

**Spec:** `docs/superpowers/specs/2026-05-16-collectors-flow-design.md`.

**Sem testes automatizados nesse release.** Verificação é manual (psql + dev server). Cada task termina em commit deployável.

---

## Mapa de arquivos

**Criados:**
- `supabase/migrations/049_get_collector_matches.sql` — RPC nova.
- `supabase/migrations/048_drop_friends_legacy.sql` — drops do grafo social. _(Numerada antes pra ordem cronológica no diretório, mas aplicada por último.)_
- `app/(authenticated)/colecionadores/page.tsx` — server component, data fetching, layout.
- `app/(authenticated)/colecionadores/collectors-filters.tsx` — client component, dropdown + toggle.
- `app/(authenticated)/colecionadores/collector-card.tsx` — apresentacional.
- `app/(authenticated)/colecionadores/collectors-list.tsx` — paginação numérica.

**Modificados:**
- `components/nav-bar.tsx` — renomear item "Amigos" → "Colecionadores".
- `components/landing/Footer.tsx` — renomear link "Amigos" → "Colecionadores".
- `app/robots.ts` — trocar `/friends` por `/colecionadores`.
- `next.config.ts` — adicionar redirect 301.

**Deletados:**
- `app/(authenticated)/friends/page.tsx`
- `app/(authenticated)/friends/friends-view.tsx`
- `app/(authenticated)/friends/` (diretório)
- `app/(authenticated)/user/[id]/page.tsx`
- `app/(authenticated)/user/[id]/` (diretório)

---

### Task 1: Criar migration `049_get_collector_matches.sql`

**Files:**
- Create: `supabase/migrations/049_get_collector_matches.sql`

- [ ] **Step 1: Criar o arquivo de migration**

`supabase/migrations/049_get_collector_matches.sql`:

```sql
-- Recommend collectors who own duplicates of stickers the viewer is missing.
-- Ranking: match_count DESC, proximity_score DESC, last_activity DESC NULLS LAST.

DROP FUNCTION IF EXISTS public.get_collector_matches;

CREATE FUNCTION public.get_collector_matches(
  p_viewer_id UUID,
  p_group_id INT DEFAULT NULL,
  p_only_nearby BOOLEAN DEFAULT FALSE,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  match_count INT,
  preview_sticker_ids INT[],
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_viewer_city TEXT;
  v_viewer_state TEXT;
  v_total BIGINT;
BEGIN
  SELECT p.city, p.state INTO v_viewer_city, v_viewer_state
  FROM public.profiles p
  WHERE p.id = p_viewer_id;

  -- Count distinct candidate users (for pagination).
  SELECT COUNT(DISTINCT cd.user_id) INTO v_total
  FROM (
    SELECT us.user_id
    FROM public.user_stickers us
    JOIN public.stickers s ON s.id = us.sticker_id
    WHERE us.user_id <> p_viewer_id
      AND (p_group_id IS NULL OR s.group_id = p_group_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_stickers vs
        WHERE vs.user_id = p_viewer_id AND vs.sticker_id = us.sticker_id
      )
    GROUP BY us.user_id, us.sticker_id HAVING COUNT(*) > 1
  ) cd
  JOIN public.profiles p ON p.id = cd.user_id
  WHERE (NOT p_only_nearby OR p.state = v_viewer_state);

  RETURN QUERY
  WITH viewer_missing AS (
    SELECT s.id AS sticker_id
    FROM public.stickers s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id AND us.sticker_id = s.id
    )
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
  ),
  candidate_duplicates AS (
    SELECT us.user_id, us.sticker_id
    FROM public.user_stickers us
    JOIN viewer_missing vm ON vm.sticker_id = us.sticker_id
    WHERE us.user_id <> p_viewer_id
    GROUP BY us.user_id, us.sticker_id HAVING COUNT(*) > 1
  ),
  aggregated AS (
    SELECT
      cd.user_id,
      COUNT(*)::INT AS match_count,
      (ARRAY_AGG(cd.sticker_id ORDER BY cd.sticker_id))[1:4] AS preview_sticker_ids
    FROM candidate_duplicates cd
    GROUP BY cd.user_id
  )
  SELECT
    p.id AS user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.state,
    a.match_count,
    a.preview_sticker_ids,
    v_total AS total_count
  FROM aggregated a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE (NOT p_only_nearby OR p.state = v_viewer_state)
  ORDER BY
    a.match_count DESC,
    CASE
      WHEN p.city = v_viewer_city AND p.state = v_viewer_state THEN 2
      WHEN p.state = v_viewer_state THEN 1
      ELSE 0
    END DESC,
    (SELECT MAX(us.created_at) FROM public.user_stickers us WHERE us.user_id = p.id) DESC NULLS LAST
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_collector_matches(UUID, INT, BOOLEAN, INT, INT) TO authenticated;
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Abra Supabase Studio do projeto, vá em SQL Editor, cole o conteúdo do arquivo, rode. Confirme mensagem "Success".

Como alternativa, se houver acesso direto:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/049_get_collector_matches.sql
```

Expected: `CREATE FUNCTION` + `GRANT`.

- [ ] **Step 3: Sanity-test no SQL editor**

Pegue um `user_id` real de `auth.users` ou `profiles` e rode:

```sql
SELECT user_id, display_name, match_count, preview_sticker_ids
FROM public.get_collector_matches('<viewer-uuid>'::uuid, NULL, FALSE, 1, 5);
```

Expected: zero ou mais linhas com `match_count > 0`. Sem erro.

Teste também com filtro de coleção:

```sql
SELECT match_count FROM public.get_collector_matches('<viewer-uuid>'::uuid, 1, FALSE, 1, 5);
```

Expected: linhas (se houver candidatos no `group_id=1`) ou vazio.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/049_get_collector_matches.sql
git commit -m "feat(db): add get_collector_matches RPC

Returns ranked list of collectors who own duplicates of stickers
the viewer is missing. Supports filtering by sticker group and
same-state proximity, paginated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Criar `collector-card.tsx` (apresentacional)

**Files:**
- Create: `app/(authenticated)/colecionadores/collector-card.tsx`

- [ ] **Step 1: Criar diretório e arquivo**

```bash
mkdir -p "app/(authenticated)/colecionadores"
```

`app/(authenticated)/colecionadores/collector-card.tsx`:

```tsx
import Link from "next/link";

export interface CollectorCardProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  matchCount: number;
  previewStickers: { id: number; imageUrl: string | null }[];
}

export function CollectorCard({
  username,
  displayName,
  avatarUrl,
  city,
  state,
  matchCount,
  previewStickers,
}: CollectorCardProps) {
  const location = [city, state].filter(Boolean).join(", ");
  const extra = matchCount - previewStickers.length;

  return (
    <Link
      href={`/p/${username}`}
      aria-label={`Ver perfil de ${displayName}, ${matchCount} figurinha${matchCount === 1 ? "" : "s"} em comum`}
      className="block rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:border-green-500/40 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar url={avatarUrl} name={displayName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          {location && <p className="text-xs text-gray-400 truncate">{location}</p>}
          <p className="mt-1 text-xs text-green-400 font-medium">
            {matchCount} figurinha{matchCount === 1 ? "" : "s"} que você precisa
          </p>
        </div>
      </div>

      {previewStickers.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {previewStickers.map((s) => (
            <div
              key={s.id}
              className="h-12 w-12 rounded-md overflow-hidden bg-white/5 border border-white/10 flex-shrink-0"
            >
              {s.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          ))}
          {extra > 0 && (
            <span className="text-xs text-gray-400 font-medium">+{extra}</span>
          )}
        </div>
      )}
    </Link>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={url} alt={name} className="h-10 w-10 rounded-full flex-shrink-0" />;
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(authenticated)/colecionadores/collector-card.tsx"
git commit -m "feat(colecionadores): collector card component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Criar `collectors-filters.tsx` (filtros — client)

**Files:**
- Create: `app/(authenticated)/colecionadores/collectors-filters.tsx`

- [ ] **Step 1: Criar o arquivo**

`app/(authenticated)/colecionadores/collectors-filters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface CollectorsFiltersProps {
  groups: { id: number; name: string }[];
  viewerHasState: boolean;
}

export function CollectorsFilters({ groups, viewerHasState }: CollectorsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentGroup = searchParams.get("group") ?? "";
  const currentNearby = searchParams.get("nearby") === "true";

  const update = (next: { group?: string; nearby?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.group !== undefined) {
      if (next.group) params.set("group", next.group);
      else params.delete("group");
    }
    if (next.nearby !== undefined) {
      if (next.nearby) params.set("nearby", "true");
      else params.delete("nearby");
    }
    params.delete("page"); // reset paginação ao trocar filtro
    startTransition(() => {
      router.replace(`/colecionadores${params.toString() ? `?${params}` : ""}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Coleção:</span>
        <select
          aria-label="Filtrar por coleção"
          value={currentGroup}
          onChange={(e) => update({ group: e.target.value })}
          disabled={isPending}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          <option value="">Todas</option>
          {groups.map((g) => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
      </label>

      <label
        className={`flex items-center gap-2 text-sm ${viewerHasState ? "" : "opacity-50 cursor-not-allowed"}`}
        title={viewerHasState ? undefined : "Preencha sua cidade no perfil pra usar esse filtro"}
      >
        <input
          type="checkbox"
          aria-label="Só do meu estado"
          checked={currentNearby && viewerHasState}
          disabled={!viewerHasState || isPending}
          onChange={(e) => update({ nearby: e.target.checked })}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500"
        />
        <span className="text-gray-300">Só do meu estado</span>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(authenticated)/colecionadores/collectors-filters.tsx"
git commit -m "feat(colecionadores): client filters (group + proximity)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Criar `collectors-list.tsx` (paginação)

**Files:**
- Create: `app/(authenticated)/colecionadores/collectors-list.tsx`

- [ ] **Step 1: Criar o arquivo**

`app/(authenticated)/colecionadores/collectors-list.tsx`:

```tsx
import Link from "next/link";
import { CollectorCard, type CollectorCardProps } from "./collector-card";

export interface CollectorsListProps {
  collectors: CollectorCardProps[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
}

export function CollectorsList({
  collectors,
  totalCount,
  page,
  pageSize,
  searchParams,
}: CollectorsListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.group) params.set("group", searchParams.group);
    if (searchParams.nearby) params.set("nearby", searchParams.nearby);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `/colecionadores${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {collectors.map((c) => (
          <CollectorCard key={c.username} {...c} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </span>
          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Próxima →
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(authenticated)/colecionadores/collectors-list.tsx"
git commit -m "feat(colecionadores): paginated list component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Criar `page.tsx` (server component + data fetching)

**Files:**
- Create: `app/(authenticated)/colecionadores/page.tsx`

- [ ] **Step 1: Criar o arquivo**

`app/(authenticated)/colecionadores/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { CollectorsFilters } from "./collectors-filters";
import { CollectorsList } from "./collectors-list";
import type { CollectorCardProps } from "./collector-card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function CollectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; nearby?: string; page?: string }>;
}) {
  const params = await searchParams;
  const groupId = params.group ? parseInt(params.group, 10) : null;
  const onlyNearby = params.nearby === "true";
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user!.id;

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("state")
    .eq("id", viewerId)
    .single();
  const viewerHasState = Boolean(viewerProfile?.state);

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name")
    .order("id");

  const { data: rpcRows, error } = await supabase.rpc("get_collector_matches", {
    p_viewer_id: viewerId,
    p_group_id: groupId,
    p_only_nearby: onlyNearby && viewerHasState,
    p_page: page,
    p_page_size: PAGE_SIZE,
  });

  if (error) {
    console.error("get_collector_matches failed", error);
  }

  const rows = (rpcRows ?? []) as Array<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    match_count: number;
    preview_sticker_ids: number[];
    total_count: number;
  }>;

  const totalCount = rows[0]?.total_count ?? 0;

  // Batched fetch of preview sticker images.
  const allStickerIds = Array.from(new Set(rows.flatMap((r) => r.preview_sticker_ids ?? [])));
  const stickerMap = new Map<number, string | null>();
  if (allStickerIds.length > 0) {
    const { data: stickers } = await supabase
      .from("stickers")
      .select("id, image_url")
      .in("id", allStickerIds);
    for (const s of stickers ?? []) stickerMap.set(s.id, s.image_url);
  }

  const collectors: CollectorCardProps[] = rows.map((r) => ({
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    city: r.city,
    state: r.state,
    matchCount: r.match_count,
    previewStickers: (r.preview_sticker_ids ?? []).map((id) => ({
      id,
      imageUrl: stickerMap.get(id) ?? null,
    })),
  }));

  const hasFiltersApplied = Boolean(groupId) || (onlyNearby && viewerHasState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Colecionadores</h1>
        <p className="mt-1 text-sm text-gray-400">
          Pessoas com figurinhas que você precisa.
        </p>
      </div>

      <CollectorsFilters groups={groups ?? []} viewerHasState={viewerHasState} />

      {collectors.length === 0 ? (
        <EmptyState hasFilters={hasFiltersApplied} viewerHasState={viewerHasState} />
      ) : (
        <CollectorsList
          collectors={collectors}
          totalCount={totalCount}
          page={page}
          pageSize={PAGE_SIZE}
          searchParams={{ group: params.group, nearby: params.nearby }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters, viewerHasState: _viewerHasState }: { hasFilters: boolean; viewerHasState: boolean }) {
  if (hasFilters) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-gray-300">Nenhum colecionador com esses filtros.</p>
        <a href="/colecionadores" className="mt-3 inline-block text-sm text-green-400 hover:underline">
          Limpar filtros
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
      <p className="text-sm text-gray-300">
        Ninguém ainda tem o que você precisa. Volte mais tarde.
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Dica: complete sua coleção em <a href="/collection" className="text-green-400 hover:underline">/collection</a> pra que o ranking encontre matches melhores.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test no dev server**

```bash
npm run dev
```

Abra `http://localhost:3000/colecionadores` autenticado. Expected:
- Página carrega sem erro de console
- Header "Colecionadores"
- Filtros aparecem
- Lista de cards ou empty state apropriado

Se der erro 500: confira no terminal o output do `get_collector_matches failed` — provavelmente a migration 049 não foi aplicada ou o user de teste não está em `profiles`.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/colecionadores/page.tsx"
git commit -m "feat(colecionadores): page wiring with RPC, filters, pagination

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Atualizar nav-bar

**Files:**
- Modify: `components/nav-bar.tsx:9` (import lucide-react) e `components/nav-bar.tsx:13-19` (array `links`)

- [ ] **Step 1: Trocar import de ícones**

Em `components/nav-bar.tsx`, na linha que faz `import { ... } from "lucide-react"`, substitua `Users` por `UserSearch`:

```diff
- import { LayoutDashboard, Grid3X3, Users, Repeat2, Settings, LogOut, Menu, X, Shield, MessageSquare } from "lucide-react";
+ import { LayoutDashboard, Grid3X3, UserSearch, Repeat2, Settings, LogOut, Menu, X, Shield, MessageSquare } from "lucide-react";
```

- [ ] **Step 2: Trocar entrada do array `links`**

Substitua:

```diff
-  { href: "/friends", label: "Amigos", icon: Users },
+  { href: "/colecionadores", label: "Colecionadores", icon: UserSearch },
```

- [ ] **Step 3: Verificar com lint**

```bash
npm run lint
```

Expected: sem erro novo de unused-import / undefined symbol.

- [ ] **Step 4: Commit**

```bash
git add components/nav-bar.tsx
git commit -m "feat(nav): rename Amigos to Colecionadores

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Atualizar Footer + robots.ts

**Files:**
- Modify: `components/landing/Footer.tsx:39`
- Modify: `app/robots.ts:9`

- [ ] **Step 1: Atualizar Footer**

`components/landing/Footer.tsx`, linha 39:

```diff
- <li><Link href="/friends" className="hover:text-yellow-400 transition">Amigos</Link></li>
+ <li><Link href="/colecionadores" className="hover:text-yellow-400 transition">Colecionadores</Link></li>
```

- [ ] **Step 2: Atualizar robots**

`app/robots.ts`, linha 9:

```diff
- disallow: ["/dashboard", "/collection", "/friends", "/trades", "/profile", "/user", "/admin"],
+ disallow: ["/dashboard", "/collection", "/colecionadores", "/trades", "/profile", "/admin"],
```

(Nota: removendo `/user` também porque o diretório vai ser deletado na Task 9.)

- [ ] **Step 3: Commit**

```bash
git add components/landing/Footer.tsx app/robots.ts
git commit -m "feat: update Footer and robots for /colecionadores

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Adicionar redirect 301 `/friends` → `/colecionadores`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Adicionar `redirects()` no nextConfig**

`next.config.ts`:

```diff
 const nextConfig: NextConfig = {
   images: {
     remotePatterns: [
       {
         protocol: "https",
         hostname: "lh3.googleusercontent.com",
       },
       {
         protocol: "https",
         hostname: "ryahywolbykyqrpiibmp.supabase.co",
       },
     ],
   },
+  async redirects() {
+    return [
+      { source: "/friends", destination: "/colecionadores", permanent: true },
+    ];
+  },
   async headers() {
```

- [ ] **Step 2: Smoke test**

Reinicie o dev server (`Ctrl+C` e `npm run dev`). Abra `http://localhost:3000/friends`. Expected: redireciona pra `/colecionadores`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: redirect /friends to /colecionadores

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Deletar diretórios órfãos `friends/` e `user/[id]/`

**Files:**
- Delete: `app/(authenticated)/friends/` (recursivo)
- Delete: `app/(authenticated)/user/[id]/` (recursivo)

- [ ] **Step 1: Confirmar que `/user/[id]` não tem links no app**

```bash
grep -rn 'href="/user/\|href={`/user/' app components lib --include="*.tsx" --include="*.ts" 2>/dev/null
```

Expected: nenhum resultado. Se aparecer algo, parar e investigar.

- [ ] **Step 2: Deletar os diretórios**

```bash
rm -rf "app/(authenticated)/friends" "app/(authenticated)/user"
```

- [ ] **Step 3: Build smoke test**

```bash
npm run build
```

Expected: build conclui sem erros relacionados a friends/user routes.

- [ ] **Step 4: Commit**

```bash
git add -A "app/(authenticated)/friends" "app/(authenticated)/user"
git commit -m "chore: remove orphan /friends and /user/[id] routes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Grep final + migration `048_drop_friends_legacy.sql`

**Files:**
- Create: `supabase/migrations/048_drop_friends_legacy.sql`

- [ ] **Step 1: Grep final em busca de dependentes**

```bash
grep -rn "are_friends\|accept_friend_invite\|block_friend\|unblock_friend\|remove_friend\|get_profile_with_contact\|get_trade_matches\|\.from(\"friends\"\|\.from(\"friend_invites\"" app components lib --include="*.ts" --include="*.tsx" 2>/dev/null
```

Expected: nenhum resultado. Se aparecer, parar e remover a referência antes de continuar.

- [ ] **Step 2: Criar a migration**

`supabase/migrations/048_drop_friends_legacy.sql`:

```sql
-- Drop the never-launched social graph: friends table, friend_invites table,
-- and all related RPCs. Public discovery is now handled by /colecionadores
-- via get_collector_matches (migration 049).

DROP FUNCTION IF EXISTS public.are_friends(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_friend_invite(UUID);
DROP FUNCTION IF EXISTS public.block_friend(UUID);
DROP FUNCTION IF EXISTS public.unblock_friend(UUID);
DROP FUNCTION IF EXISTS public.remove_friend(UUID);
DROP FUNCTION IF EXISTS public.get_profile_with_contact(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_trade_matches(UUID);

DROP TABLE IF EXISTS public.friend_invites CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
```

- [ ] **Step 3: Aplicar no Supabase**

Cole o conteúdo no SQL Editor do Supabase Studio e rode. Expected: "Success" sem erros.

Alternativa via psql:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/048_drop_friends_legacy.sql
```

- [ ] **Step 4: Sanity test pós-drop**

No SQL Editor, rode:

```sql
SELECT to_regclass('public.friends'), to_regclass('public.friend_invites');
```

Expected: ambas retornam `NULL` (tabelas não existem mais).

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('are_friends','accept_friend_invite','block_friend','unblock_friend','remove_friend','get_profile_with_contact','get_trade_matches')
  AND pronamespace = 'public'::regnamespace;
```

Expected: zero linhas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/048_drop_friends_legacy.sql
git commit -m "feat(db): drop friends graph and legacy RPCs

Replaced by /colecionadores via get_collector_matches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final (não é task, é checklist visual)

Após Task 10, validar no app rodando (`npm run dev`):

- [ ] `/colecionadores` carrega e mostra cards com matches reais (ou empty state coerente).
- [ ] Trocar filtro de coleção atualiza a lista sem reload (router.replace).
- [ ] Toggle "Só do meu estado" funciona (ou aparece desabilitado se viewer sem state).
- [ ] Paginação avança/volta corretamente.
- [ ] Clicar num card vai pra `/p/<username>` correto.
- [ ] Acessar `/friends` redireciona pra `/colecionadores`.
- [ ] Nav bar mostra "Colecionadores" (não mais "Amigos").
- [ ] Footer mostra "Colecionadores".
- [ ] `/user/<id>` retorna 404.
- [ ] Nenhum erro no console relacionado a tabelas/RPCs antigas.
