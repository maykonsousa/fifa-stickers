# Fluxo de trocas — registro presencial com captura de leads

**Data:** 2026-05-16
**Rota afetada:** `/trades` (substitui `UnderConstruction`), `/trades/new`

## Contexto

Hoje `/trades` retorna o componente `UnderConstruction`. Existe um `trades-view.tsx` de "matchmaking" pronto mas não usado, e uma tabela `trade_messages` minimalista sem state machine. Não há fluxo real de troca: o usuário não consegue registrar uma transação nem ver histórico.

O novo modelo descarta a ideia de "marketplace online com proposta/aceite" e adota um fluxo **ponto-de-venda presencial**: o usuário registra a troca no momento do encontro físico. O outro lado pode ser membro do app ou um lead capturado na hora, com convite por email pra cadastro posterior. Cada troca atualiza ambas as coleções automaticamente.

## Requisitos

- Registrar trocas como **eventos atômicos** no momento do encontro físico.
- Counterparty pode ser **membro do app** (achado por email) ou **lead** (criado inline com email/nome).
- Salvar a troca **atualiza ambas as coleções automaticamente** (`user_stickers` recebe inserts/deletes em batch).
- UI da seleção de figurinhas em **lançamentos sequenciais** ("essa por essa, agora essa por aquela"), achatados em direção/quantidade no banco.
- Lead recebe **email de convite** apenas na primeira troca (idempotente por `email`); na conversão para usuário, perfil já nasce pré-populado e figurinhas recebidas são creditadas.
- Membro counterparty recebe **email + indicador in-app** de troca não vista. Sem reverter formal — confiança social.
- Mobile-first. Tudo otimizado pro caso "celular numa mão, figurinhas na outra".
- Sem testes automatizados nesse release.

Fora do escopo desta rodada:
- Doação e venda (schema **não** prepara `kind`; entram em release futuro se demanda aparecer).
- Página de detalhe de troca (`/trades/[id]`). Lista mostra contagens; quem quiser detalhe vai pra v2.
- Matchmaking de quem-tem-o-que-eu-preciso (a view antiga `trades-view.tsx` é removida; pode voltar em outra rota se necessário).
- `trade_messages` (tabela atual é descartada).
- Notificações in-app além do badge de não-visto.

## Modelo de dados

### Novas tabelas

```sql
-- 029_create_leads.sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  whatsapp TEXT,
  invited_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email_invite_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_invited_by ON leads(invited_by_user_id);
CREATE INDEX idx_leads_converted ON leads(converted_to_profile_id)
  WHERE converted_to_profile_id IS NOT NULL;
```

```sql
-- 030_create_trades.sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  counterparty_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  counterparty_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  counterparty_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trades_one_counterparty CHECK (
    (counterparty_user_id IS NOT NULL AND counterparty_lead_id IS NULL) OR
    (counterparty_user_id IS NULL AND counterparty_lead_id IS NOT NULL)
  ),
  CONSTRAINT trades_no_self_trade CHECK (
    initiator_user_id IS NULL OR counterparty_user_id IS NULL
    OR initiator_user_id <> counterparty_user_id
  )
);

CREATE INDEX idx_trades_initiator ON trades(initiator_user_id, created_at DESC)
  WHERE initiator_user_id IS NOT NULL;
CREATE INDEX idx_trades_counterparty_user ON trades(counterparty_user_id, created_at DESC)
  WHERE counterparty_user_id IS NOT NULL;
CREATE INDEX idx_trades_counterparty_lead ON trades(counterparty_lead_id)
  WHERE counterparty_lead_id IS NOT NULL;
CREATE INDEX idx_trades_unread ON trades(counterparty_user_id)
  WHERE counterparty_user_id IS NOT NULL AND counterparty_seen_at IS NULL;
```

```sql
-- 031_create_trade_items.sql
CREATE TABLE trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  direction TEXT NOT NULL CHECK (direction IN ('given', 'received')),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);
```

