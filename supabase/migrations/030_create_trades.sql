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
