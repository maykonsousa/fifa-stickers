# Fluxo de colecionadores — substituir amigos por recomendação por compatibilidade

**Data:** 2026-05-16
**Rotas afetadas:** renomear `/friends` → `/colecionadores`, remover `/user/[id]`, atualizar nav-bar / footer / robots.

## Contexto

O fluxo de "amigos" (migrações 005-006) ficou incompleto: `app/(authenticated)/friends/page.tsx` é apenas um placeholder `<UnderConstruction />`, e `friends-view.tsx` (300 linhas, busca/convite/aceite/bloqueio) nunca foi conectado.

Com o release de propostas (`2026-05-16-trade-proposals-design.md`), qualquer usuário logado pode propor troca com qualquer outro via `/p/[username]` — sem precisar de vínculo. O grafo social ficou redundante.

A hipótese é que **um app transacional de troca de figurinhas não precisa de "lista de amigos"**. O que falta é **descobrir com quem trocar**: dado o que falta na minha coleção, quem tem essas figurinhas como repetida?

Este spec substitui o slot "Amigos" no app por **`/colecionadores`** — diretório rankeado por compatibilidade de troca.

## Requisitos

- Usuário logado vê em `/colecionadores` a lista de colecionadores rankeada por **"tem o que eu quero"**: quem tem como **repetida** figurinhas que estão na minha lista de **missing**.
- Ranking composto: `match_count DESC, proximity_score DESC, last_activity DESC`.
  - `match_count` = quantidade de figurinhas que o candidato tem repetida e o viewer precisa.
  - `proximity_score` = 2 se mesma cidade, 1 se mesmo estado, 0 caso contrário (relativo ao viewer).
  - `last_activity` = `MAX(user_stickers.created_at)` do candidato.
- Cada card mostra: avatar, nome, cidade/estado, badge "N figurinhas que você precisa", grade com 4 thumbs de stickers em comum (com indicador "+M" se sobrar).
- Card inteiro é link para `/p/{username}` — não há CTA "propor troca" no card (o perfil já tem o builder inline).
- Filtros: dropdown de coleção (`sticker_groups`) + toggle "Só do meu estado".
- Toggle de proximidade fica desabilitado se viewer não tiver `state` preenchido, com tooltip orientando a editar o perfil.
- Paginação numérica clássica, 20 por página (consistente com `get_public_stickers`).
- Estados vazios distintos: coleção completa, sem matches globais, sem matches com filtro.
- Mobile-first.
- Sem testes automatizados nesse release.

### Fora de escopo

- "Match mútuo" (que tem o que quero **e** quer o que tenho). A RPC original `get_trade_matches` retornava ambas direções; aqui simplifica pra unidirecional.
- "Quer o que eu tenho" como visão dedicada.
- Recomendações por similaridade de gosto / clustering.
- Real-time, cache materializado, push notifications.
- Rate limit, bloqueio/silenciamento de usuário (não há grafo social).

## Modelo de dados

### Nova RPC: `get_collector_matches`

Migration `049_get_collector_matches.sql`. Substitui `get_trade_matches` (sem call site no front).

```sql
CREATE FUNCTION get_collector_matches(
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
AS $$ ... $$;
```

**Lógica em CTEs:**

1. `viewer` — `SELECT city, state FROM profiles WHERE id = p_viewer_id` (uma linha).
2. `viewer_missing` — `sticker_id`s que o viewer não tem. Aplica `p_group_id` se informado.
3. `candidates` — `(user_id, sticker_id)` distintos de quem tem repetida (`HAVING COUNT(*) > 1`) ∩ `viewer_missing`, excluindo o próprio viewer.
4. Agregação por `user_id`: `COUNT(DISTINCT sticker_id) AS match_count`, `(array_agg(sticker_id ORDER BY sticker_id))[1:4] AS preview_sticker_ids`.
5. `JOIN profiles p` pra puxar identidade.
6. Coluna derivada `proximity_score`:
   ```
   CASE
     WHEN p.city = viewer.city AND p.state = viewer.state THEN 2
     WHEN p.state = viewer.state THEN 1
     ELSE 0
   END
   ```
7. Subquery `last_activity := (SELECT MAX(created_at) FROM user_stickers WHERE user_id = p.id)`.
8. Filtro `WHERE match_count > 0` (implícito pelo JOIN).
9. Filtro `p_only_nearby`: `AND (NOT p_only_nearby OR p.state = viewer.state)`.
10. Cálculo de `total_count` em CTE separado com a mesma where clause.
11. `ORDER BY match_count DESC, proximity_score DESC, last_activity DESC NULLS LAST`.
12. `LIMIT p_page_size OFFSET (p_page - 1) * p_page_size`.

**Acesso:** `GRANT EXECUTE TO authenticated`.

### Drops: `048_drop_friends_legacy.sql`