```sql
-- 032_create_email_log.sql
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('trade_notification', 'lead_invite')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_log_trade ON email_log(trade_id);
CREATE INDEX idx_email_log_recipient ON email_log(recipient_email, sent_at DESC);
```

### Tabelas removidas

```sql
-- 033_drop_trade_messages.sql
DROP TABLE trade_messages;
```

Também remover `app/(authenticated)/trades/trades-view.tsx` (matchmaking antigo que nunca foi conectado). Pode voltar como feature futura em outra rota se necessário.

### Decisões de schema

| Decisão | Razão |
|---------|-------|
| `quantity` em `trade_items` (vs N rows) | Storage barato, queries legíveis. RPC explode em N inserts/deletes em `user_stickers`. |
| `leads.name NOT NULL` | Requisito de UX — email + nome obrigatório no form do lead. |
| `leads.email UNIQUE` + `lower(trim())` no insert | Previne duplicatas. RPC `find_or_create_lead` é idempotente. |
| `trades.initiator ON DELETE SET NULL` | Preserva histórico do counterparty mesmo se iniciador apagar conta. |
| `trades_no_self_trade` tolerante a NULL | Após SET NULL no iniciador, CHECK ainda passa (NULL operandos retornam NULL → CHECK não falha). |
| Sem `updated_at` em `trades` | Eventos imutáveis. Rollback compensatório se precisar (não escopo). |
| `counterparty_seen_at` em `trades` (vs tabela de notificações) | MVP enxuto. Generaliza pra `notifications` se aparecerem outros tipos. |

## RPCs e triggers

Todas as escritas passam por funções `SECURITY DEFINER` — RLS bloqueia mutations diretas no client.

### `create_trade`

```sql
CREATE FUNCTION create_trade(
  p_counterparty_user_id UUID,
  p_counterparty_lead_id UUID,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_initiator_id UUID := auth.uid();
  v_trade_id UUID;
  v_item JSONB;
  v_given_count INT;
  v_received_count INT;
BEGIN
  IF v_initiator_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF (p_counterparty_user_id IS NULL) = (p_counterparty_lead_id IS NULL) THEN
    RAISE EXCEPTION 'must provide exactly one of counterparty_user_id or counterparty_lead_id';
  END IF;

  IF p_counterparty_user_id = v_initiator_id THEN
    RAISE EXCEPTION 'cannot trade with yourself';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'direction' = 'given'),
    COUNT(*) FILTER (WHERE item->>'direction' = 'received')
  INTO v_given_count, v_received_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_given_count = 0 OR v_received_count = 0 THEN
    RAISE EXCEPTION 'trade must have at least one given and one received item';
  END IF;

  INSERT INTO trades (initiator_user_id, counterparty_user_id, counterparty_lead_id)
  VALUES (v_initiator_id, p_counterparty_user_id, p_counterparty_lead_id)
  RETURNING id INTO v_trade_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO trade_items (trade_id, sticker_id, direction, quantity)
    VALUES (
      v_trade_id,
      (v_item->>'sticker_id')::INT,
      v_item->>'direction',
      (v_item->>'quantity')::INT
    );

    IF v_item->>'direction' = 'given' THEN
      PERFORM remove_user_stickers(v_initiator_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      IF p_counterparty_user_id IS NOT NULL THEN
        PERFORM add_user_stickers(p_counterparty_user_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      END IF;
    ELSE
      PERFORM add_user_stickers(v_initiator_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      IF p_counterparty_user_id IS NOT NULL THEN
        PERFORM remove_user_stickers(p_counterparty_user_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      END IF;
    END IF;
  END LOOP;

  RETURN v_trade_id;
END;
$$;
```

### `add_user_stickers` / `remove_user_stickers`

```sql
CREATE FUNCTION add_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_stickers (user_id, sticker_id)
  SELECT p_user_id, p_sticker_id
  FROM generate_series(1, p_quantity);
END;
$$;

CREATE FUNCTION remove_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_stickers
  WHERE id IN (
    SELECT id FROM user_stickers
    WHERE user_id = p_user_id AND sticker_id = p_sticker_id
    LIMIT p_quantity
  );
END;
$$;
```

