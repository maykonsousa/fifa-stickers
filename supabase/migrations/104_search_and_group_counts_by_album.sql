-- search_stickers passa a contar dentro do álbum. p_viewer_album_id = álbum
-- público do visitante (referência para "já tenho").
DROP FUNCTION IF EXISTS search_stickers(UUID, TEXT, INT, TEXT, INT, INT, UUID);

CREATE FUNCTION search_stickers(
  p_album_id INT,
  p_keyword TEXT DEFAULT NULL,
  p_group_id INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10,
  p_viewer_album_id INT DEFAULT NULL
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
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  ),
  viewer_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE p_viewer_album_id IS NOT NULL AND us.album_id = p_viewer_album_id
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

GRANT EXECUTE ON FUNCTION search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT) TO authenticated;

-- get_user_group_counts por álbum.
DROP FUNCTION IF EXISTS get_user_group_counts(UUID);

CREATE FUNCTION get_user_group_counts(p_album_id INT)
RETURNS TABLE (
  group_id INT,
  owned INT,
  total_entries INT
)
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    s.group_id,
    COUNT(DISTINCT us.sticker_id)::INT AS owned,
    COUNT(*)::INT AS total_entries
  FROM public.user_stickers us
  JOIN public.stickers s ON s.id = us.sticker_id
  WHERE us.album_id = p_album_id
  GROUP BY s.group_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_group_counts(INT) TO authenticated;
