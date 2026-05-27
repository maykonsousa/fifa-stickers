-- 061_get_user_group_counts.sql
-- Agrega contagens de figurinhas do usuário por grupo. Substitui a contagem
-- feita no client (dashboard) que truncava em 1000 linhas devido ao default
-- do PostgREST quando user_stickers tinha muitas repetidas.

CREATE OR REPLACE FUNCTION get_user_group_counts(p_user_id UUID)
RETURNS TABLE (
  group_id INT,
  owned INT,
  total_entries INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.group_id,
    COUNT(DISTINCT us.sticker_id)::INT AS owned,
    COUNT(*)::INT AS total_entries
  FROM public.user_stickers us
  JOIN public.stickers s ON s.id = us.sticker_id
  WHERE us.user_id = p_user_id
  GROUP BY s.group_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_group_counts(UUID) TO authenticated;
