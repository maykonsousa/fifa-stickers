# Trade Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que visitantes logados em `/p/[username]` proponham trocas online ("quero" + "ofereço"), com chat embutido, e que o dono aceite ou recuse a proposta. A camada é puramente de coordenação — não muta coleções (execução continua via `/trades/new`).

**Architecture:** Tabelas novas (`proposals`, `proposal_items`, `proposal_messages`) + RPCs `SECURITY DEFINER` pra todas as escritas + RLS de leitura por participante. UI consiste em rota `/proposals` (lista com abas Recebidas/Enviadas), `/proposals/[id]` (detalhe com itens + chat + ações) e `/proposals/new?to=<username>` (criação com dois pickers). Nav-bar ganha link "Propostas" com badge. O placeholder `TradeProposalDialog` em `/p/[username]` é substituído por `<Link>` direto pro `/proposals/new`.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Supabase (Postgres + SSR client), Resend, Tailwind 4, shadcn/ui.

**Sem testes automatizados:** O projeto não tem suíte. Verificação por `npm run build` (type check), `npm run dev` (smoke manual) e queries diretas no banco após cada migration.

**Spec:** `docs/superpowers/specs/2026-05-16-trade-proposals-design.md`

---

## File Structure

### Migrations (criar)
- `supabase/migrations/041_create_proposals.sql`
- `supabase/migrations/042_create_proposal_items.sql`
- `supabase/migrations/043_create_proposal_messages.sql`
- `supabase/migrations/044_proposal_rpcs.sql`
- `supabase/migrations/045_proposal_rls.sql`
- `supabase/migrations/046_email_log_proposal_support.sql`

### Email (criar)
- `lib/email/send-proposal-created.ts`
- `lib/email/send-proposal-decided.ts`
- `lib/email/send-proposal-cancelled.ts`
- `lib/email/send-proposal-message.ts`

(Sem subpasta `templates/` — seguimos padrão atual de `send-trade-notification.ts` com HTML inline.)

### Rotas e componentes (criar)
- `app/(authenticated)/proposals/lib/types.ts`
- `app/(authenticated)/proposals/lib/create-proposal-action.ts`
- `app/(authenticated)/proposals/lib/decide-proposal-action.ts`
- `app/(authenticated)/proposals/lib/cancel-proposal-action.ts`
- `app/(authenticated)/proposals/lib/post-message-action.ts`
- `app/(authenticated)/proposals/lib/mark-seen-action.ts`
- `app/(authenticated)/proposals/page.tsx`
- `app/(authenticated)/proposals/proposals-list.tsx`
- `app/(authenticated)/proposals/proposal-card.tsx`
- `app/(authenticated)/proposals/[id]/page.tsx`
- `app/(authenticated)/proposals/[id]/proposal-detail.tsx`
- `app/(authenticated)/proposals/[id]/proposal-chat.tsx`
- `app/(authenticated)/proposals/[id]/proposal-actions.tsx`
- `app/(authenticated)/proposals/new/page.tsx`
- `app/(authenticated)/proposals/new/proposal-builder.tsx`
- `app/(authenticated)/proposals/new/proposal-sticker-picker.tsx`

### Existentes (modificar)
- `components/nav-bar.tsx` — adicionar link "Propostas" com badge `unseenProposalsCount`
- `app/(authenticated)/layout.tsx` — buscar contagem de propostas não vistas e passar pro `<NavBar>`
- `app/p/[username]/page.tsx` — relaxar habilitação do botão "Propor troca"
- `app/p/[username]/profile-stickers.tsx` — botão vira `<Link href="/proposals/new?to=...">`, sem mais dialog
- `supabase/migrations/032_create_email_log.sql` — **não** editar; extensão vem na 046

### Existentes (remover)
- `app/p/[username]/trade-proposal-dialog.tsx`

---

## Task 1: Migration `041_create_proposals.sql`

**Files:**
- Create: `supabase/migrations/041_create_proposals.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- 041_create_proposals.sql
-- Tabela de propostas de troca online. Cada proposta é um convite com
-- dois lados ("want" / "offer"), com lifecycle pending → accepted/rejected/cancelled.
-- Não muta coleções: é coordenação social, não execução.

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

- [ ] **Step 2: Aplicar a migration localmente**

Run: `npx supabase db push` (ou o comando que o projeto convencionou)
Expected: migration `041_create_proposals.sql` aplicada sem erros.

- [ ] **Step 3: Verificar a tabela**

```sql
\d+ proposals
SELECT indexname FROM pg_indexes WHERE tablename = 'proposals';
```

Expected: 4 indexes (idx_proposals_owner_status, _proposer_status, _unread_owner, _unread_proposer) + primary key.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/041_create_proposals.sql
git commit -m "feat(proposals): create proposals table"
```

---

## Task 2: Migration `042_create_proposal_items.sql`

**Files:**
- Create: `supabase/migrations/042_create_proposal_items.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- 042_create_proposal_items.sql
-- Items da proposta, sempre do ponto de vista do PROPONENTE:
--   'want'  = proponente quer receber do dono
--   'offer' = proponente oferece do próprio acervo
-- UNIQUE garante uma figurinha no máximo 1x por lado; múltiplas cópias em `quantity`.

CREATE TABLE proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  direction TEXT NOT NULL CHECK (direction IN ('want', 'offer')),
  quantity INT NOT NULL CHECK (quantity > 0),
  UNIQUE (proposal_id, sticker_id, direction)
);

CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
```

- [ ] **Step 2: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar**

```sql
\d+ proposal_items
```

Expected: FK pra `proposals.id` (CASCADE) e `stickers.id`, UNIQUE composta, índice em `proposal_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/042_create_proposal_items.sql
git commit -m "feat(proposals): create proposal_items table"
```

---

## Task 3: Migration `043_create_proposal_messages.sql`

**Files:**
- Create: `supabase/migrations/043_create_proposal_messages.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- 043_create_proposal_messages.sql
-- Mensagens de chat dentro de uma proposta. Funcionam em qualquer status
-- (pending/accepted/rejected/cancelled) — permite "obrigado!", "valeu", etc.

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

- [ ] **Step 2: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar**

```sql
\d+ proposal_messages
```

Expected: tabela existe, índice `(proposal_id, created_at)` criado, CHECK de tamanho funcionando.

Teste manual rápido (opcional):
```sql
INSERT INTO proposal_messages (proposal_id, sender_user_id, body) VALUES (gen_random_uuid(), gen_random_uuid(), '   ');
-- esperado: ERROR — CHECK violation no body
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/043_create_proposal_messages.sql
git commit -m "feat(proposals): create proposal_messages table"
```

---

## Task 4: Migration `044_proposal_rpcs.sql`

**Files:**
- Create: `supabase/migrations/044_proposal_rpcs.sql`

Cobre 6 funções: `create_proposal`, `decide_proposal`, `cancel_proposal`, `post_proposal_message`, `mark_proposal_seen`, `count_unseen_proposals`.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- 044_proposal_rpcs.sql
-- Funções SECURITY DEFINER para todas as escritas em proposals/_items/_messages.
-- RLS bloqueia mutations diretas no client.

CREATE FUNCTION create_proposal(
  p_owner_user_id UUID,
  p_items JSONB
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
  SELECT owner_user_id, status INTO v_owner, v_status FROM proposals WHERE id = p_proposal_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_owner <> v_caller THEN RAISE EXCEPTION 'only owner can decide'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'proposal is not pending'; END IF;

  UPDATE proposals
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      decided_at = now(),
      last_activity_at = now(),
      owner_seen_at = now()
  WHERE id = p_proposal_id;
END;
$$;

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
  SELECT proposer_user_id, status INTO v_proposer, v_status FROM proposals WHERE id = p_proposal_id;
  IF v_proposer IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_proposer <> v_caller THEN RAISE EXCEPTION 'only proposer can cancel'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'only pending can be cancelled'; END IF;

  UPDATE proposals
  SET status = 'cancelled',
      decided_at = now(),
      last_activity_at = now(),
      proposer_seen_at = now()
  WHERE id = p_proposal_id;
END;
$$;

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
  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer FROM proposals WHERE id = p_proposal_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_caller <> v_owner AND v_caller <> v_proposer THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  INSERT INTO proposal_messages (proposal_id, sender_user_id, body)
  VALUES (p_proposal_id, v_caller, p_body)
  RETURNING id INTO v_message_id;

  UPDATE proposals
  SET last_activity_at = now(),
      proposer_seen_at = CASE WHEN v_caller = v_proposer THEN now() ELSE proposer_seen_at END,
      owner_seen_at    = CASE WHEN v_caller = v_owner    THEN now() ELSE owner_seen_at END
  WHERE id = p_proposal_id;

  RETURN v_message_id;
END;
$$;

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
  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer FROM proposals WHERE id = p_proposal_id;
  IF v_caller = v_owner THEN
    UPDATE proposals SET owner_seen_at = now() WHERE id = p_proposal_id;
  ELSIF v_caller = v_proposer THEN
    UPDATE proposals SET proposer_seen_at = now() WHERE id = p_proposal_id;
  ELSE
    RAISE EXCEPTION 'not a participant';
  END IF;
END;
$$;

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

- [ ] **Step 2: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar funções existem**

```sql
SELECT proname FROM pg_proc WHERE proname IN
  ('create_proposal', 'decide_proposal', 'cancel_proposal',
   'post_proposal_message', 'mark_proposal_seen', 'count_unseen_proposals');
