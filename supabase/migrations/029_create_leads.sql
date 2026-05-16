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
