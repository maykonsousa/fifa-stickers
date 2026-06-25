# Multi-álbum (Etapa 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada usuário tenha vários álbuns pessoais do mesmo template (Copa), cada um com coleção isolada, com seletor de álbum ativo persistido e álbum público escolhido para o perfil.

**Architecture:** Nova tabela `albums` (instância pessoal nomeada, com `template` como gancho para modalidades futuras). `user_stickers` ganha `album_id`. `profiles` ganha `active_album_id` (seletor) e `public_album_id` (perfil público). Todas as RPCs de leitura passam a filtrar `user_stickers` por álbum. O catálogo (`stickers`/`sticker_groups`) permanece global.

**Tech Stack:** Next.js (App Router, RSC), Supabase (Postgres + RLS + RPC via `supabase.rpc`), TypeScript, vitest (testes unitários só de lógica pura em `lib/**` e `app/**`), Tailwind.

## Global Constraints

- **Spec de referência:** `docs/superpowers/specs/2026-06-25-multi-album-design.md`. Toda decisão de produto vem dele.
- **Migrations aplicam no Supabase hospedado (prod).** Não há Supabase local (`supabase/config.toml` ausente) nem harness de teste de banco. Migrations 100+ devem ser **idempotentes** e validadas com cuidado. Antes de rodar a migração de backfill (Task 2) em produção, fazer backup/branch do banco.
- **Próximo número de migração livre:** `100`. Arquivos em `supabase/migrations/NNN_*.sql`, numeração crescente.
- **`CREATE OR REPLACE FUNCTION` NÃO altera assinatura.** Toda RPC que muda parâmetros precisa de `DROP FUNCTION IF EXISTS nome(tipos_antigos);` antes do `CREATE`, e re-emitir o `GRANT`.
- **Invariante de dados:** `user_stickers.user_id = albums.user_id` para o `album_id` da linha. Mantemos `user_id` denormalizado.
- **Nome do álbum padrão da migração:** `"Meu Álbum - 001"`. `template` default: `'copa-2026'`.
- **Testes:** vitest roda via `npm test` (`vitest run`); inclui apenas `lib/**/*.test.ts` e `app/**/*.test.ts` (env node). SQL e UI são verificados manualmente (passos descritos em cada task). Lógica de regra de negócio testável é extraída para `lib/` e coberta por vitest.
- **Padrão de import:** alias `@/` → raiz do projeto.

---

## File Structure

**Migrations (criar):**
- `supabase/migrations/100_albums_schema.sql` — tabela `albums`, colunas em `user_stickers`/`profiles`, RLS, índices
- `supabase/migrations/101_albums_backfill.sql` — migração de dados + `album_id` NOT NULL
- `supabase/migrations/102_new_user_default_album.sql` — `handle_new_user` cria álbum padrão em signups
- `supabase/migrations/103_per_album_sticker_count.sql` — trigger de contagem por álbum + sync do público
- `supabase/migrations/104_search_and_group_counts_by_album.sql` — `search_stickers` + `get_user_group_counts`
- `supabase/migrations/105_public_reads_by_album.sql` — `get_public_stickers_album` + `get_profile_view_stats` + `get_user_share_list(_count)`
- `supabase/migrations/106_user_stickers_album_writes.sql` — RLS de `user_stickers` + `add/remove_user_stickers` + `add_stickers_to_collection` + `set_public_album` resync

**Lib (criar):**
- `lib/albums/album-rules.ts` — regras puras (validação de nome, proteção de exclusão)
- `lib/albums/album-rules.test.ts` — testes vitest
- `lib/albums/get-active-album.ts` — helper server: resolve álbum ativo + lista de álbuns do usuário

**Componentes / páginas (criar):**
- `components/album-selector.tsx` — seletor no header (client)
- `app/(authenticated)/albums/page.tsx` — página "Meus álbuns" (server)
- `app/(authenticated)/albums/albums-manager.tsx` — UI de CRUD (client)

**Modificar:**
- `components/top-bar.tsx` — renderizar `<AlbumSelector />`
- `app/(authenticated)/collection/page.tsx` — resolver álbum ativo, passar `albumId`
- `app/(authenticated)/collection/collection-view.tsx` — `albumId` nas RPCs e insert/delete
- `app/(authenticated)/collection/scanner/scanner-view.tsx` — `albumId` no insert
- `app/(authenticated)/dashboard/page.tsx` — `get_user_group_counts` por álbum
- `app/p/[username]/page.tsx` — resolver `public_album_id` do dono e do viewer
- `app/p/[username]/profile-stickers-album.tsx` — `get_public_stickers_album` por álbum
- Callers de `get_user_share_list` / `get_user_share_list_count` (localizados via grep na Task correspondente)

---

## Task 1: Schema base de álbuns (migration 100)

**Files:**
- Create: `supabase/migrations/100_albums_schema.sql`

**Interfaces:**
- Produces: tabela `albums(id SERIAL, user_id UUID, name TEXT, template TEXT, sticker_count INT, created_at TIMESTAMPTZ)`; `user_stickers.album_id INT` (nullable nesta task); `profiles.active_album_id INT`, `profiles.public_album_id INT`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/100_albums_schema.sql`:

```sql
-- Multi-álbum (Etapa 1): tabela de álbuns + escopo de álbum em user_stickers + ponteiros no profile.
-- Catálogo (stickers/sticker_groups) permanece global. 'template' é gancho p/ modalidades futuras.

CREATE TABLE IF NOT EXISTS albums (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  template      TEXT NOT NULL DEFAULT 'copa-2026',
  sticker_count INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);

