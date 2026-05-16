# Propostas de troca — convite online com chat

**Data:** 2026-05-16
**Rota afetada:** novo `/proposals` (lista + detalhe + criação), edição do botão "Propor troca" em `/p/[username]`, nova entrada na nav-bar.

## Contexto

Hoje o perfil público (`/p/[username]`) já tem o botão "Propor troca" — mas ele abre `TradeProposalDialog`, um placeholder "Em construção". O spec anterior (`2026-05-16-trade-flow-design.md`) **explicitamente descartou** o modelo de proposta online em favor do registro presencial. Este spec **traz a proposta de volta como camada complementar**: convite online de encontro, não execução de troca.

As duas features coexistem:

- **Proposta** (`/proposals`): convite online com chat. Dono aceita/recusa. Não muta coleções.
- **Troca presencial** (`/trades`, `/trades/new`): registro de evento atômico, muta coleções. Mantida igual.

Eventual integração futura: aceitar uma proposta pode pré-popular `/trades/new`. Fora do escopo deste release; o campo `converted_to_trade_id` em `proposals` deixa porta aberta.

## Requisitos

- Visitante logado em `/p/[username]` pode propor troca com o dono.
- Proposta carrega **dois lados**: o que o proponente quer (das repetidas do dono) e o que oferece (das faltantes do dono).
- **Regra de seleção centrada no álbum do dono**, não na interseção com a coleção do proponente. Cobre o caso comum "usuário recém-cadastrado só pra propor" (coleção vazia, mas precisa conseguir oferecer).
- Sinalização visual no picker mostra o estado da coleção do proponente ("Falta", "Você tem ×N"), mas não bloqueia a seleção. Confiança social.
- Dono enxerga propostas em `/proposals` (sub-aba "Recebidas"). Proponente em "Enviadas".
- **Lifecycle mínimo:** `pending → accepted | rejected | cancelled`. Proponente cancela. Sem expiração automática.
- **Chat habilitado desde o início** (mesmo pendente), em qualquer status. Permite negociar e combinar encontro.
- **Notificação:** email + badge in-app pros eventos chave (criada, aceita, recusada, cancelada, nova mensagem). Email de chat com debounce de 15min pra evitar spam.
- Mobile-first.
- Sem testes automatizados nesse release.

### Fora de escopo

- Real-time no chat (sem `supabase.channel()` no MVP — refresh manual + polling opcional).
- Notificações push, expiração automática, contra-proposta, paginação do chat.
- Auto-conversão de proposta aceita em registro de troca.
- Bloqueio/silenciamento de usuário.
- Rate limit de propostas duplicadas (entra se virar problema).

## Modelo de dados

### Novas tabelas

```sql
-- 041_create_proposals.sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proposer_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_seen_at TIMESTAMPTZ,
  converted_to_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  CONSTRAINT no_self_proposal CHECK (proposer_user_id <> owner_user_id)
);

CREATE INDEX idx_proposals_owner_status
  ON proposals(owner_user_id, status, last_activity_at DESC);
CREATE INDEX idx_proposals_proposer_status
  ON proposals(proposer_user_id, status, last_activity_at DESC);
CREATE INDEX idx_proposals_unread_owner ON proposals(owner_user_id)
  WHERE owner_seen_at IS NULL OR owner_seen_at < last_activity_at;
CREATE INDEX idx_proposals_unread_proposer ON proposals(proposer_user_id)
  WHERE proposer_seen_at < last_activity_at;
```

```sql
-- 042_create_proposal_items.sql
CREATE TABLE proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  -- direção do ponto de vista do PROPONENTE:
  --   'want'  = quer receber do dono
  --   'offer' = oferece do próprio acervo
  direction TEXT NOT NULL CHECK (direction IN ('want', 'offer')),
  quantity INT NOT NULL CHECK (quantity > 0),
  UNIQUE (proposal_id, sticker_id, direction)
);

CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
```

```sql
-- 043_create_proposal_messages.sql
CREATE TABLE proposal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_messages_proposal
  ON proposal_messages(proposal_id, created_at);
```

### Extensão de `email_log`

