-- Estende search_stickers com um viewer opcional pra contar quantas o usuário
-- logado tem de cada figurinha — usado no picker de trocas pra desabilitar
-- cards da coleção do counterparty que o iniciador já tem.

DROP FUNCTION IF EXISTS search_stickers(UUID, TEXT, INT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_stickers(
  p_user_id UUID,
  p_keyword TEXT DEFAULT NULL,
  p_group_id INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10,
  p_viewer_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  group_id INT,
  code TEXT,
  number INT,
  title TEXT,
  image_url TEXT,
  owned_count BIGINT,
  total_count BIGINT,
  viewer_owned_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE us.user_id = p_user_id
    GROUP BY us.sticker_id
  ),
  viewer_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE p_viewer_user_id IS NOT NULL AND us.user_id = p_viewer_user_id
    GROUP BY us.sticker_id
  )
  SELECT
    s.id,
    s.group_id,
    s.code,
    s.number,
    s.title,
    s.image_url,
    COALESCE(uc.cnt, 0) AS owned_count,
    COUNT(*) OVER() AS total_count,
    COALESCE(vc.cnt, 0) AS viewer_owned_count
  FROM stickers s
  LEFT JOIN user_counts uc ON uc.sticker_id = s.id
  LEFT JOIN viewer_counts vc ON vc.sticker_id = s.id
  WHERE
    (p_keyword IS NULL OR unaccent(s.code) ILIKE '%' || unaccent(p_keyword) || '%' OR unaccent(COALESCE(s.title, '')) ILIKE '%' || unaccent(p_keyword) || '%')
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (
      p_status IS NULL
      OR (p_status = 'owned' AND COALESCE(uc.cnt, 0) > 0)
      OR (p_status = 'missing' AND COALESCE(uc.cnt, 0) = 0)
      OR (p_status = 'duplicate' AND COALESCE(uc.cnt, 0) > 1)
    )
  ORDER BY s.group_id, s.number
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;