```

Expected: 6 linhas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/044_proposal_rpcs.sql
git commit -m "feat(proposals): add RPCs (create, decide, cancel, message, seen, count)"
```

---

## Task 5: Migration `045_proposal_rls.sql`

**Files:**
- Create: `supabase/migrations/045_proposal_rls.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- 045_proposal_rls.sql
-- RLS de leitura: só participantes (proponente OU dono) leem proposta + itens + mensagens.
-- Escrita só via RPC SECURITY DEFINER (sem policy de INSERT/UPDATE/DELETE).

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

- [ ] **Step 2: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar policies**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('proposals', 'proposal_items', 'proposal_messages');
```

Expected: 3 policies, todas com `cmd = 'SELECT'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/045_proposal_rls.sql
git commit -m "feat(proposals): enable RLS with select-only policies for participants"
```

---

## Task 6: Migration `046_email_log_proposal_support.sql`

**Files:**
- Create: `supabase/migrations/046_email_log_proposal_support.sql`

- [ ] **Step 1: Verificar o nome do constraint**

Run:
```bash
psql -d <db-name> -c "SELECT conname FROM pg_constraint WHERE conrelid = 'email_log'::regclass AND contype = 'c';"
```

Expected: aparece `email_log_kind_check` e `email_log_status_check`. Se o nome do CHECK de kind for diferente, ajustar o `DROP CONSTRAINT` abaixo.

- [ ] **Step 2: Criar o arquivo de migration**

```sql
-- 046_email_log_proposal_support.sql
-- Estende email_log pra cobrir eventos de propostas (criada, decidida, cancelada, mensagem).

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

- [ ] **Step 3: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 4: Verificar**

```sql
\d+ email_log
SELECT conname FROM pg_constraint WHERE conrelid = 'email_log'::regclass;
```

Expected: coluna `proposal_id` presente; CHECK `email_log_kind_check` lista os 6 valores; 2 índices novos.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/046_email_log_proposal_support.sql
git commit -m "feat(proposals): extend email_log with proposal_id and new kinds"
```

---

## Task 7: Tipos compartilhados

