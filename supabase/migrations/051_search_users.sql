-- Busca genérica de usuários (membros), com opção de incluir leads
-- não-convertidos. Pensada para reuso: trade counterparty (com leads),
-- futura @menção/busca de amigos (sem leads).
--
-- Regras de matching:
--   - Keyword normalizada para lower(trim()).
--   - Se contém '@' → busca prefix em email.
--   - Senão → ILIKE substring em display_name OR prefix em email.
-- Ordenação:
--   - Membros antes de leads.
--   - Match exato de email > prefix de email > substring de nome.
--   - Alfabético por display_name como desempate.
-- Quando include_leads=true e o email do lead já existe em profiles,
-- o lead é omitido (precedência ao membro).

CREATE OR REPLACE FUNCTION search_users(
  p_keyword TEXT,
  p_limit INT DEFAULT 10,
  p_include_leads BOOLEAN DEFAULT false
)
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
  v_kw TEXT := lower(trim(p_keyword));
  v_is_email BOOLEAN := position('@' in v_kw) > 0;
BEGIN
  IF length(v_kw) < 4 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT
      'member'::TEXT AS kind,
      p.id,
      p.display_name,
      p.avatar_url,
      u.email::TEXT AS email,
      CASE
        WHEN lower(u.email) = v_kw THEN 0
        WHEN lower(u.email) LIKE v_kw || '%' THEN 1
        ELSE 2
      END AS rank
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE
      (v_is_email AND lower(u.email) LIKE v_kw || '%')
      OR (NOT v_is_email AND (
            lower(p.display_name) LIKE '%' || v_kw || '%'
         OR lower(u.email)        LIKE v_kw || '%'
      ))
  ),
  leads_filtered AS (
    SELECT
      'lead'::TEXT AS kind,
      l.id,
      l.name AS display_name,
      NULL::TEXT AS avatar_url,
      l.email,
      CASE
        WHEN lower(l.email) = v_kw THEN 0
        WHEN lower(l.email) LIKE v_kw || '%' THEN 1
        ELSE 2
      END AS rank
    FROM leads l
    WHERE
      p_include_leads
      AND l.converted_to_profile_id IS NULL
      AND (
        (v_is_email AND lower(l.email) LIKE v_kw || '%')
        OR (NOT v_is_email AND (
              lower(l.name)  LIKE '%' || v_kw || '%'
           OR lower(l.email) LIKE v_kw || '%'
        ))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u2
        WHERE lower(u2.email) = lower(l.email)
      )
  )
  SELECT m.kind, m.id, m.display_name, m.avatar_url, m.email
  FROM members m
  UNION ALL
  SELECT l.kind, l.id, l.display_name, l.avatar_url, l.email
  FROM leads_filtered l
  ORDER BY
    CASE WHEN kind = 'member' THEN 0 ELSE 1 END,
    rank,
    display_name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users(TEXT, INT, BOOLEAN) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON profiles ((lower(display_name)));

CREATE INDEX IF NOT EXISTS idx_leads_name_lower
  ON leads ((lower(name)));
