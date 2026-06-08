-- 065_create_broadcast_recipients.sql
-- Snapshot da audiência por broadcast com status individual.

CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  UNIQUE (broadcast_id, user_id)
);

CREATE INDEX idx_broadcast_recipients_pending
  ON broadcast_recipients(broadcast_id) WHERE status = 'pending';
CREATE INDEX idx_broadcast_recipients_broadcast_status
  ON broadcast_recipients(broadcast_id, status);