ALTER TABLE user_stickers ADD COLUMN IF NOT EXISTS album_id INT REFERENCES albums(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_stickers_album_id ON user_stickers(album_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_album_id INT REFERENCES albums(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_album_id INT REFERENCES albums(id);

-- RLS: álbum é legível por todos (perfil público lê nome/count de outros);
-- só o dono escreve.
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_select_all" ON albums;
CREATE POLICY "albums_select_all"
  ON albums FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "albums_insert_own" ON albums;
CREATE POLICY "albums_insert_own"
  ON albums FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_update_own" ON albums;
CREATE POLICY "albums_update_own"
  ON albums FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_delete_own" ON albums;
CREATE POLICY "albums_delete_own"
  ON albums FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar no banco**

Aplicar `100_albums_schema.sql` no Supabase (via dashboard SQL editor ou pipeline de migration do projeto).

- [ ] **Step 3: Verificar**

Rodar no SQL editor:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'albums' ORDER BY ordinal_position;
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_stickers' AND column_name = 'album_id';
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('active_album_id','public_album_id');
```
Esperado: colunas de `albums` (id, user_id, name, template, sticker_count, created_at), `user_stickers.album_id`, e os dois ponteiros no `profiles`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/100_albums_schema.sql
git commit -m "feat(db): tabela albums + album_id em user_stickers + ponteiros no profile"
```

---

## Task 2: Backfill dos dados existentes (migration 101)

**Files:**
- Create: `supabase/migrations/101_albums_backfill.sql`

**Interfaces:**
- Consumes: schema da Task 1.
- Produces: todo perfil com um álbum `"Meu Álbum - 001"`; `user_stickers.album_id` preenchido e NOT NULL; `profiles.active_album_id`/`public_album_id` setados; `albums.sticker_count` recalculado.

- [ ] **Step 1: Escrever a migration (idempotente)**

Create `supabase/migrations/101_albums_backfill.sql`:

```sql
-- Backfill: cada perfil ganha "Meu Álbum - 001" (template copa-2026), recebe as
-- figurinhas existentes, e vira o álbum ativo + público. Idempotente.

-- 1) Criar o álbum padrão para todo perfil que ainda não tem nenhum álbum.
INSERT INTO albums (user_id, name, template)
SELECT p.id, 'Meu Álbum - 001', 'copa-2026'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM albums a WHERE a.user_id = p.id);

-- 2) Atribuir todas as user_stickers sem álbum ao álbum padrão do dono.
UPDATE user_stickers us
SET album_id = a.id
FROM albums a
WHERE us.album_id IS NULL
  AND a.user_id = us.user_id
  AND a.name = 'Meu Álbum - 001';

-- 3) Setar active/public para o álbum padrão quando ainda nulos.
UPDATE profiles p
SET active_album_id = a.id
FROM albums a
WHERE p.active_album_id IS NULL
  AND a.user_id = p.id
  AND a.name = 'Meu Álbum - 001';

UPDATE profiles p
SET public_album_id = a.id
FROM albums a
WHERE p.public_album_id IS NULL
  AND a.user_id = p.id
  AND a.name = 'Meu Álbum - 001';

-- 4) Recalcular sticker_count por álbum (distintas).
UPDATE albums a
SET sticker_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT album_id, COUNT(DISTINCT sticker_id) AS cnt
  FROM user_stickers
  WHERE album_id IS NOT NULL
  GROUP BY album_id
) sub
WHERE a.id = sub.album_id;

-- 5) Travar album_id como obrigatório (só roda se não restou nenhum NULL).
ALTER TABLE user_stickers ALTER COLUMN album_id SET NOT NULL;
```

- [ ] **Step 2: Conferência pré-NOT NULL (manual, antes de aplicar o ALTER)**

Antes de aplicar, rodar para garantir que não sobrará linha órfã:
```sql
SELECT COUNT(*) AS sem_album FROM user_stickers WHERE album_id IS NULL;
```
Se a migração for aplicada inteira, o Step 5 falha caso reste algum NULL — o que é o comportamento desejado (aborta sem corromper).

- [ ] **Step 3: Aplicar no banco** (após backup/branch — ver Global Constraints).

- [ ] **Step 4: Verificar**

```sql
SELECT COUNT(*) FROM albums;                 -- = nº de profiles
SELECT COUNT(*) FROM user_stickers WHERE album_id IS NULL;  -- = 0
SELECT id, name, sticker_count FROM albums ORDER BY id LIMIT 5;
SELECT id, active_album_id, public_album_id FROM profiles LIMIT 5;  -- ambos preenchidos
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/101_albums_backfill.sql
git commit -m "feat(db): backfill de albums e album_id em user_stickers (NOT NULL)"
```

---

## Task 3: Álbum padrão para novos cadastros (migration 102)

**Files:**
- Create: `supabase/migrations/102_new_user_default_album.sql`

**Interfaces:**
- Consumes: `handle_new_user` (migration 020, última versão).
- Produces: novo signup nasce com `"Meu Álbum - 001"` + `active_album_id`/`public_album_id` setados.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/102_new_user_default_album.sql` (baseado na versão de 020, adicionando o álbum):

```sql
-- Novo signup nasce com um álbum padrão + ponteiros ativos/público.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base_name TEXT;
  new_username TEXT;
  v_album_id INT;
BEGIN
  base_name := LOWER(REGEXP_REPLACE(
    LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 6),
    '[^a-z0-9]', '', 'g'
  ));
  new_username := base_name || SUBSTR(MD5(NEW.id::TEXT), 1, 14 - LENGTH(base_name));

  INSERT INTO public.profiles (id, display_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    new_username
  );

  INSERT INTO public.albums (user_id, name, template)
  VALUES (NEW.id, 'Meu Álbum - 001', 'copa-2026')
  RETURNING id INTO v_album_id;

  UPDATE public.profiles
  SET active_album_id = v_album_id, public_album_id = v_album_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
```

- [ ] **Step 2: Aplicar no banco.**

- [ ] **Step 3: Verificar** — criar um usuário de teste (ou inspecionar o trigger):
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```
Esperado: corpo contém `INSERT INTO public.albums`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/102_new_user_default_album.sql
git commit -m "feat(db): novo cadastro nasce com album padrao"
```

---

## Task 4: Contagem de figurinhas por álbum (migration 103)

**Files:**
- Create: `supabase/migrations/103_per_album_sticker_count.sql`

**Interfaces:**
- Consumes: trigger `on_user_sticker_change` / `update_profile_sticker_count` (migration 024).
- Produces: `albums.sticker_count` mantido automaticamente; `profiles.sticker_count` sincronizado com o álbum público (para a lista de colecionadores continuar correta).

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/103_per_album_sticker_count.sql`:

```sql
-- Contagem passa a ser por álbum. profiles.sticker_count espelha o álbum público
-- (mantém /players e perfil público corretos sem mudar essas queries).
CREATE OR REPLACE FUNCTION update_profile_sticker_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_album_id INT := COALESCE(NEW.album_id, OLD.album_id);
  v_user_id  UUID := COALESCE(NEW.user_id, OLD.user_id);
  v_count    INT;
BEGIN
  SELECT COUNT(DISTINCT sticker_id) INTO v_count
  FROM public.user_stickers WHERE album_id = v_album_id;

  UPDATE public.albums SET sticker_count = v_count WHERE id = v_album_id;

  -- Se o álbum afetado é o público do usuário, espelha no profile.
  UPDATE public.profiles
  SET sticker_count = v_count
  WHERE id = v_user_id AND public_album_id = v_album_id;

  RETURN NULL;
END;
$$;
-- Trigger on_user_sticker_change já existe (migration 024) e continua apontando
-- para esta função; não precisa recriar.
```

- [ ] **Step 2: Aplicar no banco.**

- [ ] **Step 3: Verificar** — inserir/remover uma figurinha de teste e conferir que `albums.sticker_count` muda:
```sql
SELECT id, sticker_count FROM albums WHERE id = <album_de_teste>;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/103_per_album_sticker_count.sql
git commit -m "feat(db): sticker_count por album + sync com album publico"
```

---

## Task 5: Reads escopados por álbum — coleção e dashboard (migration 104)

**Files:**
- Create: `supabase/migrations/104_search_and_group_counts_by_album.sql`

**Interfaces:**
- Consumes: `search_stickers` (038), `get_user_group_counts` (061).
- Produces:
  - `search_stickers(p_album_id INT, p_keyword TEXT, p_group_id INT, p_status TEXT, p_page INT, p_page_size INT, p_viewer_album_id INT)` → mesmas colunas de antes (`id, group_id, code, number, title, image_url, owned_count, total_count, viewer_owned_count`).
  - `get_user_group_counts(p_album_id INT)` → `(group_id INT, owned INT, total_entries INT)`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/104_search_and_group_counts_by_album.sql`:

```sql
-- search_stickers passa a contar dentro do álbum. p_viewer_album_id = álbum
-- público do visitante (referência para "já tenho").
DROP FUNCTION IF EXISTS search_stickers(UUID, TEXT, INT, TEXT, INT, INT, UUID);

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
  viewer_owned_count BIGINT
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
    COALESCE(vc.cnt, 0) AS viewer_owned_count
  FROM stickers s
  LEFT JOIN user_counts uc ON uc.sticker_id = s.id
  LEFT JOIN viewer_counts vc ON vc.sticker_id = s.id
  WHERE
    (p_keyword IS NULL OR unaccent(s.code) ILIKE '%' || unaccent(p_keyword) || '%' OR unaccent(COALESCE(s.title, '')) ILIKE '%' || unaccent(p_keyword) || '%')
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (
      p_status IS NULL
      OR (p_status = 'owned' AND COALESCE(uc.cnt, 0) > 0)
      OR (p_status = 'missing' AND COALESCE(uc.cnt, 0) = 0)
      OR (p_status = 'duplicate' AND COALESCE(uc.cnt, 0) > 1)
    )
  ORDER BY s.group_id, s.number
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT) TO authenticated;

-- get_user_group_counts por álbum.
DROP FUNCTION IF EXISTS get_user_group_counts(UUID);

CREATE FUNCTION get_user_group_counts(p_album_id INT)
RETURNS TABLE (
  group_id INT,
  owned INT,
  total_entries INT
)
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    s.group_id,
    COUNT(DISTINCT us.sticker_id)::INT AS owned,
    COUNT(*)::INT AS total_entries
  FROM public.user_stickers us
  JOIN public.stickers s ON s.id = us.sticker_id
  WHERE us.album_id = p_album_id
  GROUP BY s.group_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_group_counts(INT) TO authenticated;
```

- [ ] **Step 2: Aplicar no banco.**

- [ ] **Step 3: Verificar**

```sql
SELECT * FROM search_stickers(<album_id>, NULL, NULL, NULL, 1, 5, NULL);
SELECT * FROM get_user_group_counts(<album_id>);
```
Esperado: resultados condizentes com o álbum (owned_count reflete só aquele álbum).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/104_search_and_group_counts_by_album.sql
git commit -m "feat(db): search_stickers e group_counts por album"
```

---

## Task 6: Reads escopados por álbum — perfil público e share (migration 105)

**Files:**
- Create: `supabase/migrations/105_public_reads_by_album.sql`

**Interfaces:**
- Consumes: `get_public_stickers_album` (060), `get_profile_view_stats` (055), `get_user_share_list` (070) e `get_user_share_list_count` (070).
- Produces:
  - `get_public_stickers_album(p_album_id INT, p_group_id INT, p_keyword TEXT, p_viewer_album_id INT)` → mesmas colunas.
  - `get_profile_view_stats(p_album_id INT, p_viewer_album_id INT)` → mesmas colunas.
  - `get_user_share_list(p_album_id INT, p_kind TEXT)` → mesmas colunas.
  - `get_user_share_list_count(p_album_id INT, p_kind TEXT)` → mesma coluna de contagem.

- [ ] **Step 1: Ler o corpo atual de `get_user_share_list_count`**

Abrir `supabase/migrations/070_get_user_share_list_count.sql` e copiar o corpo exato de `get_user_share_list_count` (assinatura atual `(UUID, TEXT)`), para reproduzir no Step 2 trocando o filtro `user_id = p_user_id` por `album_id = p_album_id`.

- [ ] **Step 2: Escrever a migration**

Create `supabase/migrations/105_public_reads_by_album.sql`:

```sql
-- Perfil público lê o álbum público do dono (p_album_id) e usa o álbum público
-- do visitante como referência (p_viewer_album_id).
DROP FUNCTION IF EXISTS get_public_stickers_album(UUID, INT, TEXT, UUID);

CREATE FUNCTION get_public_stickers_album(
  p_album_id INT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  page INT,
  "row" INT,
  "col" INT,
  orientation TEXT,
  group_id INT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_album_id IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.album_id = p_album_id
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
    s.orientation,
    sg.id AS group_id,
    sg.name AS group_name,
    COALESCE((oc.cnt - 1), 0)::INT AS duplicate_count,
    CASE
      WHEN v_viewer_present THEN COALESCE((
        SELECT COUNT(*)::INT FROM public.user_stickers us
        WHERE us.album_id = p_viewer_album_id AND us.sticker_id = s.id
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

GRANT EXECUTE ON FUNCTION get_public_stickers_album(INT, INT, TEXT, INT) TO anon, authenticated;

-- get_profile_view_stats por álbum. total_stickers segue sendo o tamanho do catálogo.
DROP FUNCTION IF EXISTS get_profile_view_stats(UUID, UUID);

CREATE FUNCTION get_profile_view_stats(
  p_album_id INT,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  total_stickers BIGINT,
  owner_unique_owned BIGINT,
  owner_total_duplicates BIGINT,
  trade_duplicates_count BIGINT
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
    END AS trade_duplicates_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_view_stats(INT, INT) TO anon, authenticated;

-- get_user_share_list por álbum.
DROP FUNCTION IF EXISTS get_user_share_list(UUID, TEXT);

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
  WHERE
    (p_kind = 'missing' AND COALESCE(c.cnt, 0) = 0)
    OR (p_kind = 'duplicates' AND COALESCE(c.cnt, 0) >= 2)
  ORDER BY s.group_id, s.number;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_list(INT, TEXT) TO authenticated, anon;

-- get_user_share_list_count por álbum: reproduzir o corpo lido no Step 1,
-- trocando "user_id = p_user_id" por "album_id = p_album_id" e a assinatura
-- para (p_album_id INT, p_kind TEXT). Emitir DROP da assinatura antiga (UUID, TEXT)
-- antes do CREATE e re-emitir o GRANT correspondente.
DROP FUNCTION IF EXISTS get_user_share_list_count(UUID, TEXT);
-- CREATE FUNCTION get_user_share_list_count(p_album_id INT, p_kind TEXT) ... (corpo do 070, filtrando por album_id)
-- GRANT EXECUTE ON FUNCTION get_user_share_list_count(INT, TEXT) TO authenticated, anon;
```

> **Importante:** substituir as 3 últimas linhas comentadas pelo `CREATE`/`GRANT` reais de `get_user_share_list_count`, usando o corpo exato copiado no Step 1 com o filtro trocado para `album_id = p_album_id`.

- [ ] **Step 3: Aplicar no banco.**

- [ ] **Step 4: Verificar**

```sql
SELECT * FROM get_public_stickers_album(<album_id>, NULL, NULL, NULL) LIMIT 3;
SELECT * FROM get_profile_view_stats(<album_id>, NULL);
SELECT * FROM get_user_share_list(<album_id>, 'duplicates') LIMIT 3;
SELECT * FROM get_user_share_list_count(<album_id>, 'duplicates');
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/105_public_reads_by_album.sql
git commit -m "feat(db): perfil publico e share list por album"
```

---

## Task 7: Escrita escopada por álbum — RLS e RPCs de troca (migration 106)

**Files:**
- Create: `supabase/migrations/106_user_stickers_album_writes.sql`

**Interfaces:**
- Consumes: políticas de `user_stickers` (008), `add_user_stickers`/`remove_user_stickers` (034), `add_stickers_to_collection` (040), `set_public_album` (criada na Task 8).
- Produces:
  - INSERT em `user_stickers` exige `album_id` pertencente ao usuário.
  - Trocas operam no **álbum público** de cada usuário (derivado de `profiles.public_album_id`).
  - `add_stickers_to_collection` insere no **álbum ativo** do `auth.uid()`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/106_user_stickers_album_writes.sql`:

```sql
-- INSERT exige que album_id pertença ao usuário.
DROP POLICY IF EXISTS "user_stickers_insert_own" ON user_stickers;
CREATE POLICY "user_stickers_insert_own"
  ON user_stickers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM albums a WHERE a.id = album_id AND a.user_id = auth.uid())
  );