```sql
-- 046_email_log_proposal_support.sql
ALTER TABLE email_log ADD COLUMN proposal_id UUID
  REFERENCES proposals(id) ON DELETE CASCADE;

ALTER TABLE email_log DROP CONSTRAINT email_log_kind_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_kind_check CHECK (
  kind IN (
    'trade_notification', 'lead_invite',
    'proposal_created', 'proposal_decided',
    'proposal_cancelled', 'proposal_message'
  )
);

CREATE INDEX idx_email_log_proposal ON email_log(proposal_id)
  WHERE proposal_id IS NOT NULL;
CREATE INDEX idx_email_log_chat_debounce
  ON email_log(recipient_email, sent_at DESC)
  WHERE kind = 'proposal_message';
```

### Decisões de schema

| Decisão | Razão |
|---------|-------|
| `proposer_user_id NOT NULL` (sem lead) | Diferente de `trades` — proposta exige conta nos dois lados. |
| `direction` = `'want' | 'offer'` (não `'given' | 'received'`) | Sempre do ponto de vista do proponente; rótulo não muda de quem lê. |
| `UNIQUE (proposal, sticker, direction)` | Uma figurinha aparece no máx. 1x por lado. Múltiplas cópias usam `quantity`. |
| `last_activity_at` separado de `created_at` | Lista ordena por atividade recente (chat ou decisão). Criação preservada. |
| `owner_seen_at` nullable | Dono pode nunca ter aberto a proposta. `proposer_seen_at` arranca em `now()` na criação. |
| `converted_to_trade_id` desde o dia 1 | Custo zero (nullable, sem FK obrigatória). Abre porta pra v2 sem migration. |
| `proposal_messages` em tabela separada (não JSONB) | Indexável, paginável, queryável. Volume baixo no MVP, modelo escala. |
| Sem `expires_at` | Lifecycle mínimo. Se inbox crescer, entra em v2. |
| `ON DELETE CASCADE` em proposer/owner | Diferente de `trades` (que preserva histórico via `SET NULL`). Propostas são efêmeras; usuário apagou, some tudo. |
| `email_log.proposal_id` nullable + `trade_id` nullable | Uma linha pertence a um ou ao outro, nunca aos dois. Sem CHECK estrito — flexibilidade pra eventos futuros. |

## RPCs

Todas `SECURITY DEFINER` em `search_path = public`. Cliente acessa só via `supabase.rpc(...)`. Mutations diretas em tabelas são bloqueadas pela ausência de policies de INSERT/UPDATE/DELETE.

### `create_proposal`

```sql
CREATE FUNCTION create_proposal(
  p_owner_user_id UUID,
  p_items JSONB    -- [{sticker_id, direction, quantity}, ...]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_proposer_id UUID := auth.uid();
  v_proposal_id UUID;
  v_item JSONB;
  v_want_count INT;
  v_offer_count INT;
BEGIN
  IF v_proposer_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF v_proposer_id = p_owner_user_id THEN
    RAISE EXCEPTION 'cannot propose to yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_owner_user_id) THEN
    RAISE EXCEPTION 'owner not found';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'direction' = 'want'),
    COUNT(*) FILTER (WHERE item->>'direction' = 'offer')
  INTO v_want_count, v_offer_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_want_count = 0 OR v_offer_count = 0 THEN
    RAISE EXCEPTION 'proposal must have at least one want and one offer item';
  END IF;

  INSERT INTO proposals (proposer_user_id, owner_user_id)
  VALUES (v_proposer_id, p_owner_user_id)
  RETURNING id INTO v_proposal_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO proposal_items (proposal_id, sticker_id, direction, quantity)
    VALUES (
      v_proposal_id,
      (v_item->>'sticker_id')::INT,
      v_item->>'direction',
      (v_item->>'quantity')::INT
    );
  END LOOP;

  RETURN v_proposal_id;
END;
$$;
```

**Não valida** que itens `want` são repetidas do dono ou que itens `offer` são faltantes do dono. A UI filtra por construção via `get_public_stickers`. Revalidar no servidor seria custo de query alto e duplicaria lógica. Cliente malicioso pode mandar combinação ruim — a proposta vira "estranha" e o dono recusa. Sem impacto em integridade (nenhuma coleção é mutada).

