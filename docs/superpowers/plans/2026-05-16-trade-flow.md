# Trade Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário registre trocas presenciais de figurinhas (com membros ou leads não-cadastrados), atualizando coleções automaticamente, enviando emails de notificação/convite, e convertendo leads em usuários quando se cadastram via Google OAuth.

**Architecture:** Schema novo (`leads`, `trades`, `trade_items`, `email_log`) + RPCs `SECURITY DEFINER` pra todas as escritas + trigger em `auth.users` pra conversão automática de leads. UI consiste em página `/trades` (lista + entrada) e wizard `/trades/new` (3 passos: counterparty → lançamentos → revisão). Resend pra emails transacionais.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Supabase (Postgres + SSR client + Auth), Resend, Tailwind 4, shadcn/ui (cmdk, sonner, Popover).

**Sem testes automatizados:** O projeto não tem suíte de testes. Verificação acontece via `npm run build` (type check), `npm run dev` (smoke manual) e queries SQL diretas no banco após cada migration.

**Spec:** `docs/superpowers/specs/2026-05-16-trade-flow-design.md`

---

## File Structure

### Migrations (criar)
- `supabase/migrations/029_create_leads.sql`
- `supabase/migrations/030_create_trades.sql`
- `supabase/migrations/031_create_trade_items.sql`
- `supabase/migrations/032_create_email_log.sql`
- `supabase/migrations/033_drop_trade_messages.sql`
- `supabase/migrations/034_trade_rpcs.sql`
- `supabase/migrations/035_lead_conversion_trigger.sql`
- `supabase/migrations/036_trades_rls_policies.sql`

### Email (criar)
- `lib/email/resend.ts` — instância singleton
- `lib/email/send-trade-notification.ts`
- `lib/email/send-lead-invite.ts`

### Rotas e componentes (criar)
- `app/(authenticated)/trades/lib/types.ts` — tipos compartilhados
- `app/(authenticated)/trades/lib/create-trade-action.ts`
- `app/(authenticated)/trades/lib/search-counterparty.ts`
- `app/(authenticated)/trades/lib/mark-trades-seen-action.ts`
- `app/(authenticated)/trades/trades-list.tsx`
- `app/(authenticated)/trades/new/page.tsx`
- `app/(authenticated)/trades/new/wizard.tsx`
- `app/(authenticated)/trades/new/step-counterparty.tsx`
- `app/(authenticated)/trades/new/step-items.tsx`
- `app/(authenticated)/trades/new/step-review.tsx`
- `app/(authenticated)/trades/new/sticker-picker.tsx`

### Existentes (modificar)
- `app/(authenticated)/trades/page.tsx` — substitui `UnderConstruction` por server component real

### Existentes (remover)
- `app/(authenticated)/trades/trades-view.tsx` — view de matchmaking nunca conectada

---

## Task 1: Migration `029_create_leads.sql`

**Files:**
- Create: `supabase/migrations/029_create_leads.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
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

- [ ] **Step 2: Aplicar migration no Supabase**

Run: `npx supabase db push`
Expected: `Applying migration 029_create_leads.sql... done`

- [ ] **Step 3: Verificar no banco**

Run no SQL editor do Supabase ou via psql:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads' ORDER BY ordinal_position;
```
Expected: 9 colunas listadas (id, email, name, city, state, whatsapp, invited_by_user_id, converted_to_profile_id, email_invite_sent_at, created_at).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/029_create_leads.sql
git commit -m "feat(trades): create leads table for non-member counterparties"
```

---

## Task 2: Migration `030_create_trades.sql`

**Files:**
- Create: `supabase/migrations/030_create_trades.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
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

- [ ] **Step 2: Aplicar e verificar**

Run: `npx supabase db push`

SQL de verificação:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'trades'::regclass;
```
Expected: incluir `trades_one_counterparty` e `trades_no_self_trade`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/030_create_trades.sql
git commit -m "feat(trades): create trades table"
```

---

## Task 3: Migration `031_create_trade_items.sql`

**Files:**
- Create: `supabase/migrations/031_create_trade_items.sql`

- [ ] **Step 1: Criar o arquivo**

```sql
CREATE TABLE trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  direction TEXT NOT NULL CHECK (direction IN ('given', 'received')),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);
```

- [ ] **Step 2: Aplicar e verificar**

Run: `npx supabase db push`

SQL:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='trade_items';
```
Expected: id, trade_id, sticker_id, direction, quantity.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/031_create_trade_items.sql
git commit -m "feat(trades): create trade_items table"
```

---

## Task 4: Migration `032_create_email_log.sql`

**Files:**
- Create: `supabase/migrations/032_create_email_log.sql`

- [ ] **Step 1: Criar o arquivo**

```sql
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

- [ ] **Step 2: Aplicar**

Run: `npx supabase db push`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/032_create_email_log.sql
git commit -m "feat(trades): create email_log table for delivery audit"
```

---

## Task 5: Migration `033_drop_trade_messages.sql`

**Files:**
- Create: `supabase/migrations/033_drop_trade_messages.sql`

- [ ] **Step 1: Verificar que nada referencia `trade_messages` no código**

Run: `grep -rn "trade_messages" --include="*.ts" --include="*.tsx" .`
Expected: nenhuma linha (só na migration 007 e 008). Se houver código que use, abortar e investigar.

- [ ] **Step 2: Criar a migration**

```sql
DROP TABLE IF EXISTS trade_messages;
```

- [ ] **Step 3: Aplicar e verificar**

Run: `npx supabase db push`

