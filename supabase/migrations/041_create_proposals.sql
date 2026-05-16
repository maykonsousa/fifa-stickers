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