`remove_user_stickers` é **tolerante**: se o usuário tem menos cópias que `p_quantity`, apaga o que tem. Reflete a regra "realidade física é a verdade" (o iniciador viu a figurinha na mesa do counterparty mesmo que o app dele estivesse desatualizado).

### `find_or_create_lead`

```sql
CREATE FUNCTION find_or_create_lead(
  p_email TEXT,
  p_name TEXT,
  p_city TEXT,
  p_state TEXT,
  p_whatsapp TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_lead_id UUID;
  v_normalized_email TEXT := lower(trim(p_email));
BEGIN
  SELECT id INTO v_lead_id FROM leads WHERE email = v_normalized_email;
  IF v_lead_id IS NOT NULL THEN
    RETURN v_lead_id;
  END IF;

  INSERT INTO leads (email, name, city, state, whatsapp, invited_by_user_id)
  VALUES (v_normalized_email, p_name, p_city, p_state, p_whatsapp, auth.uid())
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;
```

Idempotente: dois iniciadores tentando criar lead com mesmo email recebem o ID existente. `invited_by_user_id` permanece o do primeiro.

### `find_user_by_email`

```sql
CREATE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;
```

Usada pela busca no Step 1 do wizard. Retorna vazio se não houver match.

### Trigger `handle_new_user_lead_conversion`

```sql
CREATE FUNCTION handle_new_user_lead_conversion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_item trade_items%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM leads
  WHERE email = lower(trim(NEW.email)) AND converted_to_profile_id IS NULL;

  IF v_lead.id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE profiles
  SET
    display_name = COALESCE(display_name, v_lead.name),
    city = COALESCE(city, v_lead.city),
    state = COALESCE(state, v_lead.state)
  WHERE id = NEW.id;

  UPDATE trades
  SET counterparty_user_id = NEW.id, counterparty_lead_id = NULL
  WHERE counterparty_lead_id = v_lead.id;

  FOR v_item IN
    SELECT ti.* FROM trade_items ti
    JOIN trades t ON t.id = ti.trade_id
    WHERE t.counterparty_user_id = NEW.id
      AND ti.direction = 'given'
  LOOP
    PERFORM add_user_stickers(NEW.id, v_item.sticker_id, v_item.quantity);
  END LOOP;

  UPDATE leads SET converted_to_profile_id = NEW.id WHERE id = v_lead.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_lead_conversion
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_lead_conversion();
```

**Pressuposto a verificar antes de implementar**: a migration `001_create_profiles.sql` já tem um trigger em `auth.users` que cria o `profiles` row. O novo trigger precisa rodar **depois** dele — verificar ordem de execução de triggers em `auth.users` ou consolidar tudo num único trigger.

## RLS

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- leads: só quem convidou enxerga
CREATE POLICY "leads_select_own" ON leads FOR SELECT TO authenticated
  USING (auth.uid() = invited_by_user_id);

-- trades: iniciador ou counterparty membro
CREATE POLICY "trades_select_participant" ON trades FOR SELECT TO authenticated
  USING (auth.uid() = initiator_user_id OR auth.uid() = counterparty_user_id);

-- trade_items: visíveis via trade
CREATE POLICY "trade_items_select_via_trade" ON trade_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trades t WHERE t.id = trade_items.trade_id
      AND (t.initiator_user_id = auth.uid() OR t.counterparty_user_id = auth.uid())
  ));