**Files:**
- Create: `app/(authenticated)/proposals/lib/types.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export type ProposalDirection = "want" | "offer";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface ProposalItem {
  sticker_id: number;
  direction: ProposalDirection;
  quantity: number;
}

export interface ProposalItemDetail {
  sticker_id: number;
  direction: ProposalDirection;
  quantity: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

export interface ProposalListRow {
  id: string;
  other_user_id: string;
  other_name: string;
  other_avatar_url: string | null;
  status: ProposalStatus;
  want_count: number;
  offer_count: number;
  last_activity_at: string;
  is_unseen: boolean;
}

export interface ProposalMessageRow {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

export type ProposalTab = "received" | "sent";
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit` (ou `npm run build`)
Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/types.ts
git commit -m "feat(proposals): add shared types"
```

---

## Task 8: Email — `send-proposal-created.ts`

**Files:**
- Create: `lib/email/send-proposal-created.ts`

Segue o padrão de `lib/email/send-trade-notification.ts`: HTML inline + log em `email_log` + fire-and-forget.

- [ ] **Step 1: Criar o arquivo**

```ts
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalCreatedInput {
  proposalId: string;
  proposerName: string;
  recipientEmail: string;
  recipientName: string;
  itemsWant: { stickerLabel: string; quantity: number }[];
  itemsOffer: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendProposalCreated(input: ProposalCreatedInput) {
  const supabase = await createClient();

  const wantList = input.itemsWant
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");
  const offerList = input.itemsOffer
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const html = `
    <h2>${input.proposerName} fez uma proposta de troca</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.proposerName} quer trocar figurinhas com você.</p>
    <p><strong>Ele quer (de você):</strong></p>
    <ul>${wantList}</ul>
    <p><strong>Ele oferece:</strong></p>
    <ul>${offerList}</ul>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Ver proposta no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.proposerName} fez uma proposta de troca`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_created",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalCreated failed", error);
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-proposal-created.ts
git commit -m "feat(proposals): email sender for proposal_created"
```

---

## Task 9: Email — `send-proposal-decided.ts`

**Files:**
- Create: `lib/email/send-proposal-decided.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalDecidedInput {
  proposalId: string;
  ownerName: string;
  recipientEmail: string;
  recipientName: string;
  accepted: boolean;
  appUrl: string;
}

export async function sendProposalDecided(input: ProposalDecidedInput) {
  const supabase = await createClient();

  const verb = input.accepted ? "aceitou" : "recusou";
  const nextSteps = input.accepted
    ? `<p>Combinem o encontro pelo chat dentro do app. Quando se encontrarem, registrem a troca em <a href="${input.appUrl}/trades/new">${input.appUrl}/trades/new</a> pra atualizar as coleções.</p>`
    : `<p>Pode tentar com outra combinação ou propor pra outros usuários.</p>`;

  const html = `
    <h2>${input.ownerName} ${verb} sua proposta</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.ownerName} ${verb} sua proposta de troca.</p>
    ${nextSteps}
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Abrir conversa</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.ownerName} ${verb} sua proposta`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_decided",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalDecided failed", error);
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-proposal-decided.ts
git commit -m "feat(proposals): email sender for proposal_decided"
```

---

## Task 10: Email — `send-proposal-cancelled.ts`

**Files:**
- Create: `lib/email/send-proposal-cancelled.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalCancelledInput {
  proposalId: string;
  proposerName: string;
  recipientEmail: string;
  recipientName: string;
  appUrl: string;
}

export async function sendProposalCancelled(input: ProposalCancelledInput) {
  const supabase = await createClient();

  const html = `
    <h2>${input.proposerName} cancelou a proposta</h2>
    <p>Oi ${input.recipientName},</p>
    <p>A proposta enviada por ${input.proposerName} foi cancelada. Sem ação necessária.</p>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Ver no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.proposerName} cancelou a proposta`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_cancelled",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalCancelled failed", error);
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-proposal-cancelled.ts
git commit -m "feat(proposals): email sender for proposal_cancelled"
```

---

## Task 11: Email — `send-proposal-message.ts` (com debounce 15min)

**Files:**
- Create: `lib/email/send-proposal-message.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalMessageInput {
  proposalId: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  messageExcerpt: string; // até 200 chars; truncado pelo caller
  appUrl: string;
}

const DEBOUNCE_MINUTES = 15;

export async function sendProposalMessage(input: ProposalMessageInput) {
  const supabase = await createClient();

  // Debounce: se já mandou email de chat pra esse destinatário/proposta nos últimos 15min, pula.
  const { data: lastEmail } = await supabase
    .from("email_log")
    .select("sent_at")
    .eq("proposal_id", input.proposalId)
    .eq("recipient_email", input.recipientEmail)
    .eq("kind", "proposal_message")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEmail?.sent_at) {
    const ageMinutes = (Date.now() - new Date(lastEmail.sent_at).getTime()) / 60_000;
    if (ageMinutes < DEBOUNCE_MINUTES) {
      return; // skip
    }
  }

  const html = `
    <h2>Nova mensagem na proposta com ${input.senderName}</h2>
    <p>${input.senderName} respondeu na conversa:</p>
    <blockquote style="border-left:3px solid #ddd;padding-left:1em;color:#555;">
      ${input.messageExcerpt}
    </blockquote>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Continuar conversa</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `Nova mensagem na proposta com ${input.senderName}`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_message",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalMessage failed", error);
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-proposal-message.ts
git commit -m "feat(proposals): email sender for proposal_message with 15min debounce"
```

---

## Task 12: RPC auxiliar `get_user_email`

**Files:**
- Create: `supabase/migrations/047_get_user_email_rpc.sql`

As server actions de proposta precisam do email do dono / proponente pra montar emails transacionais. `profiles` não tem email — ele vive em `auth.users`. Criamos um RPC dedicado.

- [ ] **Step 1: Criar a migration**

```sql
-- 047_get_user_email_rpc.sql
-- Retorna o email de auth.users pra um user_id dado. Usado por server actions
-- pra montar destinatário de email transacional.

CREATE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email FROM auth.users u WHERE u.id = p_user_id;
$$;
```

- [ ] **Step 2: Aplicar a migration**

Run: `npx supabase db push`

- [ ] **Step 3: Verificar**

```sql
SELECT proname FROM pg_proc WHERE proname = 'get_user_email';
```

Expected: 1 linha.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/047_get_user_email_rpc.sql
git commit -m "feat: add get_user_email RPC for transactional email lookup"
```

---

## Task 13: Server action — `createProposalAction`

**Files:**
- Create: `app/(authenticated)/proposals/lib/create-proposal-action.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { sendProposalCreated } from "@/lib/email/send-proposal-created";
import type { ProposalItem } from "./types";

interface CreateProposalInput {
  ownerUserId: string;
  items: ProposalItem[];
}

export async function createProposalAction(input: CreateProposalInput): Promise<string> {
  const supabase = await createClient();

  const { data: proposalId, error: rpcError } = await supabase.rpc("create_proposal", {
    p_owner_user_id: input.ownerUserId,
    p_items: input.items,
  });
  if (rpcError || !proposalId) {
    throw new Error(rpcError?.message ?? "failed to create proposal");
  }

  // Carrega dados pro email
  const { data: { user: proposer } } = await supabase.auth.getUser();
  const { data: proposerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", proposer!.id)
    .single();

  const { data: ownerData } = await supabase
    .from("profiles")
    .select("display_name, id")
    .eq("id", input.ownerUserId)
    .single();

  // Email do dono vem de auth.users via RPC `get_user_email` (criada na Task 12).
  const { data: ownerEmail } = await supabase.rpc("get_user_email", {
    p_user_id: input.ownerUserId,
  });

  // Busca dados das figurinhas
  const stickerIds = input.items.map((i) => i.sticker_id);
  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, code, title")
    .in("id", stickerIds);

  const stickerLabel = (id: number) => {
    const s = stickers?.find((x) => x.id === id);
    return s ? `#${s.code}${s.title ? ` ${s.title}` : ""}` : `#${id}`;
  };

  const itemsWant = input.items
    .filter((i) => i.direction === "want")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));
  const itemsOffer = input.items
    .filter((i) => i.direction === "offer")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com";

  if (ownerEmail) {
    await sendProposalCreated({
      proposalId: proposalId as string,
      proposerName: proposerProfile?.display_name ?? "Alguém",
      recipientEmail: ownerEmail as string,
      recipientName: ownerData?.display_name ?? "Colecionador",
      itemsWant,
      itemsOffer,
      appUrl,
    });
  }

  return proposalId as string;
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`
Expected: tipos OK.

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/create-proposal-action.ts
git commit -m "feat(proposals): server action createProposalAction"
```

---

## Task 14: Server action — `decideProposalAction`

**Files:**
- Create: `app/(authenticated)/proposals/lib/decide-proposal-action.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendProposalDecided } from "@/lib/email/send-proposal-decided";

export async function decideProposalAction(proposalId: string, accept: boolean) {
  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("decide_proposal", {
    p_proposal_id: proposalId,
    p_accept: accept,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro proponente
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.owner_user_id)
      .single();

    const { data: proposerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.proposer_user_id)
      .single();

    const { data: proposerEmail } = await supabase.rpc("get_user_email", {
      p_user_id: proposal.proposer_user_id,
    });

    if (proposerEmail) {
      await sendProposalDecided({
        proposalId,
        ownerName: ownerProfile?.display_name ?? "Colecionador",
        recipientEmail: proposerEmail as string,
        recipientName: proposerProfile?.display_name ?? "Alguém",
        accepted: accept,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/decide-proposal-action.ts
git commit -m "feat(proposals): server action decideProposalAction"
```

---

## Task 15: Server action — `cancelProposalAction`

**Files:**
- Create: `app/(authenticated)/proposals/lib/cancel-proposal-action.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendProposalCancelled } from "@/lib/email/send-proposal-cancelled";

export async function cancelProposalAction(proposalId: string) {
  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("cancel_proposal", {
    p_proposal_id: proposalId,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro dono
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: proposerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.proposer_user_id)
      .single();
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.owner_user_id)
      .single();
    const { data: ownerEmail } = await supabase.rpc("get_user_email", {
      p_user_id: proposal.owner_user_id,
    });

    if (ownerEmail) {
      await sendProposalCancelled({
        proposalId,
        proposerName: proposerProfile?.display_name ?? "Alguém",
        recipientEmail: ownerEmail as string,
        recipientName: ownerProfile?.display_name ?? "Colecionador",
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/cancel-proposal-action.ts
git commit -m "feat(proposals): server action cancelProposalAction"
```

---

## Task 16: Server action — `postMessageAction`

**Files:**
- Create: `app/(authenticated)/proposals/lib/post-message-action.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendProposalMessage } from "@/lib/email/send-proposal-message";

const EXCERPT_MAX = 200;

export async function postMessageAction(proposalId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("mensagem vazia");
  }
  if (trimmed.length > 2000) {
    throw new Error("mensagem muito longa");
  }

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("post_proposal_message", {
    p_proposal_id: proposalId,
    p_body: trimmed,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro outro lado (com debounce no sender)
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: { user } } = await supabase.auth.getUser();
    const callerId = user!.id;
    const recipientId =
      callerId === proposal.proposer_user_id
        ? proposal.owner_user_id
        : proposal.proposer_user_id;

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", callerId)
      .single();
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", recipientId)
      .single();
    const { data: recipientEmail } = await supabase.rpc("get_user_email", {
      p_user_id: recipientId,
    });

    if (recipientEmail) {
      const excerpt =
        trimmed.length > EXCERPT_MAX ? trimmed.slice(0, EXCERPT_MAX) + "…" : trimmed;
      await sendProposalMessage({
        proposalId,
        senderName: senderProfile?.display_name ?? "Alguém",
        recipientEmail: recipientEmail as string,
        recipientName: recipientProfile?.display_name ?? "Colecionador",
        messageExcerpt: excerpt,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/proposals/${proposalId}`);
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/post-message-action.ts
git commit -m "feat(proposals): server action postMessageAction with debounced email"
```

---

## Task 17: Server action — `markSeenAction`

**Files:**
- Create: `app/(authenticated)/proposals/lib/mark-seen-action.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function markSeenAction(proposalId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_proposal_seen", {
    p_proposal_id: proposalId,
  });
  if (error) {
    // não bloqueia o render — só loga
    console.error("markSeenAction failed", error);
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/lib/mark-seen-action.ts
git commit -m "feat(proposals): server action markSeenAction"
```

---

## Task 18: Página `/proposals` — server component + lista

**Files:**
- Create: `app/(authenticated)/proposals/page.tsx`
- Create: `app/(authenticated)/proposals/proposals-list.tsx`
- Create: `app/(authenticated)/proposals/proposal-card.tsx`

- [ ] **Step 1: Criar `proposal-card.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { ProposalListRow, ProposalStatus } from "./lib/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusLabel: Record<ProposalStatus, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const statusClasses: Record<ProposalStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  accepted: "bg-green-500/20 text-green-300",
  rejected: "bg-white/10 text-gray-300",
  cancelled: "bg-white/10 text-gray-300",
};