-- DELETE/SELECT permanecem por user_id (já cobrem o dono).

-- Trocas: cada lado mexe no SEU álbum público.
CREATE OR REPLACE FUNCTION add_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_album_id INT;
BEGIN
  SELECT public_album_id INTO v_album_id FROM profiles WHERE id = p_user_id;
  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'user % has no public album', p_user_id;
  END IF;
  INSERT INTO user_stickers (user_id, sticker_id, album_id)
  SELECT p_user_id, p_sticker_id, v_album_id
  FROM generate_series(1, p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION remove_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_album_id INT;
BEGIN
  SELECT public_album_id INTO v_album_id FROM profiles WHERE id = p_user_id;
  DELETE FROM user_stickers
  WHERE id IN (
    SELECT id FROM user_stickers
    WHERE user_id = p_user_id AND sticker_id = p_sticker_id AND album_id = v_album_id
    LIMIT p_quantity
  );
END;
$$;

-- Bulk-insert do wizard de troca: vai para o álbum ATIVO do iniciador.
CREATE OR REPLACE FUNCTION add_stickers_to_collection(p_sticker_ids INT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_album_id INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  SELECT active_album_id INTO v_album_id FROM profiles WHERE id = v_user_id;
  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'user has no active album';
  END IF;
  INSERT INTO user_stickers (user_id, sticker_id, album_id)
  SELECT v_user_id, sticker_id, v_album_id FROM unnest(p_sticker_ids) AS sticker_id;
END;
$$;
```

- [ ] **Step 2: Aplicar no banco.**

- [ ] **Step 3: Verificar** — tentar INSERT direto com `album_id` de outro usuário deve ser bloqueado pela RLS; `add_stickers_to_collection(ARRAY[<sticker_id>])` deve inserir no álbum ativo.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/106_user_stickers_album_writes.sql
git commit -m "feat(db): escrita de user_stickers escopada por album (RLS + trocas)"
```

---

## Task 8: RPCs de gestão de álbuns (parte da migration 106 ou nova 107)

> Pode ir no mesmo arquivo da Task 7 (106) ou num `107_album_management_rpcs.sql`. As regras de proteção (não excluir público/único) vivem aqui.

**Files:**
- Create/Modify: `supabase/migrations/107_album_management_rpcs.sql`

**Interfaces:**
- Produces:
  - `create_album(p_name TEXT) RETURNS albums` — cria álbum do `auth.uid()`.
  - `rename_album(p_album_id INT, p_name TEXT) RETURNS VOID`.
  - `delete_album(p_album_id INT) RETURNS VOID` — rejeita se for `public_album_id` ou o último álbum.
  - `set_active_album(p_album_id INT) RETURNS VOID`.
  - `set_public_album(p_album_id INT) RETURNS VOID` — também ressincroniza `profiles.sticker_count`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/107_album_management_rpcs.sql`:

```sql
CREATE OR REPLACE FUNCTION create_album(p_name TEXT)
RETURNS albums
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_album albums;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'album name required';
  END IF;
  INSERT INTO albums (user_id, name, template)
  VALUES (v_user_id, btrim(p_name), 'copa-2026')
  RETURNING * INTO v_album;
  RETURN v_album;
END;
$$;
GRANT EXECUTE ON FUNCTION create_album(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION rename_album(p_album_id INT, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'album name required';
  END IF;
  UPDATE albums SET name = btrim(p_name)
  WHERE id = p_album_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'album not found or not owned'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rename_album(INT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION delete_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_public BOOLEAN;
  v_total INT;
BEGIN
  SELECT (public_album_id = p_album_id) INTO v_is_public FROM profiles WHERE id = v_user_id;
  IF v_is_public THEN RAISE EXCEPTION 'cannot delete public album'; END IF;
  SELECT COUNT(*) INTO v_total FROM albums WHERE user_id = v_user_id;
  IF v_total <= 1 THEN RAISE EXCEPTION 'cannot delete the only album'; END IF;
  DELETE FROM albums WHERE id = p_album_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'album not found or not owned'; END IF;
  -- Se o ativo era esse, cair no público.
  UPDATE profiles SET active_album_id = public_album_id
  WHERE id = v_user_id AND active_album_id = p_album_id;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_album(INT) TO authenticated;

CREATE OR REPLACE FUNCTION set_active_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'album not found or not owned';
  END IF;
  UPDATE profiles SET active_album_id = p_album_id WHERE id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION set_active_album(INT) TO authenticated;

CREATE OR REPLACE FUNCTION set_public_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'album not found or not owned';
  END IF;
  UPDATE profiles SET public_album_id = p_album_id WHERE id = v_user_id;
  -- Ressincroniza profiles.sticker_count com o novo álbum público.
  SELECT sticker_count INTO v_count FROM albums WHERE id = p_album_id;
  UPDATE profiles SET sticker_count = COALESCE(v_count, 0) WHERE id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION set_public_album(INT) TO authenticated;
```

- [ ] **Step 2: Aplicar no banco.**

- [ ] **Step 3: Verificar** — chamar `create_album('Teste')`, `set_active_album`, tentar `delete_album` no público (deve falhar), `rename_album`, `delete_album` no de teste (deve passar).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/107_album_management_rpcs.sql
git commit -m "feat(db): RPCs de gestao de albuns (create/rename/delete/set_active/set_public)"
```

---

## Task 9: Regras puras de álbum (lib + TDD vitest)

**Files:**
- Create: `lib/albums/album-rules.ts`
- Test: `lib/albums/album-rules.test.ts`

**Interfaces:**
- Produces:
  - `validateAlbumName(name: string, existingNames: string[]): { ok: true } | { ok: false; error: string }`
  - `canDeleteAlbum(input: { albumId: number; publicAlbumId: number; totalAlbums: number }): { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/albums/album-rules.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateAlbumName, canDeleteAlbum } from "./album-rules";

describe("validateAlbumName", () => {
  it("rejeita nome vazio", () => {
    expect(validateAlbumName("   ", [])).toEqual({ ok: false, error: "Informe um nome." });
  });
  it("rejeita nome duplicado (case/space-insensitive)", () => {
    expect(validateAlbumName(" Meu Álbum - 001 ", ["Meu Álbum - 001"]))
      .toEqual({ ok: false, error: "Já existe um álbum com esse nome." });
  });
  it("aceita nome novo", () => {
    expect(validateAlbumName("Álbum do João", ["Meu Álbum - 001"])).toEqual({ ok: true });
  });
});

describe("canDeleteAlbum", () => {
  it("bloqueia exclusão do álbum público", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 5, totalAlbums: 3 }))
      .toEqual({ ok: false, error: "Não é possível excluir o álbum público." });
  });
  it("bloqueia exclusão do último álbum", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 9, totalAlbums: 1 }))
      .toEqual({ ok: false, error: "Você precisa ter ao menos um álbum." });
  });
  it("permite excluir álbum comum quando há outros", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 9, totalAlbums: 3 })).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- album-rules`
Expected: FAIL (`Cannot find module './album-rules'`).

- [ ] **Step 3: Implementar**

Create `lib/albums/album-rules.ts`:

```typescript
type Result = { ok: true } | { ok: false; error: string };

export function validateAlbumName(name: string, existingNames: string[]): Result {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "Informe um nome." };
  const norm = (s: string) => s.trim().toLocaleLowerCase();
  if (existingNames.some((n) => norm(n) === norm(trimmed))) {
    return { ok: false, error: "Já existe um álbum com esse nome." };
  }
  return { ok: true };
}

export function canDeleteAlbum(input: {
  albumId: number;
  publicAlbumId: number;
  totalAlbums: number;
}): Result {
  if (input.albumId === input.publicAlbumId) {
    return { ok: false, error: "Não é possível excluir o álbum público." };
  }
  if (input.totalAlbums <= 1) {
    return { ok: false, error: "Você precisa ter ao menos um álbum." };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- album-rules`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/albums/album-rules.ts lib/albums/album-rules.test.ts
git commit -m "feat(albums): regras puras de validacao e protecao de exclusao"
```

---

## Task 10: Helper server para álbum ativo e lista de álbuns

**Files:**
- Create: `lib/albums/get-active-album.ts`

**Interfaces:**
- Consumes: `lib/supabase/server.ts` (`createClient`).
- Produces:
  - `type AlbumRow = { id: number; name: string; sticker_count: number }`
  - `type AlbumContext = { userId: string; albums: AlbumRow[]; activeAlbumId: number; publicAlbumId: number }`
  - `async function getAlbumContext(): Promise<AlbumContext | null>` — lê o usuário logado, seus álbuns e os ponteiros. Retorna `null` se não logado.

- [ ] **Step 1: Implementar**

Create `lib/albums/get-active-album.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";

export type AlbumRow = { id: number; name: string; sticker_count: number };
export type AlbumContext = {
  userId: string;
  albums: AlbumRow[];
  activeAlbumId: number;
  publicAlbumId: number;
};

export async function getAlbumContext(): Promise<AlbumContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_album_id, public_album_id")
    .eq("id", user.id)
    .single();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, sticker_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const list = (albums ?? []) as AlbumRow[];
  const activeAlbumId = profile?.active_album_id ?? list[0]?.id;
  const publicAlbumId = profile?.public_album_id ?? list[0]?.id;
  if (!activeAlbumId) return null;

  return { userId: user.id, albums: list, activeAlbumId, publicAlbumId };
}
```

- [ ] **Step 2: Verificar build/type**

Run: `npx tsc --noEmit`
Expected: sem erros nesse arquivo.

- [ ] **Step 3: Commit**

```bash
git add lib/albums/get-active-album.ts
git commit -m "feat(albums): helper server getAlbumContext"
```

---

## Task 11: Seletor de álbum no header

**Files:**
- Create: `components/album-selector.tsx`
- Modify: `components/top-bar.tsx`

**Interfaces:**
- Consumes: `lib/supabase/client.ts` (`createClient`), RPCs `set_active_album`, `create_album`.
- Produces: `<AlbumSelector />` (sem props; auto-fetch).

- [ ] **Step 1: Implementar o seletor**

Create `components/album-selector.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Plus, Check, BookCopy } from "lucide-react";
import { validateAlbumName } from "@/lib/albums/album-rules";

type Album = { id: number; name: string };

export function AlbumSelector() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles").select("active_album_id").eq("id", user.id).single();
    const { data: rows } = await supabase
      .from("albums").select("id, name").eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAlbums((rows ?? []) as Album[]);
    setActiveId(profile?.active_album_id ?? (rows?.[0]?.id ?? null));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function selectAlbum(id: number) {
    if (id === activeId) { setOpen(false); return; }
    const supabase = createClient();
    await supabase.rpc("set_active_album", { p_album_id: id });
    setActiveId(id);
    setOpen(false);
    router.refresh();
  }

  async function handleCreate() {
    const check = validateAlbumName(newName, albums.map((a) => a.name));
    if (!check.ok) { setError(check.error); return; }
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("create_album", { p_name: newName.trim() });
    if (rpcErr) { setError("Não foi possível criar o álbum."); return; }
    const created = data as Album;
    await supabase.rpc("set_active_album", { p_album_id: created.id });
    setCreating(false);
    setNewName("");
    setError(null);
    await load();
    router.refresh();
  }

  const activeName = albums.find((a) => a.id === activeId)?.name ?? "Álbum";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors max-w-[180px]"
        aria-label="Selecionar álbum"
      >
        <BookCopy className="h-4 w-4 shrink-0" />
        <span className="truncate">{activeName}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
          <div className="py-1 max-h-72 overflow-y-auto">
            {albums.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAlbum(a.id)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="truncate">{a.name}</span>
                {a.id === activeId && <Check className="h-4 w-4 text-green-400 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 p-2">
            {creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setError(null); }}
                  placeholder="Nome do álbum"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500">Criar</button>
                  <button onClick={() => { setCreating(false); setError(null); setNewName(""); }} className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-2 py-2 text-sm text-green-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> Criar álbum
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Renderizar no TopBar**

Modify `components/top-bar.tsx`:
- Adicionar import no topo (após linha 9):
```tsx
import { AlbumSelector } from "@/components/album-selector";
```
- Inserir o seletor logo após o bloco do logo `</Link>` (linha 89) e antes do `{/* Desktop Navigation */}` (linha 91):
```tsx
          <div className="ml-2 mr-auto">
            <AlbumSelector />
          </div>
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, abrir área logada. Esperado: seletor aparece no header mostrando "Meu Álbum - 001"; criar um álbum e trocar funcionam; trocar recarrega a página (router.refresh).

- [ ] **Step 4: Commit**

```bash
git add components/album-selector.tsx components/top-bar.tsx
git commit -m "feat(albums): seletor de album no header"
```

---

## Task 12: Página "Meus álbuns" (CRUD)

**Files:**
- Create: `app/(authenticated)/albums/page.tsx`
- Create: `app/(authenticated)/albums/albums-manager.tsx`

**Interfaces:**
- Consumes: `getAlbumContext` (Task 10), RPCs `create_album`, `rename_album`, `delete_album`, `set_public_album`, `set_active_album`; regras `validateAlbumName`, `canDeleteAlbum`.
- Produces: rota `/albums`.

- [ ] **Step 1: Página server**

Create `app/(authenticated)/albums/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAlbumContext } from "@/lib/albums/get-active-album";
import { AlbumsManager } from "./albums-manager";

export default async function AlbumsPage() {
  const ctx = await getAlbumContext();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Meus álbuns</h1>
      <AlbumsManager
        albums={ctx.albums}
        activeAlbumId={ctx.activeAlbumId}
        publicAlbumId={ctx.publicAlbumId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Manager client**

Create `app/(authenticated)/albums/albums-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Star, Check, Pencil, Trash2, Plus } from "lucide-react";
import { validateAlbumName, canDeleteAlbum } from "@/lib/albums/album-rules";

type Album = { id: number; name: string; sticker_count: number };

export function AlbumsManager({
  albums,
  activeAlbumId,
  publicAlbumId,
}: {
  albums: Album[];
  activeAlbumId: number;
  publicAlbumId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const names = albums.map((a) => a.name);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    await fn();
    setBusy(false);
    router.refresh();
  }

  async function handleCreate() {
    const check = validateAlbumName(newName, names);
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("create_album", { p_name: newName.trim() });
      setCreating(false);
      setNewName("");
    });
  }

  async function handleRename(id: number) {
    const check = validateAlbumName(editName, names.filter((n) => n !== albums.find((a) => a.id === id)?.name));
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("rename_album", { p_album_id: id, p_name: editName.trim() });
      setEditingId(null);
    });
  }

  async function handleDelete(id: number) {
    const check = canDeleteAlbum({ albumId: id, publicAlbumId, totalAlbums: albums.length });
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("delete_album", { p_album_id: id });
    });
  }

  async function makePublic(id: number) {
    await run(async () => { await supabase.rpc("set_public_album", { p_album_id: id }); });
  }

  async function makeActive(id: number) {
    await run(async () => { await supabase.rpc("set_active_album", { p_album_id: id }); });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="space-y-2">
        {albums.map((a) => (
          <li key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            {editingId === a.id ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                />
                <button disabled={busy} onClick={() => handleRename(a.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Salvar</button>
                <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm text-gray-400">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{a.name}</span>
                    {a.id === publicAlbumId && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400"><Star className="h-3 w-3" /> Público</span>}
                    {a.id === activeAlbumId && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400"><Check className="h-3 w-3" /> Ativo</span>}
                  </div>
                  <p className="text-xs text-gray-400">{a.sticker_count} figurinhas</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.id !== activeAlbumId && (
                    <button disabled={busy} onClick={() => makeActive(a.id)} className="rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Usar</button>
                  )}
                  {a.id !== publicAlbumId && (
                    <button disabled={busy} onClick={() => makePublic(a.id)} className="rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Tornar público</button>
                  )}
                  <button onClick={() => { setEditingId(a.id); setEditName(a.name); setError(null); }} className="rounded-lg p-2 text-gray-400 hover:bg-white/5" aria-label="Renomear"><Pencil className="h-4 w-4" /></button>
                  <button disabled={busy} onClick={() => handleDelete(a.id)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(null); }}
            placeholder="Nome do novo álbum"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <div className="flex gap-2">
            <button disabled={busy} onClick={handleCreate} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Criar</button>
            <button onClick={() => { setCreating(false); setNewName(""); setError(null); }} className="rounded-lg px-3 py-1.5 text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
          <Plus className="h-4 w-4" /> Criar álbum
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Link no menu do usuário (opcional mas recomendado)**

Modify `components/top-bar.tsx`: no dropdown do usuário, adicionar um `<Link href="/albums">` "Meus álbuns" próximo ao link de Configurações (linhas 194-201), seguindo o mesmo padrão visual.

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, ir em `/albums`. Esperado: lista os álbuns, criar/renomear/excluir/tornar público/usar funcionam; excluir o público ou o último mostra erro.

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/albums/ components/top-bar.tsx
git commit -m "feat(albums): pagina Meus albuns com CRUD"
```

---

## Task 13: Coleção usa o álbum ativo

**Files:**
- Modify: `app/(authenticated)/collection/page.tsx`
- Modify: `app/(authenticated)/collection/collection-view.tsx`

**Interfaces:**
- Consumes: `getAlbumContext` (Task 10); `search_stickers(p_album_id, ...)` (Task 5); RLS de insert (Task 7).
- Produces: `CollectionView` recebe `albumId: number` em vez de `userId`.

- [ ] **Step 1: Page passa albumId**

Modify `app/(authenticated)/collection/page.tsx` — substituir o corpo por:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlbumContext } from "@/lib/albums/get-active-album";
import { CollectionView } from "./collection-view";

export default async function CollectionPage() {
  const ctx = await getAlbumContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  return (
    <CollectionView
      groups={groups ?? []}
      albumId={ctx.activeAlbumId}
    />
  );
}
```

- [ ] **Step 2: View usa albumId**

Modify `app/(authenticated)/collection/collection-view.tsx`:
- Trocar a prop `userId: string` por `albumId: number` na interface de props e no destructuring do componente.
- RPC `search_stickers` (linhas ~114-121) — substituir `p_user_id: userId` por `p_album_id: albumId`:
```tsx
const { data } = await supabase.rpc("search_stickers", {
  p_album_id: albumId,
  p_keyword: keyword || null,
  p_group_id: groupId,
  p_status: status,
  p_page: pageNum,
  p_page_size: PAGE_SIZE,
});
```
- INSERTs de `user_stickers` (linhas ~203, ~287, ~299) — incluir `album_id`:
```tsx
await supabase.from("user_stickers").insert({ album_id: albumId, sticker_id: stickerId });
```
  (Não passar mais `user_id`: a RLS `WITH CHECK` exige `auth.uid() = user_id`, mas o INSERT precisa preencher `user_id`. Como `user_id` é NOT NULL, manter `user_id` no insert obtendo-o uma vez via `supabase.auth.getUser()` no início do componente — adicionar um `userId` derivado no client — OU manter a prop `userId` junto com `albumId`.)

> **Decisão de implementação:** manter **ambas** as props `userId` e `albumId` em `CollectionView` é o caminho de menor atrito, porque os INSERTs precisam de `user_id` (NOT NULL) e a RLS valida `auth.uid() = user_id`. Ajustar a Step 1 para também passar `userId={ctx.userId}`. Os INSERTs ficam:
```tsx
await supabase.from("user_stickers").insert({ user_id: userId, album_id: albumId, sticker_id: stickerId });
```
- DELETE de `user_stickers` (linhas ~212-220) — escopar por álbum:
```tsx
const { data: rows } = await supabase
  .from("user_stickers")
  .select("id")
  .eq("album_id", albumId)
  .eq("sticker_id", stickerId)
  .limit(1);
if (rows && rows.length > 0) {
  await supabase.from("user_stickers").delete().eq("id", rows[0].id);
}
```

- [ ] **Step 3: Ajustar Step 1 para passar userId também**

Em `app/(authenticated)/collection/page.tsx`, no `<CollectionView>`, adicionar `userId={ctx.userId}`.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` (sem erros) e `npm run dev` — na coleção, adicionar/remover figurinha afeta só o álbum ativo. Trocar de álbum no header e confirmar que a contagem muda.

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/collection/page.tsx app/\(authenticated\)/collection/collection-view.tsx
git commit -m "feat(albums): colecao escopada no album ativo"
```

---

## Task 14: Scanner usa o álbum ativo

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`
- Modify: `app/(authenticated)/collection/scanner/page.tsx` (se passar `userId` para a view)

**Interfaces:**
- Consumes: `getAlbumContext`; RLS de insert (Task 7).

- [ ] **Step 1: Localizar o insert e a prop**

Run: `grep -n "user_stickers\|userId\|ScannerView" app/\(authenticated\)/collection/scanner/scanner-view.tsx app/\(authenticated\)/collection/scanner/page.tsx`
Identificar onde a figurinha escaneada é inserida e como a view recebe o usuário.

- [ ] **Step 2: Passar albumId pela page**

Modify `app/(authenticated)/collection/scanner/page.tsx` — usar `getAlbumContext()` (como na Task 13) e passar `albumId={ctx.activeAlbumId}` (mantendo `userId={ctx.userId}` se já existir) para `<ScannerView>`.

- [ ] **Step 3: Incluir album_id no insert**

Modify `scanner-view.tsx` — adicionar `albumId: number` às props e incluir `album_id: albumId` em todo `from("user_stickers").insert({...})` (mantendo `user_id`).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`; testar o scanner adicionando uma figurinha e conferir que entra no álbum ativo.

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/collection/scanner/
git commit -m "feat(albums): scanner escreve no album ativo"
```

---

## Task 15: Dashboard usa o álbum ativo

**Files:**
- Modify: `app/(authenticated)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getAlbumContext`; `get_user_group_counts(p_album_id)` (Task 5).

- [ ] **Step 1: Trocar a fonte do user id e a chamada da RPC**

Modify `app/(authenticated)/dashboard/page.tsx`:
- Após obter `user`, obter o álbum ativo. Substituir a chamada:
```tsx
const { data: groupCounts } = await supabase
  .rpc("get_user_group_counts", { p_user_id: user!.id });
```
por:
```tsx
const { data: activeProfile } = await supabase
  .from("profiles").select("active_album_id").eq("id", user!.id).single();
const activeAlbumId = activeProfile?.active_album_id;
const { data: groupCounts } = await supabase
  .rpc("get_user_group_counts", { p_album_id: activeAlbumId });
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`; abrir `/dashboard` (label "Álbum") e conferir que os contadores por grupo refletem o álbum ativo; trocar álbum e confirmar mudança.

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/dashboard/page.tsx
git commit -m "feat(albums): dashboard escopado no album ativo"
```

---

## Task 16: Perfil público usa o álbum público

**Files:**
- Modify: `app/p/[username]/page.tsx`
- Modify: `app/p/[username]/profile-stickers-album.tsx`
- (E os componentes intermediários que repassam props — `profile-stickers.tsx` se necessário.)

**Interfaces:**
- Consumes: `get_profile_view_stats(p_album_id, p_viewer_album_id)` (Task 6), `get_public_stickers_album(p_album_id, p_group_id, p_keyword, p_viewer_album_id)` (Task 6).

- [ ] **Step 1: Resolver o álbum público do dono e do viewer**

Modify `app/p/[username]/page.tsx`:
- No SELECT do `profile`, adicionar `public_album_id`:
```tsx
.select("id, display_name, avatar_url, username, city, state, instagram, whatsapp, share_instagram, share_whatsapp, public_album_id")
```
- Após resolver `viewerId`, buscar o álbum público do viewer (quando houver viewer):
```tsx
let viewerAlbumId: number | null = null;
if (viewerId) {
  const { data: viewerProfile } = await supabase
    .from("profiles").select("public_album_id").eq("id", viewerId).single();
  viewerAlbumId = viewerProfile?.public_album_id ?? null;
}
const ownerAlbumId = profile.public_album_id as number;
```
- Trocar a chamada de stats:
```tsx
const { data: statsRows } = await supabase.rpc("get_profile_view_stats", {
  p_album_id: ownerAlbumId,
  p_viewer_album_id: viewerAlbumId,
});
```
- Repassar `ownerAlbumId` e `viewerAlbumId` para os componentes filhos que renderizam o álbum (em vez de `userId`/`viewerId`). Ajustar as props de `profile-stickers.tsx` / `profile-stickers-album.tsx` de acordo (renomear `userId` → `albumId`, `viewerId` → `viewerAlbumId`).

- [ ] **Step 2: Atualizar a RPC do álbum no client**

Modify `app/p/[username]/profile-stickers-album.tsx` (linhas ~102-109):
```tsx
supabase
  .rpc("get_public_stickers_album", {
    p_album_id: albumId,
    p_group_id: groupId,
    p_keyword: keyword || null,
    p_viewer_album_id: viewerAlbumId,
  })
  .then(({ data }) => { /* ... resto igual ... */ });
```
Atualizar a interface de props do componente para `albumId: number` e `viewerAlbumId: number | null`.

- [ ] **Step 3: Localizar outros callers de share list**

Run: `grep -rn "get_user_share_list\|get_public_stickers_album\|get_profile_view_stats" app/ components/`
Para cada caller restante, trocar `p_user_id`/`p_viewer_id` por `p_album_id`/`p_viewer_album_id` usando: o **álbum público** do dono para visões públicas, e o **álbum ativo** quando for a própria lista do usuário (ex.: compartilhar minhas repetidas → álbum ativo via `getAlbumContext`).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`; abrir `/p/<username>` logado e deslogado. Esperado: mostra o álbum público; trocar o álbum ativo no app **não** muda o conteúdo do link público; filtro "tenho/não tenho" do viewer usa o álbum público do viewer.

- [ ] **Step 5: Commit**

```bash
git add app/p/\[username\]/
git commit -m "feat(albums): perfil publico usa album publico do dono e do viewer"
```

---

## Task 17: Verificação fim-a-fim e regressão

**Files:** nenhum (verificação).

- [ ] **Step 1: Testes unitários**

Run: `npm test`
Expected: todos passam (incl. `album-rules`).

- [ ] **Step 2: Typecheck e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Roteiro manual**

1. Login → header mostra "Meu Álbum - 001".
2. `/albums` → criar "Álbum do Filho" → vira ativo.
3. Coleção: adicionar 3 figurinhas → contagem do álbum ativo sobe; trocar pro "Meu Álbum - 001" → coleção diferente.
4. Scanner: escanear uma → entra no ativo.
5. `/dashboard`: contadores por grupo do ativo.
6. `/albums`: tornar "Álbum do Filho" público → `/p/<username>` mostra ele; trocar ativo de volta não muda o link público.
7. `/albums`: tentar excluir o público (erro) e o último (erro); excluir um comum (ok).
8. Troca (trades) entre dois usuários: as figurinhas saem/entram nos álbuns públicos corretos.

- [ ] **Step 5: Commit final / abrir PR**

```bash
git push -u origin feature/multiplos-albuns-usuario
gh pr create --base main --title "feat: multi-álbum (Etapa 1)" --body "Implementa estrutura multi-álbum conforme docs/superpowers/specs/2026-06-25-multi-album-design.md"
```

---

## Self-Review

**Spec coverage:**
- Tabela `albums` + `template` gancho → Task 1. ✓
- `user_stickers.album_id` → Task 1 + backfill Task 2. ✓
- `active_album_id`/`public_album_id` → Task 1, backfill Task 2, novos signups Task 3. ✓
- `sticker_count` por álbum + sync público → Task 4. ✓
- RPCs de leitura por álbum (search, public album, group counts, profile stats, share list) → Tasks 5, 6. ✓
- Escrita por álbum + RLS + trocas no álbum público → Task 7. ✓
- CRUD de álbuns com proteções → Tasks 8 (RPC) + 9 (regras puras) + 12 (UI). ✓
- Seletor no header persistido → Task 11. ✓
- Collection/Scanner/Dashboard no álbum ativo → Tasks 13, 14, 15. ✓
- Perfil público no álbum público (dono + viewer) → Task 16. ✓
- Migração de dados existentes ("Meu Álbum - 001") → Task 2. ✓
- Estratégia de testes (vitest para lógica pura, manual para SQL/UI) → Task 9 + passos de verificação. ✓

**Placeholder scan:** O único ponto com corpo a completar é `get_user_share_list_count` (Task 6, Step 1/2), porque seu corpo exato vive em 070 e deve ser copiado verbatim com o filtro trocado — instrução concreta dada, com a função irmã `get_user_share_list` fornecida na íntegra como referência da transformação. Demais steps têm código completo.

**Type consistency:** `getAlbumContext`/`AlbumRow`/`AlbumContext` usados consistentemente (Tasks 10, 12, 13). RPCs nomeadas de forma idêntica entre migration e callers (`set_active_album`, `create_album`, `get_user_group_counts(p_album_id)`, `search_stickers(p_album_id,...)`, `get_public_stickers_album(p_album_id,...,p_viewer_album_id)`). `CollectionView` recebe `userId` + `albumId` (decisão registrada na Task 13).
