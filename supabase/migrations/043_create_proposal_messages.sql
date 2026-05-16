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