export function ProposalCard({ row }: { row: ProposalListRow }) {
  return (
    <Link
      href={`/proposals/${row.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {row.other_avatar_url ? (
          <img src={row.other_avatar_url} alt={row.other_name} className="h-10 w-10 rounded-full flex-shrink-0" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-grass/20 text-sm font-bold text-brand-grass flex-shrink-0">
            {row.other_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{row.other_name}</p>
            <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0 ${statusClasses[row.status]}`}>
              {statusLabel[row.status]}
            </span>
            {row.is_unseen && (
              <span className="inline-block w-2 h-2 rounded-full bg-brand-grass flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Quero {row.want_count} · Ofereço {row.offer_count}
          </p>
        </div>
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0">
        {formatDateTime(row.last_activity_at)}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Criar `proposals-list.tsx`**

```tsx
"use client";

import type { ProposalListRow, ProposalTab } from "./lib/types";
import { ProposalCard } from "./proposal-card";

export function ProposalsList({ rows, tab }: { rows: ProposalListRow[]; tab: ProposalTab }) {
  if (rows.length === 0) {
    const message =
      tab === "received"
        ? "Nenhuma proposta ainda. Quando alguém propor uma troca, ela aparece aqui."
        : "Você ainda não enviou nenhuma proposta. Visite o perfil de um colecionador pra começar.";
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ProposalCard key={row.id} row={row} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Criar `page.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProposalsList } from "./proposals-list";
import type { ProposalListRow, ProposalStatus, ProposalTab } from "./lib/types";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: ProposalTab = params.tab === "sent" ? "sent" : "received";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user!.id;

  const filterCol = tab === "received" ? "owner_user_id" : "proposer_user_id";
  const otherCol = tab === "received" ? "proposer_user_id" : "owner_user_id";

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      id,
      proposer_user_id,
      owner_user_id,
      status,
      last_activity_at,
      proposer_seen_at,
      owner_seen_at,
      proposer:profiles!proposals_proposer_user_id_fkey ( display_name, avatar_url ),
      owner:profiles!proposals_owner_user_id_fkey ( display_name, avatar_url ),
      proposal_items ( direction, quantity )
    `)
    .eq(filterCol, userId)
    .order("last_activity_at", { ascending: false })
    .limit(50);

  const rows: ProposalListRow[] = (proposals ?? []).map((p) => {
    const other = tab === "received" ? p.proposer : p.owner;
    const otherProfile = Array.isArray(other) ? other[0] : other;
    const items = Array.isArray(p.proposal_items) ? p.proposal_items : [];
    const wantCount = items
      .filter((i: { direction: string; quantity: number }) => i.direction === "want")
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    const offerCount = items
      .filter((i: { direction: string; quantity: number }) => i.direction === "offer")
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

    const isUnseen =
      tab === "received"
        ? !p.owner_seen_at || new Date(p.owner_seen_at) < new Date(p.last_activity_at)
        : new Date(p.proposer_seen_at) < new Date(p.last_activity_at);

    return {
      id: p.id,
      other_user_id: tab === "received" ? p.proposer_user_id : p.owner_user_id,
      other_name: otherProfile?.display_name ?? "Usuário",
      other_avatar_url: otherProfile?.avatar_url ?? null,
      status: p.status as ProposalStatus,
      want_count: wantCount,
      offer_count: offerCount,
      last_activity_at: p.last_activity_at,
      is_unseen: isUnseen,
    };
  });

  // Contagens das abas
  const { count: receivedCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId);
  const { count: sentCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("proposer_user_id", userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Propostas</h1>

      <div className="flex border-b border-white/10">
        <Link
          href="/proposals?tab=received"
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "received" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Recebidas ({receivedCount ?? 0})
          {tab === "received" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </Link>
        <Link
          href="/proposals?tab=sent"
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "sent" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Enviadas ({sentCount ?? 0})
          {tab === "sent" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </Link>
      </div>

      <ProposalsList rows={rows} tab={tab} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Smoke test**

Run: `npm run dev`
Acessar `http://localhost:3000/proposals` (logado). Expected:
- Header "Propostas" + duas abas (Recebidas/Enviadas) com contagens zeradas.
- Empty state apropriado.

- [ ] **Step 6: Commit**

```bash
git add app/\(authenticated\)/proposals/page.tsx app/\(authenticated\)/proposals/proposals-list.tsx app/\(authenticated\)/proposals/proposal-card.tsx
git commit -m "feat(proposals): list page with received/sent tabs"
```

---

## Task 19: Página `/proposals/[id]` — detail server component

**Files:**
- Create: `app/(authenticated)/proposals/[id]/page.tsx`
- Create: `app/(authenticated)/proposals/[id]/proposal-detail.tsx`

- [ ] **Step 1: Criar `proposal-detail.tsx` (server-rendered fragment de itens)**

```tsx
import type { ProposalItemDetail, ProposalStatus } from "../lib/types";

interface Props {
  status: ProposalStatus;
  decidedAt: string | null;
  otherName: string;
  isOwner: boolean;
  itemsWant: ProposalItemDetail[];
  itemsOffer: ProposalItemDetail[];
}

const statusBanner: Record<ProposalStatus, { text: (n: string, d: string) => string; cls: string }> = {
  pending: { text: () => "", cls: "" },
  accepted: {
    text: (_n, d) => `✅ Aceita em ${d} — combinem o encontro!`,
    cls: "bg-green-500/10 border-green-500/30 text-green-200",
  },
  rejected: {
    text: (_n, d) => `❌ Recusada em ${d}.`,
    cls: "bg-white/5 border-white/10 text-gray-300",
  },
  cancelled: {
    text: (n, d) => `Cancelada por ${n} em ${d}.`,
    cls: "bg-white/5 border-white/10 text-gray-300",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StickerItem({ item }: { item: ProposalItemDetail }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {item.image_url ? (
        <img src={item.image_url} alt={item.code} className="h-12 w-9 rounded object-cover" />
      ) : (
        <div className="h-12 w-9 rounded bg-white/10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          #{item.code} {item.title ?? ""}
        </p>
        <p className="text-xs text-gray-500">×{item.quantity}</p>
      </div>
    </li>
  );
}

export function ProposalDetail({ status, decidedAt, otherName, isOwner, itemsWant, itemsOffer }: Props) {
  const wantLabel = isOwner ? `Ele quer (você dá)` : "Você quer (recebe)";
  const offerLabel = isOwner ? "Ele oferece (você recebe)" : "Você oferece (entrega)";

  return (
    <div className="space-y-4">
      {status !== "pending" && decidedAt && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${statusBanner[status].cls}`}>
          {statusBanner[status].text(otherName, formatDate(decidedAt))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white mb-2">{wantLabel}</h3>
        <ul className="divide-y divide-white/5">
          {itemsWant.map((item) => (
            <StickerItem key={`want-${item.sticker_id}`} item={item} />
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white mb-2">{offerLabel}</h3>
        <ul className="divide-y divide-white/5">
          {itemsOffer.map((item) => (
            <StickerItem key={`offer-${item.sticker_id}`} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `page.tsx` (mínimo viável — sem chat e ações ainda)**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProposalDetail } from "./proposal-detail";
import { markSeenAction } from "../lib/mark-seen-action";
import type { ProposalItemDetail, ProposalStatus } from "../lib/types";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`
      id,
      proposer_user_id,
      owner_user_id,
      status,
      created_at,
      decided_at,
      last_activity_at,
      proposer:profiles!proposals_proposer_user_id_fkey ( id, display_name, avatar_url ),
      owner:profiles!proposals_owner_user_id_fkey ( id, display_name, avatar_url ),
      proposal_items ( sticker_id, direction, quantity, stickers ( code, title, image_url ) )
    `)
    .eq("id", id)
    .single();

  if (!proposal) {
    notFound();
  }

  const isOwner = proposal.owner_user_id === user!.id;
  const isProposer = proposal.proposer_user_id === user!.id;
  if (!isOwner && !isProposer) {
    notFound();
  }

  const proposer = Array.isArray(proposal.proposer) ? proposal.proposer[0] : proposal.proposer;
  const owner = Array.isArray(proposal.owner) ? proposal.owner[0] : proposal.owner;
  const otherProfile = isOwner ? proposer : owner;

  const items: ProposalItemDetail[] = (proposal.proposal_items ?? []).map((it: any) => {
    const sticker = Array.isArray(it.stickers) ? it.stickers[0] : it.stickers;
    return {
      sticker_id: it.sticker_id,
      direction: it.direction,
      quantity: it.quantity,
      code: sticker?.code ?? "",
      title: sticker?.title ?? null,
      image_url: sticker?.image_url ?? null,
    };
  });

  const itemsWant = items.filter((i) => i.direction === "want");
  const itemsOffer = items.filter((i) => i.direction === "offer");

  await markSeenAction(id);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/proposals" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3">
        {otherProfile?.avatar_url ? (
          <img src={otherProfile.avatar_url} alt={otherProfile.display_name ?? ""} className="h-12 w-12 rounded-full" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-grass/20 text-base font-bold text-brand-grass">
            {(otherProfile?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{otherProfile?.display_name ?? "Usuário"}</h1>
          <p className="text-xs text-gray-500">Criada em {new Date(proposal.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <ProposalDetail
        status={proposal.status as ProposalStatus}
        decidedAt={proposal.decided_at}
        otherName={otherProfile?.display_name ?? "Usuário"}
        isOwner={isOwner}
        itemsWant={itemsWant}
        itemsOffer={itemsOffer}
      />

      {/* Chat e ações serão adicionados nas Tasks 20 e 21 */}
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Smoke test (precisa de uma proposta no banco; inserir via SQL temporariamente)**

```sql
-- exemplo de seed manual (substituir UUIDs reais):
SELECT create_proposal(
  '<UUID-DO-DONO>'::uuid,
  '[
    {"sticker_id": 1, "direction": "want", "quantity": 1},
    {"sticker_id": 2, "direction": "offer", "quantity": 1}
  ]'::jsonb
);
```

Acessar `/proposals/<id>` logado como proponente ou dono. Expected: avatar + nome + dois cards (Quero / Ofereço).

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/proposals/\[id\]/page.tsx app/\(authenticated\)/proposals/\[id\]/proposal-detail.tsx
git commit -m "feat(proposals): detail page with items rendering"
```

---

## Task 20: Chat em `/proposals/[id]`

**Files:**
- Create: `app/(authenticated)/proposals/[id]/proposal-chat.tsx`
- Modify: `app/(authenticated)/proposals/[id]/page.tsx` (mount do chat + fetch das mensagens)

- [ ] **Step 1: Criar `proposal-chat.tsx`**

```tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { postMessageAction } from "../lib/post-message-action";
import type { ProposalMessageRow } from "../lib/types";

interface Props {
  proposalId: string;
  currentUserId: string;
  otherName: string;
  messages: ProposalMessageRow[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ProposalChat({ proposalId, currentUserId, otherName, messages }: Props) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      try {
        await postMessageAction(proposalId, trimmed);
        setText("");
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">Conversa</h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            Nenhuma mensagem ainda. Mande a primeira pra {otherName}.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_user_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isMine ? "bg-brand-grass/20 text-white" : "bg-white/10 text-white"
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva uma mensagem..."
          rows={1}
          maxLength={2000}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || isPending}
          className="flex items-center justify-center rounded-lg bg-brand-grass px-3 py-2 text-white hover:brightness-110 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {text.length > 1800 && (
        <p className="text-xs text-amber-300">{text.length}/2000</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar fetch de mensagens + render do chat no `page.tsx`**

Edit `app/(authenticated)/proposals/[id]/page.tsx`:

Adicione o import no topo:
```tsx
import { ProposalChat } from "./proposal-chat";
import type { ProposalMessageRow } from "../lib/types";
```

Antes do `return`, busque mensagens:
```tsx
const { data: messagesData } = await supabase
  .from("proposal_messages")
  .select("id, sender_user_id, body, created_at")
  .eq("proposal_id", id)
  .order("created_at", { ascending: true })
  .limit(50);

const messages: ProposalMessageRow[] = (messagesData ?? []) as ProposalMessageRow[];
```

E substitua o comentário `{/* Chat e ações serão adicionados nas Tasks 20 e 21 */}` por:
```tsx
<ProposalChat
  proposalId={id}
  currentUserId={user!.id}
  otherName={otherProfile?.display_name ?? "Usuário"}
  messages={messages}
/>
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Smoke test**

Acessar a proposta criada no Task 19. Mandar uma mensagem. Expected: aparece imediatamente após router.refresh.

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/proposals/\[id\]/proposal-chat.tsx app/\(authenticated\)/proposals/\[id\]/page.tsx
git commit -m "feat(proposals): chat in detail page"
```

---

## Task 21: Ações em `/proposals/[id]` (aceitar/recusar/cancelar)

**Files:**
- Create: `app/(authenticated)/proposals/[id]/proposal-actions.tsx`
- Modify: `app/(authenticated)/proposals/[id]/page.tsx` (mount das ações)

- [ ] **Step 1: Criar `proposal-actions.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
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
import { decideProposalAction } from "../lib/decide-proposal-action";
import { cancelProposalAction } from "../lib/cancel-proposal-action";

interface Props {
  proposalId: string;
  isOwner: boolean;
  isProposer: boolean;
  isPending: boolean;
}

type PendingAction = "accept" | "reject" | "cancel" | null;

export function ProposalActions({ proposalId, isOwner, isProposer, isPending }: Props) {
  const [open, setOpen] = useState<PendingAction>(null);
  const [submitting, startTransition] = useTransition();

  if (!isPending) return null;

  const confirm = () => {
    startTransition(async () => {
      try {
        if (open === "accept") await decideProposalAction(proposalId, true);
        else if (open === "reject") await decideProposalAction(proposalId, false);
        else if (open === "cancel") await cancelProposalAction(proposalId);
        setOpen(null);
      } catch (e) {
        console.error(e);
        setOpen(null);
      }
    });
  };

  const titles: Record<Exclude<PendingAction, null>, { title: string; desc: string; cta: string }> = {
    accept: { title: "Aceitar proposta?", desc: "O proponente será notificado. Vocês podem combinar o encontro pelo chat.", cta: "Aceitar" },
    reject: { title: "Recusar proposta?", desc: "O proponente será notificado. Sem ação adicional.", cta: "Recusar" },
    cancel: { title: "Cancelar proposta?", desc: "O dono será notificado. Você pode propor de novo depois se quiser.", cta: "Cancelar proposta" },
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-gray-900/80 backdrop-blur p-3 -mx-3 rounded-lg border border-white/10">
        {isOwner && (
          <>
            <button
              onClick={() => setOpen("accept")}
              className="flex-1 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              Aceitar
            </button>
            <button
              onClick={() => setOpen("reject")}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              Recusar
            </button>
          </>
        )}
        {isProposer && (
          <button
            onClick={() => setOpen("cancel")}
            className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            Cancelar proposta
          </button>
        )}
      </div>

      <AlertDialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <AlertDialogContent>
          {open && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{titles[open].title}</AlertDialogTitle>
                <AlertDialogDescription>{titles[open].desc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={confirm} disabled={submitting}>
                  {titles[open].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Verificar se `AlertDialog` do shadcn está disponível**

Run: `ls components/ui/alert-dialog.tsx`
Se não existir, instalar:
```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 3: Adicionar ações no `page.tsx`**

Edit `app/(authenticated)/proposals/[id]/page.tsx`:

Importar:
```tsx
import { ProposalActions } from "./proposal-actions";
```

Após o `<ProposalChat ... />`, adicionar:
```tsx
<ProposalActions
  proposalId={id}
  isOwner={isOwner}
  isProposer={isProposer}
  isPending={proposal.status === "pending"}
/>
```

- [ ] **Step 4: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Smoke test**

Como dono: ver botões "Aceitar" / "Recusar". Clicar em "Aceitar" → confirmar → status muda pra "accepted", banner aparece, botões somem.

Como proponente: ver botão "Cancelar proposta". Clicar → confirmar → status muda pra "cancelled".

- [ ] **Step 6: Commit**

```bash
git add app/\(authenticated\)/proposals/\[id\]/proposal-actions.tsx app/\(authenticated\)/proposals/\[id\]/page.tsx
git commit -m "feat(proposals): accept/reject/cancel actions with confirmation"
```

---

## Task 22: Picker reusável `proposal-sticker-picker.tsx`

**Files:**
- Create: `app/(authenticated)/proposals/new/proposal-sticker-picker.tsx`

Versão simplificada do picker de `/trades/new`, focada em fontes específicas (owner's duplicates ou missing) com sinalização do estado da coleção do viewer.

- [ ] **Step 1: Criar o arquivo**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Search, Loader2 } from "lucide-react";

export type PickerMode = "want" | "offer";

interface StickerRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  group_name: string;
  duplicate_count: number;
  total_count: number;
}

interface SelectedItem {
  sticker_id: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: PickerMode;
  ownerUserId: string;
  selected: SelectedItem[];
  onToggle: (sticker: StickerRow) => void;
  /** Mapa sticker_id → quantos o viewer tem na coleção dele. Pra badges visuais. */
  viewerOwnedCounts: Record<number, number>;
}

const PAGE_SIZE = 20;

export function ProposalStickerPicker({
  open, onOpenChange, mode, ownerUserId, selected, onToggle, viewerOwnedCounts,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<StickerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const versionRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tab = mode === "want" ? "duplicates" : "missing";

  useEffect(() => {
    if (!open) return;
    const v = ++versionRef.current;
    pageRef.current = 1;
    setRows([]);
    setLoading(true);

    const supabase = createClient();
    supabase
      .rpc("get_public_stickers", {
        p_user_id: ownerUserId,
        p_tab: tab,
        p_group_id: null,
        p_keyword: keyword || null,
        p_page: 1,
        p_page_size: PAGE_SIZE,
        p_viewer_id: null, // queremos a lista BRUTA do dono, sem interseção
      })
      .then(({ data }) => {
        if (v !== versionRef.current) return;
        const list = (data as StickerRow[] | null) ?? [];
        setRows(list);
        setTotalCount(list[0]?.total_count ?? 0);
        setLoading(false);
      });
  }, [open, ownerUserId, tab, keyword]);

  const hasMore = rows.length < totalCount;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      const v = ++versionRef.current;
      const nextPage = pageRef.current + 1;
      setLoading(true);
      const supabase = createClient();
      supabase
        .rpc("get_public_stickers", {
          p_user_id: ownerUserId,
          p_tab: tab,
          p_group_id: null,
          p_keyword: keyword || null,
          p_page: nextPage,
          p_page_size: PAGE_SIZE,
          p_viewer_id: null,
        })
        .then(({ data }) => {
          if (v !== versionRef.current) return;
          const list = (data as StickerRow[] | null) ?? [];
          pageRef.current = nextPage;
          setRows((prev) => [...prev, ...list]);
          setLoading(false);
        });
    }, { rootMargin: "200px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, ownerUserId, tab, keyword]);

  const selectedIds = new Set(selected.map((s) => s.sticker_id));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-white/10 max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="text-white">
            {mode === "want" ? "Escolha o que você quer" : "Escolha o que você oferece"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-3 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Buscar por código..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {rows.map((sticker) => {
              const isSelected = selectedIds.has(sticker.id);
              const viewerHas = viewerOwnedCounts[sticker.id] ?? 0;
              let badgeLabel: string;
              if (viewerHas === 0) badgeLabel = "Falta";
              else if (viewerHas === 1) badgeLabel = "Você tem";
              else badgeLabel = `Repetida ×${viewerHas - 1}`;

              return (
                <button
                  type="button"
                  key={sticker.id}
                  onClick={() => onToggle(sticker)}
                  className={`relative rounded-lg border overflow-hidden transition-all ${
                    isSelected
                      ? "border-brand-grass ring-2 ring-brand-grass"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="aspect-[2/3] bg-gray-800">
                    {sticker.image_url ? (
                      <img src={sticker.image_url} alt={sticker.code} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/30 text-xs">{sticker.code}</div>
                    )}
                  </div>
                  <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                    {badgeLabel}
                  </div>
                  {mode === "want" && sticker.duplicate_count > 0 && (
                    <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
                      ×{sticker.duplicate_count}
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-2">
                    <span className="text-[10px] font-bold text-white">{sticker.code}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            </div>
          )}

          {!loading && rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Nenhuma figurinha encontrada.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/new/proposal-sticker-picker.tsx
git commit -m "feat(proposals): reusable sticker picker for proposal builder"
```

---

## Task 23: Builder `proposal-builder.tsx` (cliente)

**Files:**
- Create: `app/(authenticated)/proposals/new/proposal-builder.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProposalAction } from "../lib/create-proposal-action";
import { ProposalStickerPicker, type PickerMode } from "./proposal-sticker-picker";
import type { ProposalItem } from "../lib/types";

interface SelectedSticker {
  sticker_id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  quantity: number;
  /** Cap superior pra stepper (duplicate_count do dono). null = sem cap. */
  maxQuantity: number | null;
}

interface Props {
  ownerUserId: string;
  ownerDisplayName: string;
  ownerUsername: string;
  viewerUserId: string;
  viewerOwnedCounts: Record<number, number>;
}

export function ProposalBuilder({
  ownerUserId, ownerDisplayName, ownerUsername, viewerUserId, viewerOwnedCounts,
}: Props) {
  const router = useRouter();
  const [wantItems, setWantItems] = useState<SelectedSticker[]>([]);
  const [offerItems, setOfferItems] = useState<SelectedSticker[]>([]);
  const [pickerOpen, setPickerOpen] = useState<PickerMode | null>(null);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const togglePick = (side: PickerMode, sticker: {
    id: number;
    code: string;
    title: string | null;
    image_url: string | null;
    duplicate_count: number;
  }) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) => {
      const existing = prev.find((x) => x.sticker_id === sticker.id);
      if (existing) {
        return prev.filter((x) => x.sticker_id !== sticker.id);
      }
      return [
        ...prev,
        {
          sticker_id: sticker.id,
          code: sticker.code,
          title: sticker.title,
          image_url: sticker.image_url,
          quantity: 1,
          maxQuantity: side === "want" ? sticker.duplicate_count : null,
        },
      ];
    });
  };

  const setQuantity = (side: PickerMode, stickerId: number, qty: number) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) =>
      prev.map((x) =>
        x.sticker_id === stickerId
          ? { ...x, quantity: Math.max(1, Math.min(x.maxQuantity ?? 9, qty)) }
          : x
      )
    );
  };

  const removeItem = (side: PickerMode, stickerId: number) => {
    const setter = side === "want" ? setWantItems : setOfferItems;
    setter((prev) => prev.filter((x) => x.sticker_id !== stickerId));
  };

  const canSubmit = wantItems.length > 0 && offerItems.length > 0 && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    const items: ProposalItem[] = [
      ...wantItems.map((x) => ({ sticker_id: x.sticker_id, direction: "want" as const, quantity: x.quantity })),
      ...offerItems.map((x) => ({ sticker_id: x.sticker_id, direction: "offer" as const, quantity: x.quantity })),
    ];
    startTransition(async () => {
      try {
        const id = await createProposalAction({ ownerUserId, items });
        router.push(`/proposals/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao enviar proposta");
      }
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-white">Propor troca</h1>
        <p className="text-sm text-gray-400">Para: <span className="text-white">@{ownerUsername}</span> ({ownerDisplayName})</p>
      </header>

      <Section
        title="O que você quer"
        items={wantItems}
        onAdd={() => setPickerOpen("want")}
        onRemove={(id) => removeItem("want", id)}
        onQuantity={(id, q) => setQuantity("want", id, q)}
      />

      <Section
        title="O que você oferece"
        items={offerItems}
        onAdd={() => setPickerOpen("offer")}
        onRemove={(id) => removeItem("offer", id)}
        onQuantity={(id, q) => setQuantity("offer", id, q)}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-lg bg-brand-grass px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Enviando..." : "Enviar proposta"}
      </button>

      <ProposalStickerPicker
        open={pickerOpen !== null}
        onOpenChange={(v) => !v && setPickerOpen(null)}
        mode={pickerOpen ?? "want"}
        ownerUserId={ownerUserId}
        selected={(pickerOpen === "want" ? wantItems : offerItems).map((x) => ({ sticker_id: x.sticker_id, quantity: x.quantity }))}
        onToggle={(s) => togglePick(pickerOpen ?? "want", s)}
        viewerOwnedCounts={viewerOwnedCounts}
      />
    </div>
  );
}

function Section({
  title, items, onAdd, onRemove, onQuantity,
}: {
  title: string;
  items: SelectedSticker[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onQuantity: (id: number, qty: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-medium text-white mb-3">{title}</h2>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">Nenhuma figurinha adicionada.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {items.map((item) => (
            <li key={item.sticker_id} className="flex items-center gap-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.code} className="h-10 w-7 rounded object-cover" />
              ) : (
                <div className="h-10 w-7 rounded bg-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">#{item.code} {item.title ?? ""}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onQuantity(item.sticker_id, item.quantity - 1)}
                  className="h-6 w-6 rounded bg-white/10 text-white text-sm"
                  aria-label="Diminuir"
                >–</button>
                <span className="text-sm text-white w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onQuantity(item.sticker_id, item.quantity + 1)}
                  className="h-6 w-6 rounded bg-white/10 text-white text-sm"
                  aria-label="Aumentar"
                >+</button>
                <button
                  type="button"
                  onClick={() => onRemove(item.sticker_id)}
                  className="ml-2 h-6 w-6 rounded text-gray-400 hover:text-red-400"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 text-sm text-brand-grass hover:underline"
      >
        <Plus className="h-4 w-4" /> Adicionar figurinha
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/proposals/new/proposal-builder.tsx
git commit -m "feat(proposals): builder UI with want/offer sections and pickers"
```

---

## Task 24: Página `/proposals/new` — server component

**Files:**
- Create: `app/(authenticated)/proposals/new/page.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalBuilder } from "./proposal-builder";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  if (!to) {
    redirect("/proposals");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: owner } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", to)
    .single();

  if (!owner || owner.id === user!.id) {
    redirect("/proposals");
  }

  // Coleção do viewer pra sinalização visual no picker
  const { data: viewerStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", user!.id);

  const viewerOwnedCounts: Record<number, number> = {};
  for (const vs of viewerStickers ?? []) {
    viewerOwnedCounts[vs.sticker_id] = (viewerOwnedCounts[vs.sticker_id] ?? 0) + 1;
  }

  return (
    <ProposalBuilder
      ownerUserId={owner.id}
      ownerDisplayName={owner.display_name ?? "Colecionador"}
      ownerUsername={owner.username}
      viewerUserId={user!.id}
      viewerOwnedCounts={viewerOwnedCounts}
    />
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Smoke test**

Acessar `/proposals/new?to=<username-de-outro-usuario>` logado.
Expected: header + duas seções vazias + botão "Enviar proposta" desabilitado.

Tente clicar "Adicionar figurinha" — drawer abre com a fonte correta (duplicates pro "Quero" / missing pro "Ofereço") e badges visuais.

Submeter uma proposta válida → redirect pra `/proposals/<id>` com itens populados.

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/proposals/new/page.tsx
git commit -m "feat(proposals): /proposals/new entry point with viewer collection lookup"
```

---

## Task 25: Atualizar nav-bar com badge

**Files:**
- Modify: `components/nav-bar.tsx`
- Modify: `app/(authenticated)/layout.tsx`

- [ ] **Step 1: Modificar `app/(authenticated)/layout.tsx`**

Adicionar busca da contagem antes do render:

```tsx
// dentro do AuthenticatedLayout, após o admin lookup:
const { data: unseenCount } = await supabase.rpc("count_unseen_proposals");
const proposalsBadge = (unseenCount as number | null) ?? 0;
```

E passar pro NavBar:
```tsx
<NavBar isAdmin={!!admin} proposalsBadge={proposalsBadge} />
```

- [ ] **Step 2: Modificar `components/nav-bar.tsx`**

Adicionar ícone na lista de imports:
```tsx
import { LayoutDashboard, Grid3X3, Users, Repeat2, MessageSquare, Settings, LogOut, Menu, X, Shield } from "lucide-react";
```

Adicionar entrada de Propostas na lista `links`:
```tsx
const links = [
  { href: "/dashboard", label: "Álbum", icon: LayoutDashboard },
  { href: "/collection", label: "Coleção", icon: Grid3X3 },
  { href: "/friends", label: "Amigos", icon: Users },
  { href: "/trades", label: "Trocas", icon: Repeat2 },
  { href: "/proposals", label: "Propostas", icon: MessageSquare },
];
```

Atualizar assinatura do componente:
```tsx
export function NavBar({ isAdmin = false, proposalsBadge = 0 }: { isAdmin?: boolean; proposalsBadge?: number }) {
```

E no map de links (no desktop e no mobile), adicionar o badge:

No desktop, dentro do `<Link>`:
```tsx
<Icon className="h-4 w-4" />
{link.label}
{link.href === "/proposals" && proposalsBadge > 0 && (
  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-grass px-1.5 text-[10px] font-bold text-white">
    {proposalsBadge > 9 ? "9+" : proposalsBadge}
  </span>
)}
```

No mobile drawer, similar dentro do `<Link>` do map:
```tsx
<Icon className="h-5 w-5" />
{link.label}
{link.href === "/proposals" && proposalsBadge > 0 && (
  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-grass px-1.5 text-[10px] font-bold text-white">
    {proposalsBadge > 9 ? "9+" : proposalsBadge}
  </span>
)}
```

O `MobileDrawer` aceita o badge também — passar como prop:
```tsx
<MobileDrawer
  open={mobileOpen}
  onClose={closeMobileDrawer}
  pathname={pathname}
  onLogout={handleLogout}
  avatarUrl={avatarUrl}
  isAdmin={isAdmin}
  proposalsBadge={proposalsBadge}
/>
```

E na assinatura do `MobileDrawer`:
```tsx
function MobileDrawer({
  open, onClose, pathname, onLogout, avatarUrl, isAdmin, proposalsBadge,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  onLogout: () => void;
  avatarUrl: string | null;
  isAdmin: boolean;
  proposalsBadge: number;
}) {
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Smoke test**

Recarregar qualquer página autenticada. Expected:
- Link "Propostas" aparece na nav-bar (desktop) e drawer mobile.
- Se há propostas não vistas (criar uma como outro usuário), badge mostra contagem.
- Após abrir `/proposals/<id>` ou `/proposals`, badge zera no próximo refresh.

- [ ] **Step 5: Commit**

```bash
git add components/nav-bar.tsx app/\(authenticated\)/layout.tsx
git commit -m "feat(proposals): nav-bar link with unseen badge"
```

---

## Task 26: Substituir o placeholder em `/p/[username]`

**Files:**
- Modify: `app/p/[username]/profile-stickers.tsx`
- Modify: `app/p/[username]/page.tsx`
- Delete: `app/p/[username]/trade-proposal-dialog.tsx`

- [ ] **Step 1: Modificar `profile-stickers.tsx`**

Remover o import e uso do dialog. Trocar o `<button>` "Propor troca" por um `<Link>`:

Adicionar import:
```tsx
import Link from "next/link";
```

Remover:
```tsx
import { TradeProposalDialog } from "./trade-proposal-dialog";
```

Remover o state:
```tsx
const [tradeOpen, setTradeOpen] = useState(false);
```

Substituir o bloco do botão (linhas ~159-174):
```tsx
{tradeFilterActive && (
  <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
    <p className="text-sm text-white">
      Quer trocar com <span className="font-semibold">@{ownerUsername}</span>?
    </p>
    {tradeButtonDisabled ? (
      <button
        type="button"
        disabled
        title="Sem trocas viáveis no momento"
        className="w-full sm:w-auto rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white cursor-not-allowed"
      >
        Propor troca
      </button>
    ) : (
      <Link
        href={`/proposals/new?to=${ownerUsername}`}
        className="w-full sm:w-auto text-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
      >
        Propor troca
      </Link>
    )}
  </div>
)}
```

Remover o uso do `<TradeProposalDialog .../>` no final do componente.

- [ ] **Step 2: Modificar `app/p/[username]/page.tsx`**

A página já calcula `ownerDupes.size` e `totalMissing`. O `tradeButtonDisabled` é calculado no client component (`profile-stickers.tsx`). Mudar a regra dentro de `profile-stickers.tsx`:

Trocar:
```tsx
const tradeButtonDisabled =
  (tradeMissingCount ?? 0) + (tradeDuplicatesCount ?? 0) === 0;
```

Por uma nova prop. Vamos passar `ownerHasTradeable` do server.

Em `page.tsx`, calcular e passar:
```tsx
const ownerHasTradeable = ownerDupes.size > 0 && totalMissing > 0;
```

E adicionar prop em `<ProfileStickers ...>`:
```tsx
ownerHasTradeable={ownerHasTradeable}
```

Em `profile-stickers.tsx`, receber a prop:
```tsx
ownerHasTradeable = false,
```
(adicionar ao tipo e default).

E substituir:
```tsx
const tradeButtonDisabled = !ownerHasTradeable;
```

- [ ] **Step 3: Deletar o dialog**

Run: `rm app/p/\[username\]/trade-proposal-dialog.tsx`

- [ ] **Step 4: Verificar build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Smoke test**

Como usuário logado, abrir perfil público de outro user.
- Se o dono tem ≥1 repetida e ≥1 faltante → botão verde "Propor troca" leva pra `/proposals/new?to=<username>`.
- Se não → botão desabilitado/cinza.
- Como dono do próprio perfil → botão não aparece (`tradeFilterActive` continua false).
- Como visitante recém-cadastrado (sem coleção) → botão **aparece e funciona** (mudança crítica).

- [ ] **Step 6: Commit**

```bash
git add app/p/\[username\]/profile-stickers.tsx app/p/\[username\]/page.tsx
git rm app/p/\[username\]/trade-proposal-dialog.tsx
git commit -m "feat(proposals): replace placeholder dialog with link to /proposals/new"
```

---

## Task 27: Smoke test final

Sem código novo — só validar todos os caminhos críticos com a feature montada.

- [ ] **Step 1: Cenário 1 — propor como usuário existente**

1. Logar como User A (com coleção povoada).
2. Abrir perfil de User B → clicar "Propor troca".
3. Adicionar 2 figurinhas em "Quero" e 1 em "Ofereço" → "Enviar".
4. Verificar redirect pra `/proposals/<id>`.
5. Verificar email no inbox do User B (ou checar `email_log` com `kind='proposal_created'`).

- [ ] **Step 2: Cenário 2 — propor como usuário novo (coleção vazia)**

1. Criar conta nova (User C) sem adicionar nenhuma figurinha.
2. Acessar `/p/<username-do-User-B>` → botão "Propor troca" deve aparecer habilitado.
3. Picker "Ofereço": badges "Falta" em todos os cards; mesmo assim consegue selecionar.
4. Submeter proposta. Verificar criada.

- [ ] **Step 3: Cenário 3 — dono aceita**

1. Logar como User B.
2. Badge na nav-bar mostra contagem.
3. Abrir `/proposals` → recebida aparece com "•".
4. Abrir detalhe → mark_seen executou (sem `•` depois do refresh).
5. Mandar mensagem no chat → aparece pra ambos.
6. Clicar "Aceitar" → confirmar → status muda pra "Aceita" + banner verde.
7. Verificar email do User A com texto de aceite.

- [ ] **Step 4: Cenário 4 — proponente cancela**

1. Logar como User A.
2. Criar nova proposta com User B.
3. Em `/proposals/<id>` → "Cancelar proposta" → confirmar → status muda.
4. Verificar email do User B com texto de cancelamento.

- [ ] **Step 5: Cenário 5 — debounce de email de chat**

1. Numa proposta existente, mandar 3 mensagens em sequência rápida (<1min).
2. Checar `email_log` — só 1 linha de `kind='proposal_message'` pro destinatário.
3. Esperar 15min, mandar mais uma → 2ª linha aparece.

- [ ] **Step 6: Cenário 6 — race / proposta já decidida**

1. Como dono, abrir mesma proposta em 2 abas.
2. Aceitar na primeira → ok.
3. Aceitar na segunda → erro toast "proposal is not pending" (silently logged).

- [ ] **Step 7: Cenário 7 — auto-propor**

1. Tentar `/proposals/new?to=<meu-proprio-username>`.
2. Expected: redirect pra `/proposals` (página rejeita).

- [ ] **Step 8: Verificar build limpo**

Run: `npm run build`
Expected: nenhum erro de TypeScript, nenhum warning crítico.

---

## Notas de implementação

### Reuso de `get_public_stickers`

A função `get_public_stickers` aceita `p_viewer_id` opcional. Pra os pickers da proposta, passamos `p_viewer_id = null` — assim a função volta a se comportar como na versão antes do filtro de interseção (retorna repetidas/faltantes do dono "puros", sem cruzar com a coleção do viewer). Isso já é o comportamento default desde a `038_search_stickers_viewer.sql`.

### Quantidade no picker

O picker em si não controla quantidade — só toggle. O ajuste de quantidade fica no `proposal-builder.tsx` (stepper +/- em cada item já selecionado). Cap superior pra "want" vem do `duplicate_count` do dono retornado pelo RPC; pra "offer" o cap é 9 (UI arbitrário, server não valida).

### Email de chat — debounce

A query de debounce usa o índice parcial `idx_email_log_chat_debounce` criado na 046. Em produção, se o volume de mensagens crescer muito, considerar mover o debounce pra um worker assíncrono (queue) em vez de fazer no caminho da request.

### Real-time no chat

Out-of-scope pra v1. O usuário precisa dar refresh ou recarregar a página pra ver mensagens novas (que estarão lá depois do `router.refresh()` no `postMessageAction`). Se virar problema, próximo passo é `supabase.channel()` em `proposal-chat.tsx` subscrevendo a `proposal_messages` filtradas pelo `proposal_id`.

### Auto-conversão pra trade

Campo `proposals.converted_to_trade_id` fica `NULL` em todas as propostas no MVP. Próxima iteração: ao registrar uma troca em `/trades/new`, se vier de uma proposta aceita, fechar o loop populando esse campo.
