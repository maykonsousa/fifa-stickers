-- 060_public_stickers_album_rpc_orientation.sql
-- Atualiza a RPC do álbum (criada em 058) pra também retornar orientation
-- (portrait/landscape). Frontend usa pra renderizar aspect ratio diferente
-- e estender o gridColumn em 2 quando landscape.
--
-- Usa CREATE OR REPLACE; a assinatura externa muda só no RETURNS TABLE
-- (adicionado orientation), os parâmetros e GRANT permanecem.

DROP FUNCTION IF EXISTS get_public_stickers_album(UUID, INT, TEXT, UUID);

CREATE FUNCTION get_public_stickers_album(
  p_user_id UUID,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  page INT,
  "row" INT,
  "col" INT,
  orientation TEXT,
  group_id INT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_id IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.user_id = p_user_id
    GROUP BY us.sticker_id
  )
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    s.page,
    s.row,
    s.col,
    s.orientation,
    sg.id AS group_id,
    sg.name AS group_name,
    COALESCE((oc.cnt - 1), 0)::INT AS duplicate_count,
    CASE
      WHEN v_viewer_present THEN COALESCE((
        SELECT COUNT(*)::INT FROM public.user_stickers us
        WHERE us.user_id = p_viewer_id AND us.sticker_id = s.id
      ), 0)
      ELSE 0
    END AS viewer_owned_count
  FROM public.stickers s
  JOIN public.sticker_groups sg ON sg.id = s.group_id
  LEFT JOIN owner_counts oc ON oc.sticker_id = s.id
  WHERE s.page IS NOT NULL
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
  ORDER BY s.page, s.row, s.col;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stickers_album(UUID, INT, TEXT, UUID) TO anon, authenticated;
