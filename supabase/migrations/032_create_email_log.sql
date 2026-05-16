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
