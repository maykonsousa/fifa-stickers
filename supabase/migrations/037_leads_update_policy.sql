-- Permite que o iniciador atualize leads que ele criou.
-- Necessário pra sendLeadInvite marcar email_invite_sent_at e garantir idempotência.
CREATE POLICY "leads_update_own" ON leads FOR UPDATE TO authenticated
  USING (auth.uid() = invited_by_user_id)
  WITH CHECK (auth.uid() = invited_by_user_id);

-- Torna find_or_create_lead resiliente a inserts concorrentes do mesmo email.
-- Antes: SELECT + INSERT → race → segundo caller pegava unique_violation (23505).
-- Agora: INSERT ON CONFLICT DO NOTHING + SELECT garante atomicidade.
CREATE OR REPLACE FUNCTION find_or_create_lead(
  p_email TEXT,
  p_name TEXT,
  p_city TEXT,
  p_state TEXT,
  p_whatsapp TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_normalized_email TEXT := lower(trim(p_email));
BEGIN
  INSERT INTO leads (email, name, city, state, whatsapp, invited_by_user_id)
  VALUES (v_normalized_email, p_name, p_city, p_state, p_whatsapp, auth.uid())
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO v_lead_id FROM leads WHERE email = v_normalized_email;
  RETURN v_lead_id;
END;
$$;
