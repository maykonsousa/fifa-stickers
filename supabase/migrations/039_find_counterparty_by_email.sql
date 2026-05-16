-- Busca unificada por email: primeiro em profiles (membros), depois em leads
-- ainda não convertidos. Permite reaproveitar leads existentes em trocas
-- subsequentes sem refilar o form, e evita duplicação no banco.

DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION find_counterparty_by_email(p_email TEXT)
RETURNS TABLE (
  kind TEXT,
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_normalized_email TEXT := lower(trim(p_email));
BEGIN
  -- Membro tem precedência
  RETURN QUERY
  SELECT
    'member'::TEXT AS kind,
    p.id,
    p.display_name,
    p.avatar_url,
    u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = v_normalized_email
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Lead não convertido como fallback
  RETURN QUERY
  SELECT
    'lead'::TEXT AS kind,
    l.id,
    l.name AS display_name,
    NULL::TEXT AS avatar_url,
    l.email
  FROM leads l
  WHERE l.email = v_normalized_email
    AND l.converted_to_profile_id IS NULL
  LIMIT 1;
END;
$$;
