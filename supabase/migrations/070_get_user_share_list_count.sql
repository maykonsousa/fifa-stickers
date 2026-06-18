-- 070_get_user_share_list_count.sql
-- Adiciona a coluna `count` (total de cópias do usuário) ao retorno de
-- get_user_share_list pra alimentar a regra de sufixo `(×(count-1))` na
-- lista de repetidas compartilhada.
--
-- DROP + CREATE porque `CREATE OR REPLACE FUNCTION` não permite mudar o
-- RETURNS TABLE (Postgres exige DROP antes pra mudar shape do row).

DROP FUNCTION IF EXISTS get_user_share_list(UUID, TEXT);

CREATE FUNCTION get_user_share_list(p_user_id UUID, p_kind TEXT)
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT,
  count INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH counts AS (
    SELECT sticker_id, COUNT(*)::INT AS cnt
    FROM public.user_stickers
    WHERE user_id = p_user_id
    GROUP BY sticker_id
  )
  SELECT
    s.group_id,
    g.name AS group_name,
    g.code AS group_code,
    s.id AS sticker_id,
    s.code AS sticker_code,
    s.number AS sticker_number,
    s.title AS sticker_title,
    COALESCE(c.cnt, 0) AS count
  FROM public.stickers s
  JOIN public.sticker_groups g ON g.id = s.group_id
  LEFT JOIN counts c ON c.sticker_id = s.id
  WHERE
    (p_kind = 'missing' AND COALESCE(c.cnt, 0) = 0)
    OR (p_kind = 'duplicates' AND COALESCE(c.cnt, 0) >= 2)
  ORDER BY s.group_id, s.number;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_list(UUID, TEXT) TO authenticated, anon;