-- email_log: ninguém lê pelo client (só backend service role)
-- Sem policy de SELECT pra authenticated — bloqueia tudo do client.
```

UPDATE em `trades.counterparty_seen_at` é feito via RPC `mark_all_trades_as_seen()` (sem parâmetros, SECURITY DEFINER), que faz `UPDATE trades SET counterparty_seen_at = now() WHERE counterparty_user_id = auth.uid() AND counterparty_seen_at IS NULL`. Chamada da server action que carrega `/trades`.

## UI

Tudo mobile-first. Wizard como rota dedicada (`/trades/new`), não modal — full-screen no mobile encaixa naturalmente e back button do browser/celular funciona pra voltar etapas.

### `/trades` — Lista + entrada

```
┌─────────────────────────────────┐
│ Trocas               [+ Nova]   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 👤 Pedro Silva       •      │ │ ← bolinha = não vista ainda
│ │ pedro@gmail.com             │ │
│ │ Dei 3 · Recebi 2            │ │
│ │ 16 mai 2026, 14:32          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ⏳ Ana Costa (lead)         │ │
│ │ ana@gmail.com               │ │
│ │ Dei 2 · Recebi 1            │ │
│ │ 12 mai 2026, 10:15          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- Lista cronológica descendente, infinite scroll (padrão já em uso no projeto).
- Item exibe: avatar/inicial, nome, email, contagens "Dei N · Recebi M", data/hora.
- Badge "lead" pendurado quando counterparty ainda não converteu.
- Indicador de não-visto: para trocas **onde o usuário é counterparty membro** e `counterparty_seen_at IS NULL`.
- Empty state: "Nenhuma troca ainda. Comece a registrar suas trocas no próximo encontro."
- Ao abrir a página, server action seta `counterparty_seen_at = now()` em todas as trocas onde o usuário é counterparty membro e ainda não viu.
- Card **não é navegável** (sem página de detalhe nesse release).

### `/trades/new` — Wizard (3 passos)

**Step 1: Counterparty**

```
┌─────────────────────────────────┐
│ ← Nova troca           1/3      │
│                                 │
│ Com quem você trocou?           │
│                                 │
│ 🔍 [ email@exemplo.com         ]│
│                                 │
│ → Achou membro:                 │
│   ┌─ Pedro Silva ──────────┐    │
│   │ pedro@gmail.com        │    │
│   └─ [Continuar →] ────────┘    │
│                                 │
│ → Não achou:                    │
│   "Esse email não tá cadastrado.│
│    Vamos criar um lead:"        │
│   Nome *      [             ]   │
│   Cidade      [             ]   │
│   Estado      [▾            ]   │
│   WhatsApp    [             ]   │
│   [Continuar →]                 │
└─────────────────────────────────┘
```

- Debounce 400ms no input. Chama RPC `find_user_by_email`.
- Lead é criado **só no submit final do wizard** (Step 3). Form state do lead fica no client.
- Validações: email formato válido, nome obrigatório quando criando lead.

**Step 2: Lançamentos**

```
┌─────────────────────────────────┐
│ ← Nova troca           2/3      │
│ Com: Pedro Silva                │
│                                 │
│ [+ Adicionar lançamento]        │
│                                 │
│ ┌─ Lançamento #1 ──── [×] ──┐   │
│ │  Dei                       │   │
│ │   #045 Vinicius Jr.  ×3    │   │
│ │   [+ figurinha]            │   │
│ │  Recebi                    │   │
│ │   #200 Messi         ×1    │   │
│ │   [+ figurinha]            │   │
│ └────────────────────────────┘   │
│                                  │
│ ┌─ Lançamento #2 ──── [×] ──┐   │
│ │  ...                       │   │
│ └────────────────────────────┘   │
│                                  │
│        [Continuar →]             │
└─────────────────────────────────┘
```

- Cada lançamento é um card com duas seções: "Dei" e "Recebi".
- Cada seção tem `[+ figurinha]` que abre o picker (bottom sheet).
- Picker:
  - Pra lado "Dei" do iniciador: sugere repetidas do iniciador no topo, depois catálogo completo.
  - Pra lado "Recebi" (saindo da coleção do outro): sugere repetidas do counterparty se ele for membro; lead = só catálogo.
  - Busca textual usa o FTS existente (`015_search_stickers.sql` + `018_unaccent_search.sql`).