Quantidade também não tem cap server-side. UI sugere e a confiança social cobre o resto.

### `decide_proposal`

```sql
CREATE FUNCTION decide_proposal(p_proposal_id UUID, p_accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT owner_user_id, status INTO v_owner, v_status
  FROM proposals WHERE id = p_proposal_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_owner <> v_caller THEN RAISE EXCEPTION 'only owner can decide'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'proposal is not pending'; END IF;

  UPDATE proposals
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      decided_at = now(),
      last_activity_at = now(),
      owner_seen_at = now()  -- caller (dono) viu sua própria ação
  WHERE id = p_proposal_id;
END;
$$;
```

### `cancel_proposal`

```sql
CREATE FUNCTION cancel_proposal(p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_proposer UUID;
  v_status TEXT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT proposer_user_id, status INTO v_proposer, v_status
  FROM proposals WHERE id = p_proposal_id;

  IF v_proposer IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_proposer <> v_caller THEN RAISE EXCEPTION 'only proposer can cancel'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'only pending can be cancelled'; END IF;

  UPDATE proposals
  SET status = 'cancelled',
      decided_at = now(),
      last_activity_at = now(),
      proposer_seen_at = now()  -- caller (proponente) viu sua própria ação
  WHERE id = p_proposal_id;
END;
$$;
```

### `post_proposal_message`

```sql
CREATE FUNCTION post_proposal_message(p_proposal_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_message_id UUID;
  v_owner UUID;
  v_proposer UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer
  FROM proposals WHERE id = p_proposal_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_caller <> v_owner AND v_caller <> v_proposer THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  INSERT INTO proposal_messages (proposal_id, sender_user_id, body)
  VALUES (p_proposal_id, v_caller, p_body)
  RETURNING id INTO v_message_id;

  -- caller marca como visto na sua própria mensagem (evita badge no próprio sender)
  UPDATE proposals
  SET last_activity_at = now(),
      proposer_seen_at = CASE WHEN v_caller = v_proposer THEN now() ELSE proposer_seen_at END,
      owner_seen_at    = CASE WHEN v_caller = v_owner    THEN now() ELSE owner_seen_at END
  WHERE id = p_proposal_id;

  RETURN v_message_id;
END;
$$;
```

Chat funciona em qualquer status (pending, accepted, rejected, cancelled). Permite "obrigado!" depois do aceite ou "ah, beleza" depois da recusa.

### `mark_proposal_seen`

```sql
CREATE FUNCTION mark_proposal_seen(p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
  v_proposer UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer
  FROM proposals WHERE id = p_proposal_id;

  IF v_caller = v_owner THEN
    UPDATE proposals SET owner_seen_at = now() WHERE id = p_proposal_id;
  ELSIF v_caller = v_proposer THEN
    UPDATE proposals SET proposer_seen_at = now() WHERE id = p_proposal_id;
  ELSE
    RAISE EXCEPTION 'not a participant';
  END IF;
END;
$$;
```

### `count_unseen_proposals`

```sql
CREATE FUNCTION count_unseen_proposals()
RETURNS INT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM proposals
  WHERE
    (owner_user_id = auth.uid()
       AND (owner_seen_at IS NULL OR owner_seen_at < last_activity_at))
    OR
    (proposer_user_id = auth.uid()
       AND proposer_seen_at < last_activity_at);
$$;
```

Conta dos dois lados — recebidas com nova atividade (novas propostas, mensagens do proponente) **e** enviadas com nova atividade (decisão do dono, mensagens do dono). Sem o segundo lado, o proponente nunca recebia indicador in-app de aceitação/recusa.

## RLS

```sql
-- 045_proposal_rls.sql
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_participant" ON proposals
  FOR SELECT TO authenticated
  USING (auth.uid() = proposer_user_id OR auth.uid() = owner_user_id);

CREATE POLICY "proposal_items_select_via_proposal" ON proposal_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND (p.proposer_user_id = auth.uid() OR p.owner_user_id = auth.uid())
  ));

CREATE POLICY "proposal_messages_select_via_proposal" ON proposal_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_messages.proposal_id
      AND (p.proposer_user_id = auth.uid() OR p.owner_user_id = auth.uid())
  ));
```

