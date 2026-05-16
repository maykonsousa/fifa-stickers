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