SQL:
```sql
SELECT to_regclass('public.trade_messages');
```
Expected: `NULL`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/033_drop_trade_messages.sql
git commit -m "chore(trades): drop unused trade_messages table"
```

---

## Task 6: Migration `034_trade_rpcs.sql` — funções de leitura e helpers

**Files:**
- Create: `supabase/migrations/034_trade_rpcs.sql`

- [ ] **Step 1: Criar o arquivo com as RPCs auxiliares e a principal**

```sql
-- Helpers de manipulação de user_stickers
CREATE OR REPLACE FUNCTION add_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stickers (user_id, sticker_id)
  SELECT p_user_id, p_sticker_id
  FROM generate_series(1, p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION remove_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

-- Busca de usuário por email (membro existente)
CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT, email TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- find_or_create_lead (idempotente)
CREATE OR REPLACE FUNCTION find_or_create_lead(
  p_email TEXT,
  p_name TEXT,
  p_city TEXT,
  p_state TEXT,
  p_whatsapp TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

-- mark_all_trades_as_seen — chamado quando counterparty membro abre /trades
CREATE OR REPLACE FUNCTION mark_all_trades_as_seen()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE trades
  SET counterparty_seen_at = now()
  WHERE counterparty_user_id = auth.uid()
    AND counterparty_seen_at IS NULL;
END;
$$;

-- create_trade — RPC principal, atômico
CREATE OR REPLACE FUNCTION create_trade(
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

- [ ] **Step 2: Aplicar migration**

Run: `npx supabase db push`
Expected: `done` sem erros.

- [ ] **Step 3: Smoke test manual no SQL editor**

Substitua os UUIDs por dois usuários reais do banco:
```sql
-- Pegue dois user ids
SELECT id FROM profiles LIMIT 2;
-- Pegue dois sticker ids
SELECT id FROM stickers LIMIT 2;

-- Garante que o user A tem ao menos 1 cópia do sticker 1
INSERT INTO user_stickers (user_id, sticker_id) VALUES ('<user_A>', <sticker_1>);
INSERT INTO user_stickers (user_id, sticker_id) VALUES ('<user_B>', <sticker_2>);

-- Simula um trade de A pra B: A dá sticker_1, recebe sticker_2
SET LOCAL "request.jwt.claim.sub" = '<user_A>';  -- simula auth.uid()
SELECT create_trade(
  '<user_B>'::UUID,
  NULL,
  '[
    {"sticker_id": <sticker_1>, "direction": "given", "quantity": 1},
    {"sticker_id": <sticker_2>, "direction": "received", "quantity": 1}
  ]'::JSONB
);

-- Verifica resultados
SELECT * FROM trades ORDER BY created_at DESC LIMIT 1;
SELECT * FROM trade_items WHERE trade_id = (SELECT id FROM trades ORDER BY created_at DESC LIMIT 1);
SELECT COUNT(*) FROM user_stickers WHERE user_id='<user_A>' AND sticker_id=<sticker_1>;  -- 0 esperado
SELECT COUNT(*) FROM user_stickers WHERE user_id='<user_A>' AND sticker_id=<sticker_2>;  -- 1 esperado
SELECT COUNT(*) FROM user_stickers WHERE user_id='<user_B>' AND sticker_id=<sticker_1>;  -- 1 esperado
SELECT COUNT(*) FROM user_stickers WHERE user_id='<user_B>' AND sticker_id=<sticker_2>;  -- 0 esperado
```

Se algum count diverge, abrir as funções e debugar antes de seguir.

**Limpe os dados de teste** depois:
```sql
DELETE FROM trades WHERE id = (SELECT id FROM trades ORDER BY created_at DESC LIMIT 1);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/034_trade_rpcs.sql
git commit -m "feat(trades): add core RPCs for trade creation and management"
```

---

## Task 7: Migration `035_lead_conversion_trigger.sql`

**Files:**
- Create: `supabase/migrations/035_lead_conversion_trigger.sql`

- [ ] **Step 1: Criar trigger de conversão**

```sql
CREATE OR REPLACE FUNCTION handle_new_user_lead_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_item trade_items%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM leads
  WHERE email = lower(trim(NEW.email))
    AND converted_to_profile_id IS NULL;

  IF v_lead.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pré-popula profile (handle_new_user já criou; UPDATE só completa)
  UPDATE profiles
  SET
    display_name = COALESCE(NULLIF(display_name, NEW.email), v_lead.name, display_name),
    city = COALESCE(city, v_lead.city),
    state = COALESCE(state, v_lead.state),
    whatsapp = COALESCE(whatsapp, v_lead.whatsapp)
  WHERE id = NEW.id;

  -- Migra trades onde ele era counterparty lead
  UPDATE trades
  SET counterparty_user_id = NEW.id, counterparty_lead_id = NULL
  WHERE counterparty_lead_id = v_lead.id;

  -- Credita figurinhas recebidas em trocas passadas
  -- (item direction='given' por iniciador = recebido pelo lead)
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

-- Nome do trigger garante ordem alfabética DEPOIS de on_auth_user_created
CREATE TRIGGER on_auth_user_created_lead_conversion
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_lead_conversion();
```

- [ ] **Step 2: Aplicar migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar ordem dos triggers em auth.users**

SQL:
```sql
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname LIKE 'on_auth_user_created%'
ORDER BY tgname;
```
Expected:
```
on_auth_user_created
on_auth_user_created_lead_conversion
```
Se ordem invertida, renomear `on_auth_user_created_lead_conversion` pra começar com letra > "on_auth_user_created" alfabeticamente.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/035_lead_conversion_trigger.sql
git commit -m "feat(trades): trigger to convert leads on user signup"
```

---

## Task 8: Migration `036_trades_rls_policies.sql`

**Files:**
- Create: `supabase/migrations/036_trades_rls_policies.sql`

- [ ] **Step 1: Criar policies**

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

-- email_log: sem policy de SELECT = bloqueado pro authenticated
-- (acesso só via service role, fora do client)
```

- [ ] **Step 2: Aplicar migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar policies**

SQL:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('leads', 'trades', 'trade_items', 'email_log')
ORDER BY tablename, policyname;
```
Expected: 3 policies de SELECT (leads_select_own, trades_select_participant, trade_items_select_via_trade). Nada pra email_log.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/036_trades_rls_policies.sql
git commit -m "feat(trades): enable RLS and define select policies"
```

---

## Task 9: Email — instância Resend compartilhada

**Files:**
- Create: `lib/email/resend.ts`

- [ ] **Step 1: Criar singleton da Resend**

```typescript
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "FaltaUma <onboarding@resend.dev>";
```

- [ ] **Step 2: Build sanity check**

Run: `npm run build`
Expected: sem erro de tipo. Se RESEND_API_KEY estiver vazio em build, lib não reclama porque só inicializa em runtime.

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): add shared Resend client"
```

---

## Task 10: Email — notification template e wrapper

**Files:**
- Create: `lib/email/send-trade-notification.ts`

- [ ] **Step 1: Criar wrapper**

```typescript
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface TradeNotificationInput {
  tradeId: string;
  initiatorName: string;
  recipientEmail: string;
  recipientName: string;
  itemsReceived: { stickerLabel: string; quantity: number }[];
  itemsGiven: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendTradeNotification(input: TradeNotificationInput) {
  const supabase = await createClient();

  const receivedList = input.itemsReceived
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");
  const givenList = input.itemsGiven
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const html = `
    <h2>${input.initiatorName} registrou uma troca com você no FaltaUma</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.initiatorName} registrou uma troca de figurinhas com você.</p>
    <p><strong>Você recebeu:</strong></p>
    <ul>${receivedList}</ul>
    <p><strong>Você deu:</strong></p>
    <ul>${givenList}</ul>
    <p>Sua coleção foi atualizada automaticamente.</p>
    <p>Se discorda da troca, fale diretamente com ${input.initiatorName}. Você pode editar sua coleção manualmente em <a href="${input.appUrl}/collection">${input.appUrl}/collection</a>.</p>
    <p><a href="${input.appUrl}/trades">Ver no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.initiatorName} registrou uma troca com você no FaltaUma`,
    html,
  });

  await supabase.from("email_log").insert({
    trade_id: input.tradeId,
    recipient_email: input.recipientEmail,
    kind: "trade_notification",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendTradeNotification failed", error);
  }
}
```

- [ ] **Step 2: Build sanity check**

Run: `npm run build`
Expected: sem erro de tipo.

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-trade-notification.ts
git commit -m "feat(email): add trade notification sender with audit log"
```

---

## Task 11: Email — lead invite

**Files:**
- Create: `lib/email/send-lead-invite.ts`

- [ ] **Step 1: Criar wrapper**

```typescript
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface LeadInviteInput {
  tradeId: string;
  leadId: string;
  initiatorName: string;
  recipientEmail: string;
  recipientName: string;
  itemsReceived: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendLeadInvite(input: LeadInviteInput) {
  const supabase = await createClient();

  // Idempotência: se já tem email_invite_sent_at, não reenvia
  const { data: lead } = await supabase
    .from("leads")
    .select("email_invite_sent_at")
    .eq("id", input.leadId)
    .single();

  if (lead?.email_invite_sent_at) {
    return;
  }

  const receivedList = input.itemsReceived
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const signupUrl = `${input.appUrl}/login?lead_invite=${input.leadId}`;
  const totalReceived = input.itemsReceived.reduce((sum, i) => sum + i.quantity, 0);

  const html = `
    <h2>Você fez uma troca de figurinhas com ${input.initiatorName} — bem-vindo ao FaltaUma!</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.initiatorName} registrou uma troca de figurinhas com você no FaltaUma, um app gratuito pra controlar seu álbum da Copa.</p>
    <p>Crie sua conta e suas ${totalReceived} ${totalReceived === 1 ? "figurinha vai aparecer" : "figurinhas vão aparecer"} na sua coleção:</p>
    <ul>${receivedList}</ul>
    <p><a href="${signupUrl}">Criar conta com Google</a></p>
    <p><small>Conta vinculada a ${input.recipientEmail} — depois você pode trocar.</small></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `Você fez uma troca de figurinhas com ${input.initiatorName} — bem-vindo ao FaltaUma!`,
    html,
  });

  await supabase.from("email_log").insert({
    trade_id: input.tradeId,
    recipient_email: input.recipientEmail,
    kind: "lead_invite",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (!error) {
    await supabase
      .from("leads")
      .update({ email_invite_sent_at: new Date().toISOString() })
      .eq("id", input.leadId);
  } else {
    console.error("sendLeadInvite failed", error);
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-lead-invite.ts
git commit -m "feat(email): add lead invite sender with idempotency"
```

---

## Task 12: Tipos compartilhados

**Files:**
- Create: `app/(authenticated)/trades/lib/types.ts`

- [ ] **Step 1: Criar arquivo de tipos**

```typescript
export type TradeDirection = "given" | "received";

export interface TradeItem {
  sticker_id: number;
  direction: TradeDirection;
  quantity: number;
}

export interface CounterpartyMember {
  type: "member";
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

export interface CounterpartyLead {
  type: "lead";
  email: string;
  name: string;
  city?: string;
  state?: string;
  whatsapp?: string;
}

export type Counterparty = CounterpartyMember | CounterpartyLead;

export interface Swap {
  given: { sticker_id: number; quantity: number }[];
  received: { sticker_id: number; quantity: number }[];
}

export interface StickerOption {
  id: number;
  group_id: number;
  code: string;
  number: number;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

export interface TradeHistoryRow {
  id: string;
  counterparty_kind: "member" | "lead";
  counterparty_name: string;
  counterparty_email: string;
  counterparty_avatar_url: string | null;
  given_count: number;
  received_count: number;
  created_at: string;
  is_unseen: boolean;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/lib/types.ts
git commit -m "feat(trades): add shared types for trade flow"
```

---

## Task 13: Server action — busca de counterparty por email

**Files:**
- Create: `app/(authenticated)/trades/lib/search-counterparty.ts`

- [ ] **Step 1: Criar server action**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchCounterpartyByEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("find_user_by_email", { p_email: trimmed })
    .maybeSingle();

  if (error) {
    console.error("searchCounterpartyByEmail error", error);
    return null;
  }

  return data
    ? {
        id: data.id as string,
        display_name: data.display_name as string,
        avatar_url: data.avatar_url as string | null,
        email: data.email as string,
      }
    : null;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/lib/search-counterparty.ts
git commit -m "feat(trades): server action to search counterparty by email"
```

---

## Task 14: Server action — `mark_all_trades_as_seen`

**Files:**
- Create: `app/(authenticated)/trades/lib/mark-trades-seen-action.ts`

- [ ] **Step 1: Criar action**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function markAllTradesAsSeen() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_trades_as_seen");
  if (error) {
    console.error("markAllTradesAsSeen error", error);
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/lib/mark-trades-seen-action.ts
git commit -m "feat(trades): server action to mark trades as seen"
```

---

## Task 15: Server action — `create_trade` orquestrador

**Files:**
- Create: `app/(authenticated)/trades/lib/create-trade-action.ts`

- [ ] **Step 1: Criar action**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendTradeNotification } from "@/lib/email/send-trade-notification";
import { sendLeadInvite } from "@/lib/email/send-lead-invite";
import type { Counterparty, TradeItem } from "./types";

interface CreateTradeInput {
  counterparty: Counterparty;
  items: TradeItem[];
}

export async function createTradeAction(input: CreateTradeInput) {
  const supabase = await createClient();

  // Resolve counterparty (cria lead se for o caso)
  let counterpartyUserId: string | null = null;
  let counterpartyLeadId: string | null = null;
  let recipientEmail: string;
  let recipientName: string;

  if (input.counterparty.type === "member") {
    counterpartyUserId = input.counterparty.id;
    recipientEmail = input.counterparty.email;
    recipientName = input.counterparty.display_name;
  } else {
    const { data: leadId, error: leadError } = await supabase.rpc("find_or_create_lead", {
      p_email: input.counterparty.email,
      p_name: input.counterparty.name,
      p_city: input.counterparty.city ?? null,
      p_state: input.counterparty.state ?? null,
      p_whatsapp: input.counterparty.whatsapp ?? null,
    });
    if (leadError || !leadId) {
      throw new Error(leadError?.message ?? "failed to create lead");
    }
    counterpartyLeadId = leadId as string;
    recipientEmail = input.counterparty.email;
    recipientName = input.counterparty.name;
  }

  // Cria trade
  const { data: tradeId, error: tradeError } = await supabase.rpc("create_trade", {
    p_counterparty_user_id: counterpartyUserId,
    p_counterparty_lead_id: counterpartyLeadId,
    p_items: input.items,
  });
  if (tradeError || !tradeId) {
    throw new Error(tradeError?.message ?? "failed to create trade");
  }

  // Carrega dados para o email
  const { data: { user: initiator } } = await supabase.auth.getUser();
  const { data: initiatorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", initiator!.id)
    .single();

  const stickerIds = input.items.map((i) => i.sticker_id);
  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, code, title")
    .in("id", stickerIds);

  const stickerLabel = (id: number) => {
    const s = stickers?.find((x) => x.id === id);
    return s ? `#${s.code}${s.title ? ` ${s.title}` : ""}` : `#${id}`;
  };

  const itemsReceived = input.items
    .filter((i) => i.direction === "received")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));
  const itemsGiven = input.items
    .filter((i) => i.direction === "given")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com";

  // Email (fire-and-forget; falha não desfaz)
  if (counterpartyUserId) {
    await sendTradeNotification({
      tradeId: tradeId as string,
      initiatorName: initiatorProfile?.display_name ?? "Alguém",
      recipientEmail,
      recipientName,
      itemsReceived,
      itemsGiven,
      appUrl,
    });
  } else {
    await sendLeadInvite({
      tradeId: tradeId as string,
      leadId: counterpartyLeadId!,
      initiatorName: initiatorProfile?.display_name ?? "Alguém",
      recipientEmail,
      recipientName,
      itemsReceived,
      appUrl,
    });
  }

  revalidatePath("/trades");
  revalidatePath("/collection");
  return tradeId as string;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/lib/create-trade-action.ts
git commit -m "feat(trades): server action to orchestrate trade creation"
```

---

## Task 16: Página `/trades` — server component que carrega histórico

**Files:**
- Modify: `app/(authenticated)/trades/page.tsx`

- [ ] **Step 1: Substituir o conteúdo**

Substituir TUDO do arquivo por:

```typescript
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TradesList } from "./trades-list";
import { markAllTradesAsSeen } from "./lib/mark-trades-seen-action";
import type { TradeHistoryRow } from "./lib/types";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Carrega trades com counterparty info + contagens agregadas
  const { data: trades } = await supabase
    .from("trades")
    .select(`
      id,
      initiator_user_id,
      counterparty_user_id,
      counterparty_lead_id,
      counterparty_seen_at,
      created_at,
      counterparty_user:profiles!trades_counterparty_user_id_fkey ( display_name, avatar_url ),
      counterparty_lead:leads ( name, email ),
      trade_items ( direction, quantity )
    `)
    .or(`initiator_user_id.eq.${user!.id},counterparty_user_id.eq.${user!.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  // Para membros, não mostramos email na lista (privacidade + custo de query extra
  // ao auth.users). Pode virar feature depois via RPC dedicada.

  const rows: TradeHistoryRow[] = (trades ?? []).map((t) => {
    const isLead = !!t.counterparty_lead_id;
    const counterpartyUser = Array.isArray(t.counterparty_user) ? t.counterparty_user[0] : t.counterparty_user;
    const counterpartyLead = Array.isArray(t.counterparty_lead) ? t.counterparty_lead[0] : t.counterparty_lead;
    const items = Array.isArray(t.trade_items) ? t.trade_items : [];

    // Se o user atual é o iniciador, "given" é dele; se é counterparty, troca.
    const userIsInitiator = t.initiator_user_id === user!.id;
    const givenCount = items
      .filter((i: { direction: string; quantity: number }) =>
        userIsInitiator ? i.direction === "given" : i.direction === "received"
      )
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    const receivedCount = items
      .filter((i: { direction: string; quantity: number }) =>
        userIsInitiator ? i.direction === "received" : i.direction === "given"
      )
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

    const counterpartyName = isLead
      ? counterpartyLead?.name ?? "Lead"
      : counterpartyUser?.display_name ?? "Usuário";
    const counterpartyEmail = isLead ? counterpartyLead?.email ?? "" : "";

    return {
      id: t.id,
      counterparty_kind: isLead ? "lead" : "member",
      counterparty_name: counterpartyName,
      counterparty_email: counterpartyEmail,
      counterparty_avatar_url: isLead ? null : counterpartyUser?.avatar_url ?? null,
      given_count: givenCount,
      received_count: receivedCount,
      created_at: t.created_at,
      is_unseen: !userIsInitiator && !t.counterparty_seen_at,
    };
  });

  // Marca como visto após renderizar (next request mostra sem badge)
  await markAllTradesAsSeen();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trocas</h1>
          <p className="mt-1 text-sm text-gray-400">
            Histórico de trocas que você registrou.
          </p>
        </div>
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova troca
        </Link>
      </div>

      <TradesList rows={rows} />
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: type check passa. Se algum aviso sobre `Array.isArray` em related fields, é problema conhecido do PostgREST — manter o cast.

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/page.tsx
git commit -m "feat(trades): replace UnderConstruction with real trades history page"
```

---

## Task 17: Componente `trades-list.tsx`

**Files:**
- Create: `app/(authenticated)/trades/trades-list.tsx`

- [ ] **Step 1: Criar componente**

```typescript
import type { TradeHistoryRow } from "./lib/types";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradesList({ rows }: { rows: TradeHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
        <p className="text-gray-400">
          Nenhuma troca ainda. Comece a registrar suas trocas no próximo encontro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            {row.counterparty_avatar_url ? (
              <img
                src={row.counterparty_avatar_url}
                alt={row.counterparty_name}
                className="h-10 w-10 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400 flex-shrink-0">
                {row.counterparty_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">{row.counterparty_name}</p>
                {row.is_unseen && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
                {row.counterparty_kind === "lead" && (
                  <span className="text-[10px] uppercase tracking-wide bg-yellow-500/20 text-yellow-400 rounded px-1.5 py-0.5 flex-shrink-0">
                    lead
                  </span>
                )}
              </div>
              {row.counterparty_email && (
                <p className="text-xs text-gray-400 truncate">{row.counterparty_email}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                Dei {row.given_count} · Recebi {row.received_count}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 flex-shrink-0">
            {formatDateTime(row.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Smoke test**

Run: `npm run dev`
Abra `/trades` no browser logado. Expected:
- Header "Trocas" + botão "Nova troca"
- Empty state ("Nenhuma troca ainda...") se nunca trocou
- Lista de cards se já houver trades no banco

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/trades/trades-list.tsx
git commit -m "feat(trades): trades history list component"
```

---

## Task 18: Sticker picker (bottom sheet com busca)

**Files:**
- Create: `app/(authenticated)/trades/new/sticker-picker.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Search, X } from "lucide-react";
import type { StickerOption } from "../lib/types";

interface StickerPickerProps {
  trigger: React.ReactNode;
  ownerUserId: string | null;  // Se null, sem hint de coleção (catálogo puro)
  ownerLabel?: string;          // "Sua coleção" ou "Coleção de Pedro"
  onSelect: (sticker: StickerOption, quantity: number) => void;
}

export function StickerPicker({ trigger, ownerUserId, ownerLabel, onSelect }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<StickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StickerOption | null>(null);
  const [quantity, setQuantity] = useState(1);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_stickers", {
      p_user_id: ownerUserId ?? "00000000-0000-0000-0000-000000000000",
      p_keyword: q || null,
      p_group_id: null,
      p_status: null,
      p_page: 1,
      p_page_size: 30,
    });
    if (!error) {
      setResults((data ?? []) as StickerOption[]);
    }
    setLoading(false);
  }, [ownerUserId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(keyword), 250);
    return () => clearTimeout(t);
  }, [keyword, open, search]);

  function handleConfirm() {
    if (!selected) return;
    onSelect(selected, quantity);
    setOpen(false);
    setSelected(null);
    setQuantity(1);
    setKeyword("");
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Selecionar figurinha</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Buscar por número ou nome..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          {!selected ? (
            <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
              {ownerLabel && (
                <p className="text-xs uppercase tracking-wide text-gray-500 pt-2">{ownerLabel}</p>
              )}
              {loading && <p className="text-sm text-gray-400 py-4 text-center">Buscando...</p>}
              {!loading && results.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum resultado.</p>
              )}
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10 flex items-center gap-3"
                >
                  <span className="text-sm font-mono text-gray-300">#{s.code}</span>
                  <span className="text-sm text-white flex-1 truncate">{s.title ?? `Sticker ${s.number}`}</span>
                  {ownerUserId && s.owned_count > 0 && (
                    <span className="text-xs text-green-400">
                      {s.owned_count} {s.owned_count === 1 ? "cópia" : "cópias"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-gray-300">#{selected.code}</p>
                  <p className="text-base text-white truncate">{selected.title ?? `Sticker ${selected.number}`}</p>
                  {ownerUserId && (
                    <p className="text-xs text-gray-400">
                      {selected.owned_count} {selected.owned_count === 1 ? "cópia disponível" : "cópias disponíveis"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-md hover:bg-white/10 flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500">Quantidade</label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center px-2 py-2 rounded-md border border-white/10 bg-white/5 text-white"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verificar se Drawer existe no shadcn local**

Run: `ls components/ui/drawer.tsx`
Expected: arquivo existente. Se não existir, rodar `npx shadcn@latest add drawer` antes.

- [ ] **Step 3: Build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/trades/new/sticker-picker.tsx
git commit -m "feat(trades): sticker picker drawer with search and quantity"
```

---

## Task 19: Step 1 — Counterparty (busca/criação de lead)

**Files:**
- Create: `app/(authenticated)/trades/new/step-counterparty.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client";

import { useState } from "react";
import { searchCounterpartyByEmail } from "../lib/search-counterparty";
import type { Counterparty } from "../lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  initial: Counterparty | null;
  onComplete: (c: Counterparty) => void;
}

export function StepCounterparty({ initial, onComplete }: Props) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [member, setMember] = useState<Extract<Counterparty, { type: "member" }> | null>(
    initial?.type === "member" ? initial : null,
  );
  const [leadFields, setLeadFields] = useState({
    name: initial?.type === "lead" ? initial.name : "",
    city: initial?.type === "lead" ? initial.city ?? "" : "",
    state: initial?.type === "lead" ? initial.state ?? "" : "",
    whatsapp: initial?.type === "lead" ? initial.whatsapp ?? "" : "",
  });

  async function handleSearch() {
    setSearching(true);
    setSearched(false);
    setMember(null);
    const found = await searchCounterpartyByEmail(email);
    if (found) {
      setMember({
        type: "member",
        id: found.id,
        display_name: found.display_name,
        avatar_url: found.avatar_url,
        email: found.email,
      });
    }
    setSearched(true);
    setSearching(false);
  }

  function handleMemberContinue() {
    if (member) onComplete(member);
  }

  function handleLeadContinue() {
    if (!leadFields.name.trim()) return;
    onComplete({
      type: "lead",
      email: email.trim(),
      name: leadFields.name.trim(),
      city: leadFields.city.trim() || undefined,
      state: leadFields.state.trim() || undefined,
      whatsapp: leadFields.whatsapp.trim() || undefined,
    });
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Com quem você trocou?</h2>
        <p className="text-sm text-gray-400">Busque pelo email.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSearched(false);
            setMember(null);
          }}
          placeholder="email@exemplo.com"
          className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <button
          onClick={handleSearch}
          disabled={!isEmailValid || searching}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {searched && member && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.display_name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                {member.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{member.display_name}</p>
              <p className="text-xs text-gray-400">{member.email}</p>
            </div>
          </div>
          <button
            onClick={handleMemberContinue}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Continuar com {member.display_name.split(" ")[0]}
          </button>
        </div>
      )}

      {searched && !member && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-gray-300">
            Esse email não tá cadastrado. Vamos criar um lead — quando essa pessoa
            criar conta, as figurinhas vão aparecer pra ela.
          </p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Nome *</span>
              <input
                type="text"
                value={leadFields.name}
                onChange={(e) => setLeadFields({ ...leadFields, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Cidade</span>
              <input
                type="text"
                value={leadFields.city}
                onChange={(e) => setLeadFields({ ...leadFields, city: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">Estado</span>
              <input
                type="text"
                value={leadFields.state}
                onChange={(e) => setLeadFields({ ...leadFields, state: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-400">WhatsApp</span>
              <input
                type="tel"
                value={leadFields.whatsapp}
                onChange={(e) => setLeadFields({ ...leadFields, whatsapp: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </label>
          </div>
          <button
            onClick={handleLeadContinue}
            disabled={!leadFields.name.trim()}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/new/step-counterparty.tsx
git commit -m "feat(trades): step 1 wizard - counterparty search/lead capture"
```

---

## Task 20: Step 2 — Lançamentos

**Files:**
- Create: `app/(authenticated)/trades/new/step-items.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { StickerPicker } from "./sticker-picker";
import type { Counterparty, StickerOption, Swap } from "../lib/types";

interface Props {
  counterparty: Counterparty;
  initiatorUserId: string;
  initial: Swap[];
  onComplete: (swaps: Swap[]) => void;
  onBack: () => void;
}

export function StepItems({ counterparty, initiatorUserId, initial, onComplete, onBack }: Props) {
  const [swaps, setSwaps] = useState<Swap[]>(
    initial.length ? initial : [{ given: [], received: [] }],
  );

  const counterpartyId = counterparty.type === "member" ? counterparty.id : null;
  const counterpartyLabel =
    counterparty.type === "member" ? `Coleção de ${counterparty.display_name.split(" ")[0]}` : undefined;

  function updateSwap(index: number, patch: Partial<Swap>) {
    setSwaps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSticker(swapIndex: number, side: "given" | "received", sticker: StickerOption, quantity: number) {
    const swap = swaps[swapIndex];
    const existing = swap[side].find((it) => it.sticker_id === sticker.id);
    const updated = existing
      ? swap[side].map((it) =>
          it.sticker_id === sticker.id ? { ...it, quantity: it.quantity + quantity } : it,
        )
      : [...swap[side], { sticker_id: sticker.id, quantity }];
    updateSwap(swapIndex, { [side]: updated });
  }

  function removeSticker(swapIndex: number, side: "given" | "received", stickerId: number) {
    updateSwap(swapIndex, {
      [side]: swaps[swapIndex][side].filter((it) => it.sticker_id !== stickerId),
    });
  }

  function addSwap() {
    setSwaps((prev) => [...prev, { given: [], received: [] }]);
  }

  function removeSwap(index: number) {
    setSwaps((prev) => prev.filter((_, i) => i !== index));
  }

  const totalGiven = swaps.reduce((sum, s) => sum + s.given.reduce((a, b) => a + b.quantity, 0), 0);
  const totalReceived = swaps.reduce((sum, s) => sum + s.received.reduce((a, b) => a + b.quantity, 0), 0);
  const canContinue = totalGiven > 0 && totalReceived > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
        <p className="text-sm text-gray-400">
          Com: {counterparty.type === "member" ? counterparty.display_name : counterparty.name}
        </p>
      </div>

      <div className="space-y-3">
        {swaps.map((swap, idx) => (
          <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Lançamento #{idx + 1}</p>
              {swaps.length > 1 && (
                <button
                  onClick={() => removeSwap(idx)}
                  className="p-1 rounded hover:bg-white/10"
                  aria-label="Remover lançamento"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <SideEditor
              title="Dei"
              items={swap.given}
              ownerUserId={initiatorUserId}
              ownerLabel="Sua coleção"
              onAdd={(s, q) => addSticker(idx, "given", s, q)}
              onRemove={(stickerId) => removeSticker(idx, "given", stickerId)}
            />

            <SideEditor
              title="Recebi"
              items={swap.received}
              ownerUserId={counterpartyId}
              ownerLabel={counterpartyLabel}
              onAdd={(s, q) => addSticker(idx, "received", s, q)}
              onRemove={(stickerId) => removeSticker(idx, "received", stickerId)}
            />
          </div>
        ))}

        <button
          onClick={addSwap}
          className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar lançamento
        </button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">
          ← Voltar
        </button>
        <button
          onClick={() => onComplete(swaps)}
          disabled={!canContinue}
          className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function SideEditor({
  title,
  items,
  ownerUserId,
  ownerLabel,
  onAdd,
  onRemove,
}: {
  title: string;
  items: { sticker_id: number; quantity: number }[];
  ownerUserId: string | null;
  ownerLabel?: string;
  onAdd: (sticker: StickerOption, quantity: number) => void;
  onRemove: (stickerId: number) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{title}</p>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.sticker_id} className="flex items-center justify-between px-2 py-1 rounded bg-white/5">
            <span className="text-sm text-white">
              <span className="font-mono text-gray-300">#{it.sticker_id}</span> ×{it.quantity}
            </span>
            <button
              onClick={() => onRemove(it.sticker_id)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Remover"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        ))}
        <StickerPicker
          ownerUserId={ownerUserId}
          ownerLabel={ownerLabel}
          onSelect={onAdd}
          trigger={
            <button className="text-xs text-green-400 hover:text-green-300 px-2 py-1">
              + figurinha
            </button>
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/new/step-items.tsx
git commit -m "feat(trades): step 2 wizard - swap items selection"
```

---

## Task 21: Step 3 — Revisão e confirmação

**Files:**
- Create: `app/(authenticated)/trades/new/step-review.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { Counterparty, Swap, TradeItem } from "../lib/types";

interface Props {
  counterparty: Counterparty;
  swaps: Swap[];
  onBack: () => void;
  onConfirm: (items: TradeItem[]) => Promise<void>;
}

function flattenSwaps(swaps: Swap[]): TradeItem[] {
  const map = new Map<string, TradeItem>();
  for (const swap of swaps) {
    for (const it of swap.given) {
      const key = `given:${it.sticker_id}`;
      const prev = map.get(key);
      map.set(key, {
        sticker_id: it.sticker_id,
        direction: "given",
        quantity: (prev?.quantity ?? 0) + it.quantity,
      });
    }
    for (const it of swap.received) {
      const key = `received:${it.sticker_id}`;
      const prev = map.get(key);
      map.set(key, {
        sticker_id: it.sticker_id,
        direction: "received",
        quantity: (prev?.quantity ?? 0) + it.quantity,
      });
    }
  }
  return Array.from(map.values());
}

export function StepReview({ counterparty, swaps, onBack, onConfirm }: Props) {
  const items = flattenSwaps(swaps);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLabels() {
      const supabase = createClient();
      const ids = Array.from(new Set(items.map((i) => i.sticker_id)));
      const { data } = await supabase.from("stickers").select("id, code, title").in("id", ids);
      const map: Record<number, string> = {};
      for (const s of data ?? []) {
        map[s.id as number] = `#${s.code}${s.title ? ` ${s.title}` : ""}`;
      }
      setLabels(map);
    }
    loadLabels();
  }, [items]);

  const given = items.filter((i) => i.direction === "given");
  const received = items.filter((i) => i.direction === "received");

  const totalGiven = given.reduce((sum, i) => sum + i.quantity, 0);
  const totalReceived = received.reduce((sum, i) => sum + i.quantity, 0);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(items);
    } finally {
      setSubmitting(false);
    }
  }

  const counterpartyName =
    counterparty.type === "member" ? counterparty.display_name : counterparty.name;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Confira antes de confirmar</h2>
        <p className="text-sm text-gray-400">Com: {counterpartyName}</p>
        <p className="text-xs text-gray-500">{counterparty.email}</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Você deu ({totalGiven} {totalGiven === 1 ? "figurinha" : "figurinhas"})
          </p>
          <ul className="mt-1 text-sm text-white space-y-1">
            {given.map((i) => (
              <li key={`g-${i.sticker_id}`}>
                {labels[i.sticker_id] ?? `#${i.sticker_id}`} ×{i.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Você recebeu ({totalReceived} {totalReceived === 1 ? "figurinha" : "figurinhas"})
          </p>
          <ul className="mt-1 text-sm text-white space-y-1">
            {received.map((i) => (
              <li key={`r-${i.sticker_id}`}>
                {labels[i.sticker_id] ?? `#${i.sticker_id}`} ×{i.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200">
        {counterparty.type === "member" ? (
          <>{counterpartyName.split(" ")[0]} vai ser notificado por email. Sua coleção será atualizada.</>
        ) : (
          <>Vamos enviar um email pra {counterpartyName.split(" ")[0]} convidando ela pro app. Sua coleção será atualizada.</>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar troca
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/new/step-review.tsx
git commit -m "feat(trades): step 3 wizard - review and confirm"
```

---

## Task 22: Wizard coordenador (client component)

**Files:**
- Create: `app/(authenticated)/trades/new/wizard.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepCounterparty } from "./step-counterparty";
import { StepItems } from "./step-items";
import { StepReview } from "./step-review";
import { createTradeAction } from "../lib/create-trade-action";
import type { Counterparty, Swap, TradeItem } from "../lib/types";

export function NewTradeWizard({ initiatorUserId }: { initiatorUserId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);

  async function handleConfirm(items: TradeItem[]) {
    if (!counterparty) return;
    try {
      await createTradeAction({ counterparty, items });
      toast.success("Troca registrada!");
      router.push("/trades");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar troca.";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/trades")}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Cancelar
        </button>
        <p className="text-xs text-gray-500">Passo {step}/3</p>
      </div>

      {step === 1 && (
        <StepCounterparty
          initial={counterparty}
          onComplete={(c) => {
            setCounterparty(c);
            setStep(2);
          }}
        />
      )}

      {step === 2 && counterparty && (
        <StepItems
          counterparty={counterparty}
          initiatorUserId={initiatorUserId}
          initial={swaps}
          onComplete={(s) => {
            setSwaps(s);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && counterparty && (
        <StepReview
          counterparty={counterparty}
          swaps={swaps}
          onBack={() => setStep(2)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/trades/new/wizard.tsx
git commit -m "feat(trades): wizard coordinator for new trade flow"
```

---

## Task 23: Página `/trades/new`

**Files:**
- Create: `app/(authenticated)/trades/new/page.tsx`

- [ ] **Step 1: Criar página**

```typescript
import { createClient } from "@/lib/supabase/server";
import { NewTradeWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto">
      <NewTradeWizard initiatorUserId={user!.id} />
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Smoke test E2E (manual)**

Run: `npm run dev`. Acessar logado:

1. Acessar `/trades` → ver botão "Nova troca"
2. Clicar → vai pra `/trades/new`
3. Digite email de um membro existente → clica "Buscar" → vê card com nome → clica "Continuar"
4. No Step 2, clica "+ figurinha" no "Dei" → drawer abre → seleciona uma fig → ajusta qtd → "Adicionar"
5. Idem pra "Recebi"
6. Clica "Continuar →"
7. Step 3 mostra resumo achatado → clica "Confirmar troca"
8. Toast "Troca registrada!" + redirect pra `/trades`
9. Vê a troca recém-criada no topo da lista

Verificar no banco:
```sql
SELECT * FROM trades ORDER BY created_at DESC LIMIT 1;
SELECT * FROM trade_items WHERE trade_id = (SELECT id FROM trades ORDER BY created_at DESC LIMIT 1);
SELECT * FROM user_stickers WHERE user_id = '<seu_uid>' AND sticker_id IN (<ids da troca>);
SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 1;
```

Repetir com email novo (sem cadastro) → cria lead inline → confirmar:
```sql
SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;  -- deve aparecer
SELECT email_invite_sent_at FROM leads WHERE id = '<lead_id>';  -- timestamp não-null
```

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/trades/new/page.tsx
git commit -m "feat(trades): new trade route entry point"
```

---

## Task 24: Cleanup — remover `trades-view.tsx`

**Files:**
- Remove: `app/(authenticated)/trades/trades-view.tsx`

- [ ] **Step 1: Verificar que não tem import**

Run: `grep -rn "trades-view" --include="*.ts" --include="*.tsx" .`
Expected: nenhum import além do próprio arquivo.

- [ ] **Step 2: Remover**

Run: `rm app/\(authenticated\)/trades/trades-view.tsx`

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: passa sem erros (porque ninguém usava o arquivo).

- [ ] **Step 4: Commit**

```bash
git add -A app/\(authenticated\)/trades/trades-view.tsx
git commit -m "chore(trades): remove unused matchmaking view"
```

---

## Task 25: Verificação final E2E

**Files:**
- Nenhum modificado nesse step.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 2: Build completo**

Run: `npm run build`
Expected: build bem-sucedido.

- [ ] **Step 3: Cenários manuais finais**

Logado como usuário A, executar:

| Cenário | Esperado |
|---------|----------|
| Criar troca com membro B existente | Troca aparece em `/trades`. Coleções de A e B atualizam. B recebe email. `email_log` registra `status='sent'`. |
| Abrir `/trades` como usuário B | Bolinha de não-visto some na segunda visita. |
| Criar troca com email não cadastrado (novo lead) | Lead criado em `leads`. Troca aparece com badge "lead". Email de convite enviado. |
| Criar segunda troca com mesmo email do lead | Lead reusado (mesmo id). `email_invite_sent_at` NÃO muda. Email NÃO reenviado. |
| Tentar trocar consigo mesmo (digitando próprio email) | Sistema mostra "você" e bloqueia (ou erro do RPC "cannot trade with yourself"). |
| Tentar avançar Step 2 sem itens em uma das listas | Botão "Continuar" disabled. |
| Criar conta nova via Google com email de um lead existente | Trigger converte: profile pré-populado, trades migrados, figurinhas recebidas creditadas. Verificar via SQL. |

- [ ] **Step 4: Verificação de SQL pós-conversão de lead**

Após o cenário de conversão, rodar:
```sql
SELECT id, converted_to_profile_id FROM leads WHERE email = '<email_do_lead>';
-- converted_to_profile_id deve estar setado

SELECT counterparty_user_id, counterparty_lead_id FROM trades
WHERE counterparty_user_id = (SELECT id FROM profiles WHERE id = '<novo_user_id>');
-- counterparty_lead_id deve ser NULL, counterparty_user_id setado

SELECT COUNT(*) FROM user_stickers WHERE user_id = '<novo_user_id>';
-- > 0 (figurinhas recebidas creditadas)
```

- [ ] **Step 5: Commit final (se houver ajustes)**

Se algum cenário falhou e precisou de patch, comitar separadamente. Caso contrário, pular.

---

## Resumo de commits esperados

```
feat(trades): create leads table for non-member counterparties
feat(trades): create trades table
feat(trades): create trade_items table
feat(trades): create email_log table for delivery audit
chore(trades): drop unused trade_messages table
feat(trades): add core RPCs for trade creation and management
feat(trades): trigger to convert leads on user signup
feat(trades): enable RLS and define select policies
feat(email): add shared Resend client
feat(email): add trade notification sender with audit log
feat(email): add lead invite sender with idempotency
feat(trades): add shared types for trade flow
feat(trades): server action to search counterparty by email
feat(trades): server action to mark trades as seen
feat(trades): server action to orchestrate trade creation
feat(trades): replace UnderConstruction with real trades history page
feat(trades): trades history list component
feat(trades): sticker picker drawer with search and quantity
feat(trades): step 1 wizard - counterparty search/lead capture
feat(trades): step 2 wizard - swap items selection
feat(trades): step 3 wizard - review and confirm
feat(trades): wizard coordinator for new trade flow
feat(trades): new trade route entry point
chore(trades): remove unused matchmaking view
```

## Notas operacionais

- **Sender de email**: hoje `onboarding@resend.dev` (dev). Em produção, configurar domínio verificado na Resend e atualizar `EMAIL_FROM` em `lib/email/resend.ts`.
- **Variável `NEXT_PUBLIC_APP_URL`**: usar em produção (`https://faltauma.com`). Default no código é esse string mas vale setar explicitamente.
- **Próximos passos pós-MVP** (fora do escopo): página de detalhe de troca, matchmaking de quem-tem-o-que-eu-preciso, kind=donation, kind=sale, contestação formal de trades.