Sem policies de INSERT/UPDATE/DELETE — escritas só passam pelos RPCs. Mesmo padrão de `trades`.

## UI

Mobile-first, espelhando padrões de `/trades` e `/trades/new`.

### Entry point — `/p/[username]`

Em `app/p/[username]/profile-stickers.tsx` o botão "Propor troca" hoje abre `TradeProposalDialog` (placeholder). Substituir por `<Link href="/proposals/new?to=<username>">`. Remover `trade-proposal-dialog.tsx`, o import e o state `tradeOpen`.

**Habilitação do botão:** relaxar a condição. Hoje é `(tradeMissingCount + tradeDuplicatesCount) === 0`. Nova regra: bastar o **dono** ter `≥1 figurinha repetida` E `≥1 figurinha faltante`, independente do visitante. Cobre o caso "usuário recém-cadastrado com coleção vazia". Métricas `ownerDupes.size` e `totalMissing` já são calculadas em `app/p/[username]/page.tsx`.

### `/proposals` — Lista com abas

```
┌─────────────────────────────────┐
│ ← Propostas                     │
│                                 │
│ Recebidas (3)  Enviadas (1)     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 👤 Pedro Silva   [Pendente]•│ │ ← bolinha = atividade não vista
│ │ Quero: 3 · Ofereço: 2       │ │
│ │ há 14min                    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 👤 Ana Costa    [Aceita]    │ │
│ │ Quero: 1 · Ofereço: 1       │ │
│ │ 12 mai, 10:15               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- Ordenação: `last_activity_at DESC`.
- Status badges: pendente (âmbar), aceita (verde), recusada (cinza), cancelada (cinza).
- Indicador "•" (atividade não vista):
  - Recebidas: `owner_seen_at IS NULL OR owner_seen_at < last_activity_at`.
  - Enviadas: `proposer_seen_at < last_activity_at`.
- Card navegável → `/proposals/[id]`.
- Infinite scroll (mesmo padrão de `/trades`).
- Sub-aba persistida via querystring `?tab=received|sent` (default `received`).
- Empty state por aba:
  - Recebidas: "Nenhuma proposta ainda. Quando alguém propor uma troca, ela aparece aqui."
  - Enviadas: "Você ainda não enviou nenhuma proposta. Visite o perfil de um colecionador pra começar."

### `/proposals/new?to=<username>` — Criação

Página única (sem multi-step — counterparty já conhecido).

```
┌─────────────────────────────────┐
│ ← Propor troca                  │
│ Para: @pedro_silva              │
│                                 │
│ ┌─ O que você quer ───────────┐ │
│ │ #200 Messi          ×2  [×] │ │
│ │ #045 Vinicius Jr.   ×1  [×] │ │
│ │ [+ Adicionar figurinha]     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─ O que você oferece ────────┐ │
│ │ #012 Neymar         ×3  [×] │ │
│ │ [+ Adicionar figurinha]     │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Enviar proposta]               │ ← disabled até ≥1 de cada lado
└─────────────────────────────────┘
```

- **`[+ Adicionar figurinha]`** abre bottom sheet picker:
  - **Picker "Quero":** `get_public_stickers(p_user_id=owner, p_tab='duplicates')` **sem** `p_viewer_id` → todas repetidas do dono.
  - **Picker "Ofereço":** `get_public_stickers(p_user_id=owner, p_tab='missing')` **sem** `p_viewer_id` → todas faltantes do dono.
- **Sinalização visual** em cada card do picker (badges iguais aos da `/collection`):
  - "Você tem ×N" se proponente tem essa figurinha (N ≥ 1).
  - "Repetida ×N" se N > 1.
  - "Falta" se proponente não tem.
  - Nada bloqueia seleção. Visitante novo (coleção vazia) vê "Falta" em tudo no picker "Ofereço" e ainda consegue incluir.
- Picker é toggle (clique adiciona/remove). Busca textual + filtro por grupo. Reusar `app/(authenticated)/trades/new/sticker-picker.tsx` com leves ajustes — extrair pra `components/` se a divergência for grande.
- **Quantidade:**
  - "Quero": stepper 1 a `duplicate_count` do dono (não dá pra receber mais do que ele tem sobrando).
  - "Ofereço": stepper 1 a 9 (UI cap arbitrário). Mostra "Você tem ×N" como dica quando aplicável.
- Submit → server action `createProposalAction` → RPC `create_proposal` → email pro dono → redirect pra `/proposals/[id]`.
- Validações de entrada na server action:
  - `?to=` ausente ou apontando pra perfil inexistente → redirect `/proposals` + toast erro.
  - `to` é o próprio usuário → mesmo tratamento.

### `/proposals/[id]` — Detalhe + chat

```
┌─────────────────────────────────┐
│ ← Pedro Silva       [Pendente]  │
│                                 │
│ ┌─ Você quer (recebe) ────────┐ │ ← rótulos mudam por POV
│ │ #200 Messi          ×2      │ │
│ │ #045 Vinicius Jr.   ×1      │ │
│ └─────────────────────────────┘ │
│ ┌─ Você oferece (entrega) ────┐ │
│ │ #012 Neymar         ×3      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ── Conversa ──                  │
│ ┌─ Pedro · 14:32 ─────────┐    │
│ │ pode ser sábado de tarde│    │
│ └─────────────────────────┘    │
│         ┌─ Você · 14:35 ─────┐ │
│         │ fechado, te chamo  │ │
│         └────────────────────┘ │
│                                 │
│ [escreva uma mensagem...]  [→]  │
│                                 │
│ ─ Ações ────────────────────    │
│ [Aceitar]  [Recusar]            │ ← se dono e pending
│ [Cancelar proposta]             │ ← se proponente e pending
└─────────────────────────────────┘
```

- Rótulos das seções mudam por POV:
  - Dono lendo: "Ele quer (você dá)" / "Ele oferece (você recebe)".
  - Proponente lendo: "Você quer (recebe)" / "Você oferece (entrega)".
- Server component (`page.tsx`) chama `mark_proposal_seen` antes de renderizar.
- Status banner exibido quando `status !== 'pending'`:
  - Aceita: "✅ Aceita em {data} — combinem o encontro!"
  - Recusada: "❌ Recusada em {data}."
  - Cancelada: "Cancelada pelo proponente em {data}."
- Ações: confirmar com `AlertDialog` (shadcn) → server action → `router.refresh()`.
- Chat:
  - Server carrega últimas 50 mensagens. Sem paginação no MVP.
  - Sem real-time inicialmente. Refresh manual.
  - Input textarea: `Enter` envia, `Shift+Enter` quebra linha.
  - Server action `postMessageAction` → RPC `post_proposal_message` → `router.refresh()`.
- Avatar do outro lado: mesmo padrão visual de `trade-detail-drawer.tsx`.

### Nav-bar — badge

Em `components/nav-bar.tsx`, adicionar item "Propostas" com badge de não-vistas:

```
Trocas  |  Propostas •3  |  Coleção  |  ...
```

Count vem de `count_unseen_proposals` (RPC) — soma recebidas com nova atividade + enviadas com nova atividade (decisão/mensagem do dono). Como invocar:
- Se nav-bar é server component → chamar direto no render.
- Se é client component → carregar no layout `app/(authenticated)/layout.tsx` (server) e passar via prop.

## Notificações e email

### Eventos que disparam email

| Evento | Destinatário | Quando |
|--------|--------------|--------|
| `proposal_created` | Dono | Após `create_proposal` |
| `proposal_decided` (accept) | Proponente | Após `decide_proposal(accept=true)` |
| `proposal_decided` (reject) | Proponente | Após `decide_proposal(accept=false)` |
| `proposal_cancelled` | Dono | Após `cancel_proposal` |
| `proposal_message` | Outro lado | Após `post_proposal_message`, com debounce |

### Debounce de email de chat

- Máximo 1 email por proposta + destinatário **a cada 15 minutos**.
- Skip se destinatário já viu desde a última mensagem (`*_seen_at >= last_activity_at`).
- Implementação: server action consulta `email_log` antes de enviar:
  ```sql
  SELECT MAX(sent_at) FROM email_log
  WHERE proposal_id = $1
    AND recipient_email = $2
    AND kind = 'proposal_message';
  ```
  Se `< 15min` atrás, skip.

### Fire-and-forget

Mesmo padrão do fluxo de trocas: server action chama RPC primeiro. Email é disparado depois e falha não desfaz a proposta. Cada tentativa loga em `email_log` (`sent`/`failed`).

### Templates (rascunho — refinar antes do go-live)

**`proposal-created.tsx`** (pro dono):
```
Assunto: {Proponente} fez uma proposta de troca

