CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION search_stickers(
  p_user_id UUID,
  p_keyword TEXT DEFAULT NULL,
  p_group_id INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10
)
RETURNS TABLE (
  id INT,
  group_id INT,
  code TEXT,
  number INT,
  title TEXT,
  image_url TEXT,
  owned_count BIGINT,
  total_count BIGINT
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
  )
  SELECT
    s.id,
    s.group_id,
    s.code,
    s.number,
    s.title,
    s.image_url,
    COALESCE(uc.cnt, 0) AS owned_count,
    COUNT(*) OVER() AS total_count
  FROM stickers s
  LEFT JOIN user_counts uc ON uc.sticker_id = s.id
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
