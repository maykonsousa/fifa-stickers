-- 066_email_log_welcome_support.sql
-- Adiciona kind 'welcome' e coluna user_id pra rastrear welcome emails.

ALTER TABLE email_log ADD COLUMN user_id UUID REFERENCES auth.users(id);

ALTER TABLE email_log DROP CONSTRAINT email_log_kind_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_kind_check CHECK (
  kind IN (
    'trade_notification', 'lead_invite',
    'proposal_created', 'proposal_decided',
    'proposal_cancelled', 'proposal_message',
    'welcome'
  )
);

CREATE INDEX idx_email_log_welcome_user
  ON email_log(user_id) WHERE kind = 'welcome';