Oi {NomeDono},

{Proponente} quer trocar figurinhas com você.

Ele quer (de você):
  • #200 Messi × 2
  • #045 Vinicius Jr. × 1

Ele oferece:
  • #012 Neymar × 3

[Ver proposta no app]
```

**`proposal-decided.tsx`** (pro proponente):
```
Assunto: {Dono} {aceitou|recusou} sua proposta

Oi {NomeProp},

{Dono} {aceitou | recusou} sua proposta de troca.

{Se aceita: Combinem o encontro pelo chat dentro do app. Quando se encontrarem, registrem a troca em /trades/new pra atualizar suas coleções.}

{Se recusada: Pode tentar com outra combinação ou propor pra outros usuários.}

[Abrir conversa]
```

**`proposal-cancelled.tsx`** (pro dono):
```
Assunto: {Proponente} cancelou a proposta

A proposta de {data} foi cancelada pelo proponente. Sem ação necessária.
```

**`proposal-message.tsx`** (pra qualquer lado):
```
Assunto: Nova mensagem na proposta com {Outro}

{Outro} respondeu na conversa:

> {trecho de até 200 caracteres da última mensagem}

[Continuar conversa]
```

## Estrutura de arquivos

```
app/(authenticated)/proposals/
├── page.tsx                          # server: lista por aba, infinite scroll setup
├── proposals-list.tsx                # client: lista + paginação
├── proposal-card.tsx                 # card item da lista
├── [id]/
│   ├── page.tsx                      # server: fetch + mark_seen
│   ├── proposal-detail.tsx           # client: items + ações
│   └── proposal-chat.tsx             # client: mensagens + input
├── new/
│   ├── page.tsx                      # client: orquestra os pickers
│   ├── proposal-builder.tsx
│   └── proposal-sticker-picker.tsx   # reusa lógica de /trades/new/sticker-picker
└── lib/
    ├── create-proposal-action.ts
    ├── decide-proposal-action.ts
    ├── cancel-proposal-action.ts
    ├── post-message-action.ts
    └── mark-seen-action.ts