```sql
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

RLS policies de `friends`/`friend_invites` somem com `DROP TABLE CASCADE`.

## UI

### Estrutura

Server component carrega dados; client component só pros filtros. URL é a fonte de verdade dos filtros.

```
app/(authenticated)/colecionadores/
  page.tsx                  # server: lê searchParams, chama RPC, batched fetch dos thumbs
  collectors-filters.tsx    # client: dropdown grupo + toggle nearby, router.replace
  collector-card.tsx        # presentational: avatar, identidade, badge, mini-grid 4 thumbs
  collectors-list.tsx       # paginação numérica
```

### Search params

`/colecionadores?group=<id>&nearby=true&page=<n>`

- Trocar filtro → `router.replace({ scroll: false })`.
- Mudar página → `<Link>` clássico com `prefetch=true`.
- Sem filtro → query params vazios (URL limpa).

### Batched fetch de thumbs

Após a RPC, server component coleta todos os `preview_sticker_ids` da página (até 80 IDs com page_size=20 × 4), faz `SELECT id, image_url FROM stickers WHERE id = ANY($1)`, mapeia por id e injeta no card.

### Card

```
┌─ Link para /p/{username} ─────────────────┐
│ [Avatar] João Silva                       │
│          Florianópolis, SC                │
│          ┃ 12 figurinhas que você precisa │
│ [thumb] [thumb] [thumb] [thumb]  +8       │
└───────────────────────────────────────────┘
```

- Card inteiro com `<Link>`, `aria-label="Ver perfil de {nome}, {match_count} figurinhas em comum"`.
- Thumb fallback usa o placeholder de sticker já existente no `/collection`.
- "+M" só aparece se `match_count > 4`.

### Estados

- **Loading**: skeleton de 6 cards. SSR cobre o primeiro paint; skeleton aparece só em transições via `router.replace`.
- **Sem matches** (`total_count = 0`):
  - Viewer com coleção completa → "Parabéns, você completou todas as coleções disponíveis."
  - Viewer com missings, sem candidates → "Ninguém ainda tem o que você precisa. Volte mais tarde."
  - Com filtros aplicados → "Nenhum colecionador com esses filtros." + botão "Limpar filtros".
- **Filtro de proximidade sem estado preenchido**: toggle `disabled` com tooltip "Preencha sua cidade no perfil pra usar esse filtro."

### Filtros

- **Coleção**: dropdown `<select>` populado com `sticker_groups` (server-side). Default "Todas".
- **Proximidade**: toggle/checkbox "Só do meu estado". Default false.

## Navegação e referências

### Renomear

- `components/nav-bar.tsx`: item `{ href: "/friends", label: "Amigos", icon: Users }` → `{ href: "/colecionadores", label: "Colecionadores", icon: UserSearch }`.
- `components/landing/Footer.tsx`: link "Amigos" → "Colecionadores", href `/colecionadores`.
- `app/robots.ts`: troca `/friends` por `/colecionadores` no array disallow.

### Redirect

`next.config.ts`:
```ts
async redirects() {
  return [{ source: "/friends", destination: "/colecionadores", permanent: true }];
}
```

### Deletar

- `app/(authenticated)/friends/` (page.tsx + friends-view.tsx).
- `app/(authenticated)/user/[id]/` (órfão — sem links).

## Ordem de execução

Cada commit é deployável sozinho — sem janela onde o app fica quebrado.

1. **DB**: aplicar `049_get_collector_matches.sql` (cria RPC nova, não interfere com nada existente).
2. **Front**: criar `app/(authenticated)/colecionadores/` consumindo a RPC.
3. **Nav/Footer/robots**: trocar refs "Amigos"/`/friends` por "Colecionadores"/`/colecionadores`.
4. **Redirect**: adicionar `/friends` → `/colecionadores` em `next.config.ts`.
5. **Deletar código órfão**: `friends/` e `user/[id]/`.
6. **DB**: aplicar `048_drop_friends_legacy.sql` (drop tabelas e funções, agora sem dependentes).

Antes do passo 6, grep final por `are_friends`, `accept_friend_invite`, `block_friend`, `unblock_friend`, `remove_friend`, `get_profile_with_contact`, `get_trade_matches` como cinto-e-suspensório.

## Riscos e pontos de atenção

- **Recomputação por request**: a RPC não usa cache materializado. Pra base atual (poucos usuários), tolerável. Plano B: matview com refresh por trigger em `user_stickers` se aparecer latência.
- **Índices**: `user_stickers(user_id, sticker_id)` já existe. Não precisa adicionar `(user_id, created_at)` pra `last_activity` agora — adicionar se ranking ficar lento.
- **Sem `is_public` em profiles**: todos os perfis são publicamente discoveráveis. Privacidade granular do app (`share_whatsapp`/`share_instagram`) continua intacta.
- **Acessibilidade**: card-link com `aria-label`, toggle com `aria-pressed`, dropdown com `aria-label`.
- **Filtro de proximidade**: bloqueado quando viewer não tem `state`. Mensagem orientativa sem auto-redirect (atrito demais).
