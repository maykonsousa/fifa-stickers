CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin tables (via service role or RPC)
CREATE POLICY "admins_select_self"
  ON admins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_invites_select_admin"
  ON admin_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "admin_invites_insert_admin"
  ON admin_invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = check_user_id);
$$;