lib/email/
├── send-proposal-created.ts
├── send-proposal-decided.ts
├── send-proposal-cancelled.ts
├── send-proposal-message.ts
└── templates/
    ├── proposal-created.tsx
    ├── proposal-decided.tsx
    ├── proposal-cancelled.tsx
    └── proposal-message.tsx

components/
└── nav-bar.tsx                       # editar: adicionar link "Propostas" com badge

app/p/[username]/
├── profile-stickers.tsx              # editar: botão vira <Link>; relaxar checagem de habilitação
└── trade-proposal-dialog.tsx         # REMOVER
```

## Edge cases

| Caso | Tratamento |
|------|-----------|
| Visitante tenta propor pra si mesmo | RPC `create_proposal` rejeita. UI já esconde botão (`isOwnProfile`). |
| Dono apaga conta entre criar e decidir | `ON DELETE CASCADE` apaga proposta + itens + mensagens. Sem alerta no MVP. |
| Proponente apaga conta enquanto pendente | Mesmo cascade. Dono não vê alerta. |
| Proposta sem `want` ou sem `offer` | RPC bloqueia. UI desabilita "Enviar". |
| Mesma figurinha 2x num lado | `UNIQUE (proposal, sticker, direction)` bloqueia. UI agrupa por sticker e usa quantidade. |
| `want.quantity` > repetidas do dono no momento do envio | Server não valida. Dono vê e recusa, ou negocia no chat. |
| `offer.quantity` de figurinha que visitante não tem | Sinalizado visualmente, não bloqueado. Confiança social. |
| Dono aceita 2 propostas conflitantes pelas mesmas figurinhas | Permitido. Resolvido offline. Coleção só muda quando alguém registra em `/trades/new`. |
| Decidir proposta já decidida (race) | RPC checa `status = 'pending'`. Segunda chamada erra. UI mostra toast. |
| Chat depois de status terminal | Permitido — comportamento natural ("obrigado!", "valeu"). |
| Mensagem vazia / só whitespace | CHECK bloqueia. UI valida antes de enviar. |
| Mensagem > 2000 chars | CHECK bloqueia. UI mostra contador a partir de 1800. |
| Spam de propostas | MVP sem rate limit. Adicionar "max 3 pendentes mesmo par proponente/dono" se virar problema. |
| Email com bounce | Logado em `email_log` (`status='failed'`). Proposta permanece. Sem retry automático. |
| `?to=` aponta pra perfil inexistente | `notFound()` em `/proposals/new/page.tsx`. |
| Sessão expirada no submit | Server action retorna erro; UI redireciona pra `/login?redirect_to=/proposals/new?to=...`. |
| Picker abriu, dono mudou coleção depois | Aceitável — picker reflete snapshot no momento da query. Recusa via UI. |

## Pressupostos a verificar antes da implementação

1. **`get_public_stickers` aceita os modos do picker.** Ler `022_public_stickers_rpc.sql` e variantes (`023`, `026`, `038`) pra confirmar:
   - `p_user_id=owner, p_tab='duplicates'` **sem** `p_viewer_id` retorna repetidas do dono com `duplicate_count`.
   - `p_user_id=owner, p_tab='missing'` **sem** `p_viewer_id` retorna faltantes do dono.
   - Se a função assume "dono é o próprio perfil público" e algo travar, criar variante interna (`get_owner_duplicates_for_proposal`, `get_owner_missing_for_proposal`).
2. **Trigger de criação de profile** (em `001_create_profiles.sql`) não bloqueia INSERT de proposta de usuário recém-cadastrado. Confirmar que o profile já existe antes de `create_proposal` ser chamado.
3. **`components/nav-bar.tsx`:** server ou client component? Define como passar a contagem do badge.
4. **`RESEND_API_KEY`** configurado (já assumido no spec anterior).
5. **`docs/superpowers/specs/2026-05-16-trade-flow-design.md` declarou `email_log.kind`** com `CHECK IN ('trade_notification', 'lead_invite')`. Migration `046` precisa fazer `DROP CONSTRAINT` antes do `ADD CONSTRAINT` ampliado.

## Plano de migração

Ordem:

1. `041_create_proposals.sql`
2. `042_create_proposal_items.sql`
3. `043_create_proposal_messages.sql`
4. `044_proposal_rpcs.sql` — `create_proposal`, `decide_proposal`, `cancel_proposal`, `post_proposal_message`, `mark_proposal_seen`, `count_unseen_proposals`
5. `045_proposal_rls.sql` — policies de SELECT
6. `046_email_log_proposal_support.sql` — `proposal_id` + `kind` expandido

Sem dados a migrar — feature totalmente nova.

## Testes

Sem testes automatizados nesse release (segue convenção do projeto). Smoke manual:

1. Criar proposta como visitante recém-cadastrado (coleção vazia) — picker "Ofereço" mostra todas faltantes do dono com "Falta" visível; consegue submeter.
2. Dono aceita pendente — proponente recebe email + badge in-app.
3. Dono recusa — mesmo fluxo, email com texto adequado.
4. Proponente cancela — dono recebe email; lista atualiza status.
5. Chat funcionando nos 4 estados (pending, accepted, rejected, cancelled).
6. Email de chat: 2 mensagens em 1 minuto enviam 1 email só; depois de 15min sem ver, envia de novo.
7. Race: 2 tabs do dono tentando aceitar simultaneamente — uma erra com "not pending".
8. Tentar auto-propor: RPC rejeita; UI nem mostra botão (visitante = dono).
9. Badge da nav-bar zera depois de abrir a lista de recebidas.
10. `mark_proposal_seen` ao abrir o detalhe — bolinha some.