- Quantidade: stepper +/- com fallback de input numérico ao lado.
- Lançamentos podem ser removidos (`×` no header do card).
- Validação ao avançar: trade deve ter ≥1 item dado E ≥1 item recebido **considerando todos os lançamentos somados**. Lançamento individual pode ser desbalanceado (ex.: o usuário tá rascunhando).

**Step 3: Revisão e confirmação**

```
┌─────────────────────────────────┐
│ ← Nova troca           3/3      │
│                                 │
│ Confira antes de confirmar      │
│                                 │
│ Com: Pedro Silva                │
│ pedro@gmail.com                 │
│                                 │
│ Você deu (4 figurinhas):        │
│ #045 ×3 · #012 ×1               │
│                                 │
│ Você recebeu (2 figurinhas):    │
│ #200 ×2                         │
│                                 │
│ ⚠ Pedro vai ser notificado.     │
│   Sua coleção será atualizada.  │
│                                 │
│      [Confirmar troca]          │
└─────────────────────────────────┘
```

- Lançamentos são **achatados** aqui: itens com mesmo `sticker_id` + `direction` em lançamentos diferentes somam quantidades.
- Texto contextual sobre o counterparty:
  - Membro: "{Nome} vai ser notificado. Sua coleção será atualizada."
  - Lead: "Vamos enviar um email pra {Nome} convidando ela pro app. Sua coleção será atualizada."
- Confirmar → server action → `find_or_create_lead` (se lead) + `create_trade` + envio de email → toast de sucesso → redirect pra `/trades`.

### Estrutura de arquivos sugerida

```
app/(authenticated)/trades/
├── page.tsx                      # server: busca histórico + marca como visto
├── trades-list.tsx               # client: lista + infinite scroll
├── new/
│   ├── page.tsx                  # wizard wrapper (client component coordenando os steps)
│   ├── step-counterparty.tsx
│   ├── step-items.tsx
│   ├── step-review.tsx
│   └── sticker-picker.tsx
└── lib/
    ├── create-trade-action.ts    # server action: orquestra RPC + email
    ├── search-counterparty.ts    # server action: find_user_by_email
    └── mark-trades-seen-action.ts

lib/email/
├── send-trade-notification.ts    # Resend wrapper
├── send-lead-invite.ts           # Resend wrapper
└── templates/
    ├── trade-notification.tsx    # React Email template
    └── lead-invite.tsx
```

Remover:
- `app/(authenticated)/trades/trades-view.tsx` (matchmaking não conectado)

## Notificações e email

### Email pro counterparty membro

- Disparado pela server action `createTradeAction` **após** `create_trade` retornar sucesso.
- Fire-and-forget: erro no Resend não desfaz a troca; loga em `email_log` com `status='failed'`.
- Conteúdo preliminar (refinar antes do go-live):

```
Assunto: {Iniciador} registrou uma troca com você no FaltaUma

Oi {Nome},

{Iniciador} registrou uma troca com você em {data, hora}.

Você recebeu (N figurinhas):
• #045 Vinicius Jr. — 3 cópias

Você deu (M figurinhas):
• #200 Messi — 1 cópia

Sua coleção foi atualizada automaticamente.

Se discorda da troca, fale com {Iniciador} — você pode editar sua coleção manualmente em {link}.

[Ver no app]
```

### Email pro lead (convite)

- Disparado **apenas na primeira troca** com aquele email — controlado por `leads.email_invite_sent_at`.
- Trocas subsequentes com o mesmo lead não disparam novo email.
- CTA: "Criar conta com Google" → `/login?lead_invite={lead_id}` que aciona o fluxo OAuth com hint do email.

Conteúdo preliminar:

```
Assunto: Você fez uma troca de figurinhas com {Iniciador} — bem-vindo ao FaltaUma!

Oi {Nome},

{Iniciador} registrou uma troca de figurinhas com você no FaltaUma, um app
gratuito pra controlar seu álbum da Copa.

Crie sua conta e suas figurinhas já vão aparecer na sua coleção:
• Você recebeu {N} figurinhas: {lista}
• Acompanhar quais faltam, criar amizades pra trocar, etc.

[Criar conta com Google]

(Conta vinculada a {email} — depois você pode trocar.)
```

### `email_log`

Cada tentativa de envio insere uma linha:

```typescript
await supabase.from("email_log").insert({
  trade_id: tradeId,
  recipient_email: recipient,
  kind: "trade_notification",
  status: error ? "failed" : "sent",
  error: error?.message ?? null,
});
```

Acesso pelo client é bloqueado por RLS (sem policy). Consulta direta via SQL/admin quando precisar debugar.

## Edge cases

| Caso | Tratamento |
|------|-----------|
| Qtd declarada > coleção disponível | Picker da própria coleção limita ao disponível. Adicionando do catálogo livre, sem limite. RPC `remove_user_stickers` apaga até N (tolerante). |
| Counterparty deleta conta entre Step 1 e Step 3 | FK violation no INSERT do `trades`. Catch → mostrar "Esse usuário não existe mais" e voltar pro Step 1. |
| Lead criado mas wizard abandonado | Não acontece — lead é criado **só no submit final** (Step 3 → server action). |
| Trocas simultâneas no mesmo counterparty | Postgres serializa via row locks. RPC tolerante a "menos cópias do que esperado" cobre o caso. |
| Email do lead com case mismatch | `lower(trim())` normaliza no `find_or_create_lead` e no trigger de conversão. UNIQUE no banco enforça. |
| Lead se cadastra com email diferente | Trigger não encontra match por email → conversão não acontece. Lead fica órfão. Aceitável pra MVP. |
| Iniciador = counterparty | CHECK constraint + validação no RPC. |
| Sticker_id inválido | Picker só mostra do catálogo. FK garante. Cliente malicioso: FK violation, erro claro. |
| Resend falha | Loga em `email_log` com `status='failed'`. Troca permanece. Pode reenviar manualmente. |

## Plano de migração

Ordem das migrations:

1. `029_create_leads.sql`
2. `030_create_trades.sql`
3. `031_create_trade_items.sql`
4. `032_create_email_log.sql`
5. `033_drop_trade_messages.sql`
6. `034_trade_rpcs.sql` — `create_trade`, `add_user_stickers`, `remove_user_stickers`, `find_or_create_lead`, `find_user_by_email`, `mark_all_trades_as_seen`
7. `035_lead_conversion_trigger.sql` — `handle_new_user_lead_conversion` + trigger em `auth.users`
8. `036_trades_rls_policies.sql` — RLS habilitado + policies de SELECT

Sem dados a migrar — tudo é nova feature.

## Testes

Sem testes automatizados nesse release (projeto não tem suíte de testes hoje). Smoke manual:

1. Registrar troca com membro: ambas as coleções atualizam.
2. Registrar troca com lead novo: lead criado, email enviado, `email_log` populado.
3. Registrar segunda troca com mesmo lead: lead reusado, email NÃO reenviado.
4. Lead se cadastra via Google: trigger migra trades, credita figurinhas recebidas, perfil pré-populado.
5. Counterparty membro abre `/trades`: badges de não-visto somem.
6. Tentar auto-trade: RPC retorna erro claro.
7. Tentar trade sem lados balanceados: validação no Step 2 + RPC bloqueia.

## Pressupostos a verificar antes da implementação

1. `001_create_profiles.sql` cria `profiles` via trigger em `auth.users` INSERT — confirmar e definir ordem de execução do novo trigger de conversão (deve rodar depois).
2. `lib/supabase/client.ts` e `lib/supabase/server.ts` já existem como exports padrão do projeto.
3. Variáveis de ambiente da Resend (`RESEND_API_KEY`) já configuradas.
4. Componente `UnderConstruction` em uso no `page.tsx` atual será substituído — confirmar que mais nenhuma rota depende dele com layout esquisito.